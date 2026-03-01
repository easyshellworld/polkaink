interface VersionNode {
  id: number;
  parentId: number | null;
  author: string;
  timestamp: number;
  isCurrent: boolean;
}

interface VersionTreeProps {
  versions: VersionNode[];
  onSelect: (versionId: number) => void;
}

export function VersionTree({ versions, onSelect }: VersionTreeProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold mb-2">Version Tree</h3>
      {versions.map((v) => (
        <button
          key={v.id}
          onClick={() => onSelect(v.id)}
          className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
            v.isCurrent
              ? 'bg-[var(--color-primary-10)] border border-[var(--color-primary)]'
              : 'bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)]'
          }`}
        >
          <span className="font-medium">v{v.id}</span>
          {v.isCurrent && <span className="ml-2 text-xs text-[var(--color-primary)]">current</span>}
        </button>
      ))}
    </div>
  );
}
