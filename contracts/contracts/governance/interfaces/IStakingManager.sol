// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IStakingManager {

    struct StakeInfo {
        uint256 amount;
        uint256 lockStart;
        uint256 lockEnd;
        uint8   lockMonths; // 3 / 6 / 12 / 24
        bool    active;
        uint256 memberNFTId;
    }

    function stake(uint8 lockMonths) external payable;
    function unstake() external;
    function earlyUnstake() external;

    function getStake(address user) external view returns (StakeInfo memory);
    function isActiveMember(address user) external view returns (bool);
    function totalActiveMembers() external view returns (uint256);
    function totalActiveMemberWeight() external view returns (uint256);

    // STAKE_AMOUNT             = 88e18  (88 PAS)
    // EARLY_UNLOCK_PENALTY_BPS = 1000   (10%)
    // VALID_LOCK_MONTHS        = [3, 6, 12, 24]

    event Staked(address indexed user, uint256 amount, uint8 lockMonths, uint256 lockEnd, uint256 memberNFTId);
    event Unstaked(address indexed user, uint256 amount);
    event EarlyUnstaked(address indexed user, uint256 returned, uint256 penalty);

    error Staking__InvalidLockMonths(uint8 provided);
    error Staking__WrongAmount(uint256 expected, uint256 provided);
    error Staking__AlreadyStaked(address user);
    error Staking__NotStaked(address user);
    error Staking__LockNotExpired(uint256 lockEnd, uint256 now_);
    error Staking__AlreadyExpired(uint256 lockEnd);
}
