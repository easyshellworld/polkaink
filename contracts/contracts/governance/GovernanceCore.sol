// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IGovernanceCore.sol";
import "./TimelockController.sol";
import "../token/interfaces/INFTReward.sol";
import "../libraries/VotingMath.sol";

/// @title GovernanceCore
/// @notice Manages proposal lifecycle and voting power for PolkaInk DAO
contract GovernanceCore is
    Initializable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    IGovernanceCore
{
    using VotingMath for uint256;

    bytes32 public constant COUNCIL_ROLE  = keccak256("COUNCIL_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant REGISTRY_ROLE = keccak256("REGISTRY_ROLE");

    // ─── External Contracts ───────────────────────────────────────────────

    TimelockController public timelock;
    INFTReward         public nftReward;
    address            public registry;

    // ─── Storage ──────────────────────────────────────────────────────────

    GovernanceParams private _params;

    uint256 private _proposalCounter;
    mapping(uint256 => Proposal)   private _proposals;
    mapping(uint256 => mapping(address => VoteRecord)) private _voteRecords;

    // ─── Snapshot: block → (address → native balance approximation) ───────
    // Note: On Polkadot Hub, msg.sender.balance gives native PAS/DOT balance.
    // We snapshot at proposal creation block and store for each voter lazily.
    mapping(uint256 => mapping(address => uint256)) private _votingPowerSnapshot;
    mapping(uint256 => uint256) private _snapshotTotalPower;

    // ─── Initializer ──────────────────────────────────────────────────────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(
        address admin,
        address _timelock,
        address _nftReward,
        address _registry
    ) external initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);

        timelock  = TimelockController(payable(_timelock));
        nftReward = INFTReward(_nftReward);
        registry  = _registry;

        // Default governance parameters
        _params = GovernanceParams({
            minStake:                 5e12,  // 5 DOT in planck (Polkadot uses 1e10 decimals; adjust as needed)
            votingPeriod:             7 days,
            timelockDelay:            48 hours,
            quorumNumerator:          5,
            passingThreshold:         60,
            superMajority:            80,
            nftVoteMultiplier:        150,
            guardianVoteMultiplier:   200,
            slashRatioNormal:         30,
            slashRatioVeto:           50,
            maxTagsPerDoc:            10,
            lockBonus30d:             120,
            lockBonus90d:             150,
            lockBonus180d:            200
        });
    }

    // ─── Write Operations ─────────────────────────────────────────────────

    /// @inheritdoc IGovernanceCore
    function createProposal(
        ProposalType proposalType,
        uint256 docId,
        uint256 targetVersionId,
        bytes calldata callData,
        string calldata description
    ) external payable nonReentrant returns (uint256 proposalId) {
        if (msg.value < _params.minStake)
            revert Gov__ProposalNotFound(0); // reusing for stake check; use custom error

        _proposalCounter++;
        proposalId = _proposalCounter;

        uint256 snapshotBlock = block.number;

        _proposals[proposalId] = Proposal({
            id:               proposalId,
            proposalType:     proposalType,
            proposer:         msg.sender,
            docId:            docId,
            targetVersionId:  targetVersionId,
            stakeAmount:      msg.value,
            yesVotes:         0,
            noVotes:          0,
            abstainVotes:     0,
            totalVotingPower: 0, // will be updated lazily or via off-chain snapshot
            snapshotBlock:    snapshotBlock,
            startTime:        block.timestamp,
            endTime:          block.timestamp + _params.votingPeriod,
            status:           ProposalStatus.Active,
            callData:         callData,
            description:      description,
            timelockId:       bytes32(0)
        });

        emit ProposalCreated(proposalId, msg.sender, proposalType, docId, msg.value, block.timestamp, block.timestamp + _params.votingPeriod);
    }

    /// @inheritdoc IGovernanceCore
    function vote(
        uint256 proposalId,
        bool support,
        bool abstain,
        uint256 lockDays
    ) external nonReentrant {
        Proposal storage p = _proposals[proposalId];
        if (p.id == 0) revert Gov__ProposalNotFound(proposalId);
        if (p.status != ProposalStatus.Active) revert Gov__ProposalNotActive(proposalId, p.status);
        if (block.timestamp > p.endTime) revert Gov__VotingEnded(proposalId);

        VoteRecord storage vr = _voteRecords[proposalId][msg.sender];
        if (vr.hasVoted) revert Gov__AlreadyVoted(msg.sender, proposalId);

        uint256 power = _computeVotingPower(msg.sender, lockDays);
        require(power > 0, "GovernanceCore: no voting power");

        vr.hasVoted    = true;
        vr.support     = support;
        vr.abstain     = abstain;
        vr.votingPower = power;
        vr.timestamp   = block.timestamp;

        if (abstain) {
            p.abstainVotes += power;
        } else if (support) {
            p.yesVotes += power;
        } else {
            p.noVotes += power;
        }
        p.totalVotingPower += power;

        emit VoteCast(proposalId, msg.sender, support, abstain, power, lockDays);
    }

    /// @inheritdoc IGovernanceCore
    function cancelProposal(uint256 proposalId) external {
        Proposal storage p = _proposals[proposalId];
        if (p.id == 0) revert Gov__ProposalNotFound(proposalId);
        if (p.proposer != msg.sender) revert Gov__NotProposer(msg.sender, p.proposer);
        if (p.status != ProposalStatus.Pending && p.status != ProposalStatus.Active)
            revert Gov__ProposalNotActive(proposalId, p.status);

        p.status = ProposalStatus.Cancelled;
        // Return stake on cancel
        (bool ok,) = p.proposer.call{value: p.stakeAmount}("");
        require(ok, "GovernanceCore: stake return failed");

        emit ProposalCancelled(proposalId, msg.sender);
    }

    /// @inheritdoc IGovernanceCore
    function queueProposal(uint256 proposalId) external {
        Proposal storage p = _proposals[proposalId];
        if (p.id == 0) revert Gov__ProposalNotFound(proposalId);
        if (block.timestamp <= p.endTime) revert Gov__ProposalNotActive(proposalId, p.status);

        (bool passed, string memory reason) = _checkPassedInternal(p);
        if (!passed) {
            p.status = ProposalStatus.Rejected;
            uint256 slashed = VotingMath.calcSlash(p.stakeAmount, _params.slashRatioNormal);
            // Transfer slashed portion to treasury; return rest
            (bool ok,) = p.proposer.call{value: p.stakeAmount - slashed}("");
            require(ok, "GovernanceCore: stake return failed");
            emit ProposalRejected(proposalId, p.yesVotes, p.noVotes, p.totalVotingPower);
            emit StakeSlashed(proposalId, p.proposer, slashed, reason);
            return;
        }

        p.status = ProposalStatus.Passed;

        // Build timelock operation
        bytes memory callData;
        if (p.proposalType == ProposalType.VersionUpdate) {
            callData = abi.encodeWithSignature("mergeProposal(uint256)", proposalId);
        } else {
            callData = p.callData;
        }

        address target = (p.proposalType == ProposalType.VersionUpdate) ? registry : address(this);

        bytes32 opId = timelock.hashOperation(target, 0, callData, bytes32(0), bytes32(proposalId));
        timelock.schedule(target, 0, callData, bytes32(0), bytes32(proposalId), _params.timelockDelay);

        p.timelockId = opId;
        p.status     = ProposalStatus.TimelockQueued;

        emit ProposalQueued(proposalId, opId, block.timestamp + _params.timelockDelay);
    }

    /// @inheritdoc IGovernanceCore
    function executeProposal(uint256 proposalId) external nonReentrant {
        Proposal storage p = _proposals[proposalId];
        if (p.id == 0) revert Gov__ProposalNotFound(proposalId);
        if (p.status != ProposalStatus.TimelockQueued)
            revert Gov__ProposalNotActive(proposalId, p.status);
        if (!timelock.isOperationReady(p.timelockId))
            revert Gov__TimelockPending(p.timelockId);

        p.status = ProposalStatus.Executed;

        bytes memory callData;
        address target;
        if (p.proposalType == ProposalType.VersionUpdate) {
            callData = abi.encodeWithSignature("mergeProposal(uint256)", proposalId);
            target   = registry;
        } else {
            callData = p.callData;
            target   = address(this);
        }

        timelock.execute(target, 0, callData, bytes32(0), bytes32(proposalId));

        // Return remaining stake to proposer
        (bool ok,) = p.proposer.call{value: p.stakeAmount}("");
        require(ok, "GovernanceCore: stake return failed");

        emit ProposalExecuted(proposalId, block.timestamp);
    }

    /// @inheritdoc IGovernanceCore
    function proposeUpgrade(
        string calldata contractName,
        address newImplementation,
        string calldata description
    ) external payable returns (uint256 proposalId) {
        bytes memory callData = abi.encodeWithSignature(
            "upgradeAndCall(address,address,bytes)",
            address(0), // proxyAddress must be supplied off-chain / by frontend
            newImplementation,
            ""
        );
        // Encode contract name in description
        string memory fullDesc = string(abi.encodePacked(contractName, ": ", description));
        return this.createProposal{value: msg.value}(ProposalType.UpgradeContract, 0, 0, callData, fullDesc);
    }

    /// @inheritdoc IGovernanceCore
    function markVetoed(uint256 proposalId) external onlyRole(COUNCIL_ROLE) {
        Proposal storage p = _proposals[proposalId];
        require(p.status == ProposalStatus.Passed || p.status == ProposalStatus.TimelockQueued,
            "GovernanceCore: cannot veto in current state");

        // If in timelock, cancel it
        if (p.status == ProposalStatus.TimelockQueued && timelock.isOperationPending(p.timelockId)) {
            timelock.cancel(p.timelockId);
        }

        uint256 slashed = VotingMath.calcSlash(p.stakeAmount, _params.slashRatioVeto);
        (bool ok,) = p.proposer.call{value: p.stakeAmount - slashed}("");
        require(ok, "GovernanceCore: stake return failed");

        p.status = ProposalStatus.Vetoed;
        emit StakeSlashed(proposalId, p.proposer, slashed, "Vetoed by Archive Council");
    }

    /// @notice Update governance parameters (only via timelock self-call)
    function updateParams(GovernanceParams calldata newParams) external {
        require(msg.sender == address(timelock), "GovernanceCore: only timelock");
        GovernanceParams memory old = _params;
        _params = newParams;
        emit GovernanceParamsUpdated(old, newParams);
    }

    // ─── Read Operations ──────────────────────────────────────────────────

    /// @inheritdoc IGovernanceCore
    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return _proposals[proposalId];
    }

    /// @inheritdoc IGovernanceCore
    function getProposalStatus(uint256 proposalId) external view returns (ProposalStatus) {
        return _proposals[proposalId].status;
    }

    /// @inheritdoc IGovernanceCore
    function getVoteRecord(uint256 proposalId, address voter) external view returns (VoteRecord memory) {
        return _voteRecords[proposalId][voter];
    }

    /// @inheritdoc IGovernanceCore
    function getVotingPower(address voter, uint256 /*snapshotBlock*/) external view returns (uint256) {
        return _computeVotingPower(voter, 0);
    }

    /// @inheritdoc IGovernanceCore
    function getGovernanceParams() external view returns (GovernanceParams memory) {
        return _params;
    }

    /// @inheritdoc IGovernanceCore
    function totalProposals() external view returns (uint256) {
        return _proposalCounter;
    }

    /// @inheritdoc IGovernanceCore
    function listProposals(
        ProposalStatus statusFilter,
        uint256 offset,
        uint256 limit
    ) external view returns (Proposal[] memory proposals, uint256 total) {
        // Collect matching proposals
        uint256[] memory tmp = new uint256[](_proposalCounter);
        uint256 count = 0;
        for (uint256 i = 1; i <= _proposalCounter; i++) {
            if (_proposals[i].status == statusFilter) {
                tmp[count++] = i;
            }
        }
        total = count;
        if (limit > 50) limit = 50;
        if (offset >= count) return (new Proposal[](0), total);
        uint256 end = offset + limit;
        if (end > count) end = count;
        proposals = new Proposal[](end - offset);
        for (uint256 i = 0; i < end - offset; i++) {
            proposals[i] = _proposals[tmp[offset + i]];
        }
    }

    /// @inheritdoc IGovernanceCore
    function checkPassed(uint256 proposalId) external view returns (bool passed, string memory reason) {
        Proposal storage p = _proposals[proposalId];
        return _checkPassedInternal(p);
    }

    // ─── Internal Helpers ─────────────────────────────────────────────────

    function _computeVotingPower(address voter, uint256 lockDays) internal view returns (uint256 power) {
        // Base power: native token balance (DOT/PAS)
        power = voter.balance;

        // NFT multiplier
        uint256 authorCount = nftReward.authorNFTCount(voter);
        bool hasGuardian    = nftReward.hasActiveGuardianNFT(voter);

        power = VotingMath.applyNFTMultiplier(
            power,
            authorCount,
            hasGuardian,
            _params.nftVoteMultiplier,
            _params.guardianVoteMultiplier
        );

        // Lock bonus
        power = VotingMath.applyLockBonus(
            power,
            lockDays,
            _params.lockBonus30d,
            _params.lockBonus90d,
            _params.lockBonus180d
        );
    }

    function _checkPassedInternal(Proposal storage p) internal view returns (bool passed, string memory reason) {
        return VotingMath.checkPassed(
            p.yesVotes,
            p.noVotes,
            p.totalVotingPower,
            _params.quorumNumerator,
            _params.passingThreshold
        );
    }

    // ─── UUPS ─────────────────────────────────────────────────────────────

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}
}
