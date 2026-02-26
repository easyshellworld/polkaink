import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';
import { useWalletStore } from '../../store/walletStore';
import { getWriteContract, TX_OVERRIDES } from '../../lib/contracts';
import { encodeMarkdown } from '../../lib/calldata';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Button } from '../../components/ui/Button';

export default function CreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const signer = useWalletStore((s) => s.signer);

  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [content, setContent] = useState(
    '# Your Document Title\n\nWrite your Polkadot history in Markdown...\n'
  );
  const [preview, setPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!signer) {
      toast.error(t('create.error_wallet'));
      return;
    }
    if (!title.trim()) {
      toast.error(t('create.error_title'));
      return;
    }
    if (!content.trim()) {
      toast.error(t('create.error_content'));
      return;
    }

    setSubmitting(true);
    try {
      const contract = getWriteContract(signer);
      const { contentHash, contentLength } = encodeMarkdown(content);
      const tagArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      toast.loading(t('create.tx_submitting'), { id: 'create' });
      const tx = await contract.createDocument(
        title.trim(),
        tagArray,
        contentHash,
        0,
        contentLength,
        TX_OVERRIDES
      );
      toast.loading(t('create.tx_confirming'), { id: 'create' });
      const receipt = await tx.wait();
      toast.success(t('create.tx_success', { hash: receipt.hash.slice(0, 10) }), { id: 'create' });
      navigate('/library');
    } catch (err) {
      toast.error('Failed: ' + (err as Error).message, { id: 'create' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageWrapper>
      <h1 className="text-2xl font-bold mb-6">{t('create.title')}</h1>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">{t('create.field_title')}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('create.field_title_placeholder')}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm focus:border-[var(--color-primary)] focus:outline-none"
            maxLength={200}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
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
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm focus:border-[var(--color-primary)] focus:outline-none"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-medium">{t('create.field_content')}</label>
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
          <div className="text-sm text-[var(--color-text-secondary)]">{t('create.calldata_info')}</div>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !signer}
            loading={submitting}
          >
            {!signer ? t('create.connect_first') : t('create.submit')}
          </Button>
        </div>
      </div>
    </PageWrapper>
  );
}
