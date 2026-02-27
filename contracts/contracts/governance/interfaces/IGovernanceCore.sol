// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IGovernanceCore
/// @notice Governance voting core interface: manages proposal lifecycle and voting power calculation
interface IGovernanceCore {

    enum ProposalType {
        VersionUpdate,
        UpgradeContract,
        ParameterChange,
        CouncilElection,
        EmergencyVeto,
        TreasurySpend
    }

    enum ProposalStatus {
        Pending,
        Active,
        Passed,
        TimelockQueued,
        Executed,
        Rejected,
        Vetoed,
        Cancelled,
        Expired
    }

    struct Proposal {
        uint256 id;
        ProposalType proposalType;
        address proposer;
        uint256 docId;
        uint256 targetVersionId;
        uint256 stakeAmount;
        uint256 yesVotes;
        uint256 noVotes;
        uint256 abstainVotes;
        uint256 totalVotingPower;
        uint256 snapshotBlock;
        uint256 startTime;
        uint256 endTime;
        ProposalStatus status;
        bytes callData;
        string description;
        bytes32 timelockId;
    }

    struct VoteRecord {
        bool hasVoted;
        bool support;
        bool abstain;
        uint256 votingPower;
        uint256 timestamp;
    }

    struct GovernanceParams {
        uint256 minStake;
        uint256 votingPeriod;
        uint256 timelockDelay;
        uint256 quorumNumerator;
        uint256 passingThreshold;
        uint256 superMajority;
        uint256 nftVoteMultiplier;
        uint256 guardianVoteMultiplier;
        uint256 slashRatioNormal;
        uint256 slashRatioVeto;
        uint256 maxTagsPerDoc;
        uint256 lockBonus30d;
        uint256 lockBonus90d;
        uint256 lockBonus180d;
    }

    function createProposal(
        ProposalType proposalType,
        uint256 docId,
        uint256 targetVersionId,
        bytes calldata callData,
        string calldata description
    ) external payable returns (uint256 proposalId);

    function vote(uint256 proposalId, bool support, bool abstain, uint256 lockDays) external;
    function cancelProposal(uint256 proposalId) external;
    function queueProposal(uint256 proposalId) external;
    function executeProposal(uint256 proposalId) external;

    function proposeUpgrade(
        string calldata contractName,
        address newImplementation,
        string calldata description
    ) external payable returns (uint256 proposalId);

    function getProposal(uint256 proposalId) external view returns (Proposal memory);
    function getProposalStatus(uint256 proposalId) external view returns (ProposalStatus);
    function getVoteRecord(uint256 proposalId, address voter) external view returns (VoteRecord memory);
    function getVotingPower(address voter, uint256 snapshotBlock) external view returns (uint256 power);
    function getGovernanceParams() external view returns (GovernanceParams memory);
    function totalProposals() external view returns (uint256);
    function listProposals(ProposalStatus statusFilter, uint256 offset, uint256 limit) external view returns (Proposal[] memory proposals, uint256 total);
    function checkPassed(uint256 proposalId) external view returns (bool passed, string memory reason);

    // For ArchiveCouncil to mark vetoed
    function markVetoed(uint256 proposalId) external;

    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, ProposalType proposalType, uint256 indexed docId, uint256 stakeAmount, uint256 startTime, uint256 endTime);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, bool abstain, uint256 votingPower, uint256 lockDays);
    event ProposalQueued(uint256 indexed proposalId, bytes32 timelockId, uint256 executeAfter);
    event ProposalExecuted(uint256 indexed proposalId, uint256 timestamp);
    event ProposalRejected(uint256 indexed proposalId, uint256 yesVotes, uint256 noVotes, uint256 totalVotingPower);
    event ProposalCancelled(uint256 indexed proposalId, address cancelledBy);
    event StakeSlashed(uint256 indexed proposalId, address indexed proposer, uint256 slashedAmount, string reason);
    event GovernanceParamsUpdated(GovernanceParams oldParams, GovernanceParams newParams);

    error Gov__ProposalNotFound(uint256 proposalId);
    error Gov__ProposalNotActive(uint256 proposalId, ProposalStatus status);
    error Gov__AlreadyVoted(address voter, uint256 proposalId);
    error Gov__VotingEnded(uint256 proposalId);
    error Gov__QuorumNotReached(uint256 actual, uint256 required);
    error Gov__ThresholdNotMet(uint256 yesPercent, uint256 required);
    error Gov__TimelockPending(bytes32 timelockId);
    error Gov__NotProposer(address caller, address proposer);
    error Gov__InvalidProposalType();
}
