// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title INFTReward
/// @notice Dual-type NFT system interface: Author NFT (historians) + Guardian NFT (council members)
interface INFTReward {

    enum NFTType { Author, Guardian }

    struct NFTMetadata {
        uint256 tokenId;
        NFTType nftType;
        address recipient;
        uint256 mintedAt;
        uint256 linkedProposalId;
        uint256 linkedDocId;
        uint256 linkedVersionId;
        uint256 termEnd;
        bool soulbound;
        bool active;
    }

    function mintAuthorNFT(address recipient, uint256 proposalId, uint256 docId, uint256 versionId) external returns (uint256 tokenId);
    function mintGuardianNFT(address recipient, uint256 termEnd) external returns (uint256 tokenId);
    function deactivateGuardianNFT(uint256 tokenId) external;
    function setAuthorNFTLock(uint256 tokenId, bool locked) external;

    function getNFTMetadata(uint256 tokenId) external view returns (NFTMetadata memory);
    function getAuthorNFTs(address holder) external view returns (uint256[] memory tokenIds);
    function getGuardianNFTs(address holder) external view returns (uint256[] memory tokenIds);
    function hasActiveGuardianNFT(address holder) external view returns (bool);
    function authorNFTCount(address holder) external view returns (uint256);
    function totalMinted(NFTType nftType) external view returns (uint256);
    function tokenURI(uint256 tokenId) external view returns (string memory);

    event AuthorNFTMinted(uint256 indexed tokenId, address indexed recipient, uint256 indexed proposalId, uint256 docId, uint256 versionId);
    event GuardianNFTMinted(uint256 indexed tokenId, address indexed recipient, uint256 termEnd);
    event GuardianNFTDeactivated(uint256 indexed tokenId, address indexed holder, uint256 timestamp);
    event AuthorNFTLockChanged(uint256 indexed tokenId, bool locked);

    error NFT__Soulbound(uint256 tokenId);
    error NFT__NotOwner(uint256 tokenId, address caller);
    error NFT__GuardianNFTExpired(uint256 tokenId);
    error NFT__Unauthorized();
}
