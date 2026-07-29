import { Children, cloneElement, isValidElement } from 'react';
import type { HTMLAttributes, ReactElement, ReactNode } from 'react';
import { Typography } from 'antd';
import type { CardProps } from 'antd';
import { StandardPageActions } from './StandardPagePatterns';
import './query-result-cards.css';

type QueryResultProps = Omit<HTMLAttributes<HTMLElement>, 'title' | 'children'> & {
  total: number;
  totalSuffix?: string;
  extra?: ReactNode;
  resultExtra?: ReactNode;
  size?: CardProps['size'];
  children: ReactNode;
};

type ActionSplit = { pageAction?: ReactNode; resultActions?: ReactNode };

function splitFirstPrimaryAction(node: ReactNode): ActionSplit {
  let pageAction: ReactNode;
  function visit(value: ReactNode): ReactNode {
    if (pageAction || value === null || value === undefined || typeof value === 'boolean') return value;
    if (Array.isArray(value)) return value.map(visit);
    if (!isValidElement(value)) return value;
    const element = value as ReactElement<{ type?: string; children?: ReactNode }>;
    if (element.props.type === 'primary') {
      pageAction = element;
      return null;
    }
    if (!('children' in element.props)) return element;
    return cloneElement(element, undefined, Children.map(element.props.children, child => visit(child)));
  }
  return { pageAction, resultActions: visit(node) };
}

export function QueryResultCard({
  total,
  totalSuffix = '条',
  children,
  className = '',
  extra,
  resultExtra,
  size = 'small',
  ...sectionProps
}: QueryResultProps) {
  const split = splitFirstPrimaryAction(extra);
  return <>
    {split.pageAction ? <StandardPageActions>{split.pageAction}</StandardPageActions> : null}
    <section
      {...sectionProps}
      className={`query-result-outer-card ${className}`.trim()}
      data-query-result-role="outer"
      data-query-result-size={size}
    >
      <div className="query-result-outer-card__header">
        <div className="query-result-card__title">
          <Typography.Text strong>查询结果</Typography.Text>
          <Typography.Text type="secondary">（共 {total} {totalSuffix}）</Typography.Text>
        </div>
        {resultExtra || split.resultActions ? (
          <div className="query-result-outer-card__actions">
            {resultExtra ? <div className="query-result-outer-card__result-extra">{resultExtra}</div> : null}
            {split.resultActions ? <div className="query-result-outer-card__extra">{split.resultActions}</div> : null}
          </div>
        ) : null}
      </div>
      {children}
    </section>
  </>;
}
