// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./interfaces/INFTReward.sol";

/// @title NFTReward v3.3
/// @notice Three soulbound NFT types for PolkaInk governance.
///         Guardian NFTs are minted in the constructor for genesis council members.
///         No GUARDIAN_MINTER_ROLE exists; Guardian supply is permanently fixed.
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
    bytes32 public constant UPGRADER_ROLE       = keccak256("UPGRADER_ROLE");

    uint256 private _tokenCounter;
    mapping(uint256 => NFTMetadata) private _metadata;
    mapping(address => uint256[]) private _holderNFTs;
    mapping(address => mapping(uint8 => uint256[])) private _holderTypeNFTs;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    /// @param admin      Deployer / admin address
    /// @param councilMembers Array of 7 genesis council member addresses; Guardian NFTs minted here
    function initialize(address admin, address[] calldata councilMembers) external initializer {
        __ERC721_init("PolkaInk NFT", "PKINK");
        __AccessControl_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);

        // Mint Guardian NFT for each genesis council member
        for (uint256 i = 0; i < councilMembers.length; i++) {
            _mintNFT(councilMembers[i], NFTType.Guardian, 0, 0, 0);
        }
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

    function deactivate(uint256 tokenId) external {
        NFTMetadata storage m = _metadata[tokenId];
        if (!m.active) revert NFT__NotActive(tokenId);
        bool authorized = hasRole(MEMBER_MINTER_ROLE, msg.sender)
            || hasRole(DEFAULT_ADMIN_ROLE, msg.sender);
        if (!authorized) revert NFT__Unauthorized();
        m.active = false;
        emit NFTDeactivated(tokenId, m.nftType);
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

    function hasActiveMember(address holder) external view returns (bool) {
        uint256[] storage ids = _holderTypeNFTs[holder][uint8(NFTType.Member)];
        for (uint256 i = 0; i < ids.length; i++) {
            if (_metadata[ids[i]].active) return true;
        }
        return false;
    }

    function hasActiveGuardian(address holder) external view returns (bool) {
        return _countActive(_holderTypeNFTs[holder][uint8(NFTType.Guardian)]) > 0;
    }

    function tokenURI(uint256 tokenId)
        public view override(ERC721Upgradeable, INFTReward) returns (string memory)
    {
        _requireOwned(tokenId);
        NFTMetadata storage m = _metadata[tokenId];
        string[3] memory names = ["Member", "Creator", "Guardian"];
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

    // Soulbound: prevent transfers
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
