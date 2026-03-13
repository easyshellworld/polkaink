import { useTranslation } from 'react-i18next';

interface StakeInputProps {
  value: string;
  onChange: (v: string) => void;
  minStake: string;
  balance: string;
}

export function StakeInput({ value, onChange, minStake, balance }: StakeInputProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold">{t('propose.stake_amount')}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={minStake}
          step="0.1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-sm"
        />
        <span className="text-sm font-medium">PAS</span>
      </div>
      <div className="text-xs text-[var(--color-text-secondary)] flex justify-between">
        <span>{t('propose.min_stake', 'Min')}: {minStake} PAS</span>
        <span>{t('propose.balance', 'Balance')}: {balance} PAS</span>
      </div>
    </div>
  );
}
