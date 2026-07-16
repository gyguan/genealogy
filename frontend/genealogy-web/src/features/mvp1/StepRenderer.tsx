import type { Mvp1StepKey } from './domain/wizardStepState';
import { BranchStep } from './steps/branch/BranchStep';
import { ClanStep } from './steps/clan/ClanStep';
import { GenerationStep } from './steps/generation/GenerationStep';
import { PersonStep } from './steps/person/PersonStep';
import { RelationshipStep } from './steps/relationship/RelationshipStep';
import { ReviewProgressStep } from './steps/review/ReviewProgressStep';
import { SourceStep } from './steps/source/SourceStep';

export type { Mvp1StepKey } from './domain/wizardStepState';

type StepRendererProps = {
  activeStep: Mvp1StepKey;
  notify: (data: unknown, error?: boolean) => void;
  onStepChange: (step: Mvp1StepKey) => void;
  onSubmittedReview?: (taskId: string) => void;
};

export function StepRenderer({ activeStep, notify, onStepChange, onSubmittedReview }: StepRendererProps) {
  switch (activeStep) {
    case 'clan':
      return <ClanStep notify={notify} onCreated={() => onStepChange('branch')} />;
    case 'branch':
      return <BranchStep notify={notify} onSubmittedReview={onSubmittedReview} />;
    case 'generation':
      return <GenerationStep notify={notify} onSubmittedReview={onSubmittedReview} />;
    case 'person':
      return <PersonStep notify={notify} onSubmittedReview={onSubmittedReview} />;
    case 'relationship':
      return <RelationshipStep notify={notify} onSubmittedReview={onSubmittedReview} />;
    case 'source':
      return <SourceStep notify={notify} onSubmittedReview={onSubmittedReview} />;
    case 'review':
      return <ReviewProgressStep notify={notify} />;
    default:
      return null;
  }
}
