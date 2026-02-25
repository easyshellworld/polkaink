// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title PolkaInk — On-Chain Polkadot History Preservation Protocol
/// @notice Consolidated contract for the MVP phase: document registry,
///         version store, and basic governance in a single deployment.
/// @dev Deployed on Polkadot Hub TestNet (Chain ID 420420417).
///      All data is stored on-chain via calldata for permanent history.
contract PolkaInk {

    // ═══════════════════════════════════════════════════════════════════
    //  ENUMS
    // ═══════════════════════════════════════════════════════════════════

    enum DocumentStatus { Active, Archived, Disputed }

    enum CompressionType { None, Gzip, Zstd }

    enum ProposalType {
        VersionUpdate,      // Regular document version update
        ParameterChange,    // Governance parameter adjustment
        ArchiveDocument     // Archive a document
    }

    enum ProposalStatus {
        Pending,            // Submitted, waiting for voting to start
        Active,             // Voting in progress
        Passed,             // Vote passed, awaiting execution
        Executed,           // Successfully executed
        Rejected,           // Vote rejected
        Cancelled,          // Cancelled by proposer
        Expired             // Exceeded maximum wait period
    }

    // ═══════════════════════════════════════════════════════════════════
    //  DATA STRUCTURES
    // ═══════════════════════════════════════════════════════════════════

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

    struct Version {
        uint256 id;
        uint256 docId;
        uint256 parentVersionId;
        address author;
        bytes32 contentHash;        // sha256 hash of the Markdown content
        uint256 blockNumber;
        uint256 timestamp;
        CompressionType compression;
        uint32 contentLength;       // Original content byte length (before compression)
    }

    struct Proposal {
        uint256 id;
        ProposalType proposalType;
        address proposer;
        uint256 docId;
        uint256 targetVersionId;
        uint256 stakeAmount;
        uint256 yesVotes;
        uint256 noVotes;
        uint256 startTime;
        uint256 endTime;
        ProposalStatus status;
        string description;
        bytes32 contentHash;        // Content hash for VersionUpdate proposals
    }

    struct GovernanceParams {
        uint256 minStake;           // Minimum stake in wei (default 1 PAS for testnet)
        uint256 votingPeriod;       // Voting period in seconds (default 3 days for testnet)
        uint256 passingThreshold;   // Passing percentage (default 60 = 60%)
        uint256 slashRatioNormal;   // Normal rejection slash (default 30 = 30%)
        uint256 maxTagsPerDoc;      // Maximum tags per document (default 10)
    }

    // ═══════════════════════════════════════════════════════════════════
    //  STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════

    address public owner;

    // --- Document Registry ---
    uint256 public totalDocuments;
    mapping(uint256 => Document) private _documents;

    // --- Version Store ---
    uint256 public totalVersions;
    mapping(uint256 => Version) private _versions;
    mapping(uint256 => uint256[]) private _docVersionIds;       // docId => versionId[]
    mapping(uint256 => uint256[]) private _versionChildren;     // versionId => childVersionId[]

    // --- Governance ---
    uint256 public totalProposals;
    mapping(uint256 => Proposal) private _proposals;
    mapping(uint256 => mapping(address => bool)) private _hasVoted;     // proposalId => voter => voted
    mapping(uint256 => mapping(address => bool)) private _voteChoice;   // proposalId => voter => support

    GovernanceParams public params;

    // ═══════════════════════════════════════════════════════════════════
    //  CUSTOM ERRORS
    // ═══════════════════════════════════════════════════════════════════

    error InvalidTitle();
    error TooManyTags(uint256 max);
    error DocumentNotFound(uint256 docId);
    error DocumentIsArchived(uint256 docId);
    error InvalidParentVersion(uint256 versionId);
    error InsufficientStake(uint256 required, uint256 provided);
    error ProposalNotFound(uint256 proposalId);
    error ProposalNotActive(uint256 proposalId);
    error AlreadyVoted(address voter, uint256 proposalId);
    error VotingEnded(uint256 proposalId);
    error VotingNotEnded(uint256 proposalId);
    error NotProposer(address caller, address proposer);
    error OnlyOwner();
    error TransferFailed();

    // ═══════════════════════════════════════════════════════════════════
    //  EVENTS
    // ═══════════════════════════════════════════════════════════════════

    // --- Registry Events ---
    event DocumentCreated(
        uint256 indexed docId,
        address indexed author,
        string title,
        string[] tags,
        uint256 timestamp
    );

    event DocumentArchived(
        uint256 indexed docId,
        uint256 timestamp
    );

    event TagsUpdated(
        uint256 indexed docId,
        string[] oldTags,
        string[] newTags
    );

    // --- Version Events ---
    event VersionStored(
        uint256 indexed versionId,
        uint256 indexed docId,
        uint256 indexed parentVersionId,
        address author,
        bytes32 contentHash,
        uint256 blockNumber
    );

    // --- Governance Events ---
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        ProposalType proposalType,
        uint256 indexed docId,
        uint256 stakeAmount,
        uint256 startTime,
        uint256 endTime
    );

    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 timestamp
    );

    event ProposalExecuted(
        uint256 indexed proposalId,
        uint256 timestamp
    );

    event ProposalRejected(
        uint256 indexed proposalId,
        uint256 yesVotes,
        uint256 noVotes
    );

    event ProposalCancelled(
        uint256 indexed proposalId,
        address cancelledBy
    );

    event StakeSlashed(
        uint256 indexed proposalId,
        address indexed proposer,
        uint256 slashedAmount
    );

    event GovernanceParamsUpdated(
        uint256 minStake,
        uint256 votingPeriod,
        uint256 passingThreshold
    );

    // ═══════════════════════════════════════════════════════════════════
    //  MODIFIERS
    // ═══════════════════════════════════════════════════════════════════

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════

    constructor() {
        owner = msg.sender;

        // Default governance parameters (tuned for testnet)
        params = GovernanceParams({
            minStake:           1e15,       // 0.001 PAS (low for testnet)
            votingPeriod:       3 days,     // 3 days (shorter for testnet, 7 days in production)
            passingThreshold:   60,         // 60%
            slashRatioNormal:   30,         // 30%
            maxTagsPerDoc:      10
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    //  DOCUMENT MANAGEMENT (Registry)
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Create a new document with an initial version
    /// @param title Document title (1-200 bytes)
    /// @param tags Document tags (max 10, each max 32 bytes)
    /// @param contentHash SHA256 hash of the initial Markdown content
    /// @param compression Compression type used for the calldata
    /// @param contentLength Original content byte length before compression
    /// @return docId The ID of the newly created document
    /// @dev The Markdown content itself is passed as calldata in the transaction,
    ///      making it permanently stored on-chain without requiring contract storage.
    function createDocument(
        string calldata title,
        string[] calldata tags,
        bytes32 contentHash,
        CompressionType compression,
        uint32 contentLength
    ) external returns (uint256 docId) {
        // Validate title
        bytes memory titleBytes = bytes(title);
        if (titleBytes.length == 0 || titleBytes.length > 200) revert InvalidTitle();

        // Validate tags
        if (tags.length > params.maxTagsPerDoc) revert TooManyTags(params.maxTagsPerDoc);

        // Create document
        docId = ++totalDocuments;

        // Store initial version
        uint256 versionId = _storeVersion(
            docId,
            0,              // parentVersionId = 0 (initial version)
            msg.sender,
            contentHash,
            compression,
            contentLength
        );

        // Build document record
        Document storage doc = _documents[docId];
        doc.id = docId;
        doc.title = title;
        doc.author = msg.sender;
        doc.currentVersionId = versionId;
        doc.createdAt = block.timestamp;
        doc.updatedAt = block.timestamp;
        doc.status = DocumentStatus.Active;

        // Copy tags
        for (uint256 i = 0; i < tags.length; i++) {
            doc.tags.push(tags[i]);
        }

        emit DocumentCreated(docId, msg.sender, title, tags, block.timestamp);
    }

    /// @notice Update document tags (only by owner or document author)
    /// @param docId Document ID
    /// @param newTags New tag list
    function updateTags(uint256 docId, string[] calldata newTags) external {
        Document storage doc = _documents[docId];
        if (doc.id == 0) revert DocumentNotFound(docId);
        if (doc.status == DocumentStatus.Archived) revert DocumentIsArchived(docId);
        if (newTags.length > params.maxTagsPerDoc) revert TooManyTags(params.maxTagsPerDoc);

        // Only document author or contract owner can update tags
        require(msg.sender == doc.author || msg.sender == owner, "Not authorized");

        string[] memory oldTags = doc.tags;

        // Replace tags
        delete doc.tags;
        for (uint256 i = 0; i < newTags.length; i++) {
            doc.tags.push(newTags[i]);
        }
        doc.updatedAt = block.timestamp;

        emit TagsUpdated(docId, oldTags, newTags);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  PROPOSAL SYSTEM (Governance)
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Submit a version update proposal with stake
    /// @param docId Target document ID
    /// @param parentVersionId Parent version ID (which version this is based on)
    /// @param contentHash SHA256 hash of the new Markdown content
    /// @param compression Compression type
    /// @param contentLength Original content byte length
    /// @param description Proposal description (max 500 bytes)
    /// @return proposalId The ID of the created proposal
    /// @dev Caller must send PAS as stake (msg.value >= minStake).
    ///      The Markdown content is passed as extra calldata in the transaction.
    function proposeVersion(
        uint256 docId,
        uint256 parentVersionId,
        bytes32 contentHash,
        CompressionType compression,
        uint32 contentLength,
        string calldata description
    ) external payable returns (uint256 proposalId) {
        // Validate document exists and is active
        Document storage doc = _documents[docId];
        if (doc.id == 0) revert DocumentNotFound(docId);
        if (doc.status == DocumentStatus.Archived) revert DocumentIsArchived(docId);

        // Validate parent version belongs to this document
        if (parentVersionId != 0) {
            Version storage parentVer = _versions[parentVersionId];
            if (parentVer.id == 0 || parentVer.docId != docId) {
                revert InvalidParentVersion(parentVersionId);
            }
        }

        // Validate stake
        if (msg.value < params.minStake) {
            revert InsufficientStake(params.minStake, msg.value);
        }

        // Store the new version
        uint256 versionId = _storeVersion(
            docId,
            parentVersionId,
            msg.sender,
            contentHash,
            compression,
            contentLength
        );

        // Create proposal
        proposalId = ++totalProposals;
        Proposal storage prop = _proposals[proposalId];
        prop.id = proposalId;
        prop.proposalType = ProposalType.VersionUpdate;
        prop.proposer = msg.sender;
        prop.docId = docId;
        prop.targetVersionId = versionId;
        prop.stakeAmount = msg.value;
        prop.startTime = block.timestamp;
        prop.endTime = block.timestamp + params.votingPeriod;
        prop.status = ProposalStatus.Active;
        prop.description = description;
        prop.contentHash = contentHash;

        emit ProposalCreated(
            proposalId,
            msg.sender,
            ProposalType.VersionUpdate,
            docId,
            msg.value,
            prop.startTime,
            prop.endTime
        );
    }

    /// @notice Cast a vote on an active proposal
    /// @param proposalId Proposal ID
    /// @param support true = yes, false = no
    function vote(uint256 proposalId, bool support) external {
        Proposal storage prop = _proposals[proposalId];
        if (prop.id == 0) revert ProposalNotFound(proposalId);
        if (prop.status != ProposalStatus.Active) revert ProposalNotActive(proposalId);
        if (block.timestamp > prop.endTime) revert VotingEnded(proposalId);
        if (_hasVoted[proposalId][msg.sender]) revert AlreadyVoted(msg.sender, proposalId);

        _hasVoted[proposalId][msg.sender] = true;
        _voteChoice[proposalId][msg.sender] = support;

        // Simple 1-address-1-vote for MVP
        // In production: DOT balance snapshot + NFT multiplier + lock bonus
        if (support) {
            prop.yesVotes += 1;
        } else {
            prop.noVotes += 1;
        }

        emit VoteCast(proposalId, msg.sender, support, block.timestamp);
    }

    /// @notice Execute a proposal after voting period ends
    /// @param proposalId Proposal ID
    function executeProposal(uint256 proposalId) external {
        Proposal storage prop = _proposals[proposalId];
        if (prop.id == 0) revert ProposalNotFound(proposalId);
        if (prop.status != ProposalStatus.Active) revert ProposalNotActive(proposalId);
        if (block.timestamp <= prop.endTime) revert VotingNotEnded(proposalId);

        uint256 totalVotes = prop.yesVotes + prop.noVotes;

        // Check passing condition: yesVotes > passingThreshold% of total votes
        // If no votes cast, proposal expires
        if (totalVotes == 0) {
            prop.status = ProposalStatus.Expired;
            // Return full stake on expiry
            _transferStake(prop.proposer, prop.stakeAmount);
            return;
        }

        bool passed = (prop.yesVotes * 100) / totalVotes >= params.passingThreshold;

        if (passed) {
            prop.status = ProposalStatus.Passed;
            _executePassedProposal(prop);
            prop.status = ProposalStatus.Executed;

            // Return full stake on success
            _transferStake(prop.proposer, prop.stakeAmount);

            emit ProposalExecuted(proposalId, block.timestamp);
        } else {
            prop.status = ProposalStatus.Rejected;

            // Slash stake on rejection
            uint256 slashAmount = (prop.stakeAmount * params.slashRatioNormal) / 100;
            uint256 returnAmount = prop.stakeAmount - slashAmount;
            _transferStake(prop.proposer, returnAmount);

            emit StakeSlashed(proposalId, prop.proposer, slashAmount);
            emit ProposalRejected(proposalId, prop.yesVotes, prop.noVotes);
        }
    }

    /// @notice Cancel a proposal (only by proposer, only if still Active)
    /// @param proposalId Proposal ID
    function cancelProposal(uint256 proposalId) external {
        Proposal storage prop = _proposals[proposalId];
        if (prop.id == 0) revert ProposalNotFound(proposalId);
        if (msg.sender != prop.proposer) revert NotProposer(msg.sender, prop.proposer);

        // Can only cancel if Active and no votes have been cast
        require(
            prop.status == ProposalStatus.Active && prop.yesVotes == 0 && prop.noVotes == 0,
            "Cannot cancel: votes already cast or not active"
        );

        prop.status = ProposalStatus.Cancelled;

        // Return full stake on cancellation
        _transferStake(prop.proposer, prop.stakeAmount);

        emit ProposalCancelled(proposalId, msg.sender);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  READ FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Get document information
    function getDocument(uint256 docId) external view returns (Document memory) {
        if (_documents[docId].id == 0) revert DocumentNotFound(docId);
        return _documents[docId];
    }

    /// @notice Get version information
    function getVersion(uint256 versionId) external view returns (Version memory) {
        require(_versions[versionId].id != 0, "Version not found");
        return _versions[versionId];
    }

    /// @notice Get all version IDs for a document
    function getVersionHistory(uint256 docId) external view returns (uint256[] memory) {
        if (_documents[docId].id == 0) revert DocumentNotFound(docId);
        return _docVersionIds[docId];
    }

    /// @notice Get children of a version (forks)
    function getVersionChildren(uint256 versionId) external view returns (uint256[] memory) {
        return _versionChildren[versionId];
    }

    /// @notice Get proposal information
    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        if (_proposals[proposalId].id == 0) revert ProposalNotFound(proposalId);
        return _proposals[proposalId];
    }

    /// @notice Check if an address has voted on a proposal
    function hasVoted(uint256 proposalId, address voter) external view returns (bool) {
        return _hasVoted[proposalId][voter];
    }

    /// @notice Get the vote choice of an address for a proposal
    function getVoteChoice(uint256 proposalId, address voter) external view returns (bool voted, bool support) {
        voted = _hasVoted[proposalId][voter];
        support = _voteChoice[proposalId][voter];
    }

    /// @notice List documents with pagination
    /// @param offset Start index (1-based document IDs)
    /// @param limit Maximum number of documents to return (max 50)
    function listDocuments(
        uint256 offset,
        uint256 limit
    ) external view returns (Document[] memory docs, uint256 total) {
        total = totalDocuments;
        if (offset >= total || limit == 0) {
            return (new Document[](0), total);
        }

        uint256 maxLimit = limit > 50 ? 50 : limit;
        uint256 end = offset + maxLimit;
        if (end > total) end = total;
        uint256 count = end - offset;

        docs = new Document[](count);
        for (uint256 i = 0; i < count; i++) {
            docs[i] = _documents[offset + i + 1]; // IDs are 1-based
        }
    }

    /// @notice List proposals with pagination
    function listProposals(
        uint256 offset,
        uint256 limit
    ) external view returns (Proposal[] memory proposals, uint256 total) {
        total = totalProposals;
        if (offset >= total || limit == 0) {
            return (new Proposal[](0), total);
        }

        uint256 maxLimit = limit > 50 ? 50 : limit;
        uint256 end = offset + maxLimit;
        if (end > total) end = total;
        uint256 count = end - offset;

        proposals = new Proposal[](count);
        for (uint256 i = 0; i < count; i++) {
            proposals[i] = _proposals[offset + i + 1]; // IDs are 1-based
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    /// @notice Update governance parameters (only owner, will be DAO-controlled in production)
    function updateGovernanceParams(
        uint256 minStake,
        uint256 votingPeriod,
        uint256 passingThreshold,
        uint256 slashRatioNormal,
        uint256 maxTagsPerDoc
    ) external onlyOwner {
        require(passingThreshold <= 100, "Threshold must be <= 100");
        require(slashRatioNormal <= 100, "Slash ratio must be <= 100");
        require(maxTagsPerDoc > 0 && maxTagsPerDoc <= 20, "Invalid max tags");

        params = GovernanceParams({
            minStake: minStake,
            votingPeriod: votingPeriod,
            passingThreshold: passingThreshold,
            slashRatioNormal: slashRatioNormal,
            maxTagsPerDoc: maxTagsPerDoc
        });

        emit GovernanceParamsUpdated(minStake, votingPeriod, passingThreshold);
    }

    /// @notice Archive a document (only owner for MVP, DAO proposal in production)
    function archiveDocument(uint256 docId) external onlyOwner {
        Document storage doc = _documents[docId];
        if (doc.id == 0) revert DocumentNotFound(docId);
        if (doc.status == DocumentStatus.Archived) revert DocumentIsArchived(docId);

        doc.status = DocumentStatus.Archived;
        doc.updatedAt = block.timestamp;

        emit DocumentArchived(docId, block.timestamp);
    }

    /// @notice Transfer contract ownership
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }

    /// @notice Withdraw slashed stakes (only owner)
    function withdrawSlashedStakes(address payable to) external onlyOwner {
        uint256 bal = address(this).balance;
        require(bal > 0, "No balance");
        (bool ok, ) = to.call{value: bal}("");
        if (!ok) revert TransferFailed();
    }

    // ═══════════════════════════════════════════════════════════════════
    //  INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════

    /// @dev Store a new version record
    function _storeVersion(
        uint256 docId,
        uint256 parentVersionId,
        address author,
        bytes32 contentHash,
        CompressionType compression,
        uint32 contentLength
    ) internal returns (uint256 versionId) {
        versionId = ++totalVersions;

        _versions[versionId] = Version({
            id: versionId,
            docId: docId,
            parentVersionId: parentVersionId,
            author: author,
            contentHash: contentHash,
            blockNumber: block.number,
            timestamp: block.timestamp,
            compression: compression,
            contentLength: contentLength
        });

        _docVersionIds[docId].push(versionId);

        // Track parent-child relationship for version tree
        if (parentVersionId != 0) {
            _versionChildren[parentVersionId].push(versionId);
        }

        emit VersionStored(
            versionId,
            docId,
            parentVersionId,
            author,
            contentHash,
            block.number
        );
    }

    /// @dev Execute a passed proposal
    function _executePassedProposal(Proposal storage prop) internal {
        if (prop.proposalType == ProposalType.VersionUpdate) {
            // Update the document's current version to the proposed version
            Document storage doc = _documents[prop.docId];
            doc.currentVersionId = prop.targetVersionId;
            doc.updatedAt = block.timestamp;
        }
        // Future: handle ParameterChange, ArchiveDocument, etc.
    }

    /// @dev Transfer PAS back to an address
    function _transferStake(address to, uint256 amount) internal {
        if (amount == 0) return;
        (bool ok, ) = payable(to).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    /// @notice Allow contract to receive PAS (for donations / treasury in future)
    receive() external payable {}
}

