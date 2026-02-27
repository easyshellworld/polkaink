// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title TimelockController
/// @notice Custom timelock implementation for PolkaInk governance
/// @dev NOT upgradeable — this is the system's trust anchor.
///      Adapted from OpenZeppelin TimelockController for Polkadot Hub compatibility.
contract TimelockController is AccessControl, ReentrancyGuard {

    bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant CANCELLER_ROLE = keccak256("CANCELLER_ROLE");

    uint256 public constant GRACE_PERIOD = 14 days;
    uint256 public constant DONE_TIMESTAMP = 1; // sentinel value

    /// operationId → executionTimestamp (0 = unscheduled, 1 = done)
    mapping(bytes32 => uint256) private _timestamps;

    uint256 private _minDelay;

    // ─── Events ───────────────────────────────────────────────────────────

    event CallScheduled(bytes32 indexed id, uint256 indexed index, address target, uint256 value, bytes data, bytes32 predecessor, uint256 delay);
    event CallExecuted(bytes32 indexed id, uint256 indexed index, address target, uint256 value, bytes data);
    event Cancelled(bytes32 indexed id);
    event MinDelayChange(uint256 oldDuration, uint256 newDuration);

    // ─── Constructor ──────────────────────────────────────────────────────

    /// @param minDelay Initial minimum delay (e.g. 48 hours = 172800)
    /// @param proposers Addresses granted PROPOSER_ROLE
    /// @param executors Addresses granted EXECUTOR_ROLE (address(0) = anyone)
    /// @param admin Initial admin (typically deployer; should be renounced post-setup)
    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) {
        _minDelay = minDelay;
        emit MinDelayChange(0, minDelay);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(CANCELLER_ROLE, admin);

        for (uint256 i = 0; i < proposers.length; i++) {
            _grantRole(PROPOSER_ROLE, proposers[i]);
            _grantRole(CANCELLER_ROLE, proposers[i]);
        }

        for (uint256 i = 0; i < executors.length; i++) {
            _grantRole(EXECUTOR_ROLE, executors[i]);
        }
    }

    receive() external payable {}

    // ─── Scheduling ───────────────────────────────────────────────────────

    /// @notice Schedule a single operation
    function schedule(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 predecessor,
        bytes32 salt,
        uint256 delay
    ) external onlyRole(PROPOSER_ROLE) {
        bytes32 id = hashOperation(target, value, data, predecessor, salt);
        _schedule(id, delay);
        emit CallScheduled(id, 0, target, value, data, predecessor, delay);
    }

    /// @notice Schedule a batch of operations
    function scheduleBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata payloads,
        bytes32 predecessor,
        bytes32 salt,
        uint256 delay
    ) external onlyRole(PROPOSER_ROLE) {
        require(targets.length == values.length && targets.length == payloads.length, "TimelockController: length mismatch");
        bytes32 id = hashOperationBatch(targets, values, payloads, predecessor, salt);
        _schedule(id, delay);
        for (uint256 i = 0; i < targets.length; i++) {
            emit CallScheduled(id, i, targets[i], values[i], payloads[i], predecessor, delay);
        }
    }

    function _schedule(bytes32 id, uint256 delay) private {
        require(!isOperation(id), "TimelockController: operation already scheduled");
        require(delay >= _minDelay, "TimelockController: insufficient delay");
        _timestamps[id] = block.timestamp + delay;
    }

    // ─── Execution ────────────────────────────────────────────────────────

    /// @notice Execute a scheduled operation
    function execute(
        address target,
        uint256 value,
        bytes calldata payload,
        bytes32 predecessor,
        bytes32 salt
    ) external payable nonReentrant {
        _checkExecutorRole();
        bytes32 id = hashOperation(target, value, payload, predecessor, salt);
        _beforeCall(id, predecessor);
        _execute(target, value, payload);
        emit CallExecuted(id, 0, target, value, payload);
        _afterCall(id);
    }

    /// @notice Execute a batch of operations
    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata payloads,
        bytes32 predecessor,
        bytes32 salt
    ) external payable nonReentrant {
        _checkExecutorRole();
        require(targets.length == values.length && targets.length == payloads.length, "TimelockController: length mismatch");
        bytes32 id = hashOperationBatch(targets, values, payloads, predecessor, salt);
        _beforeCall(id, predecessor);
        for (uint256 i = 0; i < targets.length; i++) {
            _execute(targets[i], values[i], payloads[i]);
            emit CallExecuted(id, i, targets[i], values[i], payloads[i]);
        }
        _afterCall(id);
    }

    function _execute(address target, uint256 value, bytes calldata data) private {
        (bool success,) = target.call{value: value}(data);
        require(success, "TimelockController: execution failed");
    }

    // ─── Cancellation ─────────────────────────────────────────────────────

    /// @notice Cancel a scheduled operation
    function cancel(bytes32 id) external onlyRole(CANCELLER_ROLE) {
        require(isOperationPending(id), "TimelockController: operation not pending");
        delete _timestamps[id];
        emit Cancelled(id);
    }

    // ─── Admin ────────────────────────────────────────────────────────────

    /// @notice Update minimum delay (self-call only via governance flow)
    function updateDelay(uint256 newDelay) external {
        require(msg.sender == address(this), "TimelockController: caller must be timelock");
        emit MinDelayChange(_minDelay, newDelay);
        _minDelay = newDelay;
    }

    // ─── Helpers ──────────────────────────────────────────────────────────

    function _checkExecutorRole() private view {
        if (!hasRole(EXECUTOR_ROLE, address(0))) {
            _checkRole(EXECUTOR_ROLE, msg.sender);
        }
    }

    function _beforeCall(bytes32 id, bytes32 predecessor) private view {
        require(isOperationReady(id), "TimelockController: operation not ready");
        require(predecessor == bytes32(0) || isOperationDone(predecessor), "TimelockController: predecessor not executed");
    }

    function _afterCall(bytes32 id) private {
        require(isOperationReady(id), "TimelockController: operation is not ready");
        _timestamps[id] = DONE_TIMESTAMP;
    }

    // ─── View Helpers ──────────────────────────────────────────────────────

    function hashOperation(address target, uint256 value, bytes calldata data, bytes32 predecessor, bytes32 salt) public pure returns (bytes32) {
        return keccak256(abi.encode(target, value, data, predecessor, salt));
    }

    function hashOperationBatch(address[] calldata targets, uint256[] calldata values, bytes[] calldata payloads, bytes32 predecessor, bytes32 salt) public pure returns (bytes32) {
        return keccak256(abi.encode(targets, values, payloads, predecessor, salt));
    }

    function isOperation(bytes32 id) public view returns (bool) { return getTimestamp(id) > 0; }
    function isOperationPending(bytes32 id) public view returns (bool) { return getTimestamp(id) > DONE_TIMESTAMP; }
    function isOperationReady(bytes32 id) public view returns (bool) {
        uint256 ts = getTimestamp(id);
        return ts > DONE_TIMESTAMP && ts <= block.timestamp;
    }
    function isOperationDone(bytes32 id) public view returns (bool) { return getTimestamp(id) == DONE_TIMESTAMP; }
    function getTimestamp(bytes32 id) public view returns (uint256) { return _timestamps[id]; }
    function getMinDelay() public view returns (uint256) { return _minDelay; }
}
