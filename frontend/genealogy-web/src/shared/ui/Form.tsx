import { Children, cloneElement, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Button, Form, Input, Select, Space } from 'antd';

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

function nodeText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node).trim();
  if (Array.isArray(node)) return node.map(nodeText).join('').trim();
  if (isValidElement<AnyProps>(node)) return nodeText(node.props.children);
  return '';
}

function buttonText(node: ReactNode) {
  if (!isValidElement<AnyProps>(node) || node.type !== 'button') return '';
  return nodeText(node.props.children);
}

function cloneButtonLabel(node: ReactNode, label: string, primary = false): ReactNode {
  if (!isValidElement<AnyProps>(node) || node.type !== 'button') return node;
  const { className = '', ...props } = node.props;
  const nextClassName = primary
    ? String(className).split(/\s+/).filter(item => item && !['secondary', 'ghost', 'danger'].includes(item)).join(' ')
    : className;
  return cloneElement(node as ReactElement<AnyProps>, { ...props, className: nextClassName, children: label });
}

function normalizeReviewActions(children: ReactNode) {
  const items = Children.toArray(children);
  const submit = items.find(item => buttonText(item) === REVIEW_SUBMIT_LABEL);
  if (!submit) return items;

  const draft = REVIEW_DRAFT_ALIASES
    .map(label => items.find(item => buttonText(item) === label))
    .find(Boolean);
  if (!draft) return items;

  return [cloneButtonLabel(draft, REVIEW_DRAFT_LABEL, true), submit];
}

function toAntdControl(child: ReactNode): ReactNode {
  if (!isValidElement<AnyProps>(child)) return child;
  if (typeof child.type !== 'string') return child;

  const { children, ...props } = child.props;
  if (child.type === 'textarea') {
    return <Input.TextArea {...props} value={props.value} onChange={props.onChange} />;
  }
  if (child.type === 'select') {
    const options = Children.toArray(children)
      .filter(isValidElement)
      .map(option => ({
        label: (option as ReactElement<AnyProps>).props.children,
        value: String((option as ReactElement<AnyProps>).props.value ?? ''),
        searchText: optionSearchText((option as ReactElement<AnyProps>).props.children)
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
  if (child.type === 'input') {
    return <Input {...props} value={props.value} onChange={props.onChange} />;
  }
  return child;
}

function toAntdAction(child: ReactNode): ReactNode {
  if (!isValidElement<AnyProps>(child) || child.type !== 'button') return child;
  const { className = '', children, onClick, ...rest } = child.props;
  const isSecondary = className.includes('secondary') || className.includes('ghost');
  const isDanger = className.includes('danger');
  const text = nodeText(children);
  const isDraftSave = REVIEW_DRAFT_ALIASES.includes(text);
  const nextOnClick = isDraftSave
    ? (event: unknown) => {
        markDraftSaveGuard();
        if (typeof onClick === 'function') onClick(event);
      }
    : onClick;
  return <Button {...rest} onClick={nextOnClick} danger={isDanger} type={isSecondary || isDanger ? 'default' : 'primary'}>{children}</Button>;
}

export function Field(props: { label: string; children: ReactNode; hint?: string }) {
  if (isTechnicalLabel(props.label)) return null;
  return (
    <Form.Item className="field antd-field" label={props.label} extra={props.hint} colon={false}>
      {toAntdControl(props.children)}
    </Form.Item>
  );
}

export function Actions({ children }: { children: ReactNode }) {
  return <Space className="actions antd-actions" wrap>{normalizeReviewActions(children).map(toAntdAction)}</Space>;
}
