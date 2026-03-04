// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/ITreasury.sol";

/// @title Treasury v2
/// @notice DAO treasury: receives early-unlock penalties and community donations
contract Treasury is
    Initializable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    ITreasury
{
    bytes32 public constant SPEND_ROLE    = keccak256("SPEND_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    uint256 private _spendCounter;
    mapping(uint256 => SpendRecord) private _spendRecords;
    uint256 private _totalIncome;
    uint256 private _totalSpent;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address admin) external initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
    }

    receive() external payable {
        _totalIncome += msg.value;
        emit FundsReceived(msg.sender, msg.value, "");
    }

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
            id: spendId,
            category: category,
            recipient: recipient,
            amount: amount,
            description: description,
            proposalId: proposalId,
            timestamp: block.timestamp,
            executed: false
        });
    }

    function balance() external view returns (uint256) {
        return address(this).balance;
    }

    function getSpendRecord(uint256 spendId) external view returns (SpendRecord memory) {
        return _spendRecords[spendId];
    }

    function getTotals() external view returns (uint256 totalIncome, uint256 totalSpent) {
        return (_totalIncome, _totalSpent);
    }

    function listSpendRecords(
        uint256 offset, uint256 limit
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

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}
}
