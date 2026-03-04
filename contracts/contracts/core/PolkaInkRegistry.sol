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

/// @title PolkaInkRegistry v2
/// @notice Core document registry with Frozen/Revoked support and stake-based membership
contract PolkaInkRegistry is
    Initializable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    IPolkaInkRegistry
{
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant REPORT_ROLE    = keccak256("REPORT_ROLE");
    bytes32 public constant UPGRADER_ROLE  = keccak256("UPGRADER_ROLE");

    uint256 private constant MAX_TITLE_LENGTH = 200;
    uint256 private constant MAX_TAG_LENGTH   = 32;
    uint256 private constant MAX_TAGS         = 10;

    IVersionStore   public versionStore;
    IGovernanceCore public governanceCore;
    INFTReward      public nftReward;
    IStakingManager public stakingManager;

    uint256 private _docCounter;
    mapping(uint256 => Document) private _documents;
    mapping(uint256 => uint256[]) private _versionHistory;
    mapping(uint256 => uint256) private _proposalDoc;
    mapping(uint256 => uint256) private _proposalVersion;
    mapping(string => uint256[]) private _tagDocs;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(
        address admin,
        address _versionStore,
        address _governanceCore,
        address _nftReward,
        address _stakingManager
    ) external initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);

        versionStore = IVersionStore(_versionStore);
        governanceCore = IGovernanceCore(_governanceCore);
        nftReward = INFTReward(_nftReward);
        stakingManager = IStakingManager(_stakingManager);
    }

    function setGovernanceCore(address _gc) external onlyRole(DEFAULT_ADMIN_ROLE) {
        governanceCore = IGovernanceCore(_gc);
    }

    // ─── Write Operations ─────────────────────────────────────────────────

    function createDocument(
        string calldata title,
        string[] calldata tags
    ) external returns (uint256 docId) {
        if (bytes(title).length == 0 || bytes(title).length > MAX_TITLE_LENGTH)
            revert Registry__InvalidTitle();
        if (tags.length > MAX_TAGS)
            revert Registry__TooManyTags(MAX_TAGS);
        if (!stakingManager.isActiveMember(msg.sender))
            revert Registry__NotActiveMember(msg.sender);

        _docCounter++;
        docId = _docCounter;

        string[] memory tagsCopy = new string[](tags.length);
        for (uint256 i = 0; i < tags.length; i++) {
            require(bytes(tags[i]).length <= MAX_TAG_LENGTH, "PolkaInkRegistry: tag too long");
            tagsCopy[i] = tags[i];
            _tagDocs[tags[i]].push(docId);
        }

        _documents[docId] = Document({
            id: docId,
            title: title,
            author: msg.sender,
            currentVersionId: 0,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            status: DocumentStatus.Active,
            tags: tagsCopy
        });

        // Mint Author NFT for document creator
        nftReward.mintAuthorNFT(msg.sender, docId);

        emit DocumentCreated(docId, msg.sender, title, tagsCopy, block.timestamp);
    }

    function proposeVersion(
        uint256 docId,
        uint256 parentVersionId,
        bytes32 contentHash,
        bytes calldata markdownCalldata
    ) external nonReentrant returns (uint256 proposalId) {
        Document storage doc = _documents[docId];
        if (doc.id == 0) revert Registry__DocumentNotFound(docId);
        if (doc.status == DocumentStatus.Archived) revert Registry__DocumentArchived(docId);
        if (doc.status == DocumentStatus.Frozen) revert Registry__DocumentFrozen(docId);
        if (doc.status == DocumentStatus.Revoked) revert Registry__DocumentRevoked(docId);
        if (!stakingManager.isActiveMember(msg.sender))
            revert Registry__NotActiveMember(msg.sender);

        if (parentVersionId != 0) {
            IVersionStore.Version memory pv = versionStore.getVersion(parentVersionId);
            if (pv.docId != docId) revert Registry__InvalidParentVersion(parentVersionId);
        }

        uint256 versionId = versionStore.storeVersion(
            docId, parentVersionId, msg.sender, contentHash,
            IVersionStore.CompressionType.Gzip, uint32(markdownCalldata.length)
        );

        // Create proposal via GovernanceCore on behalf of user
        proposalId = governanceCore.createProposalFor(
            msg.sender,
            IGovernanceCore.ProposalType.VersionUpdate,
            docId, versionId, "", ""
        );

        _proposalDoc[proposalId] = docId;
        _proposalVersion[proposalId] = versionId;

        emit VersionProposed(proposalId, docId, msg.sender, parentVersionId, contentHash);
    }

    function mergeProposal(uint256 proposalId) external onlyRole(GOVERNANCE_ROLE) {
        uint256 docId = _proposalDoc[proposalId];
        uint256 versionId = _proposalVersion[proposalId];
        require(docId != 0, "PolkaInkRegistry: unknown proposal");

        Document storage doc = _documents[docId];
        doc.currentVersionId = versionId;
        doc.updatedAt = block.timestamp;

        _versionHistory[docId].push(versionId);
        versionStore.setCurrentVersion(docId, versionId);

        // Mint Creator NFT for the version proposer
        IVersionStore.Version memory v = versionStore.getVersion(versionId);
        nftReward.mintCreatorNFT(v.author, docId, proposalId);

        emit VersionMerged(proposalId, docId, versionId, v.author, block.timestamp);
    }

    function archiveDocument(uint256 docId) external onlyRole(GOVERNANCE_ROLE) {
        Document storage doc = _documents[docId];
        if (doc.id == 0) revert Registry__DocumentNotFound(docId);
        doc.status = DocumentStatus.Archived;
        doc.updatedAt = block.timestamp;
        emit DocumentArchived(docId, block.timestamp);
    }

    function setDocumentStatus(uint256 docId, DocumentStatus status) external onlyRole(REPORT_ROLE) {
        Document storage doc = _documents[docId];
        if (doc.id == 0) revert Registry__DocumentNotFound(docId);
        DocumentStatus old = doc.status;
        doc.status = status;
        doc.updatedAt = block.timestamp;
        emit DocumentStatusChanged(docId, old, status);
    }

    function updateTags(uint256 docId, string[] calldata newTags) external {
        Document storage doc = _documents[docId];
        if (doc.id == 0) revert Registry__DocumentNotFound(docId);
        if (newTags.length > MAX_TAGS) revert Registry__TooManyTags(MAX_TAGS);
        if (msg.sender != doc.author && !hasRole(GOVERNANCE_ROLE, msg.sender))
            revert Registry__Unauthorized();

        string[] memory oldTags = doc.tags;
        string[] memory tagsCopy = new string[](newTags.length);
        for (uint256 i = 0; i < newTags.length; i++) {
            tagsCopy[i] = newTags[i];
        }
        doc.tags = tagsCopy;
        doc.updatedAt = block.timestamp;
        emit TagsUpdated(docId, oldTags, tagsCopy);
    }

    // ─── Read Operations ──────────────────────────────────────────────────

    function getDocument(uint256 docId) external view returns (Document memory) {
        if (_documents[docId].id == 0) revert Registry__DocumentNotFound(docId);
        return _documents[docId];
    }

    function totalDocuments() external view returns (uint256) {
        return _docCounter;
    }

    function getVersionHistory(uint256 docId) external view returns (uint256[] memory) {
        return _versionHistory[docId];
    }

    function listDocuments(
        uint256 offset, uint256 limit
    ) external view returns (Document[] memory docs, uint256 total) {
        total = _docCounter;
        if (limit > 50) limit = 50;
        if (offset >= total) return (new Document[](0), total);
        uint256 end = offset + limit > total ? total : offset + limit;
        uint256 count = end - offset;
        docs = new Document[](count);
        for (uint256 i = 0; i < count; i++) {
            docs[i] = _documents[offset + i + 1];
        }
    }

    function listDocumentsByTag(
        string calldata tag, uint256 offset, uint256 limit
    ) external view returns (Document[] memory docs, uint256 total) {
        uint256[] storage taggedDocs = _tagDocs[tag];
        total = taggedDocs.length;
        if (limit > 50) limit = 50;
        if (offset >= total) return (new Document[](0), total);
        uint256 end = offset + limit > total ? total : offset + limit;
        uint256 count = end - offset;
        docs = new Document[](count);
        for (uint256 i = 0; i < count; i++) {
            docs[i] = _documents[taggedDocs[offset + i]];
        }
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}
}
