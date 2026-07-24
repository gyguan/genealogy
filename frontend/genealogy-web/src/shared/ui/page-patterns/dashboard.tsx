import type { ReactNode } from 'react';
import { Button, Card, Drawer, Skeleton, Space, Typography } from 'antd';

import { PageFeedback } from '../Feedback';

import { EmptyState } from '../EmptyState';

const { Text, Title } = Typography;

export type DashboardAsyncStatus = 'idle' | 'loading' | 'success' | 'error' | 'forbidden';

export type DashboardAsyncStateProps = {
  status: DashboardAsyncStatus;
  loaded?: boolean;
  stale?: boolean;
  title: string;
  error?: string;
  retry?: () => void;
  skeletonRows?: number;
  children: ReactNode;
};

export function DashboardAsyncState({
  status,
  loaded = false,
  stale = false,
  title,
  error,
  retry,
  skeletonRows = 3,
  children
}: DashboardAsyncStateProps) {
  if (status === 'loading' && !loaded) {
    return <Skeleton active paragraph={{ rows: skeletonRows }} />;
  }

  if ((status === 'error' || status === 'forbidden') && !loaded) {
    const forbidden = status === 'forbidden';
    return (
      <PageFeedback
        role="status"
        tone={forbidden ? 'warning' : 'error'}
        title={forbidden ? `暂无权限查看${title}` : `${title}加载失败`}
        description={error || (forbidden ? '当前账号暂无权限查看该区域数据。' : '请稍后重试。')}
        action={forbidden || !retry ? undefined : <Button size="small" onClick={retry}>重试</Button>}
      />
    );
  }

  return (
    <Space direction="vertical" size="small" style={{ width: '100%' }}>
      {stale ? (
        <PageFeedback
          role="status"
          tone="warning"
          title={`${title}刷新失败，当前展示上次成功数据`}
          description="数据可能不是最新，请稍后重试。"
          action={retry ? <Button size="small" onClick={retry}>重试</Button> : undefined}
        />
      ) : null}
      {children}
    </Space>
  );
}

export type DashboardSectionProps = {
  title: string;
  description?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
};

export function DashboardSection({ title, description, extra, children }: DashboardSectionProps) {
  return (
    <Card title={title} extra={extra}>
      {description ? <Text type="secondary">{description}</Text> : null}
      {children}
    </Card>
  );
}

export type DashboardMetricCardProps = {
  title: string;
  value: ReactNode;
  unit?: ReactNode;
  description?: ReactNode;
  status?: 'success' | 'warning' | 'error' | 'default';
  actionLabel?: string;
  onOpen?: () => void;
};

export function DashboardMetricCard({
  title,
  value,
  unit,
  description,
  status = 'default',
  actionLabel = '查看明细',
  onOpen
}: DashboardMetricCardProps) {
  return (
    <Card className={`dashboard-metric-card dashboard-metric-card--${status}`} hoverable={Boolean(onOpen)}>
      <button type="button" className="dashboard-metric-card__button" onClick={onOpen} disabled={!onOpen}>
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Text type="secondary">{title}</Text>
          <span className="dashboard-metric-card__value">{value}{unit ? <Text className="dashboard-metric-card__unit">{unit}</Text> : null}</span>
          {description ? <Text type={status === 'warning' ? 'warning' : 'secondary'}>{description}</Text> : null}
          {onOpen ? <Text type="secondary">{actionLabel}</Text> : null}
        </Space>
      </button>
    </Card>
  );
}

export type DetailDrawerProps = {
  open: boolean;
  title: ReactNode;
  width?: number | string;
  onClose: () => void;
  children: ReactNode;
};

export function DetailDrawer({ open, title, width = 720, onClose, children }: DetailDrawerProps) {
  return (
    <Drawer title={title} open={open} onClose={onClose} width={width} destroyOnHidden>
      {children || <EmptyState image={EmptyState.PRESENTED_IMAGE_SIMPLE} description="暂无明细数据" />}
    </Drawer>
  );
}

export function DashboardDrawerTitle({ title, condition, count }: { title: string; condition?: string; count?: number }) {
  return (
    <Space direction="vertical" size={2}>
      <Title level={4} style={{ margin: 0 }}>{title}</Title>
      <Text type="secondary">{condition ? `条件：${condition} · ` : ''}共 {count ?? 0} 条记录</Text>
    </Space>
  );
}
