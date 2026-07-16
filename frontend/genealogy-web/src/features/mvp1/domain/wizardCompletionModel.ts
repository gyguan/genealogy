export type WizardCompletionControlInput = {
  activeStep: string;
  ready: boolean;
  completed: boolean;
  blockerCount: number;
  reason?: string;
};

export type WizardCompletionControl = {
  label: string;
  disabled: boolean;
  hidden: boolean;
  reason: string;
};

export function deriveWizardCompletionControl(input: WizardCompletionControlInput): WizardCompletionControl {
  if (input.activeStep !== 'review') {
    return { label: '下一步', disabled: false, hidden: false, reason: '' };
  }
  if (input.completed) {
    return { label: '完成建谱', disabled: true, hidden: true, reason: '本次建谱已完成。' };
  }
  if (!input.ready) {
    return {
      label: '完成建谱',
      disabled: true,
      hidden: false,
      reason: input.reason || '正在检查建谱完成条件。'
    };
  }
  if (input.blockerCount > 0) {
    return {
      label: '完成建谱',
      disabled: true,
      hidden: false,
      reason: input.reason || `请先处理 ${input.blockerCount} 项阻塞。`
    };
  }
  return { label: '完成建谱', disabled: false, hidden: false, reason: '' };
}
