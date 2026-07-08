import type { ReactNode } from 'react';

type StepRendererProps<TKey extends string = string> = {
  activeStep: TKey;
  renderStep: (step: TKey) => ReactNode;
};

export function StepRenderer<TKey extends string = string>({ activeStep, renderStep }: StepRendererProps<TKey>) {
  return <>{renderStep(activeStep)}</>;
}
