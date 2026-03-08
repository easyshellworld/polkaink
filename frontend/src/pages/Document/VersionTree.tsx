interface VersionNode {
  id: number;
  parentId: number | null;
  author: string;
  timestamp: number;
  isCurrent: boolean;
  proposalId?: number;
  contentHash?: string;
}

interface VersionTreeProps {
  versions: VersionNode[];
  onSelect: (versionId: number) => void;
  selectedId: number | null;
}

export function VersionTree({ versions, onSelect, selectedId }: VersionTreeProps) {
  return (
    <div className="space-y-2">
      <h3 className="mb-2 text-sm font-semibold">Version Tree</h3>
      <div className="font-mono text-xs">
        {versions.map((v, i) => {
          const isLast = i === versions.length - 1;
          const isSelected = selectedId === v.id;
          return (
            <button
              key={v.id}
              onClick={() => onSelect(v.id)}
              className={`group flex w-full items-start gap-0 rounded py-1.5 text-left transition-colors hover:bg-[var(--color-surface-alt)] ${
                isSelected ? 'bg-[var(--color-primary-10)]' : ''
              }`}
            >
              <div className="flex w-8 flex-shrink-0 flex-col items-center pt-1">
                <div className="z-10 h-3 w-3 flex-shrink-0 rounded-full border-2 border-[var(--color-primary)] bg-[var(--color-background)] transition-colors group-hover:bg-[var(--color-primary)]" />
                {!isLast && (
                  <div className="mt-0.5 min-h-[20px] w-0.5 flex-1 bg-[var(--color-border)]" />
                )}
              </div>

              <div className="min-w-0 flex-1 px-2">
                <div className="flex flex-wrap items-center gap-2">
                  {v.isCurrent && (
                    <span className="rounded bg-[var(--color-primary)] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                      HEAD
                    </span>
                  )}
                  {v.contentHash && (
                    <span className="font-medium text-amber-600">
                      {v.contentHash.slice(2, 9)}
                    </span>
                  )}
                  <span className="truncate text-[var(--color-text-secondary)]">
                    v{v.id}
                    {v.proposalId ? ` · Proposal #${v.proposalId}` : ' · Seed'}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--color-text-secondary)]">
                  <span>{v.author}</span>
                  <span>·</span>
                  <span>{new Date(v.timestamp * 1000).toLocaleString()}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
