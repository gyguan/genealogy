import type { ReactNode } from 'react';
import type { Mvp1StepKey } from './domain/wizardStepState';
import { BranchStep } from './steps/branch/BranchStep';
import { ClanStep } from './steps/clan/ClanStep';
import { GenerationStep } from './steps/generation/GenerationStep';
import { PersonStep } from './steps/person/PersonStep';
import { RelationshipStep } from './steps/relationship/RelationshipStep';
import { SourceStageStep } from './steps/source/SourceStageStep';
import { WizardResultListBoundary } from './WizardResultListBoundary';
import { WizardValidationBoundary } from './WizardValidationBoundary';
import './wizard-step-state.css';

export type { Mvp1StepKey } from './domain/wizardStepState';

type StepRendererProps = {
  activeStep: Mvp1StepKey;
  notify: (data: unknown, error?: boolean) => void;
  onStepChange: (step: Mvp1StepKey) => void;
  onSubmittedReview?: (taskId: string) => void;
};

export function StepRenderer({ activeStep, notify, onStepChange, onSubmittedReview }: StepRendererProps) {
  let content: ReactNode;
  switch (activeStep) {
    case 'clan': content = <ClanStep notify={notify} onCreated={() => onStepChange('branch')} />; break;
    case 'branch': content = <BranchStep notify={notify} onSubmittedReview={onSubmittedReview} />; break;
    case 'generation': content = <GenerationStep notify={notify} onSubmittedReview={onSubmittedReview} />; break;
    case 'person': content = <PersonStep notify={notify} onSubmittedReview={onSubmittedReview} />; break;
    case 'relationship': content = <RelationshipStep notify={notify} onSubmittedReview={onSubmittedReview} />; break;
    case 'source': content = <SourceStageStep notify={notify} onSubmittedReview={onSubmittedReview} />; break;
    default: content = null;
  }
  return (
    <WizardValidationBoundary step={activeStep}>
      <WizardResultListBoundary>{content}</WizardResultListBoundary>
    </WizardValidationBoundary>
  );
}
