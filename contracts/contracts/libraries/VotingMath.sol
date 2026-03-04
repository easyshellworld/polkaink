// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title VotingMath
/// @notice Voting weight calculation library using lookup tables for ln() approximation
library VotingMath {
    uint256 internal constant SCALE = 1e18;
    int256 internal constant THRESHOLD = 2e18; // 2.0

    /// @notice Calculate full voting weight
    /// @return weight = hasActiveMember ? (SCALE + boost) : 0
    function calculateWeight(
        bool hasActiveMember,
        uint256 creatorCount,
        bool isAuthorOfDoc,
        uint256 ogBronzeCount,
        uint256 ogSilverCount,
        bool hasOGGold,
        uint8 lockMonths
    ) internal pure returns (uint256 weight) {
        if (!hasActiveMember) return 0;

        uint256 boost = boostCreator(creatorCount)
            + boostAuthor(isAuthorOfDoc)
            + boostOG(ogBronzeCount, ogSilverCount, hasOGGold)
            + boostLock(lockMonths);

        weight = SCALE + boost;
    }

    /// @dev B_creator = 0.30 * ln(1 + creatorCount) / ln(11)
    ///      Lookup table with linear interpolation for n > 10
    function boostCreator(uint256 n) internal pure returns (uint256) {
        if (n == 0) return 0;
        if (n <= 10) {
            uint256[11] memory t = [
                uint256(0),
                 86_700_000_000_000_000, // 1
                137_400_000_000_000_000, // 2
                173_400_000_000_000_000, // 3
                201_400_000_000_000_000, // 4
                224_200_000_000_000_000, // 5
                243_400_000_000_000_000, // 6
                260_200_000_000_000_000, // 7
                274_900_000_000_000_000, // 8
                288_100_000_000_000_000, // 9
                300_000_000_000_000_000  // 10
            ];
            return t[n];
        }
        // Sparse table for n = 10..50, linear interpolation between key points
        // Key points: (10, 0.3000), (20, 0.3809), (30, 0.4296), (50, 0.4919)
        if (n <= 20) {
            return 300_000_000_000_000_000
                + ((n - 10) * (380_900_000_000_000_000 - 300_000_000_000_000_000)) / 10;
        }
        if (n <= 30) {
            return 380_900_000_000_000_000
                + ((n - 20) * (429_600_000_000_000_000 - 380_900_000_000_000_000)) / 10;
        }
        if (n <= 50) {
            return 429_600_000_000_000_000
                + ((n - 30) * (491_900_000_000_000_000 - 429_600_000_000_000_000)) / 20;
        }
        return 491_900_000_000_000_000; // cap at n=50 value
    }

    /// @dev B_author = 0.15 if isAuthor, else 0
    function boostAuthor(bool isAuthor) internal pure returns (uint256) {
        return isAuthor ? 150_000_000_000_000_000 : 0;
    }

    /// @dev B_og = 0.05 * min(bronze,3) + 0.10 * min(silver,2) + 0.10 * hasGold
    function boostOG(uint256 bronze, uint256 silver, bool gold) internal pure returns (uint256 b) {
        uint256 br = bronze > 3 ? 3 : bronze;
        uint256 sr = silver > 2 ? 2 : silver;
        b = br * 50_000_000_000_000_000  // 0.05 each
          + sr * 100_000_000_000_000_000 // 0.10 each
          + (gold ? 100_000_000_000_000_000 : 0);
    }

    /// @dev B_lock = 0.30 * ln(1 + lockMonths) / ln(25)
    ///      Only valid for lockMonths in {3, 6, 12, 24}
    function boostLock(uint8 lockMonths) internal pure returns (uint256) {
        if (lockMonths >= 24) return 300_000_000_000_000_000; // 0.3000
        if (lockMonths >= 12) return 239_000_000_000_000_000; // 0.2390
        if (lockMonths >= 6)  return 181_400_000_000_000_000; // 0.1814
        if (lockMonths >= 3)  return 129_200_000_000_000_000; // 0.1292
        return 0;
    }

    /// @notice Check if proposal passes: score > THRESHOLD && !goldVetoed
    function checkPassed(int256 score, bool goldVetoed) internal pure returns (bool) {
        if (goldVetoed) return false;
        return score > THRESHOLD;
    }
}
