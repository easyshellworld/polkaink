import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { keccak256, parseEther, toHex } from 'viem';
import { useDocument } from '../../hooks/useDocuments';
import { useWalletStore } from '../../store/walletStore';
import { useNotificationStore } from '../../store/notificationStore';
import { writeContract, waitForTx } from '../../lib/contracts';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Button } from '../../components/ui/Button';

export default function ProposePage() {
  const { t } = useTranslation();
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const walletClient = useWalletStore((s) => s.walletClient);
  const { addNotification, updateNotification } = useNotificationStore();
  const numDocId = docId ? Number(docId) : undefined;
  const { data: doc } = useDocument(numDocId);

  const [content, setContent] = useState('');
  const [description, setDescription] = useState('');
  const [stake, setStake] = useState('0.001');
  const [preview, setPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!walletClient || !doc) {
      addNotification({ id: 'propose-err', type: 'error', message: t('propose.error_wallet') });
      return;
    }
    if (!content.trim()) {
      addNotification({ id: 'propose-err', type: 'error', message: t('propose.error_content') });
      return;
    }
    if (!description.trim()) {
      addNotification({ id: 'propose-err', type: 'error', message: t('propose.error_description') });
      return;
    }

    setSubmitting(true);
    const nid = `propose-${Date.now()}`;
    try {
      const contentBytes = new TextEncoder().encode(content);
      const contentHash = keccak256(toHex(contentBytes));
      const stakeWei = parseEther(stake);

      addNotification({ id: nid, type: 'pending', message: t('propose.tx_submitting') });
      const markdownHex = toHex(contentBytes);
      const hash = await writeContract(walletClient, 'PolkaInkRegistry', 'proposeVersion', [
        BigInt(Number(doc.id)),
        BigInt(Number(doc.currentVersionId)),
        contentHash,
        markdownHex,
      ], { value: stakeWei, gas: 1_000_000n });
      updateNotification(nid, { message: t('propose.tx_confirming') });
      const receipt = await waitForTx(hash);
      updateNotification(nid, { type: 'success', message: t('propose.tx_success', { hash: receipt.transactionHash.slice(0, 10) }) });
      navigate('/governance');
    } catch (err) {
      updateNotification(nid, { type: 'error', message: 'Failed: ' + (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageWrapper>
      <h1 className="text-2xl font-bold mb-2">{t('propose.title')}</h1>
      {doc && (
        <p
          className="text-[var(--color-text-secondary)] mb-6"
          dangerouslySetInnerHTML={{
            __html: t('propose.for_doc', {
              title: doc.title,
              docId: Number(doc.id),
              versionId: Number(doc.currentVersionId),
            }),
          }}
        />
      )}

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">{t('propose.field_description')}</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('propose.field_description_placeholder')}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm focus:border-[var(--color-primary)] focus:outline-none"
            maxLength={500}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">{t('propose.field_stake')}</label>
          <input
            type="number"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            step="0.001"
            min="0.001"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm focus:border-[var(--color-primary)] focus:outline-none"
          />
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{t('propose.stake_hint')}</p>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-medium">{t('propose.field_content')}</label>
            <button
              onClick={() => setPreview(!preview)}
              className="text-xs text-[var(--color-primary)] hover:underline"
            >
              {preview ? t('create.edit') : t('create.preview')}
            </button>
          </div>
          {preview ? (
            <div className="min-h-[300px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <div className="markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={15}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 font-mono text-sm focus:border-[var(--color-primary)] focus:outline-none resize-y"
            />
          )}
        </div>

        <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="text-sm text-[var(--color-text-secondary)]">{t('propose.voting_period')}</div>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !walletClient}
            loading={submitting}
          >
            {!walletClient ? t('propose.connect_first') : t('propose.submit', { stake })}
          </Button>
        </div>
      </div>
    </PageWrapper>
  );
}
