import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

interface SubmitConfirmProps {
  title: string;
  contentSize: number;
  onConfirm: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export function SubmitConfirm({ title, contentSize, onConfirm, onBack, isSubmitting }: SubmitConfirmProps) {
  const { t } = useTranslation();

  return (
    <Card padding="lg">
      <h3 className="text-lg font-semibold mb-4">{t('propose.confirm_title')}</h3>
      <dl className="text-sm space-y-3 mb-6">
        <div className="flex justify-between">
          <dt className="text-[var(--color-text-secondary)]">{t('propose.document', 'Document')}</dt>
          <dd className="font-medium">{title}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-[var(--color-text-secondary)]">{t('propose.content_size', 'Content size')}</dt>
          <dd className="font-medium">{(contentSize / 1024).toFixed(1)} KB</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-[var(--color-text-secondary)]">{t('propose.stake_required', 'Stake Required')}</dt>
          <dd className="font-medium">88 PAS ({t('propose.version_update', 'VersionUpdate')})</dd>
        </div>
      </dl>
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={onBack} disabled={isSubmitting}>
          {t('common.back')}
        </Button>
        <Button onClick={onConfirm} disabled={isSubmitting}>
          {isSubmitting ? t('common.loading') : t('propose.submit')}
        </Button>
      </div>
    </Card>
  );
}
