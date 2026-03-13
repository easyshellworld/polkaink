import { useTranslation } from 'react-i18next';

interface ProposalStepperProps {
  currentStep: number;
}

const STEPS = ['propose.step_write', 'propose.step_preview', 'propose.step_stake', 'propose.step_submit'] as const;

export function ProposalStepper({ currentStep }: ProposalStepperProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((key, i) => (
        <div key={key} className="flex items-center gap-2">
          <div
            className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
              i <= currentStep
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)]'
            }`}
          >
            {i + 1}
          </div>
          <span
            className={`text-xs hidden md:inline ${
              i <= currentStep ? 'text-[var(--color-primary)] font-medium' : 'text-[var(--color-text-secondary)]'
            }`}
          >
            {t(key)}
          </span>
          {i < STEPS.length - 1 && (
            <div className={`w-8 h-px ${i < currentStep ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`} />
          )}
        </div>
      ))}
    </div>
  );
}
