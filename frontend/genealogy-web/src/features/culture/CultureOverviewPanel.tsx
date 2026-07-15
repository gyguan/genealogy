import { Alert, Button, Card, Col, Empty, Progress, Row, Skeleton, Space, Statistic, Tag, Typography } from 'antd';
import type { CultureOverviewResponse } from '../../shared/api/generated/culture-types';
import { categoryOptions, formatCoverageRate, optionLabel, statusColor, statusOptions } from './cultureOptions';
import { MigrationTimelinePanel } from './MigrationTimelinePanel';

const { Text } = Typography;

type Props = {
  overview: CultureOverviewResponse | null;
  loading: boolean;
  error?: string;
  onOpenItem: (itemId: number) => void;
};

export function CultureOverviewPanel({ overview, loading, error, onOpenItem }: Props) {
  if (loading && !overview) return <Card><Skeleton active paragraph={{ rows: 3 }} /></Card>;
  if (error && !overview) return <Alert type="error" showIcon message="文化总览加载失败" description={error} />;
  if (!overview) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请选择宗族后查看文化总览" />;

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {error ? <Alert type="warning" showIcon message="总览刷新失败，当前显示上次结果" description={error} /> : null}
      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} lg={6}><Card size="small"><Statistic title="正式资料" value={overview.statistics.officialItemCount} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card size="small"><Statistic title="待审核" value={overview.statistics.pendingReviewCount} suffix="条" /></Card></Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic title="来源覆盖率" value={formatCoverageRate(overview.statistics.sourceCoverageRate)} precision={0} suffix="%" />
            <Progress percent={formatCoverageRate(overview.statistics.sourceCoverageRate)} showInfo={false} size="small" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}><Card size="small"><Statistic title="首页精选" value={overview.featuredItems.length} suffix="条" /></Card></Col>
      </Row>

      <Row gutter={[12, 12]}>
        <Col xs={24} lg={14}>
          <Card size="small" title="精选文化资料">
            {overview.featuredItems.length ? (
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {overview.featuredItems.map(item => (
                  <Button key={item.id} type="text" block className="culture-featured-item" onClick={() => onOpenItem(item.id)}>
                    <span>{item.title}</span>
                    <Space size={6}>
                      <Tag>{optionLabel(categoryOptions, item.category)}</Tag>
                      <Tag color={statusColor(item.dataStatus)}>{optionLabel(statusOptions, item.dataStatus)}</Tag>
                    </Space>
                  </Button>
                ))}
              </Space>
            ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无已发布精选资料" />}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card size="small" title="资料完善提示">
            {overview.missingHints.length ? (
              <Space direction="vertical" size={6}>
                {overview.missingHints.map((hint, index) => <Text key={`${index}-${hint}`}>• {hint}</Text>)}
              </Space>
            ) : <Alert type="success" showIcon message="当前没有待补齐提示" />}
          </Card>
        </Col>
      </Row>

      <MigrationTimelinePanel />
    </Space>
  );
}
