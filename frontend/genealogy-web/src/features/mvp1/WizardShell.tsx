import type { ReactNode } from 'react';
import { Panel } from '../../shared/ui/Panel';
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
  return (
    <div className="mvp1-wizard-page">
      <Panel title="MVP1 建谱向导" description="对象先保存为草稿，可在创建页内提交审核；只有审核通过对象才能进入下一步关联。">
        <div className="wizard-steps">
          {steps.map(step => (
            <button
              key={step.key}
              className={activeStep === step.key ? 'active' : step.ready ? 'ready' : ''}
              onClick={() => onStepChange(step.key)}
            >
              <strong>{step.title}</strong>
              <span>{step.desc}</span>
            </button>
          ))}
        </div>
      </Panel>
      {result ? <ResultNotice data={result} /> : null}
      {!loaded ? <div className="wizard-step-hint">点击步骤后加载本步骤数据。</div> : null}
      {children}
    </div>
  );
}
