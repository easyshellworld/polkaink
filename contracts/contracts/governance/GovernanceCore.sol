// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IGovernanceCore.sol";
import "./interfaces/IArchiveCouncil.sol";
import "./interfaces/IStakingManager.sol";
import "./TimelockController.sol";
import "../token/interfaces/INFTReward.sol";
import "../finance/interfaces/ITreasury.sol";
import "../core/interfaces/IPolkaInkRegistry.sol";
import "../libraries/VotingMath.sol";

/// @title GovernanceCore v3.4
/// @notice Stake-weighted governance with Council veto window, dynamic VersionUpdate rewards,
///         REJECTION_COOLDOWN on both Rejected and CouncilVetoed, reward skip on low pool.
///
/// v3.4 fixes:
///   - vote() now uses nftReward.hasActiveMember() (not si.active) for calculateWeight first param
///   - getVotingWeight() same fix
///   - createProposal() stores target address in Proposal for Timelock scheduling
///   - executeProposal() uses p.target for Timelock.schedule() instead of hardcoded registry
///   - executeProposal() EmergencyConfirm branch now handles Approved→Frozen and
///     Rejected→Active (setDocumentStatus) correctly
contract GovernanceCore is
    Initializable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    IGovernanceCore
{
    bytes32 public constant REGISTRY_ROLE = keccak256("REGISTRY_ROLE");
    bytes32 public constant COUNCIL_ROLE  = keccak256("COUNCIL_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // MVP test values (replace before mainnet)
    uint256 public constant VOTING_PERIOD           = 10 minutes;  // prod: 7 days
    uint256 public constant EMERGENCY_VOTING_PERIOD = 5 minutes;   // prod: 48 hours
    uint256 public constant COUNCIL_WINDOW          = 3 minutes;   // prod: 24 hours
    uint256 public constant REJECTION_COOLDOWN      = 5 minutes;   // prod: 72 hours
    uint256 public constant PROPOSAL_STAKE          = 5 ether;     // 5 PAS

    TimelockController public timelock;
    INFTReward         public nftReward;
    IStakingManager    public stakingManager;
    ITreasury          public treasury;
    address            public registry;
    address            public archiveCouncil;

    uint256 private _proposalCounter;
    mapping(uint256 => Proposal)                        private _proposals;
    mapping(uint256 => mapping(address => VoteRecord))  private _voteRecords;

    // proposer => docId => cooldownEnd
    mapping(address => mapping(uint256 => uint256)) private _rejectionCooldowns;
    // docId => active proposalId (0 = none)
    mapping(uint256 => uint256) private _activeProposalForDoc;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(
        address admin,
        address _timelock,
        address _nftReward,
        address _stakingManager,
        address _treasury
    ) external initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();
_grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);

        timelock        = TimelockController(payable(_timelock));
        nftReward       = INFTReward(_nftReward);
        stakingManager  = IStakingManager(_stakingManager);
        treasury        = ITreasury(payable(_treasury));
    }

    function setRegistry(address _registry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_registry != address(0), "GovernanceCore: zero address");
        registry = _registry;
    }

    function setArchiveCouncil(address council) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(council != address(0), "GovernanceCore: zero address");
        archiveCouncil = council;
    }

    // ─── Write Operations ─────────────────────────────────────────────────

    function createProposalFor(
        address proposer,
        uint256 docId,
        uint256 targetVersionId,
        uint256 parentVersionId,
        string calldata description
    ) external onlyRole(REGISTRY_ROLE) returns (uint256 proposalId) {
        if (!stakingManager.isActiveMember(proposer))
            revert Gov__NotActiveMember(proposer);
        _checkCooldown(proposer, docId);
        _checkNoActiveProposal(docId);
        proposalId = _createProposal(
            proposer, ProposalType.VersionUpdate,
            docId, targetVersionId, parentVersionId, address(0), "", description, 0
        );
        _activeProposalForDoc[docId] = proposalId;
    }

    function createProposal(
        ProposalType proposalType,
        uint256 docId,
        uint256 targetVersionId,
        uint256 parentVersionId,
        address timelockTarget,
        bytes calldata callData,
        string calldata description
    ) external payable returns (uint256 proposalId) {
        require(
            proposalType == ProposalType.UpgradeContract ||
            proposalType == ProposalType.ParameterChange,
            "GovernanceCore: use createProposalFor for VersionUpdate"
        );
        if (!stakingManager.isActiveMember(msg.sender))
            revert Gov__NotActiveMember(msg.sender);
        if (msg.value != PROPOSAL_STAKE)
            revert Gov__InsufficientStake(PROPOSAL_STAKE, msg.value);
        require(timelockTarget != address(0), "GovernanceCore: zero timelockTarget");

        proposalId = _createProposal(
            msg.sender, proposalType,
            docId, targetVersionId, parentVersionId,
            timelockTarget, callData, description, PROPOSAL_STAKE
        );
    }

    function createEmergencyConfirm(
        uint256 docId,
        string calldata description
    ) external onlyRole(COUNCIL_ROLE) returns (uint256 proposalId) {
        proposalId = _createEmergencyProposal(msg.sender, docId, description);
    }

    function vote(uint256 proposalId, VoteChoice choice) external nonReentrant {
        Proposal storage p = _proposals[proposalId];
        if (p.id == 0) revert Gov__ProposalNotFound(proposalId);
        if (p.status != ProposalStatus.Active) revert Gov__ProposalNotActive(proposalId);
        require(block.timestamp <= p.endTime, "GovernanceCore: voting ended");

        VoteRecord storage vr = _voteRecords[proposalId][msg.sender];
        if (vr.hasVoted) revert Gov__AlreadyVoted(msg.sender, proposalId);

        if (!stakingManager.isActiveMember(msg.sender))
            revert Gov__NotActiveMember(msg.sender);

        IStakingManager.StakeInfo memory si = stakingManager.getStake(msg.sender);
        // Fix: use nftReward.hasActiveMember() for semantic correctness (not si.active)
        uint256 weight = VotingMath.calculateWeight(
            nftReward.hasActiveMember(msg.sender),
            nftReward.activeCreatorCount(msg.sender),
            si.lockMonths
        );
        require(weight > 0, "GovernanceCore: zero weight");

        vr.hasVoted  = true;
        vr.choice    = choice;
        vr.weight    = weight;
        vr.timestamp = block.timestamp;

        if (choice == VoteChoice.Yes) {
            p.score += int256(weight);
        } else if (choice == VoteChoice.No) {
            p.score -= int256(weight);
        }
        // Abstain: score unchanged
        p.totalVoteWeight += weight;
        p.voterCount      += 1;

        // Record voter weight for epoch reward distribution (VersionUpdate proposals only)
        if (p.proposalType == ProposalType.VersionUpdate) {
            uint256 epochId = (block.timestamp - _epochStartTime()) / _epochDuration();
            treasury.recordEpochVoterWeight(epochId, proposalId, msg.sender, weight);
        }

        emit VoteCast(proposalId, msg.sender, choice, weight);
    }

    // ─── Internal epoch helpers ───────────────────────────────────────────

    /// @dev Returns current epochId by querying Treasury's epoch start time and duration
    function _epochStartTime() internal view returns (uint256) {
        return treasury.epochStartTime();
    }

    function _epochDuration() internal view returns (uint256) {
        return treasury.EPOCH_DURATION();
    }

    function cancelProposal(uint256 proposalId) external {
        Proposal storage p = _proposals[proposalId];
        if (p.id == 0) revert Gov__ProposalNotFound(proposalId);
        if (p.proposer != msg.sender) revert Gov__NotProposer(msg.sender);
        if (p.status != ProposalStatus.Active) revert Gov__ProposalNotActive(proposalId);

        p.status = ProposalStatus.Cancelled;
        _activeProposalForDoc[p.docId] = 0;
        // No cooldown on cancel
    }

    function finalizeProposal(uint256 proposalId) external {
        Proposal storage p = _proposals[proposalId];
        if (p.id == 0) revert Gov__ProposalNotFound(proposalId);
        if (p.status != ProposalStatus.Active) revert Gov__ProposalNotActive(proposalId);
        if (block.timestamp <= p.endTime) revert Gov__VotingNotEnded(proposalId);

        bool isEmergency = p.proposalType == ProposalType.EmergencyConfirm;
        (bool passed, uint256 participationBps) = VotingMath.checkPassed(
            p.score, p.totalVoteWeight, p.snapshotTotalWeight, isEmergency
        );

        if (passed) {
            p.status = ProposalStatus.Approved;
            if (isEmergency) {
                p.councilWindowEnd = 0;
            } else {
                p.councilWindowEnd = block.timestamp + COUNCIL_WINDOW;
                emit CouncilWindowOpened(proposalId, p.councilWindowEnd);
            }
            _activeProposalForDoc[p.docId] = 0;
        } else {
            p.status = ProposalStatus.Rejected;
            _activeProposalForDoc[p.docId] = 0;
            _rejectionCooldowns[p.proposer][p.docId] = block.timestamp + REJECTION_COOLDOWN;
            if (isEmergency) {
                (bool ok,) = registry.call(
                    abi.encodeWithSignature("setDocumentStatus(uint256,uint8)", p.docId, 0)
                );
                require(ok, "GovernanceCore: emergency unfreeze failed");
            }
        }

        emit ProposalFinalized(proposalId, p.status, p.score, participationBps);
    }

    function executeProposal(uint256 proposalId) external nonReentrant {
        Proposal storage p = _proposals[proposalId];
        if (p.id == 0) revert Gov__ProposalNotFound(proposalId);
        if (p.status != ProposalStatus.Approved) revert Gov__ProposalNotActive(proposalId);
        if (
            p.proposalType != ProposalType.EmergencyConfirm &&
            block.timestamp <= p.councilWindowEnd
        )
            revert Gov__CouncilWindowNotClosed(proposalId, p.councilWindowEnd);

        p.status = ProposalStatus.Executed;
        _activeProposalForDoc[p.docId] = 0;

        uint256 rewardPaid = 0;

        if (p.proposalType == ProposalType.VersionUpdate) {
            // Call registry.mergeProposal
            (bool ok,) = registry.call(
                abi.encodeWithSignature("mergeProposal(uint256,uint256)", p.docId, proposalId)
            );
            require(ok, "GovernanceCore: merge failed");

            // Mint Creator NFT
            nftReward.mintCreatorNFT(p.proposer, p.docId, proposalId);

            // Distribute reward if pool sufficient; emit RewardSkipped if not
            rewardPaid = treasury.distributeProposerReward(p.proposer, proposalId, p.voterCount);
            if (rewardPaid == 0) {
                emit RewardSkipped(proposalId, 0);
            }

        } else if (
            p.proposalType == ProposalType.UpgradeContract ||
            p.proposalType == ProposalType.ParameterChange
        ) {
            // Queue in timelock using the stored timelockTarget (not hardcoded registry)
            bytes32 salt = bytes32(proposalId);
            timelock.schedule(
                p.timelockTarget, 0, p.callData, bytes32(0), salt,
                2 minutes // MVP timelock delay (prod: 48 hours)
            );
            // Refund 5 PAS stake
            (bool ok,) = p.proposer.call{value: p.proposalStake}("");
            require(ok, "GovernanceCore: stake refund failed");

        } else if (p.proposalType == ProposalType.EmergencyConfirm) {
            (bool okStatus,) = registry.call(
                abi.encodeWithSignature("setDocumentStatus(uint256,uint8)", p.docId, 1)
            );
            require(okStatus, "GovernanceCore: emergency freeze keep failed");
            IArchiveCouncil(archiveCouncil).confirmEmergencyFreeze(p.docId);
        }

        emit ProposalExecuted(proposalId, rewardPaid);
    }

    function markCouncilVetoed(uint256 proposalId)
        external onlyRole(COUNCIL_ROLE)
    {
        Proposal storage p = _proposals[proposalId];
        if (p.id == 0) revert Gov__ProposalNotFound(proposalId);
        require(p.status == ProposalStatus.Approved, "GovernanceCore: not Approved");

        p.status = ProposalStatus.CouncilVetoed;
        _activeProposalForDoc[p.docId] = 0;
        // Apply same REJECTION_COOLDOWN as Rejected
        _rejectionCooldowns[p.proposer][p.docId] = block.timestamp + REJECTION_COOLDOWN;
    }

    // ─── Read Operations ──────────────────────────────────────────────────

    function getProposal(uint256 id) external view returns (Proposal memory) {
        return _proposals[id];
    }

    function getVoteRecord(uint256 proposalId, address voter)
        external view returns (VoteRecord memory)
    {
        return _voteRecords[proposalId][voter];
    }

    function getVotingWeight(address voter) external view returns (uint256) {
        IStakingManager.StakeInfo memory si = stakingManager.getStake(voter);
        return VotingMath.calculateWeight(
            nftReward.hasActiveMember(voter),
            nftReward.activeCreatorCount(voter),
            si.lockMonths
        );
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
        uint256 parentVersionId,
        address timelockTarget,
        bytes memory callData,
        string memory description,
        uint256 proposalStake
    ) internal returns (uint256 proposalId) {
        _proposalCounter++;
        proposalId = _proposalCounter;

        uint256 endTime = block.timestamp + VOTING_PERIOD;
        uint256 snapshot = stakingManager.totalActiveMemberWeight();

        _proposals[proposalId] = Proposal({
            id:                 proposalId,
            proposalType:       proposalType,
            proposer:           proposer,
            docId:              docId,
            targetVersionId:    targetVersionId,
            parentVersionId:    parentVersionId,
            score:              0,
            totalVoteWeight:    0,
            voterCount:         0,
            snapshotTotalWeight: snapshot,
            startTime:          block.timestamp,
            endTime:            endTime,
            councilWindowEnd:   0,
            status:             ProposalStatus.Active,
            callData:           callData,
            description:        description,
            proposalStake:      proposalStake,
            timelockTarget:     timelockTarget
        });

        emit ProposalCreated(proposalId, proposer, proposalType, docId, parentVersionId, endTime);
    }

    function _createEmergencyProposal(
        address proposer,
        uint256 docId,
        string memory description
    ) internal returns (uint256 proposalId) {
        _proposalCounter++;
        proposalId = _proposalCounter;

        uint256 endTime  = block.timestamp + EMERGENCY_VOTING_PERIOD;
        uint256 snapshot = stakingManager.totalActiveMemberWeight();

        _proposals[proposalId] = Proposal({
            id:                 proposalId,
            proposalType:       ProposalType.EmergencyConfirm,
            proposer:           proposer,
            docId:              docId,
            targetVersionId:    0,
            parentVersionId:    0,
            score:              0,
            totalVoteWeight:    0,
            voterCount:         0,
            snapshotTotalWeight: snapshot,
            startTime:          block.timestamp,
            endTime:            endTime,
            councilWindowEnd:   0,
            status:             ProposalStatus.Active,
            callData:           "",
            description:        description,
            proposalStake:      0,
            timelockTarget:     address(0)
        });

        emit ProposalCreated(proposalId, proposer, ProposalType.EmergencyConfirm, docId, 0, endTime);
    }

    function _checkCooldown(address proposer, uint256 docId) internal view {
        uint256 cooldownEnd = _rejectionCooldowns[proposer][docId];
        if (block.timestamp < cooldownEnd)
            revert Gov__RejectionCooldown(proposer, docId, cooldownEnd);
    }

    function _checkNoActiveProposal(uint256 docId) internal view {
        uint256 active = _activeProposalForDoc[docId];
        if (active != 0)
            revert Gov__DocumentHasActiveProposal(docId, active);
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}
}
