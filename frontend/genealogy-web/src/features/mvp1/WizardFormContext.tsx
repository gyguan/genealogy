import { createContext, useContext } from 'react';
import type { FormInstance } from 'antd';
import type { Mvp1StepKey } from './domain/wizardStepState';
import type { WizardFieldErrors } from './domain/wizardFormValidation';

type WizardFormContextValue = {
  step?: Mvp1StepKey;
  form?: FormInstance;
  setBusinessError: (message: string) => void;
  applyServerErrors: (errors?: WizardFieldErrors, message?: string) => void;
};

const WizardFormContext = createContext<WizardFormContextValue>({
  setBusinessError: () => undefined,
  applyServerErrors: () => undefined
});

export function WizardFormProvider({ value, children }: { value: WizardFormContextValue; children: React.ReactNode }) {
  return <WizardFormContext.Provider value={value}>{children}</WizardFormContext.Provider>;
}

export function useWizardFormContext() {
  return useContext(WizardFormContext);
}
