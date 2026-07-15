import { Alert, Button, Card, Col, Empty, Progress, Result, Row, Skeleton, Space, Statistic, Table, Tag, Typography } from 'antd';
import type { TableColumnsType } from 'antd';
import type { CultureQualityIssueResponse, CultureQualityResponse } from '../../shared/api/generated/culture-types';

const { Text } = Typography;

const TARGET_LABELS: Record<CultureQualityIssueResponse['targetType'], string> = {
  culture_item: '文化资料',
  migration_event: '迁徙事件',
  culture_site: '文化场所'
};

const ISSUE_LABELS: Record<CultureQualityIssueResponse['issueCodes'][number], { label: string; color: string }> = {
  PENDING_REVIEW: { label: '待审核', color: 'processing' },
  NO_SOURCE: { label: '无来源', color: 'error' },
  INCOMPLETE: { label: '信息不完整', color: 'warning' },
  LOW_CONFIDENCE: { label: '低可信', color: 'orange' },
  STALE: { label: '长期未复核', color: 'default' }
};

function percent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

function dateText(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('zh-CN');
}

export function CultureQualityPanel({
  quality,
  loading,
  error,
  forbidden,
  onRetry,
  onOpenCultureItem
}: {
  quality: CultureQualityResponse | null;
  loading: boolean;
  error: string;
  forbidden: boolean;
  onRetry: () => void;
  onOpenCultureItem: (id: number) => void;
}) {
  if (loading && !quality) {
    return <Card title="文化质量与运营"><Skeleton active paragraph={{ rows: 4 }} /></Card>;
  }

  if (forbidden) {
    return (
      <Card title="文化质量与运营">
        <Result
          status="403"
          title="暂无质量数据权限"
          subTitle={error || '当前账号只能维护业务内容，不能查看跨对象质量统计。'}
        />
      </Card>
    );
  }

  if (error && !quality) {
    return (
      <Card title="文化质量与运营">
        <Alert
          type="error"
          showIcon
          message="文化质量数据加载失败"
          description={error}
          action={<Button size="small" onClick={onRetry}>重试</Button>}
        />
      </Card>
    );
  }

  if (!quality) {
    return <Card title="文化质量与运营"><Empty description="请选择宗族后查看质量数据" /></Card>;
  }

  const metrics = quality.overall;
  const columns: TableColumnsType<CultureQualityIssueResponse> = [
    {
      title: '对象',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (_, issue) => (
        <Space direction="vertical" size={0}>
          {issue.targetType === 'culture_item' ? (
            <Button type="link" className="culture-title-button" onClick={() => onOpenCultureItem(issue.targetId)}>
              {issue.displayName}
            </Button>
          ) : <Text>{issue.displayName}</Text>}
          <Text type="secondary">{TARGET_LABELS[issue.targetType]}{issue.branchName ? ` · ${issue.branchName}` : ''}</Text>
        </Space>
      )
    },
    {
      title: '待治理问题',
      dataIndex: 'issueCodes',
      key: 'issueCodes',
      render: (codes: CultureQualityIssueResponse['issueCodes']) => (
        <Space size={[4, 4]} wrap>
          {codes.map(code => <Tag key={code} color={ISSUE_LABELS[code].color}>{ISSUE_LABELS[code].label}</Tag>)}
        </Space>
      )
    },
    {
      title: '最近更新',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 120,
      render: dateText
    }
  ];

  return (
    <Card
      title="文化质量与运营"
      extra={<Button size="small" loading={loading} onClick={onRetry}>刷新</Button>}
    >
      {error ? <Alert type="warning" showIcon message="已展示上次成功结果，本次刷新失败" description={error} style={{ marginBottom: 16 }} /> : null}
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}><Statistic title="正式对象" value={metrics.officialCount} /></Col>
        <Col xs={12} md={6}><Statistic title="待审核变更" value={metrics.pendingReviewCount} /></Col>
        <Col xs={12} md={6}>
          <Statistic title="来源覆盖率" value={percent(metrics.sourceCoverageRate)} suffix="%" />
          <Progress percent={percent(metrics.sourceCoverageRate)} showInfo={false} size="small" />
        </Col>
        <Col xs={12} md={6}>
          <Statistic title="完整度" value={percent(metrics.completenessRate)} suffix="%" />
          <Progress percent={percent(metrics.completenessRate)} showInfo={false} size="small" />
        </Col>
      </Row>
      <Space size={[8, 8]} wrap style={{ marginBlock: 16 }}>
        <Tag>强来源 {metrics.strongSourceCount}</Tag>
        <Tag color={metrics.lowConfidenceCount ? 'orange' : 'default'}>低可信 {metrics.lowConfidenceCount}</Tag>
        <Tag color={metrics.staleCount ? 'default' : 'success'}>长期未复核 {metrics.staleCount}</Tag>
      </Space>
      {quality.issues.length ? (
        <Table<CultureQualityIssueResponse>
          rowKey={issue => `${issue.targetType}:${issue.targetId}`}
          columns={columns}
          dataSource={quality.issues}
          pagination={false}
          size="small"
          scroll={{ x: 680 }}
        />
      ) : <Empty description="当前可见范围内暂无待治理问题" />}
      <Space direction="vertical" size={2} style={{ marginTop: 12 }}>
        {quality.notes.map(note => <Text key={note} type="secondary">• {note}</Text>)}
      </Space>
    </Card>
  );
}
