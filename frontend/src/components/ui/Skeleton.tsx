interface SkeletonProps {
  className?: string;
  count?: number;
}

export function Skeleton({ className = 'h-24', count = 1 }: SkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse rounded-xl bg-[var(--color-surface-alt)] ${className}`}
        />
      ))}
    </div>
  );
}
