import { useState, useEffect, useCallback } from "react";
import {
  HashRouter,
  Routes,
  Route,
  Link,
  useParams,
  useNavigate,
} from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ethers } from "ethers";
import toast, { Toaster } from "react-hot-toast";
import {
  getReadContract,
  getWriteContract,
  switchToPAS,
  PAS_NETWORK,
  POLKAINK_ADDRESS,
  TX_OVERRIDES,
} from "./lib/contracts";

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

interface Document {
  id: bigint;
  title: string;
  author: string;
  currentVersionId: bigint;
  createdAt: bigint;
  updatedAt: bigint;
  status: number;
  tags: string[];
}

interface Version {
  id: bigint;
  docId: bigint;
  parentVersionId: bigint;
  author: string;
  contentHash: string;
  blockNumber: bigint;
  timestamp: bigint;
  compression: number;
  contentLength: number;
}

interface Proposal {
  id: bigint;
  proposalType: number;
  proposer: string;
  docId: bigint;
  targetVersionId: bigint;
  stakeAmount: bigint;
  yesVotes: bigint;
  noVotes: bigint;
  startTime: bigint;
  endTime: bigint;
  status: number;
  description: string;
  contentHash: string;
}

const STATUS_LABELS = ["Active", "Archived", "Disputed"];
const PROPOSAL_STATUS_LABELS = [
  "Pending",
  "Active",
  "Passed",
  "Executed",
  "Rejected",
  "Cancelled",
  "Expired",
];
const PROPOSAL_STATUS_COLORS = [
  "bg-gray-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-green-700",
  "bg-red-500",
  "bg-yellow-600",
  "bg-gray-400",
];

/* ═══════════════════════════════════════════════════════════════
   WALLET HOOK
   ═══════════════════════════════════════════════════════════════ */

function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [balance, setBalance] = useState<string>("0");

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      toast.error("Please install MetaMask!");
      return;
    }
    try {
      await switchToPAS();
      const provider = new ethers.BrowserProvider(window.ethereum);
      const s = await provider.getSigner();
      const addr = await s.getAddress();
      const bal = await provider.getBalance(addr);
      setAddress(addr);
      setSigner(s);
      setBalance(ethers.formatEther(bal));
      toast.success("Wallet connected!");
    } catch (err) {
      toast.error("Connection failed: " + (err as Error).message);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setSigner(null);
    setBalance("0");
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return;
    const handleChange = () => {
      disconnect();
    };
    window.ethereum.on("accountsChanged", handleChange);
    window.ethereum.on("chainChanged", handleChange);
    return () => {
      window.ethereum?.removeListener("accountsChanged", handleChange);
      window.ethereum?.removeListener("chainChanged", handleChange);
    };
  }, [disconnect]);

  return { address, signer, balance, connect, disconnect };
}

/* ═══════════════════════════════════════════════════════════════
   UTILITY FUNCTIONS
   ═══════════════════════════════════════════════════════════════ */

function shortenAddress(addr: string): string {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function formatDate(timestamp: bigint): string {
  return new Date(Number(timestamp) * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function timeRemaining(endTime: bigint): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = Number(endTime) - now;
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h remaining`;
  const mins = Math.floor((diff % 3600) / 60);
  return `${hours}h ${mins}m remaining`;
}

/* ═══════════════════════════════════════════════════════════════
   HEADER COMPONENT
   ═══════════════════════════════════════════════════════════════ */

function Header({
  address,
  balance,
  onConnect,
  onDisconnect,
}: {
  address: string | null;
  balance: string;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold">
          <span className="text-[var(--color-primary)] text-2xl">◎</span>
          <span>PolkaInk</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link
            to="/library"
            className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
          >
            Library
          </Link>
          <Link
            to="/governance"
            className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
          >
            Governance
          </Link>
          <Link
            to="/create"
            className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
          >
            Create
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {address ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-[var(--color-text-secondary)] sm:inline">
                {parseFloat(balance).toFixed(2)} PAS
              </span>
              <button
                onClick={onDisconnect}
                className="rounded-full bg-[var(--color-surface-alt)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--color-border)] transition-colors"
              >
                {shortenAddress(address)}
              </button>
            </div>
          ) : (
            <button
              onClick={onConnect}
              className="rounded-full bg-[var(--color-primary)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <div className="flex justify-around border-t border-[var(--color-border)] md:hidden">
        <Link to="/" className="flex-1 py-2 text-center text-xs font-medium text-[var(--color-text-secondary)]">
          Home
        </Link>
        <Link to="/library" className="flex-1 py-2 text-center text-xs font-medium text-[var(--color-text-secondary)]">
          Library
        </Link>
        <Link to="/governance" className="flex-1 py-2 text-center text-xs font-medium text-[var(--color-text-secondary)]">
          Governance
        </Link>
        <Link to="/create" className="flex-1 py-2 text-center text-xs font-medium text-[var(--color-text-secondary)]">
          Create
        </Link>
      </div>
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HOME PAGE
   ═══════════════════════════════════════════════════════════════ */

function HomePage() {
  const [stats, setStats] = useState({
    totalDocs: 0,
    totalVersions: 0,
    totalProposals: 0,
  });
  const [recentProposals, setRecentProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const contract = getReadContract();
        const [docs, versions, proposals] = await Promise.all([
          contract.totalDocuments(),
          contract.totalVersions(),
          contract.totalProposals(),
        ]);
        setStats({
          totalDocs: Number(docs),
          totalVersions: Number(versions),
          totalProposals: Number(proposals),
        });

        if (Number(proposals) > 0) {
          const limit = Math.min(Number(proposals), 5);
          const offset = Math.max(0, Number(proposals) - limit);
          const [list] = await contract.listProposals(offset, limit);
          setRecentProposals([...list].reverse());
        }
      } catch (err) {
        console.error("Failed to load stats:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="py-16 text-center md:py-24">
        <div className="text-6xl mb-6">◎</div>
        <h1 className="mx-auto max-w-2xl text-3xl font-bold leading-tight md:text-5xl">
          Write Polkadot History
          <br />
          <span className="text-[var(--color-primary)]">
            Into the Blockchain Itself
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-[var(--color-text-secondary)]">
          The on-chain, DAO-governed, community-consensus historical archive for
          the Polkadot ecosystem.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            to="/library"
            className="rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            Explore Library
          </Link>
          <Link
            to="/create"
            className="rounded-full border border-[var(--color-border)] px-6 py-2.5 text-sm font-medium hover:bg-[var(--color-surface-alt)] transition-colors"
          >
            Submit Document
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto grid max-w-4xl grid-cols-3 gap-4 px-4 pb-12">
        {[
          { label: "Documents", value: stats.totalDocs, icon: "📄" },
          { label: "Versions", value: stats.totalVersions, icon: "🔀" },
          { label: "Proposals", value: stats.totalProposals, icon: "🗳️" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center"
          >
            <div className="text-2xl">{s.icon}</div>
            <div className="mt-1 text-2xl font-bold">
              {loading ? "—" : s.value}
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">
              {s.label}
            </div>
          </div>
        ))}
      </section>

      {/* Recent Proposals */}
      {recentProposals.length > 0 && (
        <section className="mx-auto max-w-4xl px-4 pb-16">
          <h2 className="mb-4 text-lg font-semibold">Latest Proposals</h2>
          <div className="space-y-3">
            {recentProposals.map((p) => (
              <ProposalCard key={Number(p.id)} proposal={p} />
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] py-8 text-center text-xs text-[var(--color-text-secondary)]">
        Built on{" "}
        <a
          href={PAS_NETWORK.explorer}
          target="_blank"
          rel="noopener"
          className="text-[var(--color-primary)] hover:underline"
        >
          Polkadot Hub
        </a>{" "}
        · Powered by DAO · All data on-chain ·{" "}
        <a
          href={`${PAS_NETWORK.explorer}/address/${POLKAINK_ADDRESS}`}
          target="_blank"
          rel="noopener"
          className="text-[var(--color-primary)] hover:underline"
        >
          Contract
        </a>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PROPOSAL CARD (shared component)
   ═══════════════════════════════════════════════════════════════ */

function ProposalCard({ proposal: p }: { proposal: Proposal }) {
  const total = Number(p.yesVotes) + Number(p.noVotes);
  const yesPercent = total > 0 ? (Number(p.yesVotes) / total) * 100 : 0;

  return (
    <Link
      to={`/governance/${Number(p.id)}`}
      className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 hover:border-[var(--color-primary)] transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium text-white ${PROPOSAL_STATUS_COLORS[p.status]}`}
            >
              {PROPOSAL_STATUS_LABELS[p.status]}
            </span>
            <span className="text-xs text-[var(--color-text-secondary)]">
              #{Number(p.id)}
            </span>
          </div>
          <p className="font-medium truncate">{p.description || "Version Update Proposal"}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-secondary)]">
            <span>By {shortenAddress(p.proposer)}</span>
            <span>Stake: {ethers.formatEther(p.stakeAmount)} PAS</span>
            <span>Doc #{Number(p.docId)}</span>
            {p.status === 1 && <span>{timeRemaining(p.endTime)}</span>}
          </div>
        </div>
      </div>
      {total > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[var(--color-success)]">
              Yes {yesPercent.toFixed(1)}%
            </span>
            <span className="text-[var(--color-error)]">
              No {(100 - yesPercent).toFixed(1)}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-alt)]">
            <div
              className="h-full rounded-full bg-[var(--color-success)] transition-all"
              style={{ width: `${yesPercent}%` }}
            />
          </div>
        </div>
      )}
    </Link>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LIBRARY PAGE
   ═══════════════════════════════════════════════════════════════ */

function LibraryPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const perPage = 10;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const contract = getReadContract();
        const [docs, t] = await contract.listDocuments(page * perPage, perPage);
        setDocuments(docs);
        setTotal(Number(t));
      } catch (err) {
        console.error("Failed to load documents:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [page]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Document Library</h1>
        <Link
          to="/create"
          className="rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] transition-colors"
        >
          + New Document
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-[var(--color-surface-alt)]"
            />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
          <div className="text-4xl mb-4">📜</div>
          <h2 className="text-lg font-semibold mb-2">No documents yet</h2>
          <p className="text-[var(--color-text-secondary)] mb-4">
            Be the first to write Polkadot history on-chain!
          </p>
          <Link
            to="/create"
            className="inline-block rounded-full bg-[var(--color-primary)] px-6 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
          >
            Create First Document
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {documents.map((doc) => (
              <Link
                key={Number(doc.id)}
                to={`/document/${Number(doc.id)}`}
                className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 hover:border-[var(--color-primary)] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{doc.title}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                      <span>By {shortenAddress(doc.author)}</span>
                      <span>·</span>
                      <span>Version #{Number(doc.currentVersionId)}</span>
                      <span>·</span>
                      <span>{formatDate(doc.updatedAt)}</span>
                    </div>
                    {doc.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {doc.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-[var(--color-primary-10)] px-2 py-0.5 text-xs text-[var(--color-primary)]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      doc.status === 0
                        ? "bg-green-100 text-green-700"
                        : doc.status === 1
                        ? "bg-gray-100 text-gray-600"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {STATUS_LABELS[doc.status]}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded px-3 py-1 text-sm disabled:opacity-30 hover:bg-[var(--color-surface-alt)]"
              >
                ← Prev
              </button>
              <span className="text-sm text-[var(--color-text-secondary)]">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded px-3 py-1 text-sm disabled:opacity-30 hover:bg-[var(--color-surface-alt)]"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DOCUMENT DETAIL PAGE
   ═══════════════════════════════════════════════════════════════ */

function DocumentPage({ signer: _signer }: { signer: ethers.Signer | null }) {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<Document | null>(null);
  const [version, setVersion] = useState<Version | null>(null);
  const [versionIds, setVersionIds] = useState<bigint[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const contract = getReadContract();
        const d = await contract.getDocument(Number(id));
        setDoc(d);
        const v = await contract.getVersion(Number(d.currentVersionId));
        setVersion(v);
        const history = await contract.getVersionHistory(Number(id));
        setVersionIds(history);
      } catch (err) {
        console.error("Failed to load document:", err);
        toast.error("Document not found");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 rounded bg-[var(--color-surface-alt)]" />
          <div className="h-4 w-40 rounded bg-[var(--color-surface-alt)]" />
          <div className="h-64 rounded bg-[var(--color-surface-alt)]" />
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h2 className="text-lg font-semibold">Document not found</h2>
        <Link to="/library" className="mt-4 inline-block text-[var(--color-primary)] hover:underline">
          Back to Library
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-4 text-sm text-[var(--color-text-secondary)]">
        <Link to="/library" className="hover:text-[var(--color-text)]">
          Library
        </Link>
        <span className="mx-2">/</span>
        <span>{doc.title}</span>
      </div>

      {/* Document Header */}
      <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{doc.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[var(--color-text-secondary)]">
              <span>Author: {shortenAddress(doc.author)}</span>
              <span>·</span>
              <span>
                Created: {formatDate(doc.createdAt)}
              </span>
              <span>·</span>
              <span>
                Updated: {formatDate(doc.updatedAt)}
              </span>
            </div>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              doc.status === 0
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {STATUS_LABELS[doc.status]}
          </span>
        </div>

        {doc.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {doc.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[var(--color-primary-10)] px-2.5 py-0.5 text-xs text-[var(--color-primary)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => navigate(`/propose/${Number(doc.id)}`)}
            className="rounded-full bg-[var(--color-primary)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
          >
            Propose Update
          </button>
          <a
            href={`${PAS_NETWORK.explorer}/address/${POLKAINK_ADDRESS}`}
            target="_blank"
            rel="noopener"
            className="rounded-full border border-[var(--color-border)] px-4 py-1.5 text-sm font-medium hover:bg-[var(--color-surface-alt)]"
          >
            View on Explorer
          </a>
        </div>
      </div>

      {/* Version Info */}
      {version && (
        <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h2 className="text-sm font-semibold mb-2">Version Information</h2>
          <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
            <div>
              <span className="text-[var(--color-text-secondary)]">
                Version ID:
              </span>{" "}
              #{Number(version.id)}
            </div>
            <div>
              <span className="text-[var(--color-text-secondary)]">Block:</span>{" "}
              {Number(version.blockNumber)}
            </div>
            <div>
              <span className="text-[var(--color-text-secondary)]">Size:</span>{" "}
              {version.contentLength} bytes
            </div>
            <div>
              <span className="text-[var(--color-text-secondary)]">
                Versions:
              </span>{" "}
              {versionIds.length}
            </div>
          </div>
          <div className="mt-2 text-xs text-[var(--color-text-secondary)] break-all">
            Content Hash: {version.contentHash}
          </div>
        </div>
      )}

      {/* Content placeholder */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <div className="markdown-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {`> **Note:** Document content is stored as calldata in transactions. To view the full Markdown content, the indexer needs to decode the transaction data from block #${version ? Number(version.blockNumber) : "?"}.

This document has **${versionIds.length} version(s)** on-chain.

Content hash: \`${version?.contentHash || "loading..."}\``}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CREATE DOCUMENT PAGE
   ═══════════════════════════════════════════════════════════════ */

function CreatePage({ signer }: { signer: ethers.Signer | null }) {
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [content, setContent] = useState(
    "# Your Document Title\n\nWrite your Polkadot history in Markdown...\n"
  );
  const [preview, setPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!signer) {
      toast.error("Please connect your wallet first!");
      return;
    }
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!content.trim()) {
      toast.error("Content is required");
      return;
    }

    setSubmitting(true);
    try {
      const contract = getWriteContract(signer);
      const contentBytes = new TextEncoder().encode(content);
      const contentHash = ethers.keccak256(contentBytes);
      const tagArray = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      toast.loading("Submitting transaction...", { id: "create" });

      const tx = await contract.createDocument(
        title.trim(),
        tagArray,
        contentHash,
        0, // CompressionType.None
        contentBytes.length,
        TX_OVERRIDES
      );

      toast.loading("Waiting for confirmation...", { id: "create" });
      const receipt = await tx.wait();

      toast.success(
        `Document created! Tx: ${receipt.hash.slice(0, 10)}...`,
        { id: "create" }
      );
      navigate("/library");
    } catch (err) {
      console.error("Create failed:", err);
      toast.error("Failed: " + (err as Error).message, { id: "create" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Create New Document</h1>

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="mb-1 block text-sm font-medium">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Polkadot Genesis Story"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm focus:border-[var(--color-primary)] focus:outline-none"
            maxLength={200}
          />
        </div>

        {/* Tags */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            Tags{" "}
            <span className="text-[var(--color-text-secondary)] font-normal">
              (comma separated, max 10)
            </span>
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="history, polkadot, governance"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm focus:border-[var(--color-primary)] focus:outline-none"
          />
        </div>

        {/* Content Editor */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-medium">Content (Markdown)</label>
            <button
              onClick={() => setPreview(!preview)}
              className="text-xs text-[var(--color-primary)] hover:underline"
            >
              {preview ? "← Edit" : "Preview →"}
            </button>
          </div>
          {preview ? (
            <div className="min-h-[300px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={15}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 font-mono text-sm focus:border-[var(--color-primary)] focus:outline-none resize-y"
              placeholder="Write your document in Markdown..."
            />
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="text-sm text-[var(--color-text-secondary)]">
            Content will be stored on-chain as calldata (permanent &amp;
            immutable)
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting || !signer}
            className="rounded-full bg-[var(--color-primary)] px-6 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors"
          >
            {submitting
              ? "Submitting..."
              : !signer
              ? "Connect Wallet First"
              : "Create Document"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PROPOSE VERSION PAGE
   ═══════════════════════════════════════════════════════════════ */

function ProposePage({ signer }: { signer: ethers.Signer | null }) {
  const { docId } = useParams<{ docId: string }>();
  const [doc, setDoc] = useState<Document | null>(null);
  const [content, setContent] = useState("");
  const [description, setDescription] = useState("");
  const [stake, setStake] = useState("0.001");
  const [preview, setPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!docId) return;
    (async () => {
      try {
        const contract = getReadContract();
        const d = await contract.getDocument(Number(docId));
        setDoc(d);
      } catch {
        toast.error("Document not found");
      }
    })();
  }, [docId]);

  const handleSubmit = async () => {
    if (!signer || !doc) {
      toast.error("Connect wallet first!");
      return;
    }
    if (!content.trim()) {
      toast.error("Content is required");
      return;
    }
    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }

    setSubmitting(true);
    try {
      const contract = getWriteContract(signer);
      const contentBytes = new TextEncoder().encode(content);
      const contentHash = ethers.keccak256(contentBytes);
      const stakeWei = ethers.parseEther(stake);

      toast.loading("Submitting proposal...", { id: "propose" });

      const tx = await contract.proposeVersion(
        Number(doc.id),
        Number(doc.currentVersionId), // Base on current version
        contentHash,
        0, // CompressionType.None
        contentBytes.length,
        description.trim(),
        { value: stakeWei, gasLimit: 600_000n }
      );

      toast.loading("Waiting for confirmation...", { id: "propose" });
      const receipt = await tx.wait();

      toast.success(
        `Proposal submitted! Tx: ${receipt.hash.slice(0, 10)}...`,
        { id: "propose" }
      );
      navigate("/governance");
    } catch (err) {
      console.error("Proposal failed:", err);
      toast.error("Failed: " + (err as Error).message, { id: "propose" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Propose Version Update</h1>
      {doc && (
        <p className="text-[var(--color-text-secondary)] mb-6">
          For: <strong>{doc.title}</strong> (Doc #{Number(doc.id)}, current
          version #{Number(doc.currentVersionId)})
        </p>
      )}

      <div className="space-y-4">
        {/* Description */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            Proposal Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Briefly describe what you changed..."
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm focus:border-[var(--color-primary)] focus:outline-none"
            maxLength={500}
          />
        </div>

        {/* Stake */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            Stake Amount (PAS)
          </label>
          <input
            type="number"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            step="0.001"
            min="0.001"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm focus:border-[var(--color-primary)] focus:outline-none"
          />
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            Minimum 0.001 PAS. Stake is returned on approval, 30% slashed on
            rejection.
          </p>
        </div>

        {/* Content Editor */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-medium">
              Updated Content (Markdown)
            </label>
            <button
              onClick={() => setPreview(!preview)}
              className="text-xs text-[var(--color-primary)] hover:underline"
            >
              {preview ? "← Edit" : "Preview →"}
            </button>
          </div>
          {preview ? (
            <div className="min-h-[300px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={15}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 font-mono text-sm focus:border-[var(--color-primary)] focus:outline-none resize-y"
              placeholder="Write the updated Markdown content..."
            />
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="text-sm text-[var(--color-text-secondary)]">
            Proposal will enter 3-day voting period
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting || !signer}
            className="rounded-full bg-[var(--color-primary)] px-6 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors"
          >
            {submitting
              ? "Submitting..."
              : !signer
              ? "Connect Wallet First"
              : `Submit (${stake} PAS)`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   GOVERNANCE PAGE
   ═══════════════════════════════════════════════════════════════ */

function GovernancePage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const perPage = 10;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const contract = getReadContract();
        const totalP = await contract.totalProposals();
        setTotal(Number(totalP));
        if (Number(totalP) > 0) {
          const offset = page * perPage;
          const [list] = await contract.listProposals(offset, perPage);
          setProposals([...list].reverse());
        }
      } catch (err) {
        console.error("Failed to load proposals:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [page]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Governance</h1>
        <span className="text-sm text-[var(--color-text-secondary)]">
          {total} total proposals
        </span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-[var(--color-surface-alt)]"
            />
          ))}
        </div>
      ) : proposals.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center">
          <div className="text-4xl mb-4">🗳️</div>
          <h2 className="text-lg font-semibold mb-2">No proposals yet</h2>
          <p className="text-[var(--color-text-secondary)]">
            Create a document first, then propose updates to start governance.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {proposals.map((p) => (
              <ProposalCard key={Number(p.id)} proposal={p} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded px-3 py-1 text-sm disabled:opacity-30 hover:bg-[var(--color-surface-alt)]"
              >
                ← Prev
              </button>
              <span className="text-sm text-[var(--color-text-secondary)]">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded px-3 py-1 text-sm disabled:opacity-30 hover:bg-[var(--color-surface-alt)]"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PROPOSAL DETAIL + VOTE PAGE
   ═══════════════════════════════════════════════════════════════ */

function ProposalDetailPage({ signer, address }: { signer: ethers.Signer | null; address: string | null }) {
  const { id } = useParams<{ id: string }>();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  const loadProposal = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const contract = getReadContract();
      const p = await contract.getProposal(Number(id));
      setProposal(p);
      if (address) {
        const v = await contract.hasVoted(Number(id), address);
        setVoted(v);
      }
    } catch (err) {
      console.error("Failed to load proposal:", err);
    } finally {
      setLoading(false);
    }
  }, [id, address]);

  useEffect(() => {
    loadProposal();
  }, [loadProposal]);

  const handleVote = async (support: boolean) => {
    if (!signer) {
      toast.error("Connect wallet first!");
      return;
    }
    setVoting(true);
    try {
      const contract = getWriteContract(signer);
      toast.loading("Submitting vote...", { id: "vote" });
      const tx = await contract.vote(Number(id), support, TX_OVERRIDES);
      toast.loading("Waiting for confirmation...", { id: "vote" });
      await tx.wait();
      toast.success("Vote cast successfully!", { id: "vote" });
      loadProposal();
    } catch (err) {
      console.error("Vote failed:", err);
      toast.error("Vote failed: " + (err as Error).message, { id: "vote" });
    } finally {
      setVoting(false);
    }
  };

  const handleExecute = async () => {
    if (!signer) return;
    try {
      const contract = getWriteContract(signer);
      toast.loading("Executing proposal...", { id: "exec" });
      const tx = await contract.executeProposal(Number(id), TX_OVERRIDES);
      toast.loading("Waiting for confirmation...", { id: "exec" });
      await tx.wait();
      toast.success("Proposal executed!", { id: "exec" });
      loadProposal();
    } catch (err) {
      console.error("Execute failed:", err);
      toast.error("Execute failed: " + (err as Error).message, { id: "exec" });
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-[var(--color-surface-alt)]" />
          <div className="h-48 rounded bg-[var(--color-surface-alt)]" />
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h2 className="text-lg font-semibold">Proposal not found</h2>
      </div>
    );
  }

  const p = proposal;
  const total = Number(p.yesVotes) + Number(p.noVotes);
  const yesPercent = total > 0 ? (Number(p.yesVotes) / total) * 100 : 0;
  const isActive = p.status === 1;
  const isEnded = Number(p.endTime) <= Math.floor(Date.now() / 1000);
  const canExecute = isActive && isEnded;
  const canVote = isActive && !isEnded && !voted;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        to="/governance"
        className="mb-4 inline-block text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
      >
        ← Back to Governance
      </Link>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${PROPOSAL_STATUS_COLORS[p.status]}`}
              >
                {PROPOSAL_STATUS_LABELS[p.status]}
              </span>
              <span className="text-sm text-[var(--color-text-secondary)]">
                Proposal #{Number(p.id)}
              </span>
            </div>
            <h1 className="text-xl font-bold">
              {p.description || "Version Update Proposal"}
            </h1>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4 rounded-lg bg-[var(--color-surface-alt)] p-4 text-sm md:grid-cols-4">
          <div>
            <div className="text-[var(--color-text-secondary)]">Proposer</div>
            <div className="font-medium">{shortenAddress(p.proposer)}</div>
          </div>
          <div>
            <div className="text-[var(--color-text-secondary)]">Document</div>
            <Link
              to={`/document/${Number(p.docId)}`}
              className="font-medium text-[var(--color-primary)] hover:underline"
            >
              Doc #{Number(p.docId)}
            </Link>
          </div>
          <div>
            <div className="text-[var(--color-text-secondary)]">Stake</div>
            <div className="font-medium">
              {ethers.formatEther(p.stakeAmount)} PAS
            </div>
          </div>
          <div>
            <div className="text-[var(--color-text-secondary)]">
              {isEnded ? "Ended" : "Ends"}
            </div>
            <div className="font-medium">{timeRemaining(p.endTime)}</div>
          </div>
        </div>

        {/* Vote Progress */}
        <div className="mt-6">
          <h2 className="text-sm font-semibold mb-3">Voting Results</h2>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[var(--color-success)] font-medium">
              Yes: {Number(p.yesVotes)} ({yesPercent.toFixed(1)}%)
            </span>
            <span className="text-[var(--color-error)] font-medium">
              No: {Number(p.noVotes)} ({total > 0 ? (100 - yesPercent).toFixed(1) : "0.0"}%)
            </span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-[var(--color-surface-alt)]">
            <div
              className="h-full rounded-full bg-[var(--color-success)] transition-all"
              style={{ width: `${total > 0 ? yesPercent : 0}%` }}
            />
          </div>
          <div className="mt-1 text-center text-xs text-[var(--color-text-secondary)]">
            {total} total votes · Threshold: 60%
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap gap-3">
          {canVote && (
            <>
              <button
                onClick={() => handleVote(true)}
                disabled={voting}
                className="flex-1 rounded-lg bg-[var(--color-success)] px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {voting ? "..." : "Vote Yes ✓"}
              </button>
              <button
                onClick={() => handleVote(false)}
                disabled={voting}
                className="flex-1 rounded-lg bg-[var(--color-error)] px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {voting ? "..." : "Vote No ✗"}
              </button>
            </>
          )}
          {voted && (
            <div className="w-full rounded-lg bg-[var(--color-surface-alt)] p-3 text-center text-sm text-[var(--color-text-secondary)]">
              ✓ You have already voted on this proposal
            </div>
          )}
          {canExecute && (
            <button
              onClick={handleExecute}
              className="w-full rounded-lg bg-[var(--color-secondary)] px-6 py-2.5 text-sm font-medium text-white hover:opacity-90"
            >
              Execute Proposal
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   APP ROOT
   ═══════════════════════════════════════════════════════════════ */

function AppContent() {
  const { address, signer, balance, connect, disconnect } = useWallet();

  return (
    <div className="min-h-screen">
      <Header
        address={address}
        balance={balance}
        onConnect={connect}
        onDisconnect={disconnect}
      />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route
            path="/document/:id"
            element={<DocumentPage signer={signer} />}
          />
          <Route path="/create" element={<CreatePage signer={signer} />} />
          <Route
            path="/propose/:docId"
            element={<ProposePage signer={signer} />}
          />
          <Route path="/governance" element={<GovernancePage />} />
          <Route
            path="/governance/:id"
            element={
              <ProposalDetailPage signer={signer} address={address} />
            }
          />
        </Routes>
      </main>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--color-surface)",
            color: "var(--color-text)",
            border: "1px solid var(--color-border)",
          },
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}
