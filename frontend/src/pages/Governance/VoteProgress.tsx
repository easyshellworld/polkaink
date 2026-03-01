import { Progress } from '../../components/ui/Progress';

interface VoteProgressProps {
  yesVotes: number;
  noVotes: number;
  quorum: number;
}

export function VoteProgress({ yesVotes, noVotes, quorum }: VoteProgressProps) {
  const total = yesVotes + noVotes;
  const yesPercent = total > 0 ? (yesVotes / total) * 100 : 0;
  const participation = quorum > 0 ? (total / quorum) * 100 : 0;

  return (
    <div className="space-y-3">
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-[var(--color-success)]">Yes {yesPercent.toFixed(1)}%</span>
          <span className="text-[var(--color-error)]">No {(100 - yesPercent).toFixed(1)}%</span>
        </div>
        <Progress yesPercent={yesPercent} showLabels={false} />
      </div>
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span>Participation</span>
          <span>{participation.toFixed(1)}%</span>
        </div>
        <Progress yesPercent={Math.min(participation, 100)} showLabels={false} />
      </div>
    </div>
  );
}
