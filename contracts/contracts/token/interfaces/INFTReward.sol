// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title INFTReward v2
/// @notice Six-type NFT system: Member, Creator, Author, OGBronze, OGSilver, OGGold
interface INFTReward {

    enum NFTType { Member, Creator, Author, OGBronze, OGSilver, OGGold }

    struct NFTMetadata {
        uint256 tokenId;
        NFTType nftType;
        address holder;
        uint256 mintedAt;
        uint256 lockEnd;          // Member only; 0 for others
        uint256 linkedDocId;      // Creator/Author
        uint256 linkedProposalId; // Creator
        bool    active;
    }

    function mintMemberNFT(address to, uint256 lockEnd) external returns (uint256);
    function mintCreatorNFT(address to, uint256 docId, uint256 proposalId) external returns (uint256);
    function mintAuthorNFT(address to, uint256 docId) external returns (uint256);
    function mintOGNFT(address to, NFTType ogType) external returns (uint256);
    function deactivate(uint256 tokenId) external;
    function revokeOGGold(uint256 tokenId) external;

    function getNFTMetadata(uint256 tokenId) external view returns (NFTMetadata memory);
    function getNFTsByHolder(address holder) external view returns (uint256[] memory);
    function getNFTsByType(address holder, NFTType nftType) external view returns (uint256[] memory);
    function activeCreatorCount(address holder) external view returns (uint256);
    function isAuthorOf(address holder, uint256 docId) external view returns (bool);
    function ogCount(address holder, NFTType ogType) external view returns (uint256);
    function hasActiveOGGold(address holder) external view returns (bool);
    function hasActiveMember(address holder) external view returns (bool);
    function tokenURI(uint256 tokenId) external view returns (string memory);

    event NFTMinted(uint256 indexed tokenId, address indexed holder, NFTType nftType, uint256 docId);
    event NFTDeactivated(uint256 indexed tokenId, NFTType nftType);
    event OGGoldRevoked(uint256 indexed tokenId, address indexed holder);

    error NFT__Unauthorized();
    error NFT__OGCapReached(address holder, uint8 ogType);
    error NFT__NotActive(uint256 tokenId);
    error NFT__InvalidOGType(uint8 provided);
    error NFT__Soulbound(uint256 tokenId);
}
