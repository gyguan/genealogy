import type { WizardSession } from '../services/wizardSessionService';

export type WizardStartupState = {
  contentReady: boolean;
  recoveryDecisionPending: boolean;
  allowPersistence: boolean;
};

export function deriveWizardStartupState(storedSession?: WizardSession): WizardStartupState {
  const recoveryDecisionPending = Boolean(storedSession);
  return {
    contentReady: true,
    recoveryDecisionPending,
    allowPersistence: !recoveryDecisionPending
  };
}
