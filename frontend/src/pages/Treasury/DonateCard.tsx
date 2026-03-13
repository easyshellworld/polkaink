import { useState } from 'react';
import { parseEther } from 'viem';
import { useTranslation } from 'react-i18next';
import { useWalletStore } from '../../store/walletStore';
import { useNotificationStore } from '../../store/notificationStore';
import { writeContract, waitForTx } from '../../lib/contracts';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import i18n from '../../lib/i18n';

export function DonateCard({ rewardPoolBalance }: { rewardPoolBalance: bigint }) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const walletClient = useWalletStore((s) => s.walletClient);
  const { addNotification, updateNotification } = useNotificationStore();

  const isPaused = rewardPoolBalance < parseEther('50');

  const handleDonate = async () => {
    if (!walletClient || !amount) return;
    const nid = `donate-${Date.now()}`;
    setSubmitting(true);
    try {
      addNotification({ id: nid, type: 'pending', message: i18n.t('notify.submitting_donation', 'Submitting donation...') });
      const hash = await writeContract(walletClient, 'Treasury', 'depositRewardPool', [], {
        value: parseEther(amount),
      });
      updateNotification(nid, { message: i18n.t('notify.waiting_confirm', 'Waiting for confirmation...') });
      await waitForTx(hash);
      updateNotification(nid, { type: 'success', message: i18n.t('notify.donation_submitted', 'Donation submitted.') });
      setAmount('');
    } catch (err) {
      updateNotification(nid, { type: 'error', message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="mb-6">
      <h2 className="text-sm font-semibold mb-3">{t('treasury.donate_title', 'Donate to Reward Pool')}</h2>

      {isPaused && (
        <div className="mb-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 font-medium">
          {t('treasury.donate_paused', 'Rewards are currently paused (pool balance < 50 PAS).')}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="number"
          min="0"
          step="0.1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={t('treasury.donate_placeholder', 'Amount (PAS)')}
          className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        />
        <Button onClick={handleDonate} disabled={submitting || !amount || !walletClient} loading={submitting}>
          {t('treasury.donate_button', 'Donate')}
        </Button>
      </div>
      <p className="mt-2 text-xs text-gray-400">
        {t('treasury.donate_note', 'All your donations go into the DAO treasury. Thank you for supporting PolkaInk.')}
      </p>
    </Card>
  );
}
