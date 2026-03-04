// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IArchiveCouncil
/// @notice Archive Council (7-member ethics guardian committee) interface
/// @dev The committee only has veto power; it cannot proactively decide any content
interface IArchiveCouncil {

    enum CouncilMemberStatus { Active, Suspended, Resigned, Removed, Expired }

    struct CouncilMember {
        address memberAddress;
        uint256 guardianNFTId;
        uint256 termStart;
        uint256 termEnd;
        uint256 vetoCount;
        CouncilMemberStatus status;
    }

    struct VetoRecord {
        uint256 proposalId;
        address[] vetoers;
        string reason;
        uint256 timestamp;
    }

    struct Election {
        uint256 id;
        uint256 startTime;
        uint256 endTime;
        address[] candidates;
        bool executed;
    }

    function veto(uint256 proposalId, string calldata reason) external;
    function approve(uint256 proposalId) external;
    function initiateElection(address[] calldata candidates) external returns (uint256 electionId);
    function voteInElection(uint256 electionId, address candidate) external;
    function executeElection(uint256 electionId) external;
    function resign() external;
    function removeMember(address member, string calldata reason) external;
    function suspendMember(address member) external;

    function getCouncilMembers() external view returns (CouncilMember[] memory);
    function isActiveMember(address addr) external view returns (bool);
    function getVetoStatus(uint256 proposalId) external view returns (uint256 vetoCount, bool vetoed);
    function getVetoRecord(uint256 proposalId) external view returns (VetoRecord memory);
    function getElection(uint256 electionId) external view returns (Election memory);
    function getElectionVotes(uint256 electionId, address candidate) external view returns (uint256 votes);
    function vetoThreshold() external view returns (uint256);

    event VetoCast(uint256 indexed proposalId, address indexed member, string reason, uint256 currentVetoCount, uint256 threshold);
    event ProposalVetoed(uint256 indexed proposalId, address[] vetoers, string reason, uint256 timestamp);
    event ProposalApproved(uint256 indexed proposalId, address indexed member);
    event ElectionInitiated(uint256 indexed electionId, address[] candidates, uint256 startTime, uint256 endTime);
    event ElectionVoteCast(uint256 indexed electionId, address indexed voter, address indexed candidate, uint256 votingPower);
    event ElectionExecuted(uint256 indexed electionId, address[] newMembers);
    event MemberRemoved(address indexed member, string reason, uint256 timestamp);
    event MemberResigned(address indexed member, uint256 timestamp);

    error Council__NotActiveMember(address caller);
    error Council__AlreadyVetoed(address member, uint256 proposalId);
    error Council__VetoWindowClosed(uint256 proposalId);
    error Council__ElectionNotFound(uint256 electionId);
    error Council__ElectionStillActive(uint256 electionId);
    error Council__AlreadyVotedInElection(address voter);
    error Council__InvalidCandidateCount(uint256 count, uint256 required);
}
