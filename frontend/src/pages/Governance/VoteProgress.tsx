import { useTranslation } from 'react-i18next';

interface ScoreDisplayProps {
  score: bigint;
  goldVetoed: boolean;
}

export function VoteProgress({ score, goldVetoed }: ScoreDisplayProps) {
  const { t } = useTranslation();
  const scoreNum = Number(score) / 1e18;
  const sign = scoreNum >= 0 ? '+' : '';

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-[var(--color-text-secondary)]">{t('governance.score', 'Score')}</span>
        <span className={`font-semibold ${scoreNum > 2 ? 'text-[var(--color-success)]' : scoreNum > 0 ? 'text-[var(--color-primary)]' : 'text-[var(--color-error)]'}`}>
          {sign}{scoreNum.toFixed(2)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-[var(--color-surface-alt)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${scoreNum > 2 ? 'bg-[var(--color-success)]' : scoreNum > 0 ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-error)]'}`}
          style={{ width: `${Math.min(Math.max((scoreNum / 4) * 100, 0), 100)}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-[var(--color-text-secondary)]">
        <span>0</span>
        <span className="font-medium">{t('governance.threshold')}: 2.0</span>
        <span>4.0</span>
      </div>
      {goldVetoed && (
        <div className="text-xs text-[var(--color-error)] font-medium">
          {t('governance.vetoed_by_gold', 'Vetoed by OG Gold')}
        </div>
      )}
    </div>
  );
}
