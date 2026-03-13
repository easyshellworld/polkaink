// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title VersionTree
/// @notice Version DAG (Directed Acyclic Graph) utility operations
library VersionTree {

    /// @notice Check whether a versionId is an ancestor of descendantId
    /// @param parentMap Mapping of versionId → parentVersionId
    /// @param versionId Potential ancestor version ID
    /// @param descendantId Version ID to trace back from
    /// @param maxDepth Maximum tree depth to traverse (prevents unbounded loops)
    /// @return Whether versionId is an ancestor of descendantId
    function isAncestor(
        mapping(uint256 => uint256) storage parentMap,
        uint256 versionId,
        uint256 descendantId,
        uint256 maxDepth
    ) internal view returns (bool) {
        uint256 current = descendantId;
        for (uint256 i = 0; i < maxDepth; i++) {
            uint256 parent = parentMap[current];
            if (parent == 0) break;
            if (parent == versionId) return true;
            current = parent;
        }
        return false;
    }

    /// @notice Collect all ancestor version IDs from a given version up to root
    /// @param parentMap Mapping of versionId → parentVersionId
    /// @param versionId Starting version ID
    /// @param maxDepth Maximum depth
    /// @return ancestors List of ancestor version IDs (from parent to root)
    function collectAncestors(
        mapping(uint256 => uint256) storage parentMap,
        uint256 versionId,
        uint256 maxDepth
    ) internal view returns (uint256[] memory ancestors) {
        uint256[] memory tmp = new uint256[](maxDepth);
        uint256 count = 0;
        uint256 current = versionId;

        for (uint256 i = 0; i < maxDepth; i++) {
            uint256 parent = parentMap[current];
            if (parent == 0) break;
            tmp[count++] = parent;
            current = parent;
        }

        ancestors = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            ancestors[i] = tmp[i];
        }
    }

    /// @notice Compute the depth of a version from root
    /// @param parentMap Mapping of versionId → parentVersionId
    /// @param versionId Starting version ID
    /// @param maxDepth Maximum depth
    /// @return depth Depth from root (0 = root)
    function depth(
        mapping(uint256 => uint256) storage parentMap,
        uint256 versionId,
        uint256 maxDepth
    ) internal view returns (uint256) {
        uint256 d = 0;
        uint256 current = versionId;
        for (uint256 i = 0; i < maxDepth; i++) {
            uint256 parent = parentMap[current];
            if (parent == 0) break;
            d++;
            current = parent;
        }
        return d;
    }
}
