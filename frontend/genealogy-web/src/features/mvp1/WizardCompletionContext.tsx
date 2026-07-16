import { createContext, useContext } from 'react';

type WizardCompletionStatus = {
  ready: boolean;
  completed: boolean;
  blockerCount: number;
  reason: string;
};

type WizardCompletionContextValue = {
  requestVersion: number;
  status: WizardCompletionStatus;
  reportStatus: (status: WizardCompletionStatus) => void;
};

export const initialWizardCompletionStatus: WizardCompletionStatus = {
  ready: false,
  completed: false,
  blockerCount: 0,
  reason: '正在检查建谱完成条件。'
};

export const WizardCompletionContext = createContext<WizardCompletionContextValue>({
  requestVersion: 0,
  status: initialWizardCompletionStatus,
  reportStatus: () => undefined
});

export function useWizardCompletion() {
  return useContext(WizardCompletionContext);
}
