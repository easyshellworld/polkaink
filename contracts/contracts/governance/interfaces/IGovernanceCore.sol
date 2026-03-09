// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IGovernanceCore v3.4
interface IGovernanceCore {

    enum ProposalType {
        VersionUpdate,
        UpgradeContract,
        ParameterChange,
        EmergencyConfirm
    }

    enum ProposalStatus {
        Active,
        Approved,
        CouncilVetoed,
        Rejected,
        Executed,
        Cancelled
    }

    struct Proposal {
        uint256        id;
        ProposalType   proposalType;
        address        proposer;
        uint256        docId;
        uint256        targetVersionId;
        uint256        parentVersionId;
        int256         score;
        uint256        totalVoteWeight;
        uint256        voterCount;
        uint256        snapshotTotalWeight;
        uint256        startTime;
        uint256        endTime;
        uint256        councilWindowEnd;
        ProposalStatus status;
        bytes          callData;
        string         description;
        uint256        proposalStake;
        address        timelockTarget;      // target contract for Timelock (UpgradeContract/ParameterChange)
    }

    enum VoteChoice { Yes, No, Abstain }

    struct VoteRecord {
        bool       hasVoted;
        VoteChoice choice;
        uint256    weight;
        uint256    timestamp;
    }

    function createProposalFor(address proposer, uint256 docId, uint256 targetVersionId, uint256 parentVersionId, string calldata description) external returns (uint256 proposalId);
    /// @dev msg.value must equal PROPOSAL_STAKE (5 PAS). timelockTarget is the contract address
    ///      the Timelock will call on execution (e.g. ProxyAdmin for upgrades).
    function createProposal(ProposalType proposalType, uint256 docId, uint256 targetVersionId, uint256 parentVersionId, address timelockTarget, bytes calldata callData, string calldata description) external payable returns (uint256 proposalId);
    function createEmergencyConfirm(uint256 docId, string calldata description) external returns (uint256 proposalId);
    function vote(uint256 proposalId, VoteChoice choice) external;
    function cancelProposal(uint256 proposalId) external;
    function finalizeProposal(uint256 proposalId) external;
    function executeProposal(uint256 proposalId) external;
    function markCouncilVetoed(uint256 proposalId) external;
    function setArchiveCouncil(address council) external;

    function getProposal(uint256 id) external view returns (Proposal memory);
    function getVoteRecord(uint256 proposalId, address voter) external view returns (VoteRecord memory);
    function getVotingWeight(address voter) external view returns (uint256);
    function totalProposals() external view returns (uint256);
    function listProposals(ProposalStatus filter, uint256 offset, uint256 limit) external view returns (Proposal[] memory proposals, uint256 total);

    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, ProposalType proposalType, uint256 indexed docId, uint256 parentVersionId, uint256 endTime);
    event VoteCast(uint256 indexed proposalId, address indexed voter, VoteChoice choice, uint256 weight);
    event ProposalFinalized(uint256 indexed proposalId, ProposalStatus status, int256 score, uint256 participationBps);
    event ProposalExecuted(uint256 indexed proposalId, uint256 rewardAmount);
    event RewardSkipped(uint256 indexed proposalId, uint256 poolBalance);
    event CouncilWindowOpened(uint256 indexed proposalId, uint256 windowEnd);

    error Gov__NotActiveMember(address caller);
    error Gov__ProposalNotFound(uint256 proposalId);
    error Gov__ProposalNotActive(uint256 proposalId);
    error Gov__AlreadyVoted(address voter, uint256 proposalId);
    error Gov__VotingNotEnded(uint256 proposalId);
    error Gov__CouncilWindowNotClosed(uint256 proposalId, uint256 windowEnd);
    error Gov__NotProposer(address caller);
    error Gov__InsufficientStake(uint256 required, uint256 provided);
    error Gov__RejectionCooldown(address proposer, uint256 docId, uint256 cooldownEnd);
    error Gov__DocumentHasActiveProposal(uint256 docId, uint256 activeProposalId);
    error Gov__InvalidParentVersion(uint256 provided, uint256 expected);
    error Gov__MergeBlockedByFrozen(uint256 docId);
}
