// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IStakingManager.sol";
import "../token/interfaces/INFTReward.sol";

/// @title StakingManager
/// @notice Manages 88 DOT staking for PolkaInk membership
contract StakingManager is
    Initializable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    IStakingManager
{
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    uint256 public constant STAKE_AMOUNT = 88 ether; // 88 DOT
    uint256 public constant EARLY_UNLOCK_PENALTY_BPS = 10; // 10%

    INFTReward public nftReward;
    address public treasury;

    mapping(address => StakeInfo) private _stakes;
    uint256 private _activeMemberCount;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(
        address admin,
        address _nftReward,
        address _treasury
    ) external initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        nftReward = INFTReward(_nftReward);
        treasury = _treasury;
    }

    function stake(uint8 lockMonths) external payable nonReentrant {
        if (msg.value != STAKE_AMOUNT)
            revert Staking__WrongAmount(STAKE_AMOUNT, msg.value);
        if (!_isValidLockMonths(lockMonths))
            revert Staking__InvalidLockMonths(lockMonths);
        if (_stakes[msg.sender].active)
            revert Staking__AlreadyStaked(msg.sender);

        uint256 lockEnd = block.timestamp + uint256(lockMonths) * 30 days;
        uint256 nftId = nftReward.mintMemberNFT(msg.sender, lockEnd);

        _stakes[msg.sender] = StakeInfo({
            amount: msg.value,
            lockStart: block.timestamp,
            lockEnd: lockEnd,
            lockMonths: lockMonths,
            active: true,
            memberNFTId: nftId
        });
        _activeMemberCount++;

        emit Staked(msg.sender, msg.value, lockMonths, lockEnd, nftId);
    }

    function unstake() external nonReentrant {
        StakeInfo storage info = _stakes[msg.sender];
        if (!info.active) revert Staking__NotStaked(msg.sender);
        if (block.timestamp < info.lockEnd)
            revert Staking__LockNotExpired(info.lockEnd, block.timestamp);

        uint256 amount = info.amount;
        info.active = false;
        _activeMemberCount--;

        nftReward.deactivate(info.memberNFTId);

        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "StakingManager: transfer failed");

        emit Unstaked(msg.sender, amount);
    }

    function earlyUnstake() external nonReentrant {
        StakeInfo storage info = _stakes[msg.sender];
        if (!info.active) revert Staking__NotStaked(msg.sender);
        if (block.timestamp >= info.lockEnd)
            revert Staking__AlreadyExpired(info.lockEnd);

        uint256 penalty = (info.amount * EARLY_UNLOCK_PENALTY_BPS) / 100;
        uint256 returned = info.amount - penalty;
        info.active = false;
        _activeMemberCount--;

        nftReward.deactivate(info.memberNFTId);

        // Send penalty to Treasury
        (bool ok1,) = treasury.call{value: penalty}("");
        require(ok1, "StakingManager: penalty transfer failed");

        // Return remainder to user
        (bool ok2,) = msg.sender.call{value: returned}("");
        require(ok2, "StakingManager: return transfer failed");

        emit EarlyUnstaked(msg.sender, returned, penalty);
    }

    function getStake(address user) external view returns (StakeInfo memory) {
        return _stakes[user];
    }

    function isActiveMember(address user) external view returns (bool) {
        return _stakes[user].active;
    }

    function totalActiveMembers() external view returns (uint256) {
        return _activeMemberCount;
    }

    function _isValidLockMonths(uint8 m) internal pure returns (bool) {
        return m == 3 || m == 6 || m == 12 || m == 24;
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}
}
