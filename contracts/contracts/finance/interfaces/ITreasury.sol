// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ITreasury {

    enum SpendCategory {
        ProposerReward,
        VoterEpochReward,
        Reserve,
        CouncilAllowance,
        ProtocolOps
    }

    struct EpochRecord {
        uint256 epochId;
        uint256 startTime;
        uint256 endTime;
        uint256 totalVoterReward;
        uint256 proposalCount;
        bool    finalized;
    }

    /// @notice Anyone can call; deposits into rewardPool
    receive() external payable;
    function depositRewardPool() external payable;

    /// @notice GovernanceCore calls this for VersionUpdate proposals (GOVERNANCE_ROLE)
    /// @dev If rewardPool < BASE_REWARD, skip internally; do not revert
    function distributeProposerReward(
        address proposer,
        uint256 proposalId,
        uint256 voterCount
    ) external returns (uint256 rewardPaid);

    function finalizeEpoch(uint256 epochId) external;
    function claimEpochReward(uint256 epochId) external;

    /// @notice GovernanceCore calls this on each vote cast for VersionUpdate proposals
    ///         to accumulate voter weights for proportional epoch reward distribution.
    ///         GOVERNANCE_ROLE only.
    function recordEpochVoterWeight(uint256 epochId, address voter, uint256 weight) external;

    /// @notice ArchiveCouncil calls this to pay fixed council allowance (COUNCIL_ROLE)
    function distributeCouncilAllowance(address member, uint256 epochId) external;

    function executeSpend(
        address payable to,
        uint256 amount,
        SpendCategory category,
        string calldata memo
    ) external; // SPEND_ROLE

    // ─── Read Operations ───
    function rewardPoolBalance() external view returns (uint256);
    function getEpochRecord(uint256 epochId) external view returns (EpochRecord memory);
    function pendingReward(address voter, uint256 epochId) external view returns (uint256);
    function epochStartTime() external view returns (uint256);

    // EPOCH_DURATION                = 30 days     / 1 hour (MVP)
    // PROPOSER_SHARE_BPS            = 5000  (50%)
    // VOTER_SHARE_BPS               = 3000  (30%)
    // RESERVE_BPS                   = 2000  (20%)
    // COUNCIL_ALLOWANCE_PER_MEMBER  = 5e18  (5 PAS)
    // TIMELOCK_DELAY                = 48 hours / 2 minutes (MVP)

    event RewardPoolDeposited(address indexed from, uint256 amount);
    event ProposerRewarded(address indexed proposer, uint256 indexed proposalId, uint256 amount, uint256 voterCount);
    event RewardSkippedInsufficientPool(uint256 indexed proposalId, uint256 poolBalance);
    event EpochFinalized(uint256 indexed epochId, uint256 totalVoterReward, uint256 voterCount);
    event EpochRewardClaimed(address indexed voter, uint256 indexed epochId, uint256 amount);
    event CouncilAllowancePaid(address indexed member, uint256 indexed epochId, uint256 amount);
    event SpendExecuted(address indexed to, uint256 amount, SpendCategory category);

    error Treasury__InsufficientBalance(uint256 available, uint256 required);
    error Treasury__EpochNotEnded(uint256 epochId, uint256 endTime);
    error Treasury__EpochAlreadyFinalized(uint256 epochId);
    error Treasury__NothingToClaim(address voter, uint256 epochId);
}
