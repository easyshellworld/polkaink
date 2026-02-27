// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IPolkaInkRegistry
/// @notice Core document registry interface: manages document lifecycle and version tree
interface IPolkaInkRegistry {

    // ─── Data Structures ──────────────────────────────────────────────────

    enum DocumentStatus { Active, Archived, Disputed }

    struct Document {
        uint256 id;
        string  title;
        address author;
        uint256 currentVersionId;
        uint256 createdAt;
        uint256 updatedAt;
        DocumentStatus status;
        string[] tags;
    }

    // ─── Write Operations ─────────────────────────────────────────────────

    /// @notice Create a new document (entry point, initiates initial version proposal)
    /// @param title Document title (1–200 bytes)
    /// @param tags Document tags (max 10, each max 32 bytes)
    /// @return docId New document ID
    function createDocument(
        string calldata title,
        string[] calldata tags
    ) external returns (uint256 docId);

    /// @notice Submit a version modification proposal (Markdown content written to calldata)
    /// @param docId Target document ID
    /// @param parentVersionId Parent version ID
    /// @param contentHash sha256 hash of Markdown content
    /// @param markdownCalldata gzip-compressed Markdown content (calldata)
    /// @return proposalId Proposal ID (assigned by GovernanceCore)
    function proposeVersion(
        uint256 docId,
        uint256 parentVersionId,
        bytes32 contentHash,
        bytes calldata markdownCalldata
    ) external payable returns (uint256 proposalId);

    /// @notice Merge a passed proposal (only GovernanceCore can call)
    /// @param proposalId Passed proposal ID
    function mergeProposal(uint256 proposalId) external;

    /// @notice Archive a document (requires DAO governance proposal)
    /// @param docId Document ID
    function archiveDocument(uint256 docId) external;

    /// @notice Update document tags
    /// @param docId Document ID
    /// @param newTags New tag list
    function updateTags(uint256 docId, string[] calldata newTags) external;

    // ─── Read Operations ──────────────────────────────────────────────────

    function getDocument(uint256 docId) external view returns (Document memory);
    function totalDocuments() external view returns (uint256);
    function getVersionHistory(uint256 docId) external view returns (uint256[] memory);
    function listDocuments(uint256 offset, uint256 limit) external view returns (Document[] memory docs, uint256 total);
    function listDocumentsByTag(string calldata tag, uint256 offset, uint256 limit) external view returns (Document[] memory docs, uint256 total);

    // ─── Events ───────────────────────────────────────────────────────────

    event DocumentCreated(uint256 indexed docId, address indexed author, string title, string[] tags, uint256 timestamp);
    event VersionProposed(uint256 indexed proposalId, uint256 indexed docId, address indexed proposer, uint256 parentVersionId, bytes32 contentHash, uint256 stakeAmount);
    event VersionMerged(uint256 indexed proposalId, uint256 indexed docId, uint256 indexed newVersionId, address author, uint256 timestamp);
    event DocumentArchived(uint256 indexed docId, uint256 timestamp);
    event TagsUpdated(uint256 indexed docId, string[] oldTags, string[] newTags);

    // ─── Errors ───────────────────────────────────────────────────────────

    error Registry__DocumentNotFound(uint256 docId);
    error Registry__DocumentArchived(uint256 docId);
    error Registry__InvalidParentVersion(uint256 versionId);
    error Registry__InvalidTitle();
    error Registry__TooManyTags(uint256 max);
    error Registry__InsufficientStake(uint256 required, uint256 provided);
    error Registry__Unauthorized();
}
