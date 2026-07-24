import type { ReactNode } from 'react';
import { Button, Card, Grid, Steps, Tooltip, Typography } from 'antd';
import { ResultNotice } from '../../shared/ui/ResultNotice';
import type { WizardBusinessState } from './domain/wizardStepState';

import { PageFeedback } from '../../shared/ui/Feedback';

export type WizardStepMeta<TKey extends string = string> = {
  key: TKey;
  title: string;
  desc: string;
  state: WizardBusinessState;
  stateLabel: string;
  canEnter: boolean;
  reason: string;
  action: string;
};

export type WizardNavigationActions = {
  previousDisabled?: boolean;
  saveDisabled?: boolean;
  nextDisabled?: boolean;
  saveLoading?: boolean;
  nextLoading?: boolean;
  saveLabel?: string;
  nextLabel: string;
  extra?: ReactNode;
  onPrevious: () => void;
  onSaveDraft: () => void;
  onNext: () => void;
};

export type WizardGateNotice<TKey extends string = string> = {
  title: string;
  reason: string;
  action: string;
  blockingStep?: TKey;
};

type WizardShellProps<TKey extends string = string> = {
  title: string;
  description: string;
  contextLabel: string;
  saveStatus: { label: string; color?: string };
  steps: WizardStepMeta<TKey>[];
  activeStep: TKey;
  loaded: boolean;
  result?: unknown;
  navigation: WizardNavigationActions;
  gateNotice?: WizardGateNotice<TKey>;
  onExit: () => void;
  onStepChange: (step: TKey) => void;
  onGateAction?: (step: TKey) => void;
  children: ReactNode;
};

export function WizardShell<TKey extends string = string>({
  contextLabel,
  steps,
  activeStep,
  loaded,
  result,
  gateNotice,
  onStepChange,
  onGateAction,
  children
}: WizardShellProps<TKey>) {
  const screens = Grid.useBreakpoint();
  const activeIndex = Math.max(0, steps.findIndex(step => step.key === activeStep));
  const activeStepMeta = steps[activeIndex];
  const direction = screens.md === false ? 'vertical' : 'horizontal';
  const hasClanContext = contextLabel && contextLabel !== '尚未选择宗族';

  function handleStepChange(index: number) {
    const nextStep = steps[index];
    if (nextStep) onStepChange(nextStep.key);
  }

  return (
    <div className="mvp1-wizard-page">
      <Card className="wizard-progress-card" size="small" aria-label="建谱步骤">
        <Steps
          className="wizard-ant-steps"
          direction={direction}
          responsive={false}
          size="small"
          current={activeIndex}
          onChange={handleStepChange}
          items={steps.map(step => ({
            title: (
              <Tooltip title={step.desc}>
                <span aria-label={step.title}>{step.title}</span>
              </Tooltip>
            ),
            status: step.key === activeStep ? 'process' : 'wait'
          }))}
        />
        {activeStepMeta ? (
          <div className="wizard-progress-summary">
            <div className="wizard-progress-summary__heading">
              <Typography.Text strong>{activeIndex + 1}/{steps.length} · {activeStepMeta.title}</Typography.Text>
              {hasClanContext ? <Typography.Text type="secondary">宗族：{contextLabel}</Typography.Text> : null}
            </div>
          </div>
        ) : null}
      </Card>

      {gateNotice ? (
        <PageFeedback
          className="wizard-gate-alert"
          tone="warning"
          title={gateNotice.title}
          description={gateNotice.reason}
          action={gateNotice.blockingStep && onGateAction
            ? <Button size="small" onClick={() => onGateAction(gateNotice.blockingStep as TKey)}>去处理</Button>
            : undefined}
        />
      ) : null}

      <section
        className="wizard-step-content"
        aria-label={activeStepMeta ? `${activeStepMeta.title}步骤内容` : '当前步骤内容'}
        aria-busy={!loaded}
        data-step-state={loaded ? 'ready' : 'restoring'}
      >
        {children}
      </section>
      {result ? <ResultNotice result={result} /> : null}
    </div>
  );
}
