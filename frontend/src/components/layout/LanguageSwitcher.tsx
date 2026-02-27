import { useTranslation } from 'react-i18next';

const langs = [
  { code: 'en', label: 'EN' },
  { code: 'zh-CN', label: '中文' },
  { code: 'kr', label: '한국어' },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div className="hidden items-center gap-1 md:flex">
      {langs.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => i18n.changeLanguage(code)}
          className={`rounded px-2 py-1 text-xs transition-colors ${
            i18n.language === code
              ? 'bg-[var(--color-primary-10)] text-[var(--color-primary)] font-medium'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
