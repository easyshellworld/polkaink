// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title VotingMath
/// @notice Voting power calculation utilities
library VotingMath {

    uint256 internal constant BASE = 100;

    /// @notice Apply NFT vote multiplier to base voting power
    /// @param baseVotingPower Base voting power (e.g. DOT balance)
    /// @param authorNFTCount Number of Author NFTs held
    /// @param hasGuardianNFT Whether holder has active Guardian NFT
    /// @param nftMultiplier Author NFT multiplier (e.g. 150 = 1.5x, base 100)
    /// @param guardianMultiplier Guardian NFT multiplier (e.g. 200 = 2.0x)
    /// @return power Adjusted voting power
    function applyNFTMultiplier(
        uint256 baseVotingPower,
        uint256 authorNFTCount,
        bool hasGuardianNFT,
        uint256 nftMultiplier,
        uint256 guardianMultiplier
    ) internal pure returns (uint256 power) {
        power = baseVotingPower;

        if (hasGuardianNFT) {
            power = (power * guardianMultiplier) / BASE;
        } else if (authorNFTCount > 0) {
            // NFT multiplier scales with count but caps at reasonable level
            uint256 multiplier = nftMultiplier + ((authorNFTCount - 1) * 10);
            if (multiplier > 300) multiplier = 300; // cap at 3x
            power = (power * multiplier) / BASE;
        }
    }

    /// @notice Apply lock bonus to voting power
    /// @param power Base (optionally NFT-adjusted) voting power
    /// @param lockDays Lock days (0, 30, 90, or 180)
    /// @param lockBonus30d Bonus for 30-day lock (e.g. 120 = 1.2x)
    /// @param lockBonus90d Bonus for 90-day lock
    /// @param lockBonus180d Bonus for 180-day lock
    /// @return Adjusted power
    function applyLockBonus(
        uint256 power,
        uint256 lockDays,
        uint256 lockBonus30d,
        uint256 lockBonus90d,
        uint256 lockBonus180d
    ) internal pure returns (uint256) {
        if (lockDays >= 180) return (power * lockBonus180d) / BASE;
        if (lockDays >= 90)  return (power * lockBonus90d) / BASE;
        if (lockDays >= 30)  return (power * lockBonus30d) / BASE;
        return power;
    }

    /// @notice Check if a proposal passes quorum and threshold
    /// @param yesVotes Total YES votes
    /// @param noVotes Total NO votes
    /// @param totalVotingPower Total voting power in the snapshot
    /// @param quorumNumerator Quorum percentage numerator (e.g. 5 = 5%)
    /// @param passingThreshold Passing threshold (e.g. 60 = 60%)
    /// @return passed Whether proposal passes
    /// @return reason Human-readable failure reason (empty if passed)
    function checkPassed(
        uint256 yesVotes,
        uint256 noVotes,
        uint256 totalVotingPower,
        uint256 quorumNumerator,
        uint256 passingThreshold
    ) internal pure returns (bool passed, string memory reason) {
        uint256 participated = yesVotes + noVotes;
        if (totalVotingPower == 0) {
            return (false, "No voting power");
        }

        uint256 participationBps = (participated * 100) / totalVotingPower;
        if (participationBps < quorumNumerator) {
            return (false, "Quorum not reached");
        }

        uint256 yesBps = (yesVotes * 100) / participated;
        if (yesBps < passingThreshold) {
            return (false, "Threshold not met");
        }

        return (true, "");
    }

    /// @notice Calculate slash amount
    /// @param stakeAmount Original stake
    /// @param slashRatio Slash ratio (e.g. 30 = 30%)
    /// @return slashed Amount to slash
    function calcSlash(uint256 stakeAmount, uint256 slashRatio) internal pure returns (uint256 slashed) {
        slashed = (stakeAmount * slashRatio) / BASE;
    }
}
