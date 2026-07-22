import type { HTMLAttributes, ReactNode } from 'react';
import { Typography } from 'antd';
import type { CardProps } from 'antd';
import './query-result-cards.css';

type QueryResultProps = Omit<HTMLAttributes<HTMLElement>, 'title' | 'children'> & {
  total: number;
  totalSuffix?: string;
  extra?: ReactNode;
  resultExtra?: ReactNode;
  size?: CardProps['size'];
  children: ReactNode;
};

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
  return (
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
        {resultExtra || extra ? (
          <div className="query-result-outer-card__actions">
            {resultExtra ? <div className="query-result-outer-card__result-extra">{resultExtra}</div> : null}
            {extra ? <div className="query-result-outer-card__extra">{extra}</div> : null}
          </div>
        ) : null}
      </div>
      {children}
    </section>
  );
}
