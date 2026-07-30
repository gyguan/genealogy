import { Children, cloneElement, isValidElement } from 'react';
import type { AriaAttributes, ReactElement, ReactNode } from 'react';
import { DownOutlined, UpOutlined } from '@ant-design/icons';
import { Button, Space } from 'antd';
import type { ButtonProps, SpaceProps } from 'antd';
import './standard-query-actions.css';

export type StandardQueryActionKind = 'more' | 'reset' | 'submit';
export type StandardQueryActionsProps = Omit<SpaceProps, 'children'> & { children: ReactNode };

export type StandardMoreFiltersButtonProps = Omit<ButtonProps, 'children' | 'icon'> & {
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

function activeFilterCount(item: ActionElement) {
  const value = Number(item.props['data-active-filter-count'] || 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function normalizeMoreAction(item: ActionElement) {
  const expanded = item.props['aria-expanded'] === true || item.props['aria-expanded'] === 'true';
  const count = activeFilterCount(item);
  const label = `${expanded ? '收起筛选' : '更多筛选'}${count ? `（${count}）` : ''}`;
  return cloneElement(item, {
    type: item.props.type || 'text',
    icon: expanded ? <UpOutlined /> : <DownOutlined />,
    'aria-label': label,
    'data-query-more-state': expanded ? 'expanded' : 'collapsed'
  }, label);
}

export function StandardMoreFiltersButton({ expanded, activeFilterCount = 0, ...props }: StandardMoreFiltersButtonProps) {
  return (
    <Button
      {...props}
      type={props.type || 'text'}
      icon={expanded ? <UpOutlined /> : <DownOutlined />}
      data-query-action="more"
      data-active-filter-count={activeFilterCount}
      data-query-more-state={expanded ? 'expanded' : 'collapsed'}
      aria-expanded={expanded}
      aria-label={`${expanded ? '收起筛选' : '更多筛选'}${activeFilterCount ? `（${activeFilterCount}）` : ''}`}
    >
      {`${expanded ? '收起筛选' : '更多筛选'}${activeFilterCount ? `（${activeFilterCount}）` : ''}`}
    </Button>
  );
}

export function StandardQueryActions({ children, className = '', ...props }: StandardQueryActionsProps) {
  const items = Children.toArray(children);
  const action = (kind: StandardQueryActionKind) => items.find(item => isValidElement(item) && (item as ActionElement).props['data-query-action'] === kind) as ActionElement | undefined;
  const submit = action('submit');
  const busy = Boolean(submit?.props.loading);
  const ordered = (['more', 'reset', 'submit'] as const).flatMap(kind => {
    const item = action(kind);
    if (!item) return [];
    if (kind === 'submit') return [item];
    const normalized = kind === 'more' ? normalizeMoreAction(item) : item;
    return [cloneElement(normalized, { disabled: busy || normalized.props.disabled })];
  });
  return <Space {...props} className={['standard-query-actions', className].filter(Boolean).join(' ')} aria-busy={busy}>{ordered}</Space>;
}
