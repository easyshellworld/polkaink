// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IGovernanceCore v2
/// @notice Stake-weighted governance with OG Gold veto
interface IGovernanceCore {

    enum ProposalType { VersionUpdate, UpgradeContract, ParameterChange }

    enum ProposalStatus { Active, Approved, Rejected, Vetoed, Executed, Cancelled }

    struct Proposal {
        uint256 id;
        ProposalType proposalType;
        address proposer;
        uint256 docId;
        uint256 targetVersionId;
        int256  score;          // Σ(vote_i × weight_i), scaled 1e18
        uint256 startTime;
        uint256 endTime;
        ProposalStatus status;
        bytes   callData;
        string  description;
        bool    goldVetoed;
        uint256 noVoterCount;
    }

    enum VoteChoice { Yes, No, Abstain }

    struct VoteRecord {
        bool       hasVoted;
        VoteChoice choice;
        uint256    weight;
        uint256    timestamp;
    }

    function createProposal(
        ProposalType proposalType,
        uint256 docId,
        uint256 targetVersionId,
        bytes calldata callData,
        string calldata description
    ) external returns (uint256 proposalId);

    function createProposalFor(
        address proposer,
        ProposalType proposalType,
        uint256 docId,
        uint256 targetVersionId,
        bytes calldata callData,
        string calldata description
    ) external returns (uint256 proposalId);

    function vote(uint256 proposalId, VoteChoice choice) external;
    function cancelProposal(uint256 proposalId) external;
    function finalizeProposal(uint256 proposalId) external;
    function executeProposal(uint256 proposalId) external;

    function setVotingPeriod(uint256 period) external;
    function getVotingPeriod() external view returns (uint256);
    function getProposal(uint256 proposalId) external view returns (Proposal memory);
    function getVoteRecord(uint256 proposalId, address voter) external view returns (VoteRecord memory);
    function getVotingWeight(address voter, uint256 docId) external view returns (uint256 weight);
    function totalProposals() external view returns (uint256);
    function listProposals(ProposalStatus filter, uint256 offset, uint256 limit)
        external view returns (Proposal[] memory, uint256 total);

    event ProposalCreated(uint256 indexed proposalId, address indexed proposer,
        ProposalType proposalType, uint256 indexed docId, uint256 startTime, uint256 endTime);
    event VoteCast(uint256 indexed proposalId, address indexed voter,
        VoteChoice choice, uint256 weight);
    event ProposalFinalized(uint256 indexed proposalId, ProposalStatus status, int256 score);
    event ProposalExecuted(uint256 indexed proposalId);
    event GoldVeto(uint256 indexed proposalId, address indexed goldHolder);
    event ProposalCancelled(uint256 indexed proposalId, address cancelledBy);

    error Gov__NotActiveMember(address caller);
    error Gov__ProposalNotFound(uint256 proposalId);
    error Gov__ProposalNotActive(uint256 proposalId);
    error Gov__AlreadyVoted(address voter, uint256 proposalId);
    error Gov__VotingNotEnded(uint256 proposalId);
    error Gov__VotingEnded(uint256 proposalId);
    error Gov__NotProposer(address caller);
    error Gov__AlreadyFinalized(uint256 proposalId);
    error Gov__NotApproved(uint256 proposalId);
    error Gov__Unauthorized();
}
