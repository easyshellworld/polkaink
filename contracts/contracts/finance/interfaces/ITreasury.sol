// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title ITreasury
/// @notice DAO treasury interface: manages DOT fund intake, allocation, and spending
interface ITreasury {

    enum SpendCategory {
        ProposerReward,
        OperationalReserve,
        CouncilOperations,
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

    function distributeProposalReward(uint256 proposalId, address proposer, uint256 totalReward) external;
    function executeSpend(uint256 spendId) external;
    function createSpendRequest(SpendCategory category, address recipient, uint256 amount, string calldata description, uint256 proposalId) external returns (uint256 spendId);
    function deployLiquidity(address protocol, uint256 amount, bytes calldata data) external;

    function balance() external view returns (uint256);
    function getSpendRecord(uint256 spendId) external view returns (SpendRecord memory);
    function getTotals() external view returns (uint256 totalIncome, uint256 totalSpent);
    function listSpendRecords(uint256 offset, uint256 limit) external view returns (SpendRecord[] memory records, uint256 total);

    event FundsReceived(address indexed sender, uint256 amount, string note);
    event RewardDistributed(uint256 indexed proposalId, address indexed proposer, uint256 proposerAmount, uint256 treasuryRetained);
    event SpendExecuted(uint256 indexed spendId, SpendCategory category, address indexed recipient, uint256 amount);
    event LiquidityDeployed(address indexed protocol, uint256 amount, uint256 timestamp);

    error Treasury__InsufficientBalance(uint256 requested, uint256 available);
    error Treasury__SpendNotApproved(uint256 spendId);
    error Treasury__Unauthorized();
}
