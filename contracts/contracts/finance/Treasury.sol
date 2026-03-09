// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/ITreasury.sol";
import "../libraries/VotingMath.sol";

/// @title Treasury v3.4
/// @notice DAO treasury: rewardPool, Epoch rewards, fixed Council allowance, open donations.
///         Anyone can donate via depositRewardPool() or direct transfer.
///
/// v3.4 fix: 30% voter share is now actually allocated to _pendingRewards during finalizeEpoch().
///   - GovernanceCore calls recordEpochVoterWeight(epochId, voter, weight) on each vote
///   - distributeProposerReward() deducts both proposerShare AND voterShare from rewardPool
///   - finalizeEpoch() distributes voterShare proportionally by weight into _pendingRewards
contract Treasury is
    Initializable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    ITreasury
{
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant COUNCIL_ROLE    = keccak256("COUNCIL_ROLE");
    bytes32 public constant SPEND_ROLE      = keccak256("SPEND_ROLE");
    bytes32 public constant UPGRADER_ROLE   = keccak256("UPGRADER_ROLE");

    // MVP test values (replace with production values before mainnet deploy)
    uint256 public constant EPOCH_DURATION               = 3600;           // MVP: 1 hour (prod: 30 days)
    uint256 public constant PROPOSER_SHARE_BPS           = 5000;           // 50%
    uint256 public constant VOTER_SHARE_BPS              = 3000;           // 30%
    uint256 public constant RESERVE_BPS                  = 2000;           // 20%
    uint256 public constant COUNCIL_ALLOWANCE_PER_MEMBER = 5 ether;        // 5 PAS
    uint256 public constant EPOCH_MIN_PARTICIPATION_BPS  = 5000;           // 50%

    uint256 private _rewardPool;
    uint256 private _reservedRewards;
    uint256 private _epochStartTime;

    mapping(uint256 => EpochRecord)            private _epochRecords;
    mapping(uint256 => mapping(address => uint256)) private _pendingRewards; // epochId => voter => claimable amount
    mapping(uint256 => mapping(address => bool))    private _allowanceClaimed; // epochId => member => claimed

    // Epoch voter weight tracking (for proportional reward distribution)
    mapping(uint256 => address[])              private _epochVoters;         // epochId => voter addresses
    mapping(uint256 => mapping(address => uint256)) private _epochVoterWeight; // epochId => voter => accumulated weight
    mapping(uint256 => uint256)                private _epochTotalVoterWeight; // epochId => total weight
    mapping(uint256 => uint256)                private _epochEligibleProposalCount; // epochId => valid proposal count
    mapping(uint256 => mapping(uint256 => bool)) private _epochProposalCounted; // epochId => proposalId => counted
    mapping(uint256 => mapping(address => uint256)) private _epochVoterParticipationCount; // epochId => voter => voted proposals
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) private _epochProposalVoted; // epochId => proposalId => voter => voted

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address admin) external initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();
_grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        _epochStartTime = block.timestamp;
    }

    // ─── Open Donations ───────────────────────────────────────────────────

    receive() external payable {
        _rewardPool += msg.value;
        emit RewardPoolDeposited(msg.sender, msg.value);
    }

    function depositRewardPool() external payable {
        _rewardPool += msg.value;
        emit RewardPoolDeposited(msg.sender, msg.value);
    }

    // ─── Reward Distribution ──────────────────────────────────────────────

    /// @inheritdoc ITreasury
    function distributeProposerReward(
        address proposer,
        uint256 proposalId,
        uint256 voterCount
    ) external onlyRole(GOVERNANCE_ROLE) nonReentrant returns (uint256 rewardPaid) {
        uint256 availablePool = _availableRewardPool();
        uint256 reward = VotingMath.calculateProposalReward(voterCount, availablePool);
        if (reward == 0) {
            emit RewardSkippedInsufficientPool(proposalId, _rewardPool);
            return 0;
        }

        uint256 proposerShare = (reward * PROPOSER_SHARE_BPS) / 10_000;
        uint256 voterShare    = (reward * VOTER_SHARE_BPS)    / 10_000;
        // Reserve portion (20%) remains in rewardPool implicitly

        // Pay proposer now, reserve voter share until epoch finalization.
        _rewardPool      -= proposerShare;
        _reservedRewards += voterShare;

        // Record voter share for current epoch
        uint256 epochId = _currentEpochId();
        EpochRecord storage ep = _epochRecords[epochId];
        ep.epochId          = epochId;
        ep.startTime        = _epochStartTime + epochId * EPOCH_DURATION;
        ep.endTime          = ep.startTime + EPOCH_DURATION;
        ep.totalVoterReward += voterShare;
        ep.proposalCount    += 1;

        // Send proposer reward immediately
        (bool ok,) = proposer.call{value: proposerShare}("");
        require(ok, "Treasury: proposer transfer failed");

        rewardPaid = proposerShare;
        emit ProposerRewarded(proposer, proposalId, proposerShare, voterCount);
    }

    /// @notice GovernanceCore calls this on each vote to record voter weight for epoch reward tracking
    /// @dev GOVERNANCE_ROLE only. Deduplication: if voter already recorded in this epoch, weight is added.
    function recordEpochVoterWeight(
        uint256 epochId,
        uint256 proposalId,
        address voter,
        uint256 weight
    ) external onlyRole(GOVERNANCE_ROLE) {
        if (!_epochProposalCounted[epochId][proposalId]) {
            _epochProposalCounted[epochId][proposalId] = true;
            _epochEligibleProposalCount[epochId] += 1;
        }
        if (!_epochProposalVoted[epochId][proposalId][voter]) {
            _epochProposalVoted[epochId][proposalId][voter] = true;
            _epochVoterParticipationCount[epochId][voter] += 1;
        }
        if (_epochVoterWeight[epochId][voter] == 0) {
            // First time this voter votes in this epoch — add to list
            _epochVoters[epochId].push(voter);
        }
        _epochVoterWeight[epochId][voter] += weight;
        _epochTotalVoterWeight[epochId]   += weight;
    }

    function finalizeEpoch(uint256 epochId) external {
        EpochRecord storage ep = _epochRecords[epochId];
        uint256 epochEnd = _epochStartTime + (epochId + 1) * EPOCH_DURATION;
        if (block.timestamp < epochEnd)
            revert Treasury__EpochNotEnded(epochId, epochEnd);
        if (ep.finalized)
            revert Treasury__EpochAlreadyFinalized(epochId);

        ep.finalized = true;

        // Distribute voter share proportionally by accumulated vote weight
        uint256 totalVoterReward = ep.totalVoterReward;
        uint256 totalWeight      = _epochTotalVoterWeight[epochId];
        uint256 proposalCount    = _epochEligibleProposalCount[epochId];
        uint256 requiredVotes    = proposalCount == 0
            ? 0
            : (proposalCount * EPOCH_MIN_PARTICIPATION_BPS + 9_999) / 10_000;

        uint256 distributed = 0;
        if (totalVoterReward > 0 && totalWeight > 0) {
            address[] storage voters = _epochVoters[epochId];
            uint256 len = voters.length;
            uint256 qualifiedWeight = 0;

            for (uint256 i = 0; i < len; i++) {
                address voter = voters[i];
                uint256 participated = _epochVoterParticipationCount[epochId][voter];
                if (requiredVotes > 0 && participated < requiredVotes) continue;
                qualifiedWeight += _epochVoterWeight[epochId][voter];
            }

            if (qualifiedWeight > 0) {
                for (uint256 i = 0; i < len; i++) {
                    address voter = voters[i];
                    uint256 participated = _epochVoterParticipationCount[epochId][voter];
                    if (requiredVotes > 0 && participated < requiredVotes) continue;
                    uint256 voterWeight = _epochVoterWeight[epochId][voter];
                    if (voterWeight == 0) continue;

                    uint256 share;
                    share = (totalVoterReward * voterWeight) / qualifiedWeight;
                    if (share > 0) {
                        _pendingRewards[epochId][voter] += share;
                        distributed += share;
                    }
                }

                // Allocate exact remainder to the last qualifying voter to avoid dust.
                if (distributed < totalVoterReward) {
                    for (uint256 i = len; i > 0; i--) {
                        address voter = voters[i - 1];
                        uint256 participated = _epochVoterParticipationCount[epochId][voter];
                        if (requiredVotes > 0 && participated < requiredVotes) continue;
                        _pendingRewards[epochId][voter] += (totalVoterReward - distributed);
                        distributed = totalVoterReward;
                        break;
                    }
                }
            }
        }

        if (totalVoterReward > 0) {
            require(_reservedRewards >= totalVoterReward, "Treasury: reserved underflow");
            _reservedRewards -= totalVoterReward;
            _reservedRewards += distributed;
        }

        emit EpochFinalized(epochId, totalVoterReward, ep.proposalCount);
    }

    function claimEpochReward(uint256 epochId) external nonReentrant {
        uint256 amount = _pendingRewards[epochId][msg.sender];
        if (amount == 0)
            revert Treasury__NothingToClaim(msg.sender, epochId);
        if (_rewardPool < amount)
            revert Treasury__InsufficientBalance(_rewardPool, amount);

        _pendingRewards[epochId][msg.sender] = 0;
        require(_reservedRewards >= amount, "Treasury: reserved underflow");
        _reservedRewards -= amount;
        _rewardPool -= amount;

        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "Treasury: claim transfer failed");

        emit EpochRewardClaimed(msg.sender, epochId, amount);
    }

    /// @inheritdoc ITreasury
    function distributeCouncilAllowance(
        address member,
        uint256 epochId
    ) external onlyRole(COUNCIL_ROLE) nonReentrant {
        require(!_allowanceClaimed[epochId][member], "Treasury: already claimed");

        uint256 amount = COUNCIL_ALLOWANCE_PER_MEMBER;
        uint256 available = _availableRewardPool();
        if (available < amount)
            revert Treasury__InsufficientBalance(available, amount);

        _rewardPool -= amount;
        (bool ok,) = member.call{value: amount}("");
        require(ok, "Treasury: allowance transfer failed");
        _allowanceClaimed[epochId][member] = true;

        emit CouncilAllowancePaid(member, epochId, amount);
    }

    function executeSpend(
        address payable to,
        uint256 amount,
        SpendCategory category,
        string calldata memo
    ) external onlyRole(SPEND_ROLE) nonReentrant {
        uint256 available = _availableRewardPool();
        if (available < amount)
            revert Treasury__InsufficientBalance(available, amount);

        _rewardPool -= amount;
        (bool ok,) = to.call{value: amount}("");
        require(ok, "Treasury: spend transfer failed");

        emit SpendExecuted(to, amount, category);
    }

    // ─── Read Operations ──────────────────────────────────────────────────

    function rewardPoolBalance() external view returns (uint256) {
        return _rewardPool;
    }

    function availableRewardPool() external view returns (uint256) {
        return _availableRewardPool();
    }

    function getEpochRecord(uint256 epochId) external view returns (EpochRecord memory) {
        return _epochRecords[epochId];
    }

    function pendingReward(address voter, uint256 epochId) external view returns (uint256) {
        return _pendingRewards[epochId][voter];
    }

    function epochStartTime() external view returns (uint256) {
        return _epochStartTime;
    }

    // ─── Internal ─────────────────────────────────────────────────────────

    function _currentEpochId() internal view returns (uint256) {
        return (block.timestamp - _epochStartTime) / EPOCH_DURATION;
    }

    function _availableRewardPool() internal view returns (uint256) {
        if (_rewardPool <= _reservedRewards) return 0;
        return _rewardPool - _reservedRewards;
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}
}
