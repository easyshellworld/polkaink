// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IVersionStore
/// @notice Document version storage interface: manages version tree and calldata index
interface IVersionStore {

    enum CompressionType { None, Gzip, Zstd }

    struct Version {
        uint256 id;
        uint256 docId;
        uint256 parentVersionId;
        address author;
        bytes32 contentHash;
        uint256 calldataTxHash;
        uint256 blockNumber;
        uint256 timestamp;
        CompressionType compression;
        uint32 contentLength;
        bool isSharded;
        uint8 shardCount;
    }

    struct Shard {
        uint256 versionId;
        uint8 shardIndex;
        bytes32 shardHash;
        uint256 calldataTxHash;
    }

    function storeVersion(
        uint256 docId,
        uint256 parentVersionId,
        address author,
        bytes32 contentHash,
        CompressionType compression,
        uint32 contentLength
    ) external returns (uint256 versionId);

    function appendShard(
        uint256 versionId,
        uint8 shardIndex,
        bytes32 shardHash,
        uint256 calldataTxHash
    ) external;

    function setCurrentVersion(uint256 docId, uint256 versionId) external;

    function getVersion(uint256 versionId) external view returns (Version memory);
    function getShards(uint256 versionId) external view returns (Shard[] memory);
    function getAncestors(uint256 versionId) external view returns (uint256[] memory);
    function getChildren(uint256 versionId) external view returns (uint256[] memory);
    function getCurrentVersion(uint256 docId) external view returns (uint256);
    function getVersionDAG(uint256 docId) external view returns (uint256[] memory versionIds, uint256[] memory parentIds);
    function totalVersions() external view returns (uint256);

    event VersionStored(uint256 indexed versionId, uint256 indexed docId, uint256 indexed parentVersionId, address author, bytes32 contentHash, uint256 blockNumber);
    event ShardAppended(uint256 indexed versionId, uint8 shardIndex, bytes32 shardHash);
}
