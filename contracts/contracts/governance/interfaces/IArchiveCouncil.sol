// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IArchiveCouncil v3.3
/// @notice Genesis 7 members written in constructor; no replacement before Phase 1.
///         No setMember(), no acknowledgeProposal().
///         Council allowance is unconditionally paid every Epoch.
interface IArchiveCouncil {

    enum VetoReason {
        FalseHistory,
        MaliciousUpgrade,
        LegalRisk,
        HateSpeech
    }

    struct VetoRecord {
        uint256    proposalId;
        address[]  vetoVoters;
        uint256    vetoTime;
        VetoReason reason;
        string     description; // >= 50 bytes, permanently on-chain
    }

    struct FreezeRecord {
        uint256    docId;
        address[]  freezeVoters;
        uint256    freezeTime;
        uint256    confirmDeadline; // 72h DAO confirmation deadline
        VetoReason reason;
        string     description;
        bool       confirmed;
        bool       autoUnfrozen;
    }

    struct CouncilVoteRecord {
        bool    hasVoted;
        bool    isAgainst;
        uint256 timestamp;
    }

    // ─── Veto ───

    /// @notice Council member casts veto on an Approved proposal (within 24h window)
    function castVeto(
        uint256    proposalId,
        VetoReason reason,
        string calldata description
    ) external;

    // ─── Emergency Freeze ───

    /// @notice Council member votes for emergency freeze on an active document
    function castEmergencyFreeze(
        uint256    docId,
        VetoReason reason,
        string calldata description
    ) external;

    /// @notice Anyone can call: check if emergency freeze confirmation expired; auto-unfreeze if so
    function checkAndAutoUnfreeze(uint256 docId) external;
    /// @notice GovernanceCore marks a freeze as DAO-confirmed after EmergencyConfirm execution
    function confirmEmergencyFreeze(uint256 docId) external;

    // ─── Council Allowance (v3.3: unconditional) ───

    /// @notice Council member claims fixed allowance after Epoch ends
    /// @dev No participation requirement; 5 PAS per member per Epoch
    /// @param epochId Target Epoch ID
    function claimCouncilAllowance(uint256 epochId) external;

    // ─── Governance Migration ───

    /// @notice Transfer Council control to election contract (irreversible, triggered by DAO proposal)
    /// @dev vetoThreshold automatically drops to 4/7 after call
    function transferControlToElection(address electionContract) external;

    // ─── Read Operations ───

    function getMembers() external view returns (address[] memory);
    function isMember(address addr) external view returns (bool);
    function vetoThreshold() external view returns (uint256);
    function getVetoRecord(uint256 proposalId) external view returns (VetoRecord memory);
    function getFreezeRecord(uint256 docId) external view returns (FreezeRecord memory);
    function getCouncilVote(uint256 proposalId, address member) external view returns (CouncilVoteRecord memory);
    function isControlTransferred() external view returns (bool);
    function isAllowanceClaimed(address member, uint256 epochId) external view returns (bool);

    event VetoCast(uint256 indexed proposalId, address indexed member, VetoReason reason, uint256 currentCount);
    event ProposalVetoed(uint256 indexed proposalId, address[] vetoVoters, VetoReason reason);
    event EmergencyFreezeCast(uint256 indexed docId, address indexed member, uint256 currentCount);
    event EmergencyFreezeTriggered(uint256 indexed docId, address[] freezeVoters, VetoReason reason, uint256 confirmDeadline);
    event EmergencyFreezeConfirmed(uint256 indexed docId);
    event EmergencyFreezeAutoUnfrozen(uint256 indexed docId);
    event CouncilAllowanceClaimed(address indexed member, uint256 indexed epochId, uint256 amount);
    event ControlTransferred(address indexed electionContract);

    error Council__NotMember(address caller);
    error Council__AlreadyVoted(address member, uint256 id);
    error Council__NotInVetoWindow(uint256 proposalId);
    error Council__ProposalAlreadyVetoed(uint256 proposalId);
    error Council__DocAlreadyFrozenByCouncil(uint256 docId);
    error Council__DocNotActive(uint256 docId);
    error Council__DescriptionTooShort(uint256 length);
    error Council__ControlAlreadyTransferred();
    error Council__AllowanceAlreadyClaimed(address member, uint256 epochId);
    error Council__EpochNotEnded(uint256 epochId);
    error Council__InsufficientRewardPool(uint256 available, uint256 required);
}
