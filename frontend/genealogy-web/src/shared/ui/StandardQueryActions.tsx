import { Children, cloneElement, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Space } from 'antd';
import type { SpaceProps } from 'antd';

export type StandardQueryActionKind = 'more' | 'reset' | 'submit';
export type StandardQueryActionsProps = Omit<SpaceProps, 'children'> & { children: ReactNode };

type ActionElement = ReactElement<{ 'data-query-action'?: StandardQueryActionKind; loading?: boolean; disabled?: boolean }>;

export function StandardQueryActions({ children, className = '', ...props }: StandardQueryActionsProps) {
  const items = Children.toArray(children);
  const action = (kind: StandardQueryActionKind) => items.find(item => isValidElement(item) && (item as ActionElement).props['data-query-action'] === kind) as ActionElement | undefined;
  const submit = action('submit');
  const busy = Boolean(submit?.props.loading);
  const ordered = (['more', 'reset', 'submit'] as const).flatMap(kind => {
    const item = action(kind);
    if (!item) return [];
    if (kind === 'submit') return [item];
    return [cloneElement(item, { disabled: busy || item.props.disabled })];
  });
  return <Space {...props} className={['standard-query-actions', className].filter(Boolean).join(' ')} aria-busy={busy}>{ordered}</Space>;
}
