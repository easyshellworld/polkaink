// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IArchiveCouncil.sol";
import "./interfaces/IGovernanceCore.sol";
import "../token/interfaces/INFTReward.sol";

/// @title ArchiveCouncil
/// @notice 7-member ethics guardian committee — veto power only, no proactive content decisions
contract ArchiveCouncil is Initializable, AccessControlUpgradeable, UUPSUpgradeable, IArchiveCouncil {

    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant UPGRADER_ROLE   = keccak256("UPGRADER_ROLE");

    uint256 public constant COUNCIL_SIZE       = 7;
    uint256 public constant VETO_THRESHOLD     = 4; // 4 out of 7
    uint256 public constant TERM_LENGTH        = 180 days;
    uint256 public constant ELECTION_DURATION  = 7 days;
    uint256 public constant SUPER_MAJORITY_BPS = 75; // 75% DAO vote to remove member

    IGovernanceCore public governanceCore;
    INFTReward      public nftReward;

    // ─── Storage ──────────────────────────────────────────────────────────

    address[] private _memberAddresses;
    mapping(address => CouncilMember) private _members;

    // proposalId → member → has vetoed
    mapping(uint256 => mapping(address => bool)) private _hasVetoed;
    // proposalId → VetoRecord
    mapping(uint256 => VetoRecord) private _vetoRecords;
    // proposalId → veto count
    mapping(uint256 => uint256) private _vetoCounts;
    // proposalId → member → has approved
    mapping(uint256 => mapping(address => bool)) private _hasApproved;

    // Elections
    uint256 private _electionCounter;
    mapping(uint256 => Election) private _elections;
    mapping(uint256 => mapping(address => uint256)) private _electionVotes; // electionId → candidate → votes
    mapping(uint256 => mapping(address => bool)) private _electionVoted;    // electionId → voter → voted

    // ─── Initializer ──────────────────────────────────────────────────────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(
        address admin,
        address _governanceCore,
        address _nftReward,
        address[] calldata initialMembers
    ) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        _grantRole(GOVERNANCE_ROLE, admin);

        governanceCore = IGovernanceCore(_governanceCore);
        nftReward      = INFTReward(_nftReward);

        require(initialMembers.length == COUNCIL_SIZE, "ArchiveCouncil: need exactly 7 members");
        for (uint256 i = 0; i < initialMembers.length; i++) {
            _addMember(initialMembers[i]);
        }
    }

    // ─── Write Operations ─────────────────────────────────────────────────

    /// @inheritdoc IArchiveCouncil
    function veto(uint256 proposalId, string calldata reason) external {
        if (!_isActiveMember(msg.sender)) revert Council__NotActiveMember(msg.sender);
        if (_hasVetoed[proposalId][msg.sender]) revert Council__AlreadyVetoed(msg.sender, proposalId);

        // Check proposal is in vetable state
        IGovernanceCore.ProposalStatus status = governanceCore.getProposalStatus(proposalId);
        require(
            status == IGovernanceCore.ProposalStatus.Passed ||
            status == IGovernanceCore.ProposalStatus.TimelockQueued,
            "ArchiveCouncil: proposal not in veto window"
        );

        _hasVetoed[proposalId][msg.sender] = true;
        _vetoCounts[proposalId]++;
        _members[msg.sender].vetoCount++;

        VetoRecord storage record = _vetoRecords[proposalId];
        record.proposalId = proposalId;
        record.vetoers.push(msg.sender);
        if (record.timestamp == 0) {
            record.reason    = reason;
            record.timestamp = block.timestamp;
        }

        uint256 count = _vetoCounts[proposalId];
        emit VetoCast(proposalId, msg.sender, reason, count, VETO_THRESHOLD);

        if (count >= VETO_THRESHOLD) {
            governanceCore.markVetoed(proposalId);
            emit ProposalVetoed(proposalId, record.vetoers, record.reason, block.timestamp);
        }
    }

    /// @inheritdoc IArchiveCouncil
    function approve(uint256 proposalId) external {
        if (!_isActiveMember(msg.sender)) revert Council__NotActiveMember(msg.sender);
        _hasApproved[proposalId][msg.sender] = true;
        emit ProposalApproved(proposalId, msg.sender);
    }

    /// @inheritdoc IArchiveCouncil
    function initiateElection(address[] calldata candidates) external returns (uint256 electionId) {
        require(candidates.length >= COUNCIL_SIZE, "ArchiveCouncil: not enough candidates");

        _electionCounter++;
        electionId = _electionCounter;

        address[] memory cands = new address[](candidates.length);
        for (uint256 i = 0; i < candidates.length; i++) {
            cands[i] = candidates[i];
        }

        _elections[electionId] = Election({
            id:        electionId,
            startTime: block.timestamp,
            endTime:   block.timestamp + ELECTION_DURATION,
            candidates: cands,
            executed:  false
        });

        emit ElectionInitiated(electionId, cands, block.timestamp, block.timestamp + ELECTION_DURATION);
    }

    /// @inheritdoc IArchiveCouncil
    function voteInElection(uint256 electionId, address candidate) external {
        Election storage e = _elections[electionId];
        require(e.id != 0, "ArchiveCouncil: election not found");
        require(block.timestamp <= e.endTime, "ArchiveCouncil: election ended");
        require(!e.executed, "ArchiveCouncil: election executed");
        if (_electionVoted[electionId][msg.sender]) revert Council__AlreadyVotedInElection(msg.sender);

        _electionVoted[electionId][msg.sender] = true;
        _electionVotes[electionId][candidate] += msg.sender.balance; // DOT balance as power

        emit ElectionVoteCast(electionId, msg.sender, candidate, msg.sender.balance);
    }

    /// @inheritdoc IArchiveCouncil
    function executeElection(uint256 electionId) external {
        Election storage e = _elections[electionId];
        require(e.id != 0, "ArchiveCouncil: election not found");
        require(block.timestamp > e.endTime, "ArchiveCouncil: election not ended");
        require(!e.executed, "ArchiveCouncil: already executed");

        e.executed = true;

        // Find top COUNCIL_SIZE candidates
        address[] memory winners = _topCandidates(electionId, e.candidates);

        // Deactivate old members
        for (uint256 i = 0; i < _memberAddresses.length; i++) {
            address addr = _memberAddresses[i];
            uint256 nftId = _members[addr].guardianNFTId;
            if (nftId != 0) {
                nftReward.deactivateGuardianNFT(nftId);
            }
            delete _members[addr];
        }
        delete _memberAddresses;

        // Install new members
        for (uint256 i = 0; i < winners.length; i++) {
            _addMember(winners[i]);
        }

        emit ElectionExecuted(electionId, winners);
    }

    /// @inheritdoc IArchiveCouncil
    function resign() external {
        require(_isActiveMember(msg.sender), "ArchiveCouncil: not a member");
        _members[msg.sender].status = CouncilMemberStatus.Resigned;
        uint256 nftId = _members[msg.sender].guardianNFTId;
        if (nftId != 0) nftReward.deactivateGuardianNFT(nftId);
        emit MemberResigned(msg.sender, block.timestamp);
    }

    /// @inheritdoc IArchiveCouncil
    function removeMember(address member, string calldata reason) external onlyRole(GOVERNANCE_ROLE) {
        require(_isActiveMember(member), "ArchiveCouncil: not a member");
        _members[member].status = CouncilMemberStatus.Removed;
        uint256 nftId = _members[member].guardianNFTId;
        if (nftId != 0) nftReward.deactivateGuardianNFT(nftId);
        emit MemberRemoved(member, reason, block.timestamp);
    }

    /// @inheritdoc IArchiveCouncil
    function suspendMember(address member) external onlyRole(GOVERNANCE_ROLE) {
        require(_isActiveMember(member), "ArchiveCouncil: not a member");
        _members[member].status = CouncilMemberStatus.Suspended;
    }

    // ─── Read Operations ──────────────────────────────────────────────────

    /// @inheritdoc IArchiveCouncil
    function getCouncilMembers() external view returns (CouncilMember[] memory members) {
        members = new CouncilMember[](_memberAddresses.length);
        for (uint256 i = 0; i < _memberAddresses.length; i++) {
            members[i] = _members[_memberAddresses[i]];
        }
    }

    /// @inheritdoc IArchiveCouncil
    function isActiveMember(address addr) external view returns (bool) {
        return _isActiveMember(addr);
    }

    /// @inheritdoc IArchiveCouncil
    function getVetoStatus(uint256 proposalId) external view returns (uint256 vetoCount, bool vetoed) {
        vetoCount = _vetoCounts[proposalId];
        vetoed    = vetoCount >= VETO_THRESHOLD;
    }

    /// @inheritdoc IArchiveCouncil
    function getVetoRecord(uint256 proposalId) external view returns (VetoRecord memory) {
        return _vetoRecords[proposalId];
    }

    /// @inheritdoc IArchiveCouncil
    function getElection(uint256 electionId) external view returns (Election memory) {
        return _elections[electionId];
    }

    /// @inheritdoc IArchiveCouncil
    function getElectionVotes(uint256 electionId, address candidate) external view returns (uint256 votes) {
        return _electionVotes[electionId][candidate];
    }

    /// @inheritdoc IArchiveCouncil
    function vetoThreshold() external pure returns (uint256) {
        return VETO_THRESHOLD;
    }

    // ─── Internal Helpers ─────────────────────────────────────────────────

    function _isActiveMember(address addr) internal view returns (bool) {
        CouncilMember storage m = _members[addr];
        return m.memberAddress == addr && m.status == CouncilMemberStatus.Active && block.timestamp <= m.termEnd;
    }

    function _addMember(address addr) internal {
        uint256 termEnd = block.timestamp + TERM_LENGTH;
        uint256 nftId   = nftReward.mintGuardianNFT(addr, termEnd);
        _members[addr] = CouncilMember({
            memberAddress: addr,
            guardianNFTId: nftId,
            termStart:     block.timestamp,
            termEnd:       termEnd,
            vetoCount:     0,
            status:        CouncilMemberStatus.Active
        });
        _memberAddresses.push(addr);
    }

    function _topCandidates(uint256 electionId, address[] memory candidates)
        internal view returns (address[] memory winners)
    {
        winners = new address[](COUNCIL_SIZE);
        uint256[] memory votes = new uint256[](candidates.length);
        for (uint256 i = 0; i < candidates.length; i++) {
            votes[i] = _electionVotes[electionId][candidates[i]];
        }

        // Simple selection sort for COUNCIL_SIZE winners
        for (uint256 w = 0; w < COUNCIL_SIZE; w++) {
            uint256 best = w;
            for (uint256 i = w + 1; i < candidates.length; i++) {
                if (votes[i] > votes[best]) best = i;
            }
            winners[w] = candidates[best];
            // Swap so we don't pick same winner twice
            (candidates[w], candidates[best]) = (candidates[best], candidates[w]);
            (votes[w], votes[best])           = (votes[best], votes[w]);
        }
    }

    // ─── UUPS ─────────────────────────────────────────────────────────────

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}
}
