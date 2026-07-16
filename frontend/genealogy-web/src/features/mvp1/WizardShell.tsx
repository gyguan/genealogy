import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Button, Card, Grid, Space, Steps, Tag, Tooltip, Typography } from 'antd';
import { ResultNotice } from '../../shared/ui/ResultNotice';
import { deriveWizardCompletionControl } from './domain/wizardCompletionModel';
import type { WizardBusinessState } from './domain/wizardStepState';
import { initialWizardCompletionStatus, WizardCompletionContext } from './WizardCompletionContext';

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
  onContentChange?: () => void;
  children: ReactNode;
};

function stateColor(state: WizardBusinessState) {
  switch (state) {
    case 'completed': return 'success';
    case 'reviewing': return 'processing';
    case 'rejected':
    case 'error': return 'error';
    case 'invalid': return 'warning';
    case 'editing': return 'blue';
    default: return 'default';
  }
}

function stepStatus(state: WizardBusinessState, active: boolean): 'wait' | 'process' | 'finish' | 'error' {
  if (state === 'completed') return 'finish';
  if (state === 'rejected' || state === 'invalid' || state === 'error') return 'error';
  if (state === 'reviewing' || active) return 'process';
  return 'wait';
}

export function WizardShell<TKey extends string = string>({
  title,
  description,
  contextLabel,
  saveStatus,
  steps,
  activeStep,
  loaded,
  result,
  navigation,
  gateNotice,
  onExit,
  onStepChange,
  onGateAction,
  onContentChange,
  children
}: WizardShellProps<TKey>) {
  const screens = Grid.useBreakpoint();
  const [completionStatus, setCompletionStatus] = useState(initialWizardCompletionStatus);
  const [completionRequestVersion, setCompletionRequestVersion] = useState(0);
  const isCompletionStep = String(activeStep) === 'review';
  const normalizedSteps = useMemo(() => steps.map(step => String(step.key) === 'review'
    ? { ...step, title: '完成', desc: '汇总建谱结果、处理阻塞项并确认完成建谱。' }
    : step), [steps]);
  const activeIndex = Math.max(0, normalizedSteps.findIndex(step => step.key === activeStep));
  const activeStepMeta = normalizedSteps[activeIndex];
  const direction = screens.md === false ? 'vertical' : 'horizontal';
  const buttonSize = screens.md === false ? 'large' : 'middle';
  const completionControl = deriveWizardCompletionControl({
    activeStep: String(activeStep),
    ready: completionStatus.ready,
    completed: completionStatus.completed,
    blockerCount: completionStatus.blockerCount,
    reason: completionStatus.reason
  });

  useEffect(() => {
    if (!isCompletionStep) {
      setCompletionStatus(initialWizardCompletionStatus);
      setCompletionRequestVersion(0);
    }
  }, [isCompletionStep]);

  function handleStepChange(index: number) {
    const nextStep = normalizedSteps[index];
    if (nextStep) onStepChange(nextStep.key);
  }

  function handlePrimaryAction() {
    if (isCompletionStep) {
      setCompletionRequestVersion(version => version + 1);
      return;
    }
    navigation.onNext();
  }

  const pageDescription = description.replace('来源和审核顺序', '来源和完成顺序').replace('和审核顺序', '和完成顺序');
  const nextLabel = isCompletionStep ? completionControl.label : navigation.nextLabel;
  const nextDisabled = navigation.nextDisabled || (isCompletionStep && completionControl.disabled);

  return (
    <WizardCompletionContext.Provider value={{ requestVersion: completionRequestVersion, status: completionStatus, reportStatus: setCompletionStatus }}>
      <div className="mvp1-wizard-page">
        <header className="wizard-page-header">
          <div className="wizard-page-heading">
            <Typography.Title level={3}>{title}</Typography.Title>
            <Typography.Paragraph type="secondary">{pageDescription}</Typography.Paragraph>
            <Space size={[8, 8]} wrap>
              <Tag color="blue">当前宗族：{contextLabel}</Tag>
              <Tag color={saveStatus.color} aria-live="polite">{saveStatus.label}</Tag>
            </Space>
          </div>
          <Button size={buttonSize} onClick={onExit}>退出向导</Button>
        </header>

        <Card className="wizard-progress-card" size="small" aria-label="建谱进度">
          <Steps
            className="wizard-ant-steps"
            direction={direction}
            responsive={false}
            size="small"
            current={activeIndex}
            onChange={handleStepChange}
            items={normalizedSteps.map(step => ({
              title: (
                <Tooltip title={`${step.reason} ${step.action}`}>
                  <span className="wizard-step-title" aria-label={`${step.title}：${step.stateLabel}`}>
                    <span>{step.title}</span>
                    <Tag color={stateColor(step.state)}>{step.stateLabel}</Tag>
                  </span>
                </Tooltip>
              ),
              description: screens.md === false ? step.reason : undefined,
              status: stepStatus(step.state, step.key === activeStep)
            }))}
          />
          {activeStepMeta ? (
            <div className="wizard-progress-summary">
              <div className="wizard-progress-summary__heading">
                <Typography.Text strong>步骤 {activeIndex + 1}/{normalizedSteps.length} · {activeStepMeta.title}</Typography.Text>
                <Tag color={stateColor(activeStepMeta.state)}>{activeStepMeta.stateLabel}</Tag>
              </div>
              <div className="wizard-progress-summary__detail">
                <Typography.Text type="secondary">{activeStepMeta.desc}</Typography.Text>
                <Typography.Text>{activeStepMeta.reason}</Typography.Text>
              </div>
            </div>
          ) : null}
        </Card>

        {gateNotice ? (
          <Alert
            className="wizard-gate-alert"
            type="warning"
            showIcon
            message={gateNotice.title}
            description={`${gateNotice.reason} 建议：${gateNotice.action}`}
            action={gateNotice.blockingStep && onGateAction
              ? <Button size="small" onClick={() => onGateAction(gateNotice.blockingStep as TKey)}>前往处理</Button>
              : undefined}
          />
        ) : null}

        {!loaded ? <div className="wizard-step-hint">正在加载当前步骤状态…</div> : null}
        {loaded ? (
          <section
            className="wizard-step-content"
            aria-label={activeStepMeta ? `${activeStepMeta.title}步骤内容` : '当前步骤内容'}
            onInputCapture={onContentChange}
            onChangeCapture={onContentChange}
          >
            {children}
          </section>
        ) : null}
        {result ? <ResultNotice result={result} /> : null}

        <Card className="wizard-fixed-action-card" size="small" aria-label="建谱向导操作">
          <div className="wizard-fixed-actions">
            <Space className="wizard-fixed-actions__secondary" size={8} wrap>
              <Button size={buttonSize} disabled={navigation.previousDisabled} onClick={navigation.onPrevious}>上一步</Button>
              <Button
                size={buttonSize}
                disabled={navigation.saveDisabled}
                loading={navigation.saveLoading}
                onClick={navigation.onSaveDraft}
              >
                {navigation.saveLabel || '保存草稿'}
              </Button>
            </Space>
            <Space className="wizard-fixed-actions__primary" size={8} wrap>
              {navigation.extra}
              {isCompletionStep && completionControl.reason && !completionControl.completed ? (
                <Typography.Text type="secondary" role="status">{completionControl.reason}</Typography.Text>
              ) : null}
              {!completionControl.hidden ? (
                <Button
                  type="primary"
                  size={buttonSize}
                  disabled={nextDisabled}
                  loading={navigation.nextLoading}
                  onClick={handlePrimaryAction}
                >
                  {nextLabel}
                </Button>
              ) : null}
            </Space>
          </div>
        </Card>
      </div>
    </WizardCompletionContext.Provider>
  );
}
