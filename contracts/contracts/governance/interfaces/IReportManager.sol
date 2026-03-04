// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IReportManager {

    struct ReportStatus {
        uint256 docId;
        uint256 reportCount;
        uint256 threshold;
        bool    frozen;
        uint256 freezeEnd;
        uint256 revoteEnd;
        uint256 yesVotes;
        uint256 noVotes;
        uint256 voterCount;
        uint8   reportRound;
        bool    finalized;
        bool    revoked;
    }

    function report(uint256 docId) external;
    function revote(uint256 docId, bool support) external;
    function finalize(uint256 docId) external;
    function getReportStatus(uint256 docId) external view returns (ReportStatus memory);

    event DocReported(uint256 indexed docId, address reporter, uint256 reportCount, uint256 threshold);
    event DocFrozen(uint256 indexed docId, uint256 freezeEnd, uint256 revoteEnd);
    event RevoteCast(uint256 indexed docId, address voter, bool support);
    event DocMaintained(uint256 indexed docId, uint256 yesVotes, uint256 noVotes);
    event DocRevoked(uint256 indexed docId, uint256 yesVotes, uint256 noVotes);

    error Report__DocNotApproved(uint256 docId);
    error Report__NotActiveMember(address caller);
    error Report__MaxReportsReached(uint256 docId);
    error Report__AlreadyReported(address reporter, uint256 docId);
    error Report__NotInRevotePeriod(uint256 docId);
    error Report__AlreadyRevoted(address voter, uint256 docId);
    error Report__RevoteNotEnded(uint256 docId);
    error Report__QuorumNotReached(uint256 actual, uint256 required);
    error Report__AlreadyFrozen(uint256 docId);
    error Report__AlreadyFinalized(uint256 docId);
}
