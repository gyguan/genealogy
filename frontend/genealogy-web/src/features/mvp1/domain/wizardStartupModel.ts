export type WizardStartupState = {
  contentReady: boolean;
  recoveryDecisionPending: boolean;
  allowPersistence: boolean;
};

export function deriveWizardStartupState(hasStoredSession: boolean): WizardStartupState {
  return {
    contentReady: true,
    recoveryDecisionPending: hasStoredSession,
    allowPersistence: !hasStoredSession
  };
}
