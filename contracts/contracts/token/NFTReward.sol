// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./interfaces/INFTReward.sol";

/// @title NFTReward
/// @notice Dual-type ERC-721 NFT: Author NFT (tradable) + Guardian NFT (soulbound)
contract NFTReward is
    Initializable,
    ERC721Upgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    INFTReward
{
    using Strings for uint256;

    bytes32 public constant AUTHOR_MINTER_ROLE   = keccak256("AUTHOR_MINTER_ROLE");
    bytes32 public constant GUARDIAN_MINTER_ROLE = keccak256("GUARDIAN_MINTER_ROLE");
    bytes32 public constant UPGRADER_ROLE        = keccak256("UPGRADER_ROLE");

    uint256 private _tokenCounter;

    mapping(uint256 => NFTMetadata) private _metadata;

    // holder → authorNFT tokenIds
    mapping(address => uint256[]) private _authorNFTs;
    // holder → guardianNFT tokenIds
    mapping(address => uint256[]) private _guardianNFTs;

    uint256 private _totalAuthor;
    uint256 private _totalGuardian;

    // ─── Initializer ──────────────────────────────────────────────────────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address admin) external initializer {
        __ERC721_init("PolkaInk NFT", "PKINK");
        __AccessControl_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
    }

    // ─── Write Operations ─────────────────────────────────────────────────

    /// @inheritdoc INFTReward
    function mintAuthorNFT(
        address recipient,
        uint256 proposalId,
        uint256 docId,
        uint256 versionId
    ) external onlyRole(AUTHOR_MINTER_ROLE) returns (uint256 tokenId) {
        _tokenCounter++;
        tokenId = _tokenCounter;
        _totalAuthor++;

        _metadata[tokenId] = NFTMetadata({
            tokenId:          tokenId,
            nftType:          NFTType.Author,
            recipient:        recipient,
            mintedAt:         block.timestamp,
            linkedProposalId: proposalId,
            linkedDocId:      docId,
            linkedVersionId:  versionId,
            termEnd:          0,
            soulbound:        false,
            active:           true
        });

        _authorNFTs[recipient].push(tokenId);
        _safeMint(recipient, tokenId);

        emit AuthorNFTMinted(tokenId, recipient, proposalId, docId, versionId);
    }

    /// @inheritdoc INFTReward
    function mintGuardianNFT(
        address recipient,
        uint256 termEnd
    ) external onlyRole(GUARDIAN_MINTER_ROLE) returns (uint256 tokenId) {
        _tokenCounter++;
        tokenId = _tokenCounter;
        _totalGuardian++;

        _metadata[tokenId] = NFTMetadata({
            tokenId:          tokenId,
            nftType:          NFTType.Guardian,
            recipient:        recipient,
            mintedAt:         block.timestamp,
            linkedProposalId: 0,
            linkedDocId:      0,
            linkedVersionId:  0,
            termEnd:          termEnd,
            soulbound:        true,
            active:           true
        });

        _guardianNFTs[recipient].push(tokenId);
        _safeMint(recipient, tokenId);

        emit GuardianNFTMinted(tokenId, recipient, termEnd);
    }

    /// @inheritdoc INFTReward
    function deactivateGuardianNFT(uint256 tokenId) external onlyRole(GUARDIAN_MINTER_ROLE) {
        NFTMetadata storage meta = _metadata[tokenId];
        require(meta.nftType == NFTType.Guardian, "NFTReward: not a Guardian NFT");
        meta.active = false;
        emit GuardianNFTDeactivated(tokenId, meta.recipient, block.timestamp);
    }

    /// @inheritdoc INFTReward
    function setAuthorNFTLock(uint256 tokenId, bool locked) external {
        NFTMetadata storage meta = _metadata[tokenId];
        require(meta.nftType == NFTType.Author, "NFTReward: not an Author NFT");
        require(ownerOf(tokenId) == msg.sender || hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "NFTReward: not owner");
        meta.soulbound = locked;
        emit AuthorNFTLockChanged(tokenId, locked);
    }

    // ─── Read Operations ──────────────────────────────────────────────────

    /// @inheritdoc INFTReward
    function getNFTMetadata(uint256 tokenId) external view returns (NFTMetadata memory) {
        return _metadata[tokenId];
    }

    /// @inheritdoc INFTReward
    function getAuthorNFTs(address holder) external view returns (uint256[] memory tokenIds) {
        return _authorNFTs[holder];
    }

    /// @inheritdoc INFTReward
    function getGuardianNFTs(address holder) external view returns (uint256[] memory tokenIds) {
        return _guardianNFTs[holder];
    }

    /// @inheritdoc INFTReward
    function hasActiveGuardianNFT(address holder) external view returns (bool) {
        uint256[] storage ids = _guardianNFTs[holder];
        for (uint256 i = 0; i < ids.length; i++) {
            NFTMetadata storage m = _metadata[ids[i]];
            if (m.active && block.timestamp <= m.termEnd) return true;
        }
        return false;
    }

    /// @inheritdoc INFTReward
    function authorNFTCount(address holder) external view returns (uint256) {
        return _authorNFTs[holder].length;
    }

    /// @inheritdoc INFTReward
    function totalMinted(NFTType nftType) external view returns (uint256) {
        return nftType == NFTType.Author ? _totalAuthor : _totalGuardian;
    }

    /// @notice On-chain tokenURI generation (no IPFS required)
    function tokenURI(uint256 tokenId) public view override(ERC721Upgradeable, INFTReward) returns (string memory) {
        _requireOwned(tokenId);
        NFTMetadata storage meta = _metadata[tokenId];
        string memory nftTypeName = meta.nftType == NFTType.Author ? "Author" : "Guardian";
        string memory json = string(abi.encodePacked(
            '{"name":"PolkaInk ', nftTypeName, ' #', tokenId.toString(), '",',
            '"description":"PolkaInk on-chain history NFT",',
            '"attributes":[',
            '{"trait_type":"Type","value":"', nftTypeName, '"},',
            '{"trait_type":"DocId","value":"', meta.linkedDocId.toString(), '"},',
            '{"trait_type":"Active","value":"', meta.active ? "true" : "false", '"}',
            ']}'
        ));
        return string(abi.encodePacked("data:application/json;utf8,", json));
    }

    // ─── Transfer Guards (Soulbound) ──────────────────────────────────────

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            // Transfer check: Guardian NFTs and locked Author NFTs cannot be transferred
            NFTMetadata storage meta = _metadata[tokenId];
            if (meta.soulbound) revert NFT__Soulbound(tokenId);
        }
        return super._update(to, tokenId, auth);
    }

    // ─── Supportsinterface ────────────────────────────────────────────────

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721Upgradeable, AccessControlUpgradeable) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // ─── UUPS ─────────────────────────────────────────────────────────────

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}
}
