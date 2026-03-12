import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { decodeEventLog } from 'viem';
import { useWalletStore } from '../../store/walletStore';
import { useNotificationStore } from '../../store/notificationStore';
import { writeContract, waitForTx, TX_GAS, getAbi } from '../../lib/contracts';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export default function CreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const walletClient = useWalletStore((s) => s.walletClient);
  const { addNotification, updateNotification } = useNotificationStore();

  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdDocId, setCreatedDocId] = useState<number | null>(null);

  const handleSubmit = async () => {
    if (!walletClient) {
      addNotification({ id: 'create-err', type: 'error', message: t('create.error_wallet') });
      return;
    }
    if (!title.trim()) {
      addNotification({ id: 'create-err', type: 'error', message: t('create.error_title') });
      return;
    }

    setSubmitting(true);
    const nid = `create-${Date.now()}`;
    try {
      const tagArray = tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

      addNotification({ id: nid, type: 'pending', message: t('create.tx_submitting') });
      const hash = await writeContract(walletClient, 'PolkaInkRegistry', 'createDocument', [
        title.trim(), tagArray, '',
      ], { gas: TX_GAS });
      updateNotification(nid, { message: t('create.tx_confirming') });
      const receipt = await waitForTx(hash);

      let docId: number | null = null;
      const abi = getAbi('PolkaInkRegistry');
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({ abi, data: log.data, topics: log.topics });
          if (decoded.eventName === 'DocumentCreated') {
            docId = Number((decoded.args as unknown as { docId: bigint }).docId);
            break;
          }
        } catch {
          // skip non-matching logs
        }
      }

      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });

      if (docId) {
        setCreatedDocId(docId);
        updateNotification(nid, { type: 'success', message: t('create.tx_success_doc', { id: docId }) });
      } else {
        updateNotification(nid, { type: 'success', message: t('create.tx_success_generic') });
        navigate('/library');
      }
    } catch (err) {
      updateNotification(nid, { type: 'error', message: t('common.failed', 'Failed') + ': ' + (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  if (createdDocId) {
    return (
      <PageWrapper>
        <Card padding="lg" className="text-center animate-scale-in">
          <div className="py-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-success)]/10 mb-4">
              <svg className="w-6 h-6 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">{t('create.success_title')}</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              {t('create.success_desc')}
            </p>
            <div className="flex justify-center gap-3">
              <Button
                variant="primary"
                onClick={() => navigate(`/propose/${createdDocId}`)}
              >
                {t('create.write_content')}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/document/${createdDocId}`)}
              >
                {t('create.view_doc')}
              </Button>
            </div>
          </div>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <h1 className="text-2xl font-bold mb-6">{t('create.title')}</h1>

      <Card padding="lg">
        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t('create.field_title')}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('create.field_title_placeholder')}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm focus:border-[var(--color-primary)] focus:outline-none transition-colors"
              maxLength={200}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t('create.field_tags')}{' '}
              <span className="text-[var(--color-text-secondary)] font-normal">
                {t('create.field_tags_hint')}
              </span>
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder={t('create.field_tags_placeholder')}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm focus:border-[var(--color-primary)] focus:outline-none transition-colors"
            />
          </div>

          <div className="rounded-lg bg-[var(--color-surface-alt)] p-4 text-sm text-[var(--color-text-secondary)]">
            {t('create.flow_hint')}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={submitting || !walletClient || !title.trim()}
              loading={submitting}
            >
              {!walletClient ? t('create.connect_first') : t('create.submit')}
            </Button>
          </div>
        </div>
      </Card>
    </PageWrapper>
  );
}
