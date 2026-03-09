// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IVersionStore.sol";

/// @title VersionStore v3.4
/// @notice Stores on-chain version metadata for all documents.
///         Only PolkaInkRegistry (WRITER_ROLE) can write.
contract VersionStore is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IVersionStore
{
    bytes32 public constant WRITER_ROLE   = keccak256("WRITER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    uint256 private _versionCounter;

    mapping(uint256 => Version)    private _versions;
    mapping(uint256 => uint256[])  private _docVersions;   // docId => versionIds
    mapping(uint256 => uint256)    private _parentMap;      // versionId => parentVersionId

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address admin) external initializer {
        __AccessControl_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
    }

    // ─── Write Operations ─────────────────────────────────────────────────

    function storeVersion(
        uint256 docId,
        uint256 parentVersionId,
        address author,
        uint256 proposalId,
        bytes32 contentHash,
        uint256 txBlock,
        uint256 txIndex
    ) external onlyRole(WRITER_ROLE) returns (uint256 versionId) {
        _versionCounter++;
        versionId = _versionCounter;

        _versions[versionId] = Version({
            versionId:       versionId,
            docId:           docId,
            parentVersionId: parentVersionId,
            author:          author,
            proposalId:      proposalId,
            contentHash:     contentHash,
            txBlock:         txBlock,
            txIndex:         txIndex,
            timestamp:       block.timestamp
        });

        _parentMap[versionId] = parentVersionId;
        _docVersions[docId].push(versionId);

        emit VersionStored(versionId, docId, parentVersionId, author, contentHash);
    }

    function linkProposal(uint256 versionId, uint256 proposalId) external onlyRole(WRITER_ROLE) {
        Version storage v = _versions[versionId];
        if (v.versionId == 0) revert VersionStore__VersionNotFound(versionId);
        if (v.proposalId != 0) {
            revert VersionStore__ProposalAlreadyLinked(versionId, v.proposalId);
        }
        v.proposalId = proposalId;
        emit VersionProposalLinked(versionId, proposalId);
    }

    // ─── Read Operations ──────────────────────────────────────────────────

    function getVersion(uint256 versionId) external view returns (Version memory) {
        if (_versions[versionId].versionId == 0 && versionId != 0)
            revert VersionStore__VersionNotFound(versionId);
        return _versions[versionId];
    }

    function getVersionsByDoc(uint256 docId) external view returns (uint256[] memory) {
        return _docVersions[docId];
    }

    function getVersionAncestors(uint256 versionId) external view returns (uint256[] memory) {
        // Collect ancestors up to depth 256
        uint256[] memory tmp = new uint256[](256);
        uint256 count = 0;
        uint256 cur = _parentMap[versionId];
        while (cur != 0 && count < 256) {
            tmp[count++] = cur;
            cur = _parentMap[cur];
        }
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) result[i] = tmp[i];
        return result;
    }

    function totalVersions() external view returns (uint256) {
        return _versionCounter;
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}
}
