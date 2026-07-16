import { useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { Alert } from 'antd';
import type { Mvp1StepKey } from './domain/wizardStepState';
import {
  firstWizardFieldError,
  mergeWizardFieldErrors,
  validateWizardStep,
  type WizardFieldErrors,
  type WizardFieldValues
} from './domain/wizardFormValidation';

const ACTION_PATTERN = /(创建|保存|提交|绑定|新增|批量提交|确认)/;
const PASS_THROUGH_PATTERN = /(刷新|重试|重置|取消|选择|查看|上一|下一|退出|恢复|暂不)/;

function normalizeLabel(value: string) {
  return value.replace(/[：:*＊]/g, '').replace(/\s+/g, ' ').trim();
}

function itemLabel(item: Element) {
  const label = item.querySelector('.ant-form-item-label label, label > span:first-child, .field-label');
  return normalizeLabel(label?.textContent || '');
}

function controlValue(item: Element) {
  const input = item.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input:not([type="hidden"]), textarea, select');
  if (input) {
    if (input instanceof HTMLInputElement && (input.type === 'checkbox' || input.type === 'radio')) return input.checked;
    if (input.value) return input.value;
  }
  const selected = item.querySelector('.ant-select-selection-item');
  if (selected?.textContent) return selected.textContent.trim();
  const disabledValue = item.querySelector('input[disabled]');
  return disabledValue?.getAttribute('value') || '';
}

function collectValues(root: HTMLElement): WizardFieldValues {
  const values: WizardFieldValues = {};
  const items = root.querySelectorAll('.ant-form-item, .field, .relationship-step-field, label');
  items.forEach(item => {
    const label = itemLabel(item);
    if (label && !(label in values)) values[label] = controlValue(item);
  });
  return values;
}

function clearDomErrors(root: HTMLElement) {
  root.querySelectorAll('.wizard-field-error-help').forEach(node => node.remove());
  root.querySelectorAll('[data-wizard-field-error="true"]').forEach(node => {
    node.removeAttribute('data-wizard-field-error');
    node.removeAttribute('aria-invalid');
  });
}

function findItemByLabel(root: HTMLElement, field: string) {
  return Array.from(root.querySelectorAll('.ant-form-item, .field, .relationship-step-field, label'))
    .find(item => itemLabel(item) === field);
}

function paintDomErrors(root: HTMLElement, errors: WizardFieldErrors) {
  clearDomErrors(root);
  for (const [field, message] of Object.entries(errors)) {
    const item = findItemByLabel(root, field);
    if (!item) continue;
    item.setAttribute('data-wizard-field-error', 'true');
    const control = item.querySelector<HTMLElement>('input, textarea, select, .ant-select-selector');
    control?.setAttribute('aria-invalid', 'true');
    const help = document.createElement('div');
    help.className = 'wizard-field-error-help';
    help.setAttribute('role', 'alert');
    help.textContent = message;
    item.appendChild(help);
  }
}

function focusFirst(root: HTMLElement, errors: WizardFieldErrors) {
  const first = firstWizardFieldError(errors);
  if (!first) return;
  const item = findItemByLabel(root, first.field);
  item?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  window.setTimeout(() => {
    const control = item?.querySelector<HTMLElement>('input:not([disabled]), textarea:not([disabled]), select:not([disabled]), .ant-select-selector');
    control?.focus();
  }, 180);
}

type ApiErrorDetail = { fieldErrors?: WizardFieldErrors; message?: string };

type Props = {
  step: Mvp1StepKey;
  children: ReactNode;
};

export function WizardValidationBoundary({ step, children }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [fieldErrors, setFieldErrors] = useState<WizardFieldErrors>({});
  const [businessError, setBusinessError] = useState('');

  function applyErrors(errors: WizardFieldErrors, message = '') {
    setFieldErrors(errors);
    setBusinessError(message);
    if (rootRef.current) {
      paintDomErrors(rootRef.current, errors);
      focusFirst(rootRef.current, errors);
    }
  }

  useEffect(() => {
    setFieldErrors({});
    setBusinessError('');
    if (rootRef.current) clearDomErrors(rootRef.current);
  }, [step]);

  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<ApiErrorDetail>).detail || {};
      const next = mergeWizardFieldErrors(fieldErrors, detail.fieldErrors);
      applyErrors(next, detail.message || '保存失败，请修正当前步骤后重试');
    };
    window.addEventListener('genealogy:wizard-api-error', listener);
    return () => window.removeEventListener('genealogy:wizard-api-error', listener);
  }, [fieldErrors]);

  function onClickCapture(event: ReactMouseEvent<HTMLDivElement>) {
    const button = (event.target as HTMLElement).closest('button');
    if (!button || button.disabled) return;
    const text = (button.textContent || '').trim();
    if (!ACTION_PATTERN.test(text) || PASS_THROUGH_PATTERN.test(text)) return;
    const root = rootRef.current;
    if (!root) return;
    const errors = validateWizardStep(step, collectValues(root));
    if (!Object.keys(errors).length) {
      applyErrors({});
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    applyErrors(errors, '请先修正标记字段，再执行当前操作。');
  }

  function onInputCapture() {
    const root = rootRef.current;
    if (!root || !Object.keys(fieldErrors).length) return;
    const next = validateWizardStep(step, collectValues(root));
    setFieldErrors(next);
    paintDomErrors(root, next);
    if (!Object.keys(next).length) setBusinessError('');
  }

  return (
    <div ref={rootRef} className="wizard-validation-boundary" onClickCapture={onClickCapture} onInputCapture={onInputCapture} onChangeCapture={onInputCapture}>
      {businessError ? (
        <Alert
          className="wizard-step-local-error"
          type="error"
          showIcon
          message={businessError}
          description={Object.values(fieldErrors).length ? Object.values(fieldErrors).join('；') : undefined}
          closable
          onClose={() => applyErrors({})}
        />
      ) : null}
      {children}
    </div>
  );
}
