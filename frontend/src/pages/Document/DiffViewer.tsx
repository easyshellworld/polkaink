interface DiffViewerProps {
  oldContent: string;
  newContent: string;
}

export function DiffViewer({ oldContent, newContent }: DiffViewerProps) {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  const maxLen = Math.max(oldLines.length, newLines.length);

  return (
    <div className="font-mono text-xs overflow-auto">
      {Array.from({ length: maxLen }).map((_, i) => {
        const oldLine = oldLines[i] ?? '';
        const newLine = newLines[i] ?? '';
        const changed = oldLine !== newLine;
        return (
          <div
            key={i}
            className={`flex ${changed ? 'bg-[var(--color-warning-bg,rgba(255,200,0,0.1))]' : ''}`}
          >
            <span className="w-10 text-right pr-2 text-[var(--color-text-secondary)] select-none">
              {i + 1}
            </span>
            <span className="flex-1 whitespace-pre">{newLine}</span>
          </div>
        );
      })}
    </div>
  );
}
