// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IPolkaInkRegistry.sol";
import "./interfaces/IVersionStore.sol";
import "../governance/interfaces/IGovernanceCore.sol";
import "../governance/interfaces/IStakingManager.sol";
import "../token/interfaces/INFTReward.sol";

/// @title PolkaInkRegistry v3.4
/// @notice Core document lifecycle management.
///         createSeedDocument only writes title + tags; content is empty.
///         SEED_CREATOR_ROLE is renounced after all seed documents are created.
contract PolkaInkRegistry is
    Initializable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    IPolkaInkRegistry
{
    bytes32 public constant GOVERNANCE_ROLE   = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant COUNCIL_ROLE      = keccak256("COUNCIL_ROLE");
    bytes32 public constant SEED_CREATOR_ROLE = keccak256("SEED_CREATOR_ROLE");
    bytes32 public constant UPGRADER_ROLE     = keccak256("UPGRADER_ROLE");

    uint256 private constant MAX_TITLE_LENGTH = 200;
    uint256 private constant MAX_TAGS         = 10;

    IVersionStore   public versionStore;
    IGovernanceCore public governanceCore;
    IStakingManager public stakingManager;

    uint256 private _docCounter;
    mapping(uint256 => Document)      private _documents;
    mapping(string  => uint256[])     private _tagDocs;
    mapping(uint256 => uint256)       private _proposalDoc;
    mapping(uint256 => uint256)       private _proposalVersion;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(
        address admin,
        address _versionStore,
        address _governanceCore,
        address _stakingManager
    ) external initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();
_grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);

        versionStore   = IVersionStore(_versionStore);
        governanceCore = IGovernanceCore(_governanceCore);
        stakingManager = IStakingManager(_stakingManager);
    }

    // ─── Write Operations ─────────────────────────────────────────────────

    function createDocument(
        string calldata title,
        string[] calldata tags,
        string calldata /*description*/
    ) external returns (uint256 docId) {
        if (bytes(title).length == 0 || bytes(title).length > MAX_TITLE_LENGTH)
            revert Registry__InvalidTitle();
        if (tags.length > MAX_TAGS)
            revert Registry__TooManyTags(tags.length);
        if (!stakingManager.isActiveMember(msg.sender))
            revert Registry__NotActiveMember(msg.sender);

        docId = _createDoc(title, tags, msg.sender, false);

        // First version with empty content
        versionStore.storeVersion(docId, 0, msg.sender, 0, bytes32(0), block.number, 0);

        emit DocumentCreated(docId, msg.sender, title, false);
    }

    function createSeedDocument(
        string calldata title,
        string[] calldata tags
    ) external onlyRole(SEED_CREATOR_ROLE) returns (uint256 docId) {
        if (bytes(title).length == 0 || bytes(title).length > MAX_TITLE_LENGTH)
            revert Registry__InvalidTitle();
        if (tags.length > MAX_TAGS)
            revert Registry__TooManyTags(tags.length);

        docId = _createDoc(title, tags, msg.sender, true);

        // First version: empty content (bytes32(0)), proposalId = 0
        versionStore.storeVersion(docId, 0, msg.sender, 0, bytes32(0), block.number, 0);

        emit DocumentCreated(docId, msg.sender, title, true);
    }

    function proposeVersion(
        uint256 docId,
        uint256 parentVersionId,
        bytes32 contentHash,
        string calldata description
    ) external nonReentrant returns (uint256 proposalId) {
        Document storage doc = _documents[docId];
        if (doc.docId == 0) revert Registry__DocumentNotFound(docId);
        if (!stakingManager.isActiveMember(msg.sender))
            revert Registry__NotActiveMember(msg.sender);

        // parentVersion rules:
        // A: parentVersionId == currentVersionId
        // B: if latest proposal is Approved and unexecuted, parentVersionId == latest targetVersionId
        uint256 latestProposalId = doc.latestProposalId;
        if (latestProposalId == 0) {
            if (parentVersionId != doc.currentVersionId) {
                revert Registry__InvalidParentVersion(parentVersionId, doc.currentVersionId);
            }
        } else {
            IGovernanceCore.Proposal memory latest = governanceCore.getProposal(latestProposalId);
            if (latest.docId != docId) {
                doc.latestProposalId = 0;
                if (parentVersionId != doc.currentVersionId) {
                    revert Registry__InvalidParentVersion(parentVersionId, doc.currentVersionId);
                }
            } else if (latest.status == IGovernanceCore.ProposalStatus.Active) {
                revert Registry__ActiveProposalExists(docId, latestProposalId);
            } else if (latest.status == IGovernanceCore.ProposalStatus.Approved) {
                uint256 approvedTargetVersion = _proposalVersion[latestProposalId];
                if (parentVersionId != approvedTargetVersion) {
                    revert Registry__InvalidParentVersion(parentVersionId, approvedTargetVersion);
                }
            } else {
                doc.latestProposalId = 0;
                if (parentVersionId != doc.currentVersionId) {
                    revert Registry__InvalidParentVersion(parentVersionId, doc.currentVersionId);
                }
            }
        }

        // Store the proposed version
        uint256 targetVersionId = versionStore.storeVersion(
            docId, parentVersionId, msg.sender, 0, contentHash,
            block.number, 0
        );

        // Create proposal via GovernanceCore
        proposalId = governanceCore.createProposalFor(
            msg.sender, docId, targetVersionId, parentVersionId, description
        );
        versionStore.linkProposal(targetVersionId, proposalId);

        doc.latestProposalId = proposalId;
        _proposalDoc[proposalId]     = docId;
        _proposalVersion[proposalId] = targetVersionId;

        emit VersionProposed(docId, proposalId, msg.sender, parentVersionId, targetVersionId);
    }

    function mergeProposal(uint256 docId, uint256 proposalId)
        external onlyRole(GOVERNANCE_ROLE)
    {
        Document storage doc = _documents[docId];
        if (doc.docId == 0) revert Registry__DocumentNotFound(docId);
        if (doc.status == DocumentStatus.Frozen)
            revert Registry__DocumentFrozenCannotMerge(docId);

        if (_proposalDoc[proposalId] != docId)
            revert Registry__Unauthorized();
        uint256 versionId = _proposalVersion[proposalId];
        require(versionId != 0, "Registry: unknown proposal version");

        doc.currentVersionId = versionId;
        doc.latestProposalId = 0;

        emit ProposalMerged(docId, proposalId, versionId, 0);
    }

    function setDocumentStatus(uint256 docId, DocumentStatus status)
        external
    {
        if (!hasRole(COUNCIL_ROLE, msg.sender) && !hasRole(GOVERNANCE_ROLE, msg.sender))
            revert Registry__Unauthorized();
        Document storage doc = _documents[docId];
        if (doc.docId == 0) revert Registry__DocumentNotFound(docId);
        doc.status = status;
        emit DocumentStatusChanged(docId, status);
    }

    // ─── Read Operations ──────────────────────────────────────────────────

    function getDocument(uint256 docId) external view returns (Document memory) {
        if (_documents[docId].docId == 0) revert Registry__DocumentNotFound(docId);
        return _documents[docId];
    }

    function totalDocuments() external view returns (uint256) {
        return _docCounter;
    }

    function listDocuments(uint256 offset, uint256 limit)
        external view returns (Document[] memory docs, uint256 total)
    {
        total = _docCounter;
        if (limit > 50) limit = 50;
        if (offset >= total) return (new Document[](0), total);
        uint256 end = offset + limit > total ? total : offset + limit;
        docs = new Document[](end - offset);
        for (uint256 i = 0; i < end - offset; i++) {
            docs[i] = _documents[offset + i + 1];
        }
    }

    function listDocumentsByTag(
        string calldata tag, uint256 offset, uint256 limit
    ) external view returns (Document[] memory docs, uint256 total) {
        uint256[] storage tagged = _tagDocs[tag];
        total = tagged.length;
        if (limit > 50) limit = 50;
        if (offset >= total) return (new Document[](0), total);
        uint256 end = offset + limit > total ? total : offset + limit;
        docs = new Document[](end - offset);
        for (uint256 i = 0; i < end - offset; i++) {
            docs[i] = _documents[tagged[offset + i]];
        }
    }

    // ─── Internal ─────────────────────────────────────────────────────────

    function _createDoc(
        string calldata title,
        string[] calldata tags,
        address author,
        bool isSeed
    ) internal returns (uint256 docId) {
        _docCounter++;
        docId = _docCounter;

        string[] memory tagsCopy = new string[](tags.length);
        for (uint256 i = 0; i < tags.length; i++) {
            tagsCopy[i] = tags[i];
            _tagDocs[tags[i]].push(docId);
        }

        _documents[docId] = Document({
            docId:            docId,
            title:            title,
            tags:             tagsCopy,
            author:           author,
            createdAt:        block.timestamp,
            status:           DocumentStatus.Active,
            isSeed:           isSeed,
            currentVersionId: 0,
            latestProposalId: 0
        });
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}
}
