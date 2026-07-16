import type { ReactNode } from 'react';
import { Button, Card, Grid, Space, Steps, Tag, Tooltip, Typography } from 'antd';
import { ResultNotice } from '../../shared/ui/ResultNotice';

export type WizardStepMeta<TKey extends string = string> = {
  key: TKey;
  title: string;
  desc: string;
  ready?: boolean;
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
  onExit: () => void;
  onStepChange: (step: TKey) => void;
  onContentChange?: () => void;
  children: ReactNode;
};

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
  onExit,
  onStepChange,
  onContentChange,
  children
}: WizardShellProps<TKey>) {
  const screens = Grid.useBreakpoint();
  const activeIndex = Math.max(0, steps.findIndex(step => step.key === activeStep));
  const activeStepMeta = steps[activeIndex];
  const direction = screens.md === false ? 'vertical' : 'horizontal';
  const buttonSize = screens.md === false ? 'large' : 'middle';

  function handleStepChange(index: number) {
    const nextStep = steps[index];
    if (nextStep) onStepChange(nextStep.key);
  }

  return (
    <div className="mvp1-wizard-page">
      <header className="wizard-page-header">
        <div className="wizard-page-heading">
          <Typography.Title level={3}>{title}</Typography.Title>
          <Typography.Paragraph type="secondary">{description}</Typography.Paragraph>
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
          items={steps.map(step => ({
            title: <Tooltip title={step.desc}><span>{step.title}</span></Tooltip>,
            status: step.key === activeStep ? 'process' : step.ready ? 'finish' : 'wait'
          }))}
        />
        {activeStepMeta ? (
          <div className="wizard-progress-summary">
            <Typography.Text strong>步骤 {activeIndex + 1}/{steps.length} · {activeStepMeta.title}</Typography.Text>
            <Typography.Text type="secondary">{activeStepMeta.desc}</Typography.Text>
          </div>
        ) : null}
      </Card>

      {!loaded ? <div className="wizard-step-hint">请选择步骤。</div> : null}
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
            <Button
              type="primary"
              size={buttonSize}
              disabled={navigation.nextDisabled}
              loading={navigation.nextLoading}
              onClick={navigation.onNext}
            >
              {navigation.nextLabel}
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
}
