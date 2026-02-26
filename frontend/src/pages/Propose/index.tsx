import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';
import { useDocument } from '../../hooks/useDocuments';
import { useWalletStore } from '../../store/walletStore';
import { getWriteContract } from '../../lib/contracts';
import { encodeMarkdown } from '../../lib/calldata';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Button } from '../../components/ui/Button';

export default function ProposePage() {
  const { t } = useTranslation();
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const signer = useWalletStore((s) => s.signer);
  const numDocId = docId ? Number(docId) : undefined;
  const { data: doc } = useDocument(numDocId);

  const [content, setContent] = useState('');
  const [description, setDescription] = useState('');
  const [stake, setStake] = useState('0.001');
  const [preview, setPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!signer || !doc) {
      toast.error(t('propose.error_wallet'));
      return;
    }
    if (!content.trim()) {
      toast.error(t('propose.error_content'));
      return;
    }
    if (!description.trim()) {
      toast.error(t('propose.error_description'));
      return;
    }

    setSubmitting(true);
    try {
      const contract = getWriteContract(signer);
      const { contentHash, contentLength } = encodeMarkdown(content);
      const stakeWei = ethers.parseEther(stake);

      toast.loading(t('propose.tx_submitting'), { id: 'propose' });
      const tx = await contract.proposeVersion(
        Number(doc.id),
        Number(doc.currentVersionId),
        contentHash,
        0,
        contentLength,
        description.trim(),
        { value: stakeWei, gasLimit: 600_000n }
      );
      toast.loading(t('propose.tx_confirming'), { id: 'propose' });
      const receipt = await tx.wait();
      toast.success(t('propose.tx_success', { hash: receipt.hash.slice(0, 10) }), { id: 'propose' });
      navigate('/governance');
    } catch (err) {
      toast.error('Failed: ' + (err as Error).message, { id: 'propose' });
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
            disabled={submitting || !signer}
            loading={submitting}
          >
            {!signer ? t('propose.connect_first') : t('propose.submit', { stake })}
          </Button>
        </div>
      </div>
    </PageWrapper>
  );
}
