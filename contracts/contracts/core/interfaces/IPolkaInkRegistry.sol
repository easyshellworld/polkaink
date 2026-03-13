// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IPolkaInkRegistry {

    enum DocumentStatus { Active, Frozen }

    struct Document {
        uint256        docId;
        string         title;
        string[]       tags;
        address        author;
        uint256        createdAt;
        DocumentStatus status;
        bool           isSeed;
        uint256        currentVersionId;
        uint256        latestProposalId;
    }

    // ─── Write Operations ───

    /// @notice Regular member creates a document (requires active Member NFT)
    function createDocument(
        string calldata title,
        string[] calldata tags,
        string calldata description
    ) external returns (uint256 docId);

    /// @notice Admin creates seed document (SEED_CREATOR_ROLE; immediately renounced after use)
    /// @dev First version only writes title and tags; markdown content is empty string; proposalId = 0
    function createSeedDocument(
        string calldata title,
        string[] calldata tags
    ) external returns (uint256 docId);

    /// @notice Submit a version proposal (requires active Member NFT)
    /// @dev Frozen state allows proposals; but merge reverts if still Frozen
    function proposeVersion(
        uint256 docId,
        uint256 parentVersionId,
        bytes32 contentHash,
        string calldata description
    ) external returns (uint256 proposalId);

    function mergeProposal(uint256 docId, uint256 proposalId) external;

    function setDocumentStatus(uint256 docId, DocumentStatus status) external;

    // ─── Read Operations ───

    function getDocument(uint256 docId) external view returns (Document memory);
    function totalDocuments() external view returns (uint256);
    function listDocuments(uint256 offset, uint256 limit) external view returns (Document[] memory, uint256 total);
    function listDocumentsByTag(string calldata tag, uint256 offset, uint256 limit) external view returns (Document[] memory, uint256 total);

    event DocumentCreated(uint256 indexed docId, address indexed author, string title, bool isSeed);
    event VersionProposed(uint256 indexed docId, uint256 indexed proposalId, address indexed proposer, uint256 parentVersionId, uint256 targetVersionId);
    event ProposalMerged(uint256 indexed docId, uint256 indexed proposalId, uint256 newVersionId, uint256 creatorNFTId);
    event DocumentStatusChanged(uint256 indexed docId, DocumentStatus newStatus);

    error Registry__NotActiveMember(address caller);
    error Registry__DocumentNotFound(uint256 docId);
    error Registry__DocumentFrozenCannotMerge(uint256 docId);
    error Registry__ActiveProposalExists(uint256 docId, uint256 proposalId);
    error Registry__InvalidParentVersion(uint256 provided, uint256 expected);
    error Registry__InvalidTitle();
    error Registry__TooManyTags(uint256 count);
    error Registry__Unauthorized();
}
