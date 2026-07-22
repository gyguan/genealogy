import type { ReactNode } from 'react';
import { Card, Space, Typography } from 'antd';
import type { CardProps } from 'antd';
import './query-result-cards.css';

type QueryResultProps = Omit<CardProps, 'title' | 'children'> & {
  total: number;
  totalSuffix?: string;
  children: ReactNode;
};

type BusinessResultProps = {
  title: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function QueryResultCard({
  total,
  totalSuffix = '条',
  children,
  className = '',
  ...cardProps
}: QueryResultProps) {
  return (
    <Card
      {...cardProps}
      className={`query-result-outer-card ${className}`.trim()}
      title={(
        <Space size={8} wrap className="query-result-card__title">
<Typography.Text strong>查询结果</Typography.Text>
<Typography.Text type="secondary">（共 {total} {totalSuffix}）</Typography.Text>
        </Space>
      )}
    >
      {children}
    </Card>
  );
}

export function BusinessResultCard({ title, extra, children, className = '' }: BusinessResultProps) {
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
