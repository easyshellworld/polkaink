import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useElection, useElectionVotes, useVoteInElection, useExecuteElection } from '../../hooks/useCouncil';
import { useWalletStore } from '../../store/walletStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Progress } from '../../components/ui/Progress';
import { shortenAddress } from '../../lib/utils';

export function ElectionPanel() {
  const { t } = useTranslation();
  const address = useWalletStore((s) => s.address);
  const [electionId, setElectionId] = useState(0);
  const [searchId, setSearchId] = useState('');

  const { data: election, isLoading, isError } = useElection(electionId || undefined);
  const candidates = election?.candidates ?? [];
  const { data: votes } = useElectionVotes(electionId || undefined, candidates);
  const { submitting: voteSubmitting, vote } = useVoteInElection();
  const { submitting: execSubmitting, execute } = useExecuteElection();

  const now = Math.floor(Date.now() / 1000);
  const isActive = election && Number(election.startTime) <= now && Number(election.endTime) > now;
  const isEnded = election && Number(election.endTime) <= now;
  const canExecute = isEnded && !election?.executed;
  const maxVotes = votes ? Math.max(...votes.map((v) => v.votes), 1) : 1;

  const handleSearch = () => {
    const id = parseInt(searchId);
    if (!isNaN(id) && id >= 0) setElectionId(id);
  };

  return (
    <Card className="mb-6">
      <h2 className="text-sm font-semibold mb-4">{t('council.election')}</h2>

      <div className="flex gap-2 mb-4">
        <input
          type="number"
          min="0"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          placeholder={t('council.election_id_placeholder')}
          className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm focus:border-[var(--color-primary)] focus:outline-none"
        />
        <Button size="sm" onClick={handleSearch}>
          {t('council.load_election')}
        </Button>
      </div>

      {!electionId ? (
        <p className="text-sm text-[var(--color-text-secondary)]">{t('council.no_election')}</p>
      ) : isLoading ? (
        <p className="text-sm text-[var(--color-text-secondary)]">{t('common.loading')}</p>
      ) : isError || !election ? (
        <p className="text-sm text-[var(--color-error)]">{t('council.election_not_found')}</p>
      ) : (
        <div>
          <div className="grid grid-cols-3 gap-3 rounded-lg bg-[var(--color-surface-alt)] p-3 mb-4 text-xs">
            <div className="text-center">
              <div className="font-semibold">{candidates.length}</div>
              <div className="text-[var(--color-text-secondary)]">{t('council.candidates')}</div>
            </div>
            <div className="text-center">
              <div className="font-semibold">
                {isActive
                  ? t('council.election_active')
                  : election.executed
                    ? t('council.election_executed')
                    : isEnded
                      ? t('council.election_ended')
                      : t('council.election_pending')}
              </div>
              <div className="text-[var(--color-text-secondary)]">{t('council.election_status')}</div>
            </div>
            <div className="text-center">
              <div className="font-semibold">
                {new Date(Number(election.endTime) * 1000).toLocaleDateString()}
              </div>
              <div className="text-[var(--color-text-secondary)]">{t('council.election_end')}</div>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            {candidates.map((c, idx) => {
              const candidateVotes = votes?.find((v) => v.candidate.toLowerCase() === c.toLowerCase());
              const voteCount = candidateVotes?.votes ?? 0;
              const pct = maxVotes > 0 ? (voteCount / maxVotes) * 100 : 0;

              return (
                <div key={c} className="rounded-lg border border-[var(--color-border)] p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-secondary-10)] text-xs font-bold text-[var(--color-secondary)]">
                        {idx + 1}
                      </span>
                      <span className="text-sm font-medium">{shortenAddress(c)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        {voteCount} {t('council.votes')}
                      </span>
                      {isActive && address && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => vote(electionId, c)}
                          disabled={voteSubmitting}
                          loading={voteSubmitting}
                        >
                          {t('council.vote_for')}
                        </Button>
                      )}
                    </div>
                  </div>
                  <Progress yesPercent={pct} showLabels={false} height="sm" />
                </div>
              );
            })}
          </div>

          {canExecute && (
            <Button
              variant="primary"
              className="w-full"
              onClick={() => execute(electionId)}
              disabled={execSubmitting}
              loading={execSubmitting}
            >
              {t('council.execute_election')}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
