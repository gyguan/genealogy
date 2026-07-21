import { Children, cloneElement, isValidElement, useEffect } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Button, Form, Input, Select, Space } from 'antd';
import { validateWizardStep, wizardFieldName } from '../../features/mvp1/domain/wizardFormValidation';
import { useWizardFormContext } from '../../features/mvp1/WizardFormContext';

type AnyProps = Record<string, any>;

const REVIEW_SUBMIT_LABEL = '保存并提交审核';
const REVIEW_DRAFT_LABEL = '保存草稿继续录入';
const DRAFT_SAVE_GUARD_MS = 8000;
const REVIEW_DRAFT_ALIASES = [
  REVIEW_DRAFT_LABEL,
  '保存草稿，继续录入',
  '追加草稿',
  '保存关系草稿',
  '保存来源草稿',
  '保存草稿'
];

const TECHNICAL_LABEL_PATTERN = /(^|[\s（(])(ID|Id|id)([\s）)]|$)|编码|主键|技术标识|系统标识|校验值|SHA|checksum|storagePath|targetType|targetId|dataStatus|verificationStatus/i;
const CROSS_FIELD_DEPENDENCIES: Record<string, string[]> = {
  birthDate: ['deathDate', 'isLiving'],
  deathDate: ['birthDate', 'isLiving'],
  isLiving: ['birthDate', 'deathDate'],
  centerPersonId: ['relativePersonId', 'selectionRule'],
  relativePersonId: ['centerPersonId', 'selectionRule'],
  selectionRule: ['centerPersonId', 'relativePersonId']
};

function markDraftSaveGuard() {
  (window as any).__genealogyDraftSaveGuardUntil = Date.now() + DRAFT_SAVE_GUARD_MS;
}

function emitValue(originalOnChange: any, value: unknown) {
  if (typeof originalOnChange === 'function') originalOnChange({ target: { value } });
}

function isTechnicalLabel(label: string) {
  return TECHNICAL_LABEL_PATTERN.test(label);
}

function optionSearchText(label: unknown) {
  if (typeof label === 'string' || typeof label === 'number') return String(label);
  if (Array.isArray(label)) return label.map(optionSearchText).join(' ');
  return String(label ?? '');
}

function asElement(node: ReactNode): ReactElement<AnyProps> | null {
  return isValidElement(node) ? node as ReactElement<AnyProps> : null;
}

function nodeText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node).trim();
  if (Array.isArray(node)) return node.map(nodeText).join('').trim();
  const element = asElement(node);
  return element ? nodeText(element.props.children) : '';
}

function buttonText(node: ReactNode) {
  const element = asElement(node);
  if (!element || element.type !== 'button') return '';
  return nodeText(element.props.children);
}

function cloneButtonLabel(node: ReactNode, label: string, primary = false): ReactNode {
  const element = asElement(node);
  if (!element || element.type !== 'button') return node;
  const { className = '', ...props } = element.props;
  const nextClassName = primary
    ? String(className).split(/\s+/).filter(item => item && !['secondary', 'ghost', 'danger'].includes(item)).join(' ')
    : className;
  return cloneElement(element, { ...props, className: nextClassName, children: label });
}

function normalizeReviewActions(children: ReactNode) {
  const items = Children.toArray(children);
  const submit = items.find(item => buttonText(item) === REVIEW_SUBMIT_LABEL);
  if (!submit) return items;
  const draft = REVIEW_DRAFT_ALIASES.map(label => items.find(item => buttonText(item) === label)).find(Boolean);
  if (!draft) return items;
  return [cloneButtonLabel(draft, REVIEW_DRAFT_LABEL, true), submit];
}

function toAntdControl(child: ReactNode): ReactNode {
  const element = asElement(child);
  if (!element || typeof element.type !== 'string') return child;
  const { children, ...props } = element.props;
  if (element.type === 'textarea') return <Input.TextArea {...props} value={props.value} onChange={props.onChange} />;
  if (element.type === 'select') {
    const options = Children.toArray(children)
      .map(asElement)
      .filter((option): option is ReactElement<AnyProps> => option !== null)
      .map(option => ({
        label: option.props.children,
        value: String(option.props.value ?? ''),
        searchText: optionSearchText(option.props.children)
      }));
    return (
      <Select
        showSearch
        optionFilterProp="searchText"
        filterOption={(input, option) => String(option?.searchText ?? '').toLowerCase().includes(input.toLowerCase())}
        {...props}
        value={props.value}
        options={options}
        onChange={value => emitValue(props.onChange, value)}
      />
    );
  }
  if (element.type === 'input') return <Input {...props} value={props.value} onChange={props.onChange} />;
  return child;
}

function toAntdAction(child: ReactNode, validateBeforeAction: () => Promise<boolean>): ReactNode {
  const element = asElement(child);
  if (!element || element.type !== 'button') return child;
  const { className = '', children, onClick, ...rest } = element.props;
  const isSecondary = String(className).includes('secondary') || String(className).includes('ghost');
  const isDanger = String(className).includes('danger');
  const text = nodeText(children);
  const isDraftSave = REVIEW_DRAFT_ALIASES.includes(text);
  const nextOnClick = async (event: unknown) => {
    if (element.props['data-skip-validation'] !== true && !await validateBeforeAction()) return;
    if (isDraftSave) markDraftSaveGuard();
    if (typeof onClick === 'function') onClick(event);
  };
  return <Button {...rest} onClick={nextOnClick} danger={isDanger} type={isSecondary || isDanger ? 'default' : 'primary'}>{children}</Button>;
}

export function Field(props: { label: string; children: ReactNode; hint?: string; name?: string }) {
  const context = useWizardFormContext();
  const element = asElement(props.children);
  const name = props.name || wizardFieldName(props.label);
  const currentValue = element?.props.value;
  const isExternallyControlledSearch = element?.props.searchValue !== undefined;
  const originalOnChange = element?.props.onChange;
  const syncedChild = element && context.form && name
    ? cloneElement(element, {
        onChange: (eventOrValue: any) => {
          const target = eventOrValue?.target;
          const nextValue = target
            ? ((target.type === 'checkbox' || target.type === 'radio') ? target.checked : target.value)
            : eventOrValue;
          context.form?.setFieldValue(name, nextValue);
          if (typeof originalOnChange === 'function') originalOnChange(eventOrValue);
        }
      })
    : props.children;

  useEffect(() => {
    if (!context.form || !name || currentValue === undefined || isExternallyControlledSearch) return;
    if (context.form.getFieldValue(name) !== currentValue) {
      context.form.setFieldValue(name, currentValue);
    }
  }, [context.form, name, currentValue, isExternallyControlledSearch]);

  if (isTechnicalLabel(props.label)) return null;
  if (isExternallyControlledSearch) {
    return (
      <Form.Item
        className="field antd-field"
        label={props.label}
        extra={props.hint}
        colon={false}
      >
        {syncedChild}
      </Form.Item>
    );
  }

  const rules = context.step ? [{
    validator: async () => {
      const errors = validateWizardStep(context.step!, context.form?.getFieldsValue(true) || {});
      if (errors[name]) throw new Error(errors[name]);
    }
  }] : undefined;

  return (
    <Form.Item
      className="field antd-field"
      label={props.label}
      extra={props.hint}
      colon={false}
      name={context.form ? name : undefined}
      dependencies={CROSS_FIELD_DEPENDENCIES[name]}
      rules={rules}
      trigger="onBlur"
      validateTrigger="onBlur"
      getValueProps={() => ({})}
      initialValue={currentValue}
    >
      {toAntdControl(syncedChild)}
    </Form.Item>
  );
}

export function Actions({ children }: { children: ReactNode }) {
  const context = useWizardFormContext();
  const validateBeforeAction = async () => {
    if (!context.form) return true;
    try {
      await context.form.validateFields();
      context.setBusinessError('');
      return true;
    } catch {
      context.setBusinessError('请先修正标记字段，再执行当前操作。');
      const first = context.form.getFieldsError().find(item => item.errors.length)?.name;
      if (first) {
        context.form.scrollToField(first, { behavior: 'smooth', block: 'center' });
        const field = context.form.getFieldInstance(first) as { focus?: () => void } | undefined;
        field?.focus?.();
      }
      return false;
    }
  };
  return <Space className="actions antd-actions" wrap>{normalizeReviewActions(children).map(child => toAntdAction(child, validateBeforeAction))}</Space>;
}
