// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/ITreasury.sol";

/// @title Treasury
/// @notice Manages DAO funds: proposal stakes, rewards distribution, and DAO-approved spending
contract Treasury is
    Initializable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    ITreasury
{
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant SPEND_ROLE       = keccak256("SPEND_ROLE");
    bytes32 public constant UPGRADER_ROLE    = keccak256("UPGRADER_ROLE");

    /// Proposer reward percentage (70 out of 100)
    uint256 public constant PROPOSER_REWARD_BPS = 70;

    uint256 private _spendCounter;
    mapping(uint256 => SpendRecord) private _spendRecords;

    uint256 private _totalIncome;
    uint256 private _totalSpent;

    // ─── Initializer ──────────────────────────────────────────────────────

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address admin) external initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
    }

    // ─── Receive ──────────────────────────────────────────────────────────

    receive() external payable {
        _totalIncome += msg.value;
        emit FundsReceived(msg.sender, msg.value, "");
    }

    // ─── Write Operations ─────────────────────────────────────────────────

    /// @inheritdoc ITreasury
    function distributeProposalReward(
        uint256 proposalId,
        address proposer,
        uint256 totalReward
    ) external onlyRole(DISTRIBUTOR_ROLE) nonReentrant {
        if (totalReward == 0) return;
        require(address(this).balance >= totalReward, "Treasury: insufficient balance");

        uint256 proposerAmount   = (totalReward * PROPOSER_REWARD_BPS) / 100;
        uint256 treasuryRetained = totalReward - proposerAmount;

        _totalSpent += proposerAmount;
        (bool ok,) = proposer.call{value: proposerAmount}("");
        require(ok, "Treasury: transfer failed");

        emit RewardDistributed(proposalId, proposer, proposerAmount, treasuryRetained);
    }

    /// @inheritdoc ITreasury
    function executeSpend(uint256 spendId) external onlyRole(SPEND_ROLE) nonReentrant {
        SpendRecord storage record = _spendRecords[spendId];
        require(record.id != 0, "Treasury: spend not found");
        require(!record.executed, "Treasury: already executed");

        uint256 amount = record.amount;
        if (address(this).balance < amount)
            revert Treasury__InsufficientBalance(amount, address(this).balance);

        record.executed = true;
        _totalSpent += amount;

        (bool ok,) = record.recipient.call{value: amount}("");
        require(ok, "Treasury: transfer failed");

        emit SpendExecuted(spendId, record.category, record.recipient, amount);
    }

    /// @inheritdoc ITreasury
    function createSpendRequest(
        SpendCategory category,
        address recipient,
        uint256 amount,
        string calldata description,
        uint256 proposalId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (uint256 spendId) {
        _spendCounter++;
        spendId = _spendCounter;

        _spendRecords[spendId] = SpendRecord({
            id:          spendId,
            category:    category,
            recipient:   recipient,
            amount:      amount,
            description: description,
            proposalId:  proposalId,
            timestamp:   block.timestamp,
            executed:    false
        });
    }

    /// @inheritdoc ITreasury
    function deployLiquidity(
        address protocol,
        uint256 amount,
        bytes calldata data
    ) external onlyRole(SPEND_ROLE) nonReentrant {
        require(address(this).balance >= amount, "Treasury: insufficient balance");
        (bool ok,) = protocol.call{value: amount}(data);
        require(ok, "Treasury: liquidity deployment failed");
        emit LiquidityDeployed(protocol, amount, block.timestamp);
    }

    // ─── Read Operations ──────────────────────────────────────────────────

    /// @inheritdoc ITreasury
    function balance() external view returns (uint256) {
        return address(this).balance;
    }

    /// @inheritdoc ITreasury
    function getSpendRecord(uint256 spendId) external view returns (SpendRecord memory) {
        return _spendRecords[spendId];
    }

    /// @inheritdoc ITreasury
    function getTotals() external view returns (uint256 totalIncome, uint256 totalSpent) {
        return (_totalIncome, _totalSpent);
    }

    /// @inheritdoc ITreasury
    function listSpendRecords(
        uint256 offset,
        uint256 limit
    ) external view returns (SpendRecord[] memory records, uint256 total) {
        total = _spendCounter;
        if (limit > 50) limit = 50;
        if (offset >= total) return (new SpendRecord[](0), total);

        uint256 end = offset + limit;
        if (end > total) end = total;
        records = new SpendRecord[](end - offset);
        for (uint256 i = 0; i < end - offset; i++) {
            records[i] = _spendRecords[offset + i + 1];
        }
    }

    // ─── UUPS ─────────────────────────────────────────────────────────────

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}
}
