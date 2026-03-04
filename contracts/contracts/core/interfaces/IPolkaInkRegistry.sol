// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IPolkaInkRegistry v2
/// @notice Core document registry interface with Frozen/Revoked status
interface IPolkaInkRegistry {

    enum DocumentStatus { Active, Archived, Disputed, Frozen, Revoked }

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

    function createDocument(string calldata title, string[] calldata tags) external returns (uint256 docId);

    function proposeVersion(
        uint256 docId,
        uint256 parentVersionId,
        bytes32 contentHash,
        bytes calldata markdownCalldata
    ) external returns (uint256 proposalId);

    function mergeProposal(uint256 proposalId) external;
    function archiveDocument(uint256 docId) external;
    function setDocumentStatus(uint256 docId, DocumentStatus status) external;
    function updateTags(uint256 docId, string[] calldata newTags) external;

    function getDocument(uint256 docId) external view returns (Document memory);
    function totalDocuments() external view returns (uint256);
    function getVersionHistory(uint256 docId) external view returns (uint256[] memory);
    function listDocuments(uint256 offset, uint256 limit) external view returns (Document[] memory docs, uint256 total);
    function listDocumentsByTag(string calldata tag, uint256 offset, uint256 limit) external view returns (Document[] memory docs, uint256 total);

    event DocumentCreated(uint256 indexed docId, address indexed author, string title, string[] tags, uint256 timestamp);
    event VersionProposed(uint256 indexed proposalId, uint256 indexed docId, address indexed proposer, uint256 parentVersionId, bytes32 contentHash);
    event VersionMerged(uint256 indexed proposalId, uint256 indexed docId, uint256 indexed newVersionId, address author, uint256 timestamp);
    event DocumentArchived(uint256 indexed docId, uint256 timestamp);
    event DocumentStatusChanged(uint256 indexed docId, DocumentStatus oldStatus, DocumentStatus newStatus);
    event TagsUpdated(uint256 indexed docId, string[] oldTags, string[] newTags);

    error Registry__DocumentNotFound(uint256 docId);
    error Registry__DocumentArchived(uint256 docId);
    error Registry__DocumentFrozen(uint256 docId);
    error Registry__DocumentRevoked(uint256 docId);
    error Registry__InvalidParentVersion(uint256 versionId);
    error Registry__InvalidTitle();
    error Registry__TooManyTags(uint256 max);
    error Registry__NotActiveMember(address caller);
    error Registry__Unauthorized();
}
