// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";

/// @title ProxyAdmin
/// @notice UUPS proxy admin entry point — NOT upgradeable (security anchor)
/// @dev Owner should be transferred to TimelockController post-deployment
contract ProxyAdmin is Ownable {

    /// @param initialOwner Initial owner (deployer; transfer to TimelockController after setup)
    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice Upgrade a UUPS proxy to a new implementation
    /// @param proxy Address of the UUPS proxy to upgrade
    /// @param newImplementation New implementation contract address
    /// @param data Optional calldata for post-upgrade initialization
    function upgradeAndCall(
        address proxy,
        address newImplementation,
        bytes calldata data
    ) external onlyOwner {
        // Calls upgradeTo or upgradeToAndCall on the proxy via UUPS
        if (data.length == 0) {
            (bool ok,) = proxy.call(
                abi.encodeWithSignature("upgradeTo(address)", newImplementation)
            );
            require(ok, "ProxyAdmin: upgrade failed");
        } else {
            (bool ok,) = proxy.call(
                abi.encodeWithSignature("upgradeToAndCall(address,bytes)", newImplementation, data)
            );
            require(ok, "ProxyAdmin: upgradeAndCall failed");
        }
    }
}
