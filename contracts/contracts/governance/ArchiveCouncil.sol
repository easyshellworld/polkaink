// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IArchiveCouncil.sol";
import "./interfaces/IGovernanceCore.sol";
import "../core/interfaces/IPolkaInkRegistry.sol";
import "../finance/interfaces/ITreasury.sol";

/// @title ArchiveCouncil v3.4
/// @notice Genesis 7 members written in constructor; no setMember().
///         Fixed unconditional Council allowance per Epoch.
///         CouncilVetoed triggers REJECTION_COOLDOWN same as Rejected.
contract ArchiveCouncil is
    Initializable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    IArchiveCouncil
{
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // MVP test values
    uint256 public constant VETO_WINDOW              = 3 minutes;   // prod: 24 hours
    uint256 public constant FREEZE_CONFIRM_PERIOD    = 15 minutes;  // prod: 72 hours
    uint256 public constant EPOCH_DURATION           = 3600;        // prod: 30 days
    uint256 public constant MIN_DESCRIPTION_BYTES    = 50;
    uint256 public constant MAX_FREEZE_PER_DOC       = 1;

    address[]  private _members;
    uint256    private _vetoThreshold;
    bool       private _controlTransferred;

    IGovernanceCore        public governanceCore;
    IPolkaInkRegistry      public registry;
    ITreasury              public treasury;

    mapping(uint256 => VetoRecord)                        private _vetoRecords;
    mapping(uint256 => mapping(address => bool))          private _vetoVoted;
    mapping(uint256 => uint256)                           private _vetoCount;

    mapping(uint256 => FreezeRecord)                      private _freezeRecords;
    mapping(uint256 => mapping(address => bool))          private _freezeVoted;
    mapping(uint256 => uint256)                           private _freezeCount;
    mapping(uint256 => uint256)                           private _docFreezeCount;

    mapping(uint256 => mapping(address => CouncilVoteRecord)) private _councilVotes;

    // epochId => member => claimed
    mapping(uint256 => mapping(address => bool)) private _allowanceClaimed;

    uint256 private _epochStartTime;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    /// @param admin            Deployer address
    /// @param councilMembers   Array of exactly 7 genesis council member addresses
    /// @param vetoThreshold_   Initial veto threshold (5 for Demo)
    function initialize(
        address   admin,
        address[] calldata councilMembers,
        uint256   vetoThreshold_
    ) external initializer {
        require(councilMembers.length == 7, "ArchiveCouncil: must have 7 members");
        __AccessControl_init();
        __ReentrancyGuard_init();
_grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);

        for (uint256 i = 0; i < councilMembers.length; i++) {
            _members.push(councilMembers[i]);
        }
        _vetoThreshold    = vetoThreshold_;
        _controlTransferred = false;
        _epochStartTime   = block.timestamp;
    }

    function setContracts(
        address _gov,
        address _registry,
        address _treasury
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        governanceCore = IGovernanceCore(_gov);
        registry       = IPolkaInkRegistry(_registry);
        treasury       = ITreasury(payable(_treasury));
    }

    // ─── Modifiers ────────────────────────────────────────────────────────

    modifier onlyMember() {
        if (!_isMember(msg.sender)) revert Council__NotMember(msg.sender);
        _;
    }

    // ─── Veto ─────────────────────────────────────────────────────────────

    function castVeto(
        uint256    proposalId,
        VetoReason reason,
        string calldata description
    ) external onlyMember nonReentrant {
        if (bytes(description).length < MIN_DESCRIPTION_BYTES)
            revert Council__DescriptionTooShort(bytes(description).length);

        IGovernanceCore.Proposal memory p = governanceCore.getProposal(proposalId);
        // Check proposal is Approved and within VETO_WINDOW
        require(
            p.status == IGovernanceCore.ProposalStatus.Approved,
            "ArchiveCouncil: not Approved"
        );
        require(
            block.timestamp <= p.councilWindowEnd,
            "ArchiveCouncil: veto window closed"
        );

        if (_vetoVoted[proposalId][msg.sender])
            revert Council__AlreadyVoted(msg.sender, proposalId);
        _vetoVoted[proposalId][msg.sender] = true;

        // Track vote record
        _councilVotes[proposalId][msg.sender] = CouncilVoteRecord({
            hasVoted:  true,
            isAgainst: true,
            timestamp: block.timestamp
        });

        _vetoCount[proposalId]++;
        emit VetoCast(proposalId, msg.sender, reason, _vetoCount[proposalId]);

        if (_vetoCount[proposalId] >= _vetoThreshold) {
            // Build voter array
            address[] memory voters = _collectVetoVoters(proposalId);
            _vetoRecords[proposalId] = VetoRecord({
                proposalId: proposalId,
                vetoVoters: voters,
                vetoTime:   block.timestamp,
                reason:     reason,
                description: description
            });

            governanceCore.markCouncilVetoed(proposalId);
            emit ProposalVetoed(proposalId, voters, reason);
        }
    }

    // ─── Emergency Freeze ─────────────────────────────────────────────────

    function castEmergencyFreeze(
        uint256    docId,
        VetoReason reason,
        string calldata description
    ) external onlyMember nonReentrant {
        if (bytes(description).length < MIN_DESCRIPTION_BYTES)
            revert Council__DescriptionTooShort(bytes(description).length);
        if (_docFreezeCount[docId] >= MAX_FREEZE_PER_DOC)
            revert Council__DocAlreadyFrozenByCouncil(docId);

        // Check document is currently Active (not already Frozen)
        IPolkaInkRegistry.Document memory doc = registry.getDocument(docId);
        if (doc.status != IPolkaInkRegistry.DocumentStatus.Active)
            revert Council__DocNotActive(docId);

        if (_freezeVoted[docId][msg.sender])
            revert Council__AlreadyVoted(msg.sender, docId);
        _freezeVoted[docId][msg.sender] = true;

        _freezeCount[docId]++;
        emit EmergencyFreezeCast(docId, msg.sender, _freezeCount[docId]);

        if (_freezeCount[docId] >= _vetoThreshold) {
            _docFreezeCount[docId]++;
            address[] memory voters = _collectFreezeVoters(docId);
            uint256 deadline = block.timestamp + FREEZE_CONFIRM_PERIOD;

            _freezeRecords[docId] = FreezeRecord({
                docId:          docId,
                freezeVoters:   voters,
                freezeTime:     block.timestamp,
                confirmDeadline: deadline,
                reason:         reason,
                description:    description,
                confirmed:      false,
                autoUnfrozen:   false
            });

            registry.setDocumentStatus(docId, IPolkaInkRegistry.DocumentStatus.Frozen);
            governanceCore.createEmergencyConfirm(docId, description);

            emit EmergencyFreezeTriggered(docId, voters, reason, deadline);
        }
    }

    function checkAndAutoUnfreeze(uint256 docId) external {
        FreezeRecord storage fr = _freezeRecords[docId];
        require(fr.freezeTime > 0, "ArchiveCouncil: no freeze record");
        if (fr.confirmed || fr.autoUnfrozen) return;
        if (block.timestamp > fr.confirmDeadline) {
            fr.autoUnfrozen = true;
            registry.setDocumentStatus(docId, IPolkaInkRegistry.DocumentStatus.Active);
            emit EmergencyFreezeAutoUnfrozen(docId);
        }
    }

    function confirmEmergencyFreeze(uint256 docId) external {
        require(msg.sender == address(governanceCore), "ArchiveCouncil: governance only");
        FreezeRecord storage fr = _freezeRecords[docId];
        require(fr.freezeTime > 0, "ArchiveCouncil: no freeze record");
        require(!fr.autoUnfrozen, "ArchiveCouncil: already auto-unfrozen");
        if (fr.confirmed) return;
        fr.confirmed = true;
        emit EmergencyFreezeConfirmed(docId);
    }

    // ─── Council Allowance ────────────────────────────────────────────────

    function claimCouncilAllowance(uint256 epochId) external onlyMember nonReentrant {
        uint256 epochEnd = _epochStartTime + (epochId + 1) * EPOCH_DURATION;
        if (block.timestamp < epochEnd)
            revert Council__EpochNotEnded(epochId);
        if (_allowanceClaimed[epochId][msg.sender])
            revert Council__AllowanceAlreadyClaimed(msg.sender, epochId);
        uint256 amount = 5 ether;
        uint256 poolBalance = treasury.rewardPoolBalance();
        if (poolBalance < amount)
            revert Council__InsufficientRewardPool(poolBalance, amount);

        treasury.distributeCouncilAllowance(msg.sender, epochId);
        _allowanceClaimed[epochId][msg.sender] = true;

        emit CouncilAllowanceClaimed(msg.sender, epochId, amount);
    }

    // ─── Governance Migration ─────────────────────────────────────────────

    function transferControlToElection(address electionContract)
        external onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (_controlTransferred) revert Council__ControlAlreadyTransferred();
        _controlTransferred = true;
        _vetoThreshold = 4; // Drops to 4/7 on Phase 1
        emit ControlTransferred(electionContract);
    }

    // ─── Read Operations ──────────────────────────────────────────────────

    function getMembers() external view returns (address[] memory) {
        return _members;
    }

    function isMember(address addr) external view returns (bool) {
        return _isMember(addr);
    }

    function vetoThreshold() external view returns (uint256) {
        return _vetoThreshold;
    }

    function getVetoRecord(uint256 proposalId) external view returns (VetoRecord memory) {
        return _vetoRecords[proposalId];
    }

    function getFreezeRecord(uint256 docId) external view returns (FreezeRecord memory) {
        return _freezeRecords[docId];
    }

    function getCouncilVote(uint256 proposalId, address member)
        external view returns (CouncilVoteRecord memory)
    {
        return _councilVotes[proposalId][member];
    }

    function isControlTransferred() external view returns (bool) {
        return _controlTransferred;
    }

    function isAllowanceClaimed(address member, uint256 epochId) external view returns (bool) {
        return _allowanceClaimed[epochId][member];
    }

    // ─── Internal ─────────────────────────────────────────────────────────

    function _isMember(address addr) internal view returns (bool) {
        for (uint256 i = 0; i < _members.length; i++) {
            if (_members[i] == addr) return true;
        }
        return false;
    }

    function _collectVetoVoters(uint256 proposalId) internal view returns (address[] memory) {
        address[] memory tmp = new address[](_members.length);
        uint256 count = 0;
        for (uint256 i = 0; i < _members.length; i++) {
            if (_vetoVoted[proposalId][_members[i]]) {
                tmp[count++] = _members[i];
            }
        }
        address[] memory result = new address[](count);
        for (uint256 i = 0; i < count; i++) result[i] = tmp[i];
        return result;
    }

    function _collectFreezeVoters(uint256 docId) internal view returns (address[] memory) {
        address[] memory tmp = new address[](_members.length);
        uint256 count = 0;
        for (uint256 i = 0; i < _members.length; i++) {
            if (_freezeVoted[docId][_members[i]]) {
                tmp[count++] = _members[i];
            }
        }
        address[] memory result = new address[](count);
        for (uint256 i = 0; i < count; i++) result[i] = tmp[i];
        return result;
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}
}
