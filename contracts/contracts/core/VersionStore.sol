// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../libraries/VersionTree.sol";
import "./interfaces/IVersionStore.sol";

/// @title VersionStore
/// @notice Stores document version metadata and shard indexes on-chain
/// @dev UUPS upgradeable; only PolkaInkRegistry (WRITER_ROLE) can write versions
contract VersionStore is Initializable, AccessControlUpgradeable, UUPSUpgradeable, IVersionStore {

    using VersionTree for mapping(uint256 => uint256);

    bytes32 public constant WRITER_ROLE  = keccak256("WRITER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    uint256 private constant MAX_DEPTH = 256;

    uint256 private _versionCounter;

    /// versionId → Version
    mapping(uint256 => Version) private _versions;

    /// versionId → parentVersionId (for VersionTree lib)
    mapping(uint256 => uint256) private _parentMap;

    /// versionId → Shard[]
    mapping(uint256 => Shard[]) private _shards;

    /// docId → all versionIds in creation order
    mapping(uint256 => uint256[]) private _docVersions;

    /// versionId → children versionIds
    mapping(uint256 => uint256[]) private _children;

    /// docId → current official versionId
    mapping(uint256 => uint256) private _currentVersion;

    // ─── Initializer ──────────────────────────────────────────────────────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address admin) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
    }

    // ─── Write Operations ─────────────────────────────────────────────────

    /// @inheritdoc IVersionStore
    function storeVersion(
        uint256 docId,
        uint256 parentVersionId,
        address author,
        bytes32 contentHash,
        CompressionType compression,
        uint32 contentLength
    ) external onlyRole(WRITER_ROLE) returns (uint256 versionId) {
        _versionCounter++;
        versionId = _versionCounter;

        _versions[versionId] = Version({
            id:              versionId,
            docId:           docId,
            parentVersionId: parentVersionId,
            author:          author,
            contentHash:     contentHash,
            calldataTxHash:  0, // Updated off-chain via event indexing
            blockNumber:     block.number,
            timestamp:       block.timestamp,
            compression:     compression,
            contentLength:   contentLength,
            isSharded:       false,
            shardCount:      0
        });

        _parentMap[versionId] = parentVersionId;
        _docVersions[docId].push(versionId);
        if (parentVersionId != 0) {
            _children[parentVersionId].push(versionId);
        }

        emit VersionStored(versionId, docId, parentVersionId, author, contentHash, block.number);
    }

    /// @inheritdoc IVersionStore
    function appendShard(
        uint256 versionId,
        uint8 shardIndex,
        bytes32 shardHash,
        uint256 calldataTxHash
    ) external onlyRole(WRITER_ROLE) {
        require(_versions[versionId].id != 0, "VersionStore: version not found");

        _shards[versionId].push(Shard({
            versionId:      versionId,
            shardIndex:     shardIndex,
            shardHash:      shardHash,
            calldataTxHash: calldataTxHash
        }));

        Version storage v = _versions[versionId];
        v.isSharded = true;
        v.shardCount = uint8(_shards[versionId].length);

        emit ShardAppended(versionId, shardIndex, shardHash);
    }

    /// @notice Set the current official version for a document (called by Registry on merge)
    function setCurrentVersion(uint256 docId, uint256 versionId) external onlyRole(WRITER_ROLE) {
        _currentVersion[docId] = versionId;
    }

    // ─── Read Operations ──────────────────────────────────────────────────

    /// @inheritdoc IVersionStore
    function getVersion(uint256 versionId) external view returns (Version memory) {
        return _versions[versionId];
    }

    /// @inheritdoc IVersionStore
    function getShards(uint256 versionId) external view returns (Shard[] memory) {
        return _shards[versionId];
    }

    /// @inheritdoc IVersionStore
    function getAncestors(uint256 versionId) external view returns (uint256[] memory) {
        return VersionTree.collectAncestors(_parentMap, versionId, MAX_DEPTH);
    }

    /// @inheritdoc IVersionStore
    function getChildren(uint256 versionId) external view returns (uint256[] memory) {
        return _children[versionId];
    }

    /// @inheritdoc IVersionStore
    function getCurrentVersion(uint256 docId) external view returns (uint256) {
        return _currentVersion[docId];
    }

    /// @inheritdoc IVersionStore
    function getVersionDAG(
        uint256 docId
    ) external view returns (uint256[] memory versionIds, uint256[] memory parentIds) {
        versionIds = _docVersions[docId];
        parentIds  = new uint256[](versionIds.length);
        for (uint256 i = 0; i < versionIds.length; i++) {
            parentIds[i] = _versions[versionIds[i]].parentVersionId;
        }
    }

    /// @inheritdoc IVersionStore
    function totalVersions() external view returns (uint256) {
        return _versionCounter;
    }

    // ─── UUPS ─────────────────────────────────────────────────────────────

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
}
