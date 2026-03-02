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
  const h = height === 'sm' ? 'h-2' : 'h-3';
  return (
    <div>
      {showLabels && (
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-[var(--color-success)] font-medium">{yesLabel}</span>
          <span className="text-[var(--color-error)] font-medium">{noLabel}</span>
        </div>
      )}
      <div className={`${h} w-full overflow-hidden rounded-full bg-[var(--color-primary-10)]`}>
        <div
          className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500 ease-out"
          style={{ width: `${Math.max(yesPercent, 0)}%` }}
        />
      </div>
    </div>
  );
}
