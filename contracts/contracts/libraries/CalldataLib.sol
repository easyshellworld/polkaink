// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title CalldataLib
/// @notice Utility library for encoding/decoding calldata Markdown metadata
library CalldataLib {

    uint256 internal constant MAX_SHARD_SIZE = 80 * 1024; // 80 KB

    /// @notice Encode version metadata header for calldata submission
    /// @param schema Protocol schema string (e.g. "polkaink/v1")
    /// @param docId Document ID
    /// @param versionId Version ID
    /// @param parentVersionId Parent version ID
    /// @param author Author address
    /// @param contentHash Content SHA-256 hash
    /// @param contentLength Original uncompressed content length
    /// @param isSharded Whether content is sharded
    /// @param shardIndex Current shard index (0 if not sharded)
    /// @param shardCount Total shard count (0 if not sharded)
    /// @return encoded ABI-encoded header bytes
    function encodeHeader(
        string memory schema,
        uint256 docId,
        uint256 versionId,
        uint256 parentVersionId,
        address author,
        bytes32 contentHash,
        uint32 contentLength,
        bool isSharded,
        uint8 shardIndex,
        uint8 shardCount
    ) internal pure returns (bytes memory encoded) {
        encoded = abi.encode(
            schema,
            docId,
            versionId,
            parentVersionId,
            author,
            contentHash,
            contentLength,
            isSharded,
            shardIndex,
            shardCount
        );
    }

    /// @notice Compute keccak256 hash of content (used for content integrity check)
    /// @param content Raw content bytes
    /// @return hash keccak256 hash of content
    function computeHash(bytes memory content) internal pure returns (bytes32 hash) {
        hash = keccak256(content);
    }

    /// @notice Determine whether content needs sharding
    /// @param compressedSize Compressed content size in bytes
    /// @return Whether sharding is required
    function needsSharding(uint256 compressedSize) internal pure returns (bool) {
        return compressedSize > MAX_SHARD_SIZE;
    }

    /// @notice Calculate number of shards required
    /// @param compressedSize Compressed content size in bytes
    /// @return count Number of shards
    function shardCount(uint256 compressedSize) internal pure returns (uint8 count) {
        uint256 c = (compressedSize + MAX_SHARD_SIZE - 1) / MAX_SHARD_SIZE;
        require(c <= 255, "CalldataLib: too many shards");
        count = uint8(c);
    }
}
