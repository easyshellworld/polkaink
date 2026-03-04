// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./interfaces/INFTReward.sol";

/// @title NFTReward v2
/// @notice Six-type soulbound ERC-721 NFT system for PolkaInk governance
contract NFTReward is
    Initializable,
    ERC721Upgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    INFTReward
{
    using Strings for uint256;

    bytes32 public constant MEMBER_MINTER_ROLE  = keccak256("MEMBER_MINTER_ROLE");
    bytes32 public constant CREATOR_MINTER_ROLE = keccak256("CREATOR_MINTER_ROLE");
    bytes32 public constant AUTHOR_MINTER_ROLE  = keccak256("AUTHOR_MINTER_ROLE");
    bytes32 public constant OG_MINTER_ROLE      = keccak256("OG_MINTER_ROLE");
    bytes32 public constant UPGRADER_ROLE       = keccak256("UPGRADER_ROLE");

    uint256 private _tokenCounter;
    mapping(uint256 => NFTMetadata) private _metadata;
    mapping(address => uint256[]) private _holderNFTs;
    // holder → nftType → tokenIds
    mapping(address => mapping(uint8 => uint256[])) private _holderTypeNFTs;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address admin) external initializer {
        __ERC721_init("PolkaInk NFT", "PKINK");
        __AccessControl_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        _grantRole(OG_MINTER_ROLE, admin);
    }

    // ─── Mint Operations ──────────────────────────────────────────────────

    function mintMemberNFT(address to, uint256 lockEnd)
        external onlyRole(MEMBER_MINTER_ROLE) returns (uint256)
    {
        return _mintNFT(to, NFTType.Member, 0, 0, lockEnd);
    }

    function mintCreatorNFT(address to, uint256 docId, uint256 proposalId)
        external onlyRole(CREATOR_MINTER_ROLE) returns (uint256)
    {
        return _mintNFT(to, NFTType.Creator, docId, proposalId, 0);
    }

    function mintAuthorNFT(address to, uint256 docId)
        external onlyRole(AUTHOR_MINTER_ROLE) returns (uint256)
    {
        return _mintNFT(to, NFTType.Author, docId, 0, 0);
    }

    function mintOGNFT(address to, NFTType ogType)
        external onlyRole(OG_MINTER_ROLE) returns (uint256)
    {
        uint8 t = uint8(ogType);
        if (t < uint8(NFTType.OGBronze) || t > uint8(NFTType.OGGold))
            revert NFT__InvalidOGType(t);

        uint256[] storage existing = _holderTypeNFTs[to][t];
        uint256 activeCount = _countActive(existing);
        if (ogType == NFTType.OGBronze && activeCount >= 3) revert NFT__OGCapReached(to, t);
        if (ogType == NFTType.OGSilver && activeCount >= 2) revert NFT__OGCapReached(to, t);
        if (ogType == NFTType.OGGold   && activeCount >= 1) revert NFT__OGCapReached(to, t);

        return _mintNFT(to, ogType, 0, 0, 0);
    }

    function deactivate(uint256 tokenId) external {
        NFTMetadata storage m = _metadata[tokenId];
        if (!m.active) revert NFT__NotActive(tokenId);
        bool authorized = hasRole(MEMBER_MINTER_ROLE, msg.sender)
            || hasRole(DEFAULT_ADMIN_ROLE, msg.sender);
        if (!authorized) revert NFT__Unauthorized();
        m.active = false;
        emit NFTDeactivated(tokenId, m.nftType);
    }

    function revokeOGGold(uint256 tokenId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        NFTMetadata storage m = _metadata[tokenId];
        require(m.nftType == NFTType.OGGold, "NFTReward: not OG Gold");
        m.active = false;
        emit OGGoldRevoked(tokenId, m.holder);
    }

    // ─── Read Operations ──────────────────────────────────────────────────

    function getNFTMetadata(uint256 tokenId) external view returns (NFTMetadata memory) {
        return _metadata[tokenId];
    }

    function getNFTsByHolder(address holder) external view returns (uint256[] memory) {
        return _holderNFTs[holder];
    }

    function getNFTsByType(address holder, NFTType nftType) external view returns (uint256[] memory) {
        return _holderTypeNFTs[holder][uint8(nftType)];
    }

    function activeCreatorCount(address holder) external view returns (uint256) {
        return _countActive(_holderTypeNFTs[holder][uint8(NFTType.Creator)]);
    }

    function isAuthorOf(address holder, uint256 docId) external view returns (bool) {
        uint256[] storage ids = _holderTypeNFTs[holder][uint8(NFTType.Author)];
        for (uint256 i = 0; i < ids.length; i++) {
            NFTMetadata storage m = _metadata[ids[i]];
            if (m.active && m.linkedDocId == docId) return true;
        }
        return false;
    }

    function ogCount(address holder, NFTType ogType) external view returns (uint256) {
        return _countActive(_holderTypeNFTs[holder][uint8(ogType)]);
    }

    function hasActiveOGGold(address holder) external view returns (bool) {
        return _countActive(_holderTypeNFTs[holder][uint8(NFTType.OGGold)]) > 0;
    }

    function hasActiveMember(address holder) external view returns (bool) {
        uint256[] storage ids = _holderTypeNFTs[holder][uint8(NFTType.Member)];
        for (uint256 i = 0; i < ids.length; i++) {
            if (_metadata[ids[i]].active) return true;
        }
        return false;
    }

    function tokenURI(uint256 tokenId)
        public view override(ERC721Upgradeable, INFTReward) returns (string memory)
    {
        _requireOwned(tokenId);
        NFTMetadata storage m = _metadata[tokenId];
        string[6] memory names = ["Member", "Creator", "Author", "OG Bronze", "OG Silver", "OG Gold"];
        string memory typeName = names[uint8(m.nftType)];
        string memory json = string(abi.encodePacked(
            '{"name":"PolkaInk ', typeName, ' #', tokenId.toString(), '",',
            '"description":"PolkaInk on-chain history NFT",',
            '"attributes":[',
            '{"trait_type":"Type","value":"', typeName, '"},',
            '{"trait_type":"DocId","value":"', m.linkedDocId.toString(), '"},',
            '{"trait_type":"Active","value":"', m.active ? "true" : "false", '"}',
            ']}'
        ));
        return string(abi.encodePacked("data:application/json;utf8,", json));
    }

    // ─── Internal ─────────────────────────────────────────────────────────

    function _mintNFT(
        address to, NFTType nftType, uint256 docId, uint256 proposalId, uint256 lockEnd
    ) internal returns (uint256 tokenId) {
        _tokenCounter++;
        tokenId = _tokenCounter;

        _metadata[tokenId] = NFTMetadata({
            tokenId: tokenId,
            nftType: nftType,
            holder: to,
            mintedAt: block.timestamp,
            lockEnd: lockEnd,
            linkedDocId: docId,
            linkedProposalId: proposalId,
            active: true
        });

        _holderNFTs[to].push(tokenId);
        _holderTypeNFTs[to][uint8(nftType)].push(tokenId);
        _safeMint(to, tokenId);

        emit NFTMinted(tokenId, to, nftType, docId);
    }

    function _countActive(uint256[] storage ids) internal view returns (uint256 count) {
        for (uint256 i = 0; i < ids.length; i++) {
            if (_metadata[ids[i]].active) count++;
        }
    }

    // All NFTs are soulbound (non-transferable)
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert NFT__Soulbound(tokenId);
        }
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721Upgradeable, AccessControlUpgradeable) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}
}
