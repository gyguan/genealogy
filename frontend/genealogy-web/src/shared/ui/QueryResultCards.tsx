import type { ReactNode } from 'react';
import { Card, Space, Typography } from 'antd';
import './query-result-cards.css';

type Props = {
  title: ReactNode;
  total?: number;
  totalSuffix?: string;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function BusinessResultCard({ title, total, totalSuffix = '条', extra, children, className = '' }: Props) {
  return (
    <Card
      size="small"
      className={`business-result-card ${className}`.trim()}
      data-query-result-role="business"
      title={(
        <Space direction="vertical" size={0} className="business-result-card__title">
          <Typography.Text strong>{title}</Typography.Text>
          {total !== undefined ? <Typography.Text type="secondary">共 {total} {totalSuffix}</Typography.Text> : null}
        </Space>
      )}
      extra={extra}
    >
      {children}
    </Card>
  );
}
