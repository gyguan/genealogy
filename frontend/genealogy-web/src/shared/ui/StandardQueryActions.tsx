import { Children, cloneElement, isValidElement } from 'react';
import type { AriaAttributes, CSSProperties, HTMLAttributes, ReactElement, ReactNode } from 'react';
import { DownOutlined, UpOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import type { ButtonProps } from 'antd';
import './standard-query-actions.css';

export type StandardQueryActionKind = 'more' | 'reset' | 'submit';
export type StandardQueryActionsProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  children: ReactNode;
  wrap?: boolean;
  style?: CSSProperties;
};

export type StandardMoreFiltersButtonProps = Omit<ButtonProps, 'children' | 'icon' | 'type'> & {
  expanded: boolean;
  activeFilterCount?: number;
};

type ActionElementProps = Pick<ButtonProps, 'loading' | 'disabled' | 'type' | 'icon'> & AriaAttributes & {
  'data-query-action'?: StandardQueryActionKind;
  'data-active-filter-count'?: number | string;
  'data-query-more-state'?: 'expanded' | 'collapsed';
  children?: ReactNode;
};

type ActionElement = ReactElement<ActionElementProps>;

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (!isValidElement(node)) return '';
  return textOf((node as ReactElement<{ children?: ReactNode }>).props.children);
}

function activeFilterCount(item: ActionElement) {
  const value = Number(item.props['data-active-filter-count'] || 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function moreActionProps(item: ActionElement) {
  const explicitExpanded = item.props['aria-expanded'] === true || item.props['aria-expanded'] === 'true';
  const legacyExpanded = /^收起/.test(textOf(item.props.children).trim());
  const expanded = explicitExpanded || legacyExpanded;
  const count = activeFilterCount(item);
  const label = `${expanded ? '收起筛选' : '更多筛选'}${count ? `（${count}）` : ''}`;
  return {
    type: 'text' as const,
    icon: expanded ? <UpOutlined /> : <DownOutlined />,
    'aria-expanded': expanded,
    'aria-label': label,
    'data-query-action': 'more' as const,
    'data-query-more-state': expanded ? 'expanded' as const : 'collapsed' as const,
    children: label
  };
}

export function StandardMoreFiltersButton({ expanded, activeFilterCount = 0, ...props }: StandardMoreFiltersButtonProps) {
  const label = `${expanded ? '收起筛选' : '更多筛选'}${activeFilterCount ? `（${activeFilterCount}）` : ''}`;
  return (
    <Button
      {...props}
      type="text"
      icon={expanded ? <UpOutlined /> : <DownOutlined />}
      data-query-action="more"
      data-active-filter-count={activeFilterCount}
      data-query-more-state={expanded ? 'expanded' : 'collapsed'}
      aria-expanded={expanded}
      aria-label={label}
    >
      {label}
    </Button>
  );
}

function isAction(item: ReactNode, kind: StandardQueryActionKind): item is ActionElement {
  if (!isValidElement(item)) return false;
  if ((item as ActionElement).props['data-query-action'] === kind) return true;
  return kind === 'more' && item.type === StandardMoreFiltersButton;
}

function normalizeAction(kind: StandardQueryActionKind, item: ActionElement, busy: boolean) {
  if (kind === 'more') {
    const props = moreActionProps(item);
    return cloneElement(item, {
      ...props,
      disabled: busy || item.props.disabled
    }, props.children);
  }
  if (kind === 'reset') {
    return cloneElement(item, {
      type: 'default',
      icon: undefined,
      disabled: busy || item.props.disabled,
      'data-query-action': 'reset'
    });
  }
  return cloneElement(item, {
    type: 'primary',
    icon: undefined,
    'data-query-action': 'submit'
  });
}

export function StandardQueryActions({ children, className = '', wrap = false, ...props }: StandardQueryActionsProps) {
  const items = Children.toArray(children);
  const action = (kind: StandardQueryActionKind) => items.find(item => isAction(item, kind)) as ActionElement | undefined;
  const submit = action('submit');
  const busy = Boolean(submit?.props.loading);
  const ordered = (['more', 'reset', 'submit'] as const).flatMap(kind => {
    const item = action(kind);
    return item ? [normalizeAction(kind, item, busy)] : [];
  });
  return <div {...props} className={['standard-query-actions', wrap ? 'standard-query-actions--wrap' : '', className].filter(Boolean).join(' ')} aria-busy={busy}>{ordered}</div>;
}
