import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

// choice: 0=Yes, 1=No, 2=Abstain
interface VotePanelProps {
  proposalId: number;
  onVote: (proposalId: number, choice: number) => void;
  isVoting: boolean;
  hasVoted: boolean;
}

export function VotePanel({ proposalId, onVote, isVoting, hasVoted }: VotePanelProps) {
  const { t } = useTranslation();

  if (hasVoted) {
    return (
      <Card className="text-center text-sm text-[var(--color-text-secondary)]">
        {t('governance.already_voted')}
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-sm font-semibold mb-3">{t('governance.cast_vote')}</h3>
      <div className="flex gap-3">
        <Button
          className="flex-1"
          onClick={() => onVote(proposalId, 0)}
          disabled={isVoting}
        >
          {t('governance.vote_yes')}
        </Button>
        <Button
          variant="danger"
          className="flex-1"
          onClick={() => onVote(proposalId, 1)}
          disabled={isVoting}
        >
          {t('governance.vote_no')}
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => onVote(proposalId, 2)}
          disabled={isVoting}
        >
          {t('governance.abstain')}
        </Button>
      </div>
    </Card>
  );
}
