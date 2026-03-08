// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title VotingMath v3.3
///
/// weight = min(1e18 + boost, 2e18)
/// boost  = B_hist + B_lock
///
/// B_hist = 0.40 * ln(1 + creatorCount) / ln(21), cap 0.40
/// B_lock = 0.40 * ln(1 + lockMonths)  / ln(25)
///          3mo=0.1723, 6mo=0.2418, 12mo=0.3187, 24mo=0.4000
///
/// Single-person max weight = 1.80 < T=2.0; can never pass alone
library VotingMath {

    uint256 internal constant SCALE                   = 1e18;
    int256  internal constant THRESHOLD               = 2e18;
    uint256 internal constant MAX_WEIGHT              = 2e18;
    uint256 internal constant MIN_PARTICIPATION_BPS   = 500;
    uint256 internal constant EMRG_PARTICIPATION_BPS  = 1500;

    // Dynamic reward constants
    uint256 internal constant BASE_REWARD             = 50e18;
    uint256 internal constant VOTER_REWARD_PER_PERSON = 1e18;
    uint256 internal constant TREASURY_CAP_BPS        = 1000;  // 10%
    uint256 internal constant MAX_REWARD_CAP          = 200e18;
    uint256 internal constant MIN_REWARD_THRESHOLD    = 50e18;

    function calculateWeight(
        bool    hasActiveMember,
        uint256 creatorCount,
        uint8   lockMonths
    ) internal pure returns (uint256 weight) {
        if (!hasActiveMember) return 0;
        uint256 boost = boostHist(creatorCount) + boostLock(lockMonths);
        weight = SCALE + boost;
        if (weight > MAX_WEIGHT) weight = MAX_WEIGHT;
    }

    function boostHist(uint256 n) internal pure returns (uint256) {
        if (n == 0)  return 0;
        if (n == 1)  return  91_100_000_000_000_000;
        if (n == 2)  return 144_300_000_000_000_000;
        if (n == 3)  return 182_100_000_000_000_000;
        if (n == 4)  return 212_800_000_000_000_000;
        if (n == 5)  return 235_400_000_000_000_000;
        if (n == 6)  return 255_800_000_000_000_000;
        if (n == 7)  return 273_500_000_000_000_000;
        if (n == 8)  return 289_300_000_000_000_000;
        if (n == 9)  return 303_400_000_000_000_000;
        if (n == 10) return 315_000_000_000_000_000;
        if (n <= 15) return 315_000_000_000_000_000
            + ((n - 10) * (362_000_000_000_000_000 - 315_000_000_000_000_000)) / 5;
        if (n < 20)  return 362_000_000_000_000_000
            + ((n - 15) * (400_000_000_000_000_000 - 362_000_000_000_000_000)) / 5;
        return 400_000_000_000_000_000;
    }

    function boostLock(uint8 m) internal pure returns (uint256) {
        if (m >= 24) return 400_000_000_000_000_000;
        if (m >= 12) return 318_700_000_000_000_000; // 0.3187 (v3.3 corrected)
        if (m >= 6)  return 241_800_000_000_000_000; // 0.2418
        if (m >= 3)  return 172_300_000_000_000_000; // 0.1723
        return 0;
    }

    function checkPassed(
        int256  score,
        uint256 totalVoteWeight,
        uint256 snapshotTotalWeight,
        bool    isEmergency
    ) internal pure returns (bool passed, uint256 participationBps) {
        if (snapshotTotalWeight == 0) return (false, 0);
        participationBps = (totalVoteWeight * 10_000) / snapshotTotalWeight;
        uint256 minBps = isEmergency ? EMRG_PARTICIPATION_BPS : MIN_PARTICIPATION_BPS;
        passed = score > THRESHOLD && participationBps >= minBps;
    }

    /// @notice Calculate total dynamic reward for a VersionUpdate proposal
    /// @param voterCount       All actual voters (no threshold filter)
    /// @param rewardPoolBalance Current Treasury rewardPool balance
    /// @return reward          Actual reward total (0 = insufficient balance, skip distribution)
    function calculateProposalReward(
        uint256 voterCount,
        uint256 rewardPoolBalance
    ) internal pure returns (uint256 reward) {
        if (rewardPoolBalance < MIN_REWARD_THRESHOLD) return 0;
        uint256 voterBonus = voterCount * VOTER_REWARD_PER_PERSON;
        uint256 dynamicCap = rewardPoolBalance * TREASURY_CAP_BPS / 10_000;
        if (dynamicCap > MAX_REWARD_CAP) dynamicCap = MAX_REWARD_CAP;
        reward = BASE_REWARD + voterBonus;
        if (reward > dynamicCap) reward = dynamicCap;
    }
}
