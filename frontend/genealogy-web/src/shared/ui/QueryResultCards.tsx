import type { ReactNode } from 'react';
import { Card, Typography } from 'antd';
import type { CardProps } from 'antd';
import './query-result-cards.css';

type QueryResultProps = Omit<CardProps, 'title' | 'children'> & {
  total: number;
  totalSuffix?: string;
  businessTitle: ReactNode;
  businessExtra?: ReactNode;
  businessClassName?: string;
  children: ReactNode;
};

type BusinessResultProps = {
  title: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
};

function BusinessResultCard({ title, extra, children, className = '' }: BusinessResultProps) {
  return (
    <Card
      size="small"
      className={`business-result-card ${className}`.trim()}
      data-query-result-role="business"
      title={<Typography.Text strong className="business-result-card__title">{title}</Typography.Text>}
      extra={extra}
    >
      {children}
    </Card>
  );
}

export function QueryResultCard({
  total,
  totalSuffix = '条',
  businessTitle,
  businessExtra,
  businessClassName = '',
  children,
  className = '',
  extra,
  size = 'small',
  style,
  id
}: QueryResultProps) {
  return (
    <section
      id={id}
      style={style}
      className={`query-result-outer-card ${className}`.trim()}
      data-query-result-role="outer"
      data-query-result-size={size}
    >
      <div className="query-result-outer-card__header">
        <div className="query-result-card__title">
<Typography.Text strong>查询结果</Typography.Text>
<Typography.Text type="secondary">（共 {total} {totalSuffix}）</Typography.Text>
        </div>
        {extra ? <div className="query-result-outer-card__extra">{extra}</div> : null}
      </div>
      <BusinessResultCard
        title={businessTitle}
        extra={businessExtra}
        className={businessClassName}
      >
        {children}
      </BusinessResultCard>
    </section>
  );
}
