// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IReportManager.sol";
import "./interfaces/IStakingManager.sol";
import "./interfaces/IGovernanceCore.sol";
import "../core/interfaces/IPolkaInkRegistry.sol";

/// @title ReportManager
/// @notice Community-driven document reporting, freezing, and re-voting
contract ReportManager is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IReportManager
{
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    uint256 public constant FREEZE_DURATION = 72 hours;
    uint256 public constant REVOTE_DURATION = 72 hours;
    uint256 public constant REVOTE_QUORUM   = 5;
    uint256 public constant MAX_REPORTS_PER_DOC = 2;

    IStakingManager    public stakingManager;
    IGovernanceCore    public governanceCore;
    IPolkaInkRegistry  public registry;

    mapping(uint256 => ReportStatus) private _reports;
    // docId → round → reporter → bool
    mapping(uint256 => mapping(uint8 => mapping(address => bool))) private _hasReported;
    // docId → round → voter → bool
    mapping(uint256 => mapping(uint8 => mapping(address => bool))) private _hasRevoted;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(
        address admin,
        address _stakingManager,
        address _governanceCore,
        address _registry
    ) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);

        stakingManager = IStakingManager(_stakingManager);
        governanceCore = IGovernanceCore(_governanceCore);
        registry = IPolkaInkRegistry(_registry);
    }

    function report(uint256 docId) external {
        if (!stakingManager.isActiveMember(msg.sender))
            revert Report__NotActiveMember(msg.sender);

        // Check document is in a reportable state (Active with currentVersionId > 0 means it has approved content)
        IPolkaInkRegistry.Document memory doc = registry.getDocument(docId);
        if (doc.status != IPolkaInkRegistry.DocumentStatus.Active || doc.currentVersionId == 0)
            revert Report__DocNotApproved(docId);

        ReportStatus storage rs = _reports[docId];

        // Initialize on first report
        if (rs.docId == 0) {
            rs.docId = docId;
            rs.reportRound = 1;
        }

        if (rs.finalized && rs.reportRound >= MAX_REPORTS_PER_DOC)
            revert Report__MaxReportsReached(docId);

        // Start a new round if previous was finalized
        if (rs.finalized) {
            rs.reportRound++;
            rs.reportCount = 0;
            rs.frozen = false;
            rs.finalized = false;
            rs.revoked = false;
            rs.yesVotes = 0;
            rs.noVotes = 0;
            rs.voterCount = 0;
            rs.freezeEnd = 0;
            rs.revoteEnd = 0;
        }

        if (rs.frozen) revert Report__AlreadyFrozen(docId);

        uint8 round = rs.reportRound;
        if (_hasReported[docId][round][msg.sender])
            revert Report__AlreadyReported(msg.sender, docId);

        _hasReported[docId][round][msg.sender] = true;
        rs.reportCount++;

        // Calculate threshold: max(3, floor(noVoterCount * 1.5))
        // We need the noVoterCount from the most recent proposal for this doc
        // For simplicity, use a fixed threshold of 3 if no proposal data available
        if (rs.threshold == 0) {
            rs.threshold = 3; // default threshold
        }

        emit DocReported(docId, msg.sender, rs.reportCount, rs.threshold);

        // Check if threshold reached → freeze
        if (rs.reportCount >= rs.threshold) {
            rs.frozen = true;
            rs.freezeEnd = block.timestamp + FREEZE_DURATION;
            rs.revoteEnd = rs.freezeEnd + REVOTE_DURATION;

            // Freeze the document in registry
            registry.setDocumentStatus(docId, IPolkaInkRegistry.DocumentStatus.Frozen);

            emit DocFrozen(docId, rs.freezeEnd, rs.revoteEnd);
        }
    }

    /// @notice Set report threshold based on a proposal's NO voters
    function setThreshold(uint256 docId, uint256 noVoterCount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        ReportStatus storage rs = _reports[docId];
        if (rs.docId == 0) {
            rs.docId = docId;
            rs.reportRound = 1;
        }
        // threshold = max(3, floor(noVoterCount * 1.5))
        uint256 calc = (noVoterCount * 3) / 2;
        rs.threshold = calc > 3 ? calc : 3;
    }

    function revote(uint256 docId, bool support) external {
        if (!stakingManager.isActiveMember(msg.sender))
            revert Report__NotActiveMember(msg.sender);

        ReportStatus storage rs = _reports[docId];
        if (!rs.frozen || rs.finalized)
            revert Report__NotInRevotePeriod(docId);
        if (block.timestamp < rs.freezeEnd || block.timestamp > rs.revoteEnd)
            revert Report__NotInRevotePeriod(docId);

        uint8 round = rs.reportRound;
        if (_hasRevoted[docId][round][msg.sender])
            revert Report__AlreadyRevoted(msg.sender, docId);

        _hasRevoted[docId][round][msg.sender] = true;
        rs.voterCount++;

        // Pure democracy: 1 member = 1 vote, no boosts, no veto
        if (support) {
            rs.yesVotes++;
        } else {
            rs.noVotes++;
        }

        emit RevoteCast(docId, msg.sender, support);
    }

    function finalize(uint256 docId) external {
        ReportStatus storage rs = _reports[docId];
        if (!rs.frozen) revert Report__NotInRevotePeriod(docId);
        if (rs.finalized) revert Report__AlreadyFinalized(docId);
        if (block.timestamp <= rs.revoteEnd)
            revert Report__RevoteNotEnded(docId);
        if (rs.voterCount < REVOTE_QUORUM)
            revert Report__QuorumNotReached(rs.voterCount, REVOTE_QUORUM);

        rs.finalized = true;

        if (rs.yesVotes > rs.noVotes) {
            // Maintained: restore document to Active
            registry.setDocumentStatus(docId, IPolkaInkRegistry.DocumentStatus.Active);
            emit DocMaintained(docId, rs.yesVotes, rs.noVotes);
        } else {
            // Revoked
            rs.revoked = true;
            registry.setDocumentStatus(docId, IPolkaInkRegistry.DocumentStatus.Revoked);
            emit DocRevoked(docId, rs.yesVotes, rs.noVotes);
        }
    }

    function getReportStatus(uint256 docId) external view returns (ReportStatus memory) {
        return _reports[docId];
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}
}
