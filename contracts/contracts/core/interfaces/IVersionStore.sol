// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IVersionStore {

    struct Version {
        uint256 versionId;
        uint256 docId;
        uint256 parentVersionId; // 0 = initial version (seed doc first version)
        address author;
        uint256 proposalId;      // seed doc first version proposalId = 0
        bytes32 contentHash;     // seed doc first version contentHash = bytes32(0)
        uint256 txBlock;
        uint256 txIndex;
        uint256 timestamp;
    }

    function storeVersion(
        uint256 docId,
        uint256 parentVersionId,
        address author,
        uint256 proposalId,
        bytes32 contentHash,
        uint256 txBlock,
        uint256 txIndex
    ) external returns (uint256 versionId);
    function linkProposal(uint256 versionId, uint256 proposalId) external;

    function getVersion(uint256 versionId) external view returns (Version memory);
    function getVersionsByDoc(uint256 docId) external view returns (uint256[] memory versionIds);
    function getVersionAncestors(uint256 versionId) external view returns (uint256[] memory);
    function totalVersions() external view returns (uint256);

    event VersionStored(
        uint256 indexed versionId,
        uint256 indexed docId,
        uint256 parentVersionId,
        address indexed author,
        bytes32 contentHash
    );
    event VersionProposalLinked(uint256 indexed versionId, uint256 indexed proposalId);

    error VersionStore__Unauthorized();
    error VersionStore__VersionNotFound(uint256 versionId);
    error VersionStore__ProposalAlreadyLinked(uint256 versionId, uint256 existingProposalId);
}
