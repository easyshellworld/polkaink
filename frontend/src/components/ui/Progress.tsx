interface ProgressProps {
  yesPercent: number;
  yesLabel?: string;
  noLabel?: string;
  showLabels?: boolean;
  height?: 'sm' | 'md';
}

export function Progress({
  yesPercent,
  yesLabel,
  noLabel,
  showLabels = true,
  height = 'sm',
}: ProgressProps) {
  const h = height === 'sm' ? 'h-2' : 'h-4';
  return (
    <div>
      {showLabels && (
        <div className="flex justify-between text-xs mb-1">
          <span className="text-[var(--color-success)]">{yesLabel}</span>
          <span className="text-[var(--color-error)]">{noLabel}</span>
        </div>
      )}
      <div className={`${h} w-full overflow-hidden rounded-full bg-[var(--color-surface-alt)]`}>
        <div
          className="h-full rounded-full bg-[var(--color-success)] transition-all"
          style={{ width: `${yesPercent}%` }}
        />
      </div>
    </div>
  );
}
