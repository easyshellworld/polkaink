// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title ITreasury v2
/// @notice DAO treasury: receives early-unlock penalties and community donations
interface ITreasury {

    enum SpendCategory {
        CommunityRewards,
        OperationalReserve,
        ExternalGrant,
        LiquidityDeployment
    }

    struct SpendRecord {
        uint256 id;
        SpendCategory category;
        address recipient;
        uint256 amount;
        string description;
        uint256 proposalId;
        uint256 timestamp;
        bool executed;
    }

    receive() external payable;

    function executeSpend(uint256 spendId) external;
    function createSpendRequest(SpendCategory category, address recipient, uint256 amount, string calldata description, uint256 proposalId) external returns (uint256 spendId);

    function balance() external view returns (uint256);
    function getSpendRecord(uint256 spendId) external view returns (SpendRecord memory);
    function getTotals() external view returns (uint256 totalIncome, uint256 totalSpent);
    function listSpendRecords(uint256 offset, uint256 limit) external view returns (SpendRecord[] memory records, uint256 total);

    event FundsReceived(address indexed sender, uint256 amount, string note);
    event SpendExecuted(uint256 indexed spendId, SpendCategory category, address indexed recipient, uint256 amount);

    error Treasury__InsufficientBalance(uint256 requested, uint256 available);
    error Treasury__SpendNotApproved(uint256 spendId);
    error Treasury__Unauthorized();
}
