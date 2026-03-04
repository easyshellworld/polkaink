// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IGovernanceCore.sol";
import "./interfaces/IStakingManager.sol";
import "./TimelockController.sol";
import "../token/interfaces/INFTReward.sol";
import "../libraries/VotingMath.sol";

/// @title GovernanceCore v2
/// @notice Stake-weighted governance with OG Gold veto for PolkaInk DAO
contract GovernanceCore is
    Initializable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    IGovernanceCore
{
    bytes32 public constant REGISTRY_ROLE = keccak256("REGISTRY_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    uint256 public constant VOTING_PERIOD = 7 days;
    uint256 public constant TIMELOCK_DELAY = 48 hours;

    TimelockController public timelock;
    INFTReward         public nftReward;
    IStakingManager    public stakingManager;
    address            public registry;

    uint256 private _proposalCounter;
    mapping(uint256 => Proposal) private _proposals;
    mapping(uint256 => mapping(address => VoteRecord)) private _voteRecords;
    uint256 private _votingPeriodOverride;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(
        address admin,
        address _timelock,
        address _nftReward,
        address _stakingManager
    ) external initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);

        timelock = TimelockController(payable(_timelock));
        nftReward = INFTReward(_nftReward);
        if (_stakingManager != address(0)) {
            stakingManager = IStakingManager(_stakingManager);
        }
    }

    function setRegistry(address _registry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_registry != address(0), "GovernanceCore: zero address");
        registry = _registry;
    }

    function setStakingManager(address _sm) external onlyRole(DEFAULT_ADMIN_ROLE) {
        stakingManager = IStakingManager(_sm);
    }

    function setVotingPeriod(uint256 period) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _votingPeriodOverride = period;
    }

    function getVotingPeriod() external view returns (uint256) {
        return _votingPeriodOverride > 0 ? _votingPeriodOverride : VOTING_PERIOD;
    }

    // ─── Write Operations ─────────────────────────────────────────────────

    function createProposal(
        ProposalType proposalType,
        uint256 docId,
        uint256 targetVersionId,
        bytes calldata callData,
        string calldata description
    ) external returns (uint256 proposalId) {
        if (!stakingManager.isActiveMember(msg.sender))
            revert Gov__NotActiveMember(msg.sender);
        return _createProposal(msg.sender, proposalType, docId, targetVersionId, callData, description);
    }

    function createProposalFor(
        address proposer,
        ProposalType proposalType,
        uint256 docId,
        uint256 targetVersionId,
        bytes calldata callData,
        string calldata description
    ) external onlyRole(REGISTRY_ROLE) returns (uint256 proposalId) {
        if (!stakingManager.isActiveMember(proposer))
            revert Gov__NotActiveMember(proposer);
        return _createProposal(proposer, proposalType, docId, targetVersionId, callData, description);
    }

    function vote(uint256 proposalId, VoteChoice choice) external nonReentrant {
        Proposal storage p = _proposals[proposalId];
        if (p.id == 0) revert Gov__ProposalNotFound(proposalId);
        if (p.status != ProposalStatus.Active) revert Gov__ProposalNotActive(proposalId);
        if (block.timestamp > p.endTime) revert Gov__VotingEnded(proposalId);

        VoteRecord storage vr = _voteRecords[proposalId][msg.sender];
        if (vr.hasVoted) revert Gov__AlreadyVoted(msg.sender, proposalId);

        if (!stakingManager.isActiveMember(msg.sender))
            revert Gov__NotActiveMember(msg.sender);

        uint256 weight = _computeWeight(msg.sender, p.docId);
        require(weight > 0, "GovernanceCore: zero weight");

        vr.hasVoted  = true;
        vr.choice    = choice;
        vr.weight    = weight;
        vr.timestamp = block.timestamp;

        if (choice == VoteChoice.Yes) {
            p.score += int256(weight);
        } else if (choice == VoteChoice.No) {
            p.score -= int256(weight);
            p.noVoterCount++;

            // OG Gold holder voting NO triggers instant veto
            if (nftReward.hasActiveOGGold(msg.sender)) {
                p.goldVetoed = true;
                p.status = ProposalStatus.Vetoed;
                emit GoldVeto(proposalId, msg.sender);
                emit VoteCast(proposalId, msg.sender, choice, weight);
                return;
            }
        }
        // Abstain: score unchanged

        emit VoteCast(proposalId, msg.sender, choice, weight);
    }

    function cancelProposal(uint256 proposalId) external {
        Proposal storage p = _proposals[proposalId];
        if (p.id == 0) revert Gov__ProposalNotFound(proposalId);
        if (p.proposer != msg.sender) revert Gov__NotProposer(msg.sender);
        if (p.status != ProposalStatus.Active) revert Gov__ProposalNotActive(proposalId);

        p.status = ProposalStatus.Cancelled;
        emit ProposalCancelled(proposalId, msg.sender);
    }

    function finalizeProposal(uint256 proposalId) external {
        Proposal storage p = _proposals[proposalId];
        if (p.id == 0) revert Gov__ProposalNotFound(proposalId);
        if (p.status != ProposalStatus.Active) revert Gov__AlreadyFinalized(proposalId);
        if (block.timestamp <= p.endTime) revert Gov__VotingNotEnded(proposalId);

        bool passed = VotingMath.checkPassed(p.score, p.goldVetoed);
        p.status = passed ? ProposalStatus.Approved : ProposalStatus.Rejected;

        emit ProposalFinalized(proposalId, p.status, p.score);
    }

    function executeProposal(uint256 proposalId) external nonReentrant {
        Proposal storage p = _proposals[proposalId];
        if (p.id == 0) revert Gov__ProposalNotFound(proposalId);
        if (p.status != ProposalStatus.Approved) revert Gov__NotApproved(proposalId);

        p.status = ProposalStatus.Executed;

        if (p.proposalType == ProposalType.VersionUpdate) {
            // Direct execution: call registry.mergeProposal
            (bool ok,) = registry.call(
                abi.encodeWithSignature("mergeProposal(uint256)", proposalId)
            );
            require(ok, "GovernanceCore: merge failed");
        } else {
            // Upgrade/Param changes go through timelock
            timelock.schedule(
                registry, 0, p.callData, bytes32(0), bytes32(proposalId), TIMELOCK_DELAY
            );
        }

        emit ProposalExecuted(proposalId);
    }

    // ─── Read Operations ──────────────────────────────────────────────────

    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return _proposals[proposalId];
    }

    function getVoteRecord(uint256 proposalId, address voter) external view returns (VoteRecord memory) {
        return _voteRecords[proposalId][voter];
    }

    function getVotingWeight(address voter, uint256 docId) external view returns (uint256) {
        return _computeWeight(voter, docId);
    }

    function totalProposals() external view returns (uint256) {
        return _proposalCounter;
    }

    function listProposals(
        ProposalStatus filter,
        uint256 offset,
        uint256 limit
    ) external view returns (Proposal[] memory proposals, uint256 total) {
        uint256[] memory tmp = new uint256[](_proposalCounter);
        uint256 count = 0;
        for (uint256 i = 1; i <= _proposalCounter; i++) {
            if (_proposals[i].status == filter) tmp[count++] = i;
        }
        total = count;
        if (limit > 50) limit = 50;
        if (offset >= count) return (new Proposal[](0), total);
        uint256 end = offset + limit > count ? count : offset + limit;
        proposals = new Proposal[](end - offset);
        for (uint256 i = 0; i < end - offset; i++) {
            proposals[i] = _proposals[tmp[offset + i]];
        }
    }

    // ─── Internal ─────────────────────────────────────────────────────────

    function _createProposal(
        address proposer,
        ProposalType proposalType,
        uint256 docId,
        uint256 targetVersionId,
        bytes calldata callData,
        string calldata description
    ) internal returns (uint256 proposalId) {
        _proposalCounter++;
        proposalId = _proposalCounter;

        uint256 vp = _votingPeriodOverride > 0 ? _votingPeriodOverride : VOTING_PERIOD;

        _proposals[proposalId] = Proposal({
            id: proposalId,
            proposalType: proposalType,
            proposer: proposer,
            docId: docId,
            targetVersionId: targetVersionId,
            score: 0,
            startTime: block.timestamp,
            endTime: block.timestamp + vp,
            status: ProposalStatus.Active,
            callData: callData,
            description: description,
            goldVetoed: false,
            noVoterCount: 0
        });

        emit ProposalCreated(
            proposalId, proposer, proposalType, docId,
            block.timestamp, block.timestamp + vp
        );
    }

    function _computeWeight(address voter, uint256 docId) internal view returns (uint256) {
        IStakingManager.StakeInfo memory si = stakingManager.getStake(voter);

        return VotingMath.calculateWeight(
            si.active,
            nftReward.activeCreatorCount(voter),
            nftReward.isAuthorOf(voter, docId),
            nftReward.ogCount(voter, INFTReward.NFTType.OGBronze),
            nftReward.ogCount(voter, INFTReward.NFTType.OGSilver),
            nftReward.hasActiveOGGold(voter),
            si.lockMonths
        );
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}
}
