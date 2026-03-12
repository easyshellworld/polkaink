import { useTranslation } from 'react-i18next';

interface VersionSelectorProps {
  versions: number[];
  currentVersion: number;
  onSelect: (versionId: number) => void;
}

export function VersionSelector({ versions, currentVersion, onSelect }: VersionSelectorProps) {
  const { t } = useTranslation();
  return (
    <select
      value={currentVersion}
      onChange={(e) => onSelect(Number(e.target.value))}
      className="px-3 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-sm"
    >
      {versions.map((v) => (
        <option key={v} value={v}>
          v{v} {v === currentVersion ? `(${t('document.current', 'current')})` : ''}
        </option>
      ))}
    </select>
  );
}
