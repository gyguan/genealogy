import type { ReactNode } from 'react';
import { Card, Grid, Steps, Tooltip } from 'antd';
import { ResultNotice } from '../../shared/ui/ResultNotice';

export type WizardStepMeta<TKey extends string = string> = {
  key: TKey;
  title: string;
  desc: string;
  ready?: boolean;
};

type WizardShellProps<TKey extends string = string> = {
  steps: WizardStepMeta<TKey>[];
  activeStep: TKey;
  loaded: boolean;
  result?: unknown;
  onStepChange: (step: TKey) => void;
  children: ReactNode;
};

export function WizardShell<TKey extends string = string>({
  steps,
  activeStep,
  loaded,
  result,
  onStepChange,
  children
}: WizardShellProps<TKey>) {
  const screens = Grid.useBreakpoint();
  const activeIndex = Math.max(0, steps.findIndex(step => step.key === activeStep));
  const direction = screens.md === false ? 'vertical' : 'horizontal';

  function handleStepChange(index: number) {
    const nextStep = steps[index];
    if (nextStep) onStepChange(nextStep.key);
  }

  return (
    <div className="mvp1-wizard-page">
      <Card className="wizard-progress-card" size="small" aria-label="建谱进度">
        <Steps
          className="wizard-ant-steps"
          direction={direction}
          responsive={false}
          size="small"
          current={activeIndex}
          onChange={handleStepChange}
          items={steps.map(step => ({
            title: <Tooltip title={step.desc}><span>{step.title}</span></Tooltip>,
            status: step.key === activeStep ? 'process' : step.ready ? 'finish' : 'wait'
          }))}
        />
      </Card>
      {result ? <ResultNotice result={result} /> : null}
      {!loaded ? <div className="wizard-step-hint">请选择步骤。</div> : null}
      {children}
    </div>
  );
}
