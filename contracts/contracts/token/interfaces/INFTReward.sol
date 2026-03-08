// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title INFTReward v3.3
/// @notice Three NFT types, all Soulbound.
/// @dev Member:   minted on stake (MEMBER_MINTER_ROLE = StakingManager)
///      Creator:  minted on proposal merge (CREATOR_MINTER_ROLE = GovernanceCore)
///      Guardian: minted in constructor for 7 genesis council members; no GUARDIAN_MINTER_ROLE
interface INFTReward {

    enum NFTType { Member, Creator, Guardian }

    struct NFTMetadata {
        uint256 tokenId;
        NFTType nftType;
        address holder;
        uint256 mintedAt;
        uint256 lockEnd;            // Member only
        uint256 linkedDocId;        // Creator only
        uint256 linkedProposalId;   // Creator only
        bool    active;
    }

    // ─── Mint ───

    function mintMemberNFT(address to, uint256 lockEnd) external returns (uint256);   // MEMBER_MINTER_ROLE
    function mintCreatorNFT(address to, uint256 docId, uint256 proposalId) external returns (uint256); // CREATOR_MINTER_ROLE
    // mintGuardianNFT removed; Guardian minted in constructor

    function deactivate(uint256 tokenId) external;

    // ─── Read Operations ───

    function getNFTMetadata(uint256 tokenId) external view returns (NFTMetadata memory);
    function getNFTsByHolder(address holder) external view returns (uint256[] memory);
    function getNFTsByType(address holder, NFTType nftType) external view returns (uint256[] memory);
    function activeCreatorCount(address holder) external view returns (uint256);
    function hasActiveMember(address holder) external view returns (bool);
    function hasActiveGuardian(address holder) external view returns (bool);
    function tokenURI(uint256 tokenId) external view returns (string memory);

    event NFTMinted(uint256 indexed tokenId, address indexed holder, NFTType nftType, uint256 linkedDocId);
    event NFTDeactivated(uint256 indexed tokenId, NFTType nftType);

    error NFT__Unauthorized();
    error NFT__NotActive(uint256 tokenId);
    error NFT__Soulbound(uint256 tokenId);
}
