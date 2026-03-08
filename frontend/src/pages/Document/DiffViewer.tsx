interface DiffViewerProps {
  oldContent: string;
  newContent: string;
  oldLabel?: string;
  newLabel?: string;
}

type DiffLine = {
  type: 'add' | 'remove' | 'context';
  text: string;
};

function buildLineDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const n = oldLines.length;
  const m = newLines.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      if (oldLines[i] === newLines[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;

  while (i < n && j < m) {
    if (oldLines[i] === newLines[j]) {
      out.push({ type: 'context', text: oldLines[i] });
      i += 1;
      j += 1;
      continue;
    }

    if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: 'remove', text: oldLines[i] });
      i += 1;
    } else {
      out.push({ type: 'add', text: newLines[j] });
      j += 1;
    }
  }

  while (i < n) {
    out.push({ type: 'remove', text: oldLines[i] });
    i += 1;
  }
  while (j < m) {
    out.push({ type: 'add', text: newLines[j] });
    j += 1;
  }

  return out;
}

export function DiffViewer({
  oldContent,
  newContent,
  oldLabel = 'a',
  newLabel = 'b',
}: DiffViewerProps) {
  const oldLines = oldContent ? oldContent.split('\n') : [];
  const newLines = newContent ? newContent.split('\n') : [];
  const lines = buildLineDiff(oldLines, newLines);

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--color-border)] text-xs font-mono">
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-alt)] px-4 py-1.5 text-[var(--color-text-secondary)]">
        <span className="text-red-500">--- {oldLabel}</span>{' '}
        <span className="text-green-600">+++ {newLabel}</span>
      </div>
      <div className="max-h-[500px] overflow-auto">
        {lines.map((line, idx) => (
          <div
            key={`${line.type}-${idx}`}
            className={`flex items-start ${
              line.type === 'add'
                ? 'border-l-2 border-green-500 bg-green-50/70'
                : line.type === 'remove'
                ? 'border-l-2 border-red-500 bg-red-50/70'
                : 'border-l-2 border-transparent'
            }`}
          >
            <span
              className={`w-6 flex-shrink-0 select-none text-center font-bold ${
                line.type === 'add'
                  ? 'text-green-600'
                  : line.type === 'remove'
                  ? 'text-red-500'
                  : 'text-[var(--color-text-secondary)]'
              }`}
            >
              {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
            </span>
            <span
              className={`flex-1 whitespace-pre px-2 py-0.5 ${
                line.type === 'add'
                  ? 'text-green-800'
                  : line.type === 'remove'
                  ? 'text-red-800'
                  : 'text-[var(--color-text)]'
              }`}
            >
              {line.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
