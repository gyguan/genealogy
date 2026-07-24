import { useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import {
  Alert, App as AntApp, Breadcrumb, Button, Card, Checkbox, Col, ConfigProvider, Descriptions, Divider, Drawer, Flex, Form, Input, InputNumber, Layout, Menu, Modal, Radio, Result, Row, Segmented, Select, Space, Statistic, Table, Tabs, Tag, Typography, theme } from 'antd';
import type { TableProps } from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  HistoryOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined
} from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import 'antd/dist/reset.css';
import './page-patterns.css';

import { feedback } from '../shared/ui/OperationFeedback';

import { PageFeedback } from '../shared/ui/Feedback';

import { EmptyState } from '../shared/ui/EmptyState';

const { Content, Header, Sider } = Layout;
const { Paragraph, Text, Title } = Typography;

type PatternKey = 'overview' | 'list' | 'detail' | 'edit' | 'action';
type PreviewState = 'normal' | 'empty' | 'error' | 'forbidden';
type GovernanceAction = 'review' | 'archive' | 'delete';

type CultureRecord = {
  id: number;
  title: string;
  category: string;
  branch: string;
  confidence: '高' | '中' | '待考证';
  status: '草稿' | '待审核' | '正式' | '已驳回';
  privacy: '公开' | '宗族内可见' | '支派内可见';
  sourceCount: number;
  attachmentCount: number;
  updatedAt: string;
};

const records: CultureRecord[] = [
  {
    id: 11,
    title: '敦本堂堂号源流',
    category: '堂号',
    branch: '长沙支',
    confidence: '高',
    status: '正式',
    privacy: '宗族内可见',
    sourceCount: 3,
    attachmentCount: 2,
    updatedAt: '2026-07-15 10:24'
  },
  {
    id: 12,
    title: '黄氏家训十则',
    category: '家训',
    branch: '宗族级',
    confidence: '高',
    status: '待审核',
    privacy: '宗族内可见',
    sourceCount: 2,
    attachmentCount: 1,
    updatedAt: '2026-07-14 18:36'
  },
  {
    id: 13,
    title: '清中期长沙支迁徙记录',
    category: '迁徙',
    branch: '长沙支',
    confidence: '中',
    status: '草稿',
    privacy: '支派内可见',
    sourceCount: 1,
    attachmentCount: 0,
    updatedAt: '2026-07-13 09:12'
  },
  {
    id: 14,
    title: '敦本堂宗祠修缮碑记',
    category: '文化场所',
    branch: '长沙支',
    confidence: '待考证',
    status: '已驳回',
    privacy: '宗族内可见',
    sourceCount: 1,
    attachmentCount: 4,
    updatedAt: '2026-07-12 16:08'
  }
];

const statusColor: Record<CultureRecord['status'], string> = {
  草稿: 'default',
  待审核: 'processing',
  正式: 'success',
  已驳回: 'error'
};

const confidenceColor: Record<CultureRecord['confidence'], string> = {
  高: 'green',
  中: 'gold',
  待考证: 'default'
};

const navigationItems = [
  { key: 'overview', label: '规范总览' },
  { key: 'list', label: '查询列表页' },
  { key: 'detail', label: '详情抽屉' },
  { key: 'edit', label: '编辑表单页' },
  { key: 'action', label: '审核与危险操作' }
];

function AppTheme({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          colorInfo: '#1677ff',
          colorSuccess: '#52c41a',
          colorWarning: '#faad14',
          colorError: '#ff4d4f',
          colorBgLayout: '#f5f5f5',
          colorBgContainer: '#ffffff',
          colorBorder: '#d9d9d9',
          colorText: 'rgba(0, 0, 0, 0.88)',
          colorTextSecondary: 'rgba(0, 0, 0, 0.65)',
          borderRadius: 8,
          borderRadiusLG: 12,
          controlHeight: 32,
          controlHeightLG: 40,
          fontSize: 14,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif',
          boxShadowTertiary: '0 1px 2px rgba(0, 0, 0, 0.03)'
        },
        components: {
          Layout: { bodyBg: '#f5f5f5', siderBg: '#ffffff', headerBg: '#ffffff' },
          Menu: { itemBorderRadius: 8, itemHeight: 40, itemMarginBlock: 4, itemMarginInline: 8 },
          Card: { borderRadiusLG: 12, headerHeight: 48, paddingLG: 16 },
          Table: { headerBg: '#fafafa', rowHoverBg: '#f5faff', cellPaddingBlockSM: 8, cellPaddingInlineSM: 12 },
          Form: { itemMarginBottom: 12, labelColor: 'rgba(0, 0, 0, 0.65)' }
        }
      }}
    >
      <AntApp>{children}</AntApp>
    </ConfigProvider>
  );
}

function PatternPageHeader({
  title,
  description,
  primaryAction,
  secondaryAction
}: {
  title: string;
  description: string;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
}) {
  return (
    <Card className="pp-page-header" bordered={false}>
      <Flex justify="space-between" align="flex-start" gap={24} wrap="wrap">
        <div className="pp-page-heading">
          <Breadcrumb items={[{ title: '宗族文化' }, { title }]} />
          <Title level={3}>{title}</Title>
          <Paragraph type="secondary">{description}</Paragraph>
        </div>
        <Space wrap>
          {secondaryAction}
          {primaryAction}
        </Space>
      </Flex>
    </Card>
  );
}

function RuleStrip({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <Card size="small" className="pp-rule-strip">
      <Row gutter={[16, 12]}>
        {items.map(item => (
          <Col xs={12} md={6} key={item.label}>
            <Text type="secondary">{item.label}</Text>
            <div><Text strong>{item.value}</Text></div>
          </Col>
        ))}
      </Row>
    </Card>
  );
}

function OverviewPattern() {
  const patterns = [
    {
      title: '查询列表页',
      description: '适用于文化资料、迁徙事件、文化场所等对象的检索、筛选、批量查看和进入详情。',
      structure: '页面头 → 查询区 → 结果工具栏 → 数据列表 → 分页',
      rule: '一页只保留一个主操作；筛选项默认不超过 8 个，复杂条件收进“更多筛选”。'
    },
    {
      title: '详情抽屉',
      description: '适用于不离开列表上下文的快速查看、审核和轻量维护。',
      structure: '对象标题与状态 → 关键动作 → 摘要属性 → 分组内容 → 追踪记录',
      rule: '默认宽度 720；字段超过 18 个或存在复杂子任务时升级为独立详情页。'
    },
    {
      title: '编辑表单页',
      description: '适用于字段较多、需要分组说明或存在敏感配置的对象创建和修改。',
      structure: '返回与标题 → 状态提醒 → 分组表单 → 固定操作栏',
      rule: '≤ 12 个简单字段可用 Modal；超过 12 个或有分组时使用独立编辑页。'
    },
    {
      title: '审核与危险操作',
      description: '适用于提交审核、归档、删除、驳回等影响对象状态的操作。',
      structure: '影响对象 → 后果说明 → 必要输入 → 取消/确认',
      rule: '不可逆操作使用危险按钮；原因必填时必须使用 Form 校验，禁止通过抛异常提示。'
    }
  ];

  return (
    <Space direction="vertical" size={16} className="pp-full-width">
      <PatternPageHeader
        title="前端页面规范原型"
        description="基于现有 Genealogy 前端和 Ant Design 中后台模式，统一同类型页面的信息层级、布局、反馈与操作位置。"
        primaryAction={<Button type="primary" href="#pattern-list">查看查询页模板</Button>}
      />

      <RuleStrip
        items={[
          { label: '页面外边距', value: '桌面 24 / 移动 12' },
          { label: '模块间距', value: '16 px' },
          { label: '表单控件', value: '32 px' },
          { label: '页面主操作', value: '最多 1 个' }
        ]}
      />

      <Row gutter={[16, 16]}>
        {patterns.map((pattern, index) => (
          <Col xs={24} lg={12} key={pattern.title}>
            <Card
              className="pp-pattern-card"
              title={<Space><span className="pp-pattern-index">{String(index + 1).padStart(2, '0')}</span><span>{pattern.title}</span></Space>}
            >
              <Paragraph>{pattern.description}</Paragraph>
              <Descriptions size="small" column={1}>
                <Descriptions.Item label="标准结构">{pattern.structure}</Descriptions.Item>
                <Descriptions.Item label="关键约束">{pattern.rule}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
        ))}
      </Row>

      <Card title="统一设计基线">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Statistic title="内容最大宽度" value={1600} suffix="px" />
            <Text type="secondary">宽屏保持信息密度，避免内容无限拉伸。</Text>
          </Col>
          <Col xs={24} md={8}>
            <Statistic title="详情抽屉" value={720} suffix="px" />
            <Text type="secondary">移动端自动占满视口宽度。</Text>
          </Col>
          <Col xs={24} md={8}>
            <Statistic title="危险操作确认层级" value={2} suffix="层" />
            <Text type="secondary">列表入口确认后，再由服务端进行权限与状态校验。</Text>
          </Col>
        </Row>
      </Card>
    </Space>
  );
}

function SearchForm() {
  return (
    <Form layout="vertical" initialValues={{ sort: 'updatedAt,desc' }}>
      <Row gutter={[12, 0]}>
        <Col xs={24} sm={12} lg={6}>
          <Form.Item name="keyword" label="关键词">
            <Input allowClear placeholder="标题、摘要、时期或地点" prefix={<SearchOutlined />} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Form.Item name="category" label="资料分类">
            <Select allowClear mode="multiple" maxTagCount="responsive" placeholder="全部分类" options={[
              { value: 'hall', label: '堂号' },
              { value: 'instruction', label: '家训' },
              { value: 'migration', label: '迁徙' },
              { value: 'site', label: '文化场所' }
            ]} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Form.Item name="branch" label="所属支派">
            <Select allowClear showSearch optionFilterProp="label" placeholder="全部支派" options={[
              { value: 'clan', label: '宗族级' },
              { value: 'changsha', label: '长沙支' },
              { value: 'hengyang', label: '衡阳支' }
            ]} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Form.Item name="status" label="数据状态">
            <Select allowClear placeholder="全部状态" options={[
              { value: 'draft', label: '草稿' },
              { value: 'pending', label: '待审核' },
              { value: 'official', label: '正式' },
              { value: 'rejected', label: '已驳回' }
            ]} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} lg={3}>
          <Form.Item name="privacy" label="可见范围">
            <Select allowClear placeholder="全部" options={[
              { value: 'public', label: '公开' },
              { value: 'clan', label: '宗族内可见' },
              { value: 'branch', label: '支派内可见' }
            ]} />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} lg={3}>
          <Form.Item name="sort" label="排序">
            <Select options={[
              { value: 'updatedAt,desc', label: '最近更新' },
              { value: 'title,asc', label: '标题' },
              { value: 'sortOrder,asc', label: '业务顺序' }
            ]} />
          </Form.Item>
        </Col>
      </Row>
      <Flex justify="space-between" align="center" gap={12} wrap="wrap">
        <Button type="link" className="pp-more-filter">更多筛选（来源、可信度、精选）</Button>
        <Space>
          <Button icon={<ReloadOutlined />}>重置</Button>
          <Button type="primary" icon={<SearchOutlined />}>查询</Button>
        </Space>
      </Flex>
    </Form>
  );
}

function RecordTable({ compact = false }: { compact?: boolean }) {
  const columns = useMemo<TableProps<CultureRecord>['columns']>(() => [
    {
      title: '文化资料',
      dataIndex: 'title',
      width: 280,
      render: (value: string, record) => (
        <Space direction="vertical" size={2}>
          <Button type="link" className="pp-title-link">{value}</Button>
          <Text type="secondary">编号 #{record.id} · {record.category}</Text>
        </Space>
      )
    },
    { title: '所属范围', dataIndex: 'branch', width: 140 },
    {
      title: '可信度', dataIndex: 'confidence', width: 100,
      render: value => <Tag color={confidenceColor[value as CultureRecord['confidence']]}>{value}</Tag>
    },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: value => <Tag color={statusColor[value as CultureRecord['status']]}>{value}</Tag>
    },
    { title: '可见范围', dataIndex: 'privacy', width: 130 },
    {
      title: '证据', key: 'evidence', width: 130,
      render: (_, record) => <Text type="secondary">来源 {record.sourceCount} · 附件 {record.attachmentCount}</Text>
    },
    { title: '最近更新', dataIndex: 'updatedAt', width: 160 },
    {
      title: '操作', key: 'action', fixed: 'right', width: 180,
      render: () => (
        <Space size={4}>
          <Button type="link">查看</Button>
          <Button type="link">编辑</Button>
          <Button type="text" icon={<MoreOutlined />} aria-label="更多操作" />
        </Space>
      )
    }
  ], []);

  return (
    <Table<CultureRecord>
      rowKey="id"
      size={compact ? 'small' : 'middle'}
      rowSelection={{}}
      columns={columns}
      dataSource={records}
      scroll={{ x: 1280 }}
      pagination={{
        current: 1,
        pageSize: 20,
        total: 68,
        showSizeChanger: true,
        showTotal: total => `共 ${total} 条`,
        pageSizeOptions: [10, 20, 50]
      }}
    />
  );
}

function ListState({ state, compact }: { state: PreviewState; compact: boolean }) {
  if (state === 'empty') {
    return (
      <EmptyState
        image={EmptyState.PRESENTED_IMAGE_SIMPLE}
        description={<Space direction="vertical" size={2}><Text>暂无文化资料</Text><Text type="secondary">可以调整筛选条件，或新增第一条资料。</Text></Space>}
      >
        <Space><Button>重置条件</Button><Button type="primary" icon={<PlusOutlined />}>新增资料</Button></Space>
      </EmptyState>
    );
  }
  if (state === 'error') {
    return (
      <Result
        status="error"
        title="文化资料加载失败"
        subTitle="网络或服务暂时不可用，当前页面未展示过期数据。"
        extra={<Space><Button>返回上一页</Button><Button type="primary" icon={<ReloadOutlined />}>重新加载</Button></Space>}
      />
    );
  }
  if (state === 'forbidden') {
    return (
      <Result
        status="403"
        title="暂无权限"
        subTitle="当前账号无权查看该宗族的文化资料，页面不会披露受限对象信息。"
        extra={<Button>返回宗族首页</Button>}
      />
    );
  }
  return <RecordTable compact={compact} />;
}

function ListPattern() {
  const [previewState, setPreviewState] = useState<PreviewState>('normal');
  const [compact, setCompact] = useState(false);

  return (
    <Space id="pattern-list" direction="vertical" size={16} className="pp-full-width">
      <PatternPageHeader
        title="文化资料"
        description="查询、维护宗族文化资料，并通过统一详情和治理入口完成审核闭环。"
        secondaryAction={<Select aria-label="当前宗族" defaultValue="clan-6" className="pp-clan-select" options={[{ value: 'clan-6', label: '黄氏宗族' }, { value: 'clan-9', label: '陈氏宗族' }]} />}
        primaryAction={<Button type="primary" icon={<PlusOutlined />}>新增资料</Button>}
      />

      <Card size="small" title="查询条件" extra={<Text type="secondary">常用条件直接展示，低频条件折叠</Text>}>
        <SearchForm />
      </Card>

      <Card
        title={<Space><span>文化资料列表</span><Tag bordered={false}>68</Tag></Space>}
        extra={
          <Space wrap>
            <Segmented
              size="small"
              value={previewState}
              onChange={value => setPreviewState(value as PreviewState)}
              options={[
                { value: 'normal', label: '正常' },
                { value: 'empty', label: '空态' },
                { value: 'error', label: '错误' },
                { value: 'forbidden', label: '无权限' }
              ]}
            />
            <Checkbox checked={compact} onChange={event => setCompact(event.target.checked)}>紧凑密度</Checkbox>
          </Space>
        }
      >
        {previewState === 'normal' ? (
          <PageFeedback
            tone="info"
            closable
            title="当前展示黄氏宗族全部可见文化资料"
            description="正式资料变更、归档和删除将进入审核流程。"
            className="pp-list-alert"
          />
        ) : null}
        <ListState state={previewState} compact={compact} />
      </Card>

      <RuleStrip
        items={[
          { label: '页面主操作', value: '右上角新增' },
          { label: '筛选操作', value: '右下角查询/重置' },
          { label: '行操作', value: '查看、编辑、更多' },
          { label: '错误反馈', value: '列表区域内反馈' }
        ]}
      />
    </Space>
  );
}

function DetailPattern() {
  return (
    <Space direction="vertical" size={16} className="pp-full-width">
      <PatternPageHeader
        title="详情抽屉规范"
        description="保持查询列表上下文，用固定宽度抽屉承载对象详情、证据、审核和追踪。"
      />
      <div className="pp-inline-stage">
        <Card title="文化资料列表" extra={<Text type="secondary">背景页面保持可识别，但不与抽屉争夺视觉焦点</Text>}>
          <RecordTable compact />
        </Card>
        <Drawer
          open
          getContainer={false}
          mask={false}
          rootStyle={{ position: 'absolute' }}
          width={720}
          title={
            <Space direction="vertical" size={2}>
              <Space wrap><Title level={4} className="pp-zero-margin">敦本堂堂号源流</Title><Tag color="success">正式</Tag></Space>
              <Text type="secondary">文化资料 #11 · 最近更新 2026-07-15 10:24</Text>
            </Space>
          }
          extra={
            <Space>
              <Button icon={<HistoryOutlined />}>完整追踪</Button>
              <Button icon={<EditOutlined />}>编辑</Button>
              <Button type="primary">提交审核</Button>
            </Space>
          }
          closable={false}
        >
          <Tabs
            defaultActiveKey="overview"
            items={[
              {
                key: 'overview',
                label: '基本信息',
                children: (
                  <Space direction="vertical" size={16} className="pp-full-width">
                    <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
                      <Descriptions.Item label="资料分类">堂号</Descriptions.Item>
                      <Descriptions.Item label="所属支派">长沙支</Descriptions.Item>
                      <Descriptions.Item label="历史时期">清代中期</Descriptions.Item>
                      <Descriptions.Item label="相关地点">湖南长沙</Descriptions.Item>
                      <Descriptions.Item label="可信度"><Tag color="green">高</Tag></Descriptions.Item>
                      <Descriptions.Item label="可见范围">宗族内可见</Descriptions.Item>
                      <Descriptions.Item label="维护人">文化管理员</Descriptions.Item>
                      <Descriptions.Item label="创建时间">2026-07-01 08:00</Descriptions.Item>
                    </Descriptions>
                    <Card size="small" title="摘要">
                      <Paragraph className="pp-zero-margin">记录敦本堂堂号的历史来源、命名寓意及其在长沙支族谱中的使用沿革。</Paragraph>
                    </Card>
                    <Card size="small" title="正文">
                      <Paragraph className="pp-detail-copy">敦本务实，敬宗睦族。敦本堂堂号最早见于清代中期谱牒，其命名用于强调家族以根本伦理和族群互助为立身之本。</Paragraph>
                    </Card>
                  </Space>
                )
              },
              {
                key: 'evidence',
                label: '来源与附件 5',
                children: <EmptyState image={EmptyState.PRESENTED_IMAGE_SIMPLE} description="此页展示来源列表、摘录、附件预览和下载权限" />
              },
              {
                key: 'history',
                label: '审核与追踪 2',
                children: <EmptyState image={EmptyState.PRESENTED_IMAGE_SIMPLE} description="此页展示当前审核、版本变更和完整追踪入口" />
              }
            ]}
          />
        </Drawer>
      </div>
      <RuleStrip
        items={[
          { label: '桌面宽度', value: '720 px' },
          { label: '移动端', value: '100vw' },
          { label: '头部动作', value: '最多 3 个可见' },
          { label: '信息分组', value: '属性/内容/证据/追踪' }
        ]}
      />
    </Space>
  );
}

function EditPattern() {
  const [form] = Form.useForm();
  

  function saveDraft() {
    feedback.success('原型：草稿已保存');
  }

  function submit() {
    form.validateFields().then(() => feedback.success('原型：变更申请已提交审核')).catch(() => undefined);
  }

  return (
    <Space direction="vertical" size={16} className="pp-full-width">
      
      <PatternPageHeader
        title="编辑文化资料"
        description="长表单采用独立页面，按业务语义分组；提交操作固定在页面底部，避免用户滚动后失去操作入口。"
        secondaryAction={<Button icon={<ArrowLeftOutlined />}>返回详情</Button>}
      />

      <PageFeedback
        tone="warning"
        title="正式资料不会被直接覆盖"
        description="本次保存将创建变更审核申请，审核通过前当前正式内容保持不变。"
      />

      <Form
        form={form}
        layout="vertical"
        className="pp-edit-form"
        initialValues={{
          title: '敦本堂堂号源流',
          category: 'hall',
          branch: 'changsha',
          confidence: 'high',
          privacy: 'clan',
          sensitive: 'normal',
          sortOrder: 1,
          featured: true,
          period: '清代中期',
          location: '湖南长沙'
        }}
      >
        <Card title="基本信息" className="pp-form-section">
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Form.Item name="title" label="资料标题" rules={[{ required: true, message: '请输入资料标题' }, { max: 200, message: '最多 200 个字符' }]}>
                <Input showCount maxLength={200} placeholder="请输入能准确概括内容的标题" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="category" label="资料分类" rules={[{ required: true, message: '请选择资料分类' }]}>
                <Select options={[
                  { value: 'hall', label: '堂号' },
                  { value: 'instruction', label: '家训' },
                  { value: 'migration', label: '迁徙' },
                  { value: 'site', label: '文化场所' }
                ]} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="branch" label="所属支派" extra="不选择表示宗族级资料">
                <Select allowClear showSearch optionFilterProp="label" options={[
                  { value: 'changsha', label: '长沙支' },
                  { value: 'hengyang', label: '衡阳支' }
                ]} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="period" label="历史时期">
                <Input placeholder="例如：清代中期" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="location" label="相关地点">
                <Input placeholder="例如：湖南长沙" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="内容信息" className="pp-form-section">
          <Form.Item name="summary" label="摘要" rules={[{ max: 1000, message: '最多 1000 个字符' }]}>
            <Input.TextArea rows={3} showCount maxLength={1000} placeholder="概述资料内容、价值和适用范围" />
          </Form.Item>
          <Form.Item name="content" label="正文" rules={[{ required: true, whitespace: true, message: '请输入资料正文' }]}>
            <Input.TextArea rows={10} showCount maxLength={200000} placeholder="录入真实文化资料正文" />
          </Form.Item>
        </Card>

        <Card title="治理与展示" className="pp-form-section">
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="confidence" label="可信度" rules={[{ required: true, message: '请选择可信度' }]}>
                <Radio.Group options={[{ value: 'high', label: '高' }, { value: 'medium', label: '中' }, { value: 'unknown', label: '待考证' }]} optionType="button" buttonStyle="solid" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="privacy" label="可见范围" rules={[{ required: true, message: '请选择可见范围' }]}>
                <Select options={[{ value: 'public', label: '公开' }, { value: 'clan', label: '宗族内可见' }, { value: 'branch', label: '支派内可见' }]} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="sensitive" label="敏感级别" rules={[{ required: true, message: '请选择敏感级别' }]}>
                <Select options={[{ value: 'normal', label: '普通' }, { value: 'sensitive', label: '敏感' }, { value: 'sealed', label: '封存' }]} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="sortOrder" label="展示顺序" rules={[{ required: true, message: '请输入展示顺序' }]}>
                <InputNumber min={0} precision={0} className="pp-number-full" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="featured" label="首页展示" valuePropName="checked">
                <Checkbox>设为首页精选</Checkbox>
              </Form.Item>
            </Col>
          </Row>
        </Card>
      </Form>

      <div className="pp-sticky-actions">
        <Flex justify="space-between" align="center" gap={12} wrap="wrap">
          <Text type="secondary">离开页面前应提示未保存变更；提交后进入审核，不直接覆盖正式内容。</Text>
          <Space>
            <Button>取消</Button>
            <Button onClick={saveDraft}>保存草稿</Button>
            <Button type="primary" onClick={submit}>提交审核</Button>
          </Space>
        </Flex>
      </div>

      <RuleStrip
        items={[
          { label: '简单表单', value: '≤ 12 字段用 Modal' },
          { label: '复杂表单', value: '分组独立页面' },
          { label: '表单列数', value: '最多 3 列' },
          { label: '操作区域', value: '底部固定' }
        ]}
      />
    </Space>
  );
}

function GovernanceDialog({
  action,
  open,
  onCancel
}: {
  action: GovernanceAction | null;
  open: boolean;
  onCancel: () => void;
}) {
  const [form] = Form.useForm();
  const configuration = action ? {
    review: {
      title: '提交文化资料审核',
      alertType: 'info' as const,
      alert: '提交后资料进入待审核状态，审核通过后才成为正式内容。',
      reasonLabel: '提交说明',
      required: false,
      okText: '确认提交',
      danger: false
    },
    archive: {
      title: '申请归档正式文化资料',
      alertType: 'warning' as const,
      alert: '正式资料不会立即归档，将创建审核申请；审核通过后退出默认展示。',
      reasonLabel: '归档原因',
      required: true,
      okText: '提交归档申请',
      danger: false
    },
    delete: {
      title: '申请删除正式文化资料',
      alertType: 'error' as const,
      alert: '删除申请通过后对象将不可继续维护。此操作影响审计与引用关系，请谨慎确认。',
      reasonLabel: '删除原因',
      required: true,
      okText: '提交删除申请',
      danger: true
    }
  }[action] : null;

  return (
    <Modal
      open={open}
      title={configuration?.title}
      okText={configuration?.okText}
      okButtonProps={{ danger: configuration?.danger }}
      cancelText="取消"
      onCancel={onCancel}
      onOk={() => form.validateFields().then(onCancel).catch(() => undefined)}
      destroyOnHidden
    >
      {configuration ? (
        <Space direction="vertical" size={16} className="pp-full-width">
          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="影响对象">敦本堂堂号源流</Descriptions.Item>
            <Descriptions.Item label="当前状态">正式</Descriptions.Item>
          </Descriptions>
          <PageFeedback tone={configuration.alertType} title={configuration.alert} />
          <Form form={form} layout="vertical">
            <Form.Item
              name="reason"
              label={configuration.reasonLabel}
              rules={configuration.required ? [{ required: true, whitespace: true, message: `请填写${configuration.reasonLabel}` }] : undefined}
            >
              <Input.TextArea rows={4} showCount maxLength={500} placeholder={`请填写${configuration.reasonLabel}`} />
            </Form.Item>
          </Form>
        </Space>
      ) : null}
    </Modal>
  );
}

function ActionPattern() {
  const [action, setAction] = useState<GovernanceAction | null>(null);

  const actionCards = [
    {
      key: 'review' as const,
      title: '提交审核',
      icon: <CheckCircleOutlined />,
      description: '状态推进操作。说明可以选填，确认按钮使用主色。',
      button: <Button type="primary">打开提交审核</Button>
    },
    {
      key: 'archive' as const,
      title: '归档',
      icon: <HistoryOutlined />,
      description: '可恢复但影响展示的操作。必须说明后果并填写原因。',
      button: <Button>打开归档申请</Button>
    },
    {
      key: 'delete' as const,
      title: '删除',
      icon: <DeleteOutlined />,
      description: '高风险或不可逆操作。使用危险色，必须填写原因并二次确认。',
      button: <Button danger>打开删除申请</Button>
    }
  ];

  return (
    <Space direction="vertical" size={16} className="pp-full-width">
      <PatternPageHeader
        title="审核与危险操作规范"
        description="所有状态变更操作使用统一结构，明确影响对象、操作后果、必要输入和确认层级。"
      />

      <PageFeedback
        tone="info"
        title="统一原则"
        description="业务校验错误显示在当前弹窗；权限、状态冲突和网络错误使用 message 或 Alert，不通过未处理 Promise 触发全局错误。"
      />

      <Row gutter={[16, 16]}>
        {actionCards.map(item => (
          <Col xs={24} lg={8} key={item.key}>
            <Card
              className="pp-action-card"
              title={<Space>{item.icon}<span>{item.title}</span></Space>}
              actions={[
                <span key="open" onClick={() => setAction(item.key)}>{item.button}</span>
              ]}
            >
              <Paragraph>{item.description}</Paragraph>
              <Divider />
              <Space direction="vertical" size={4}>
                <Text type="secondary">标准字段</Text>
                <Text>影响对象、当前状态、后果说明、操作原因</Text>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Card title="按钮与反馈规则">
        <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
          <Descriptions.Item label="主操作">每个弹窗只有一个主确认按钮</Descriptions.Item>
          <Descriptions.Item label="取消操作">始终位于主操作左侧，文案统一为“取消”</Descriptions.Item>
          <Descriptions.Item label="危险操作">使用 danger，标题直接说明影响对象与动作</Descriptions.Item>
          <Descriptions.Item label="输入校验">使用 Form.Item 就地校验，不能抛异常代替校验提示</Descriptions.Item>
          <Descriptions.Item label="成功反馈">关闭弹窗后 message.success，并刷新当前对象</Descriptions.Item>
          <Descriptions.Item label="失败反馈">弹窗保持打开，错误信息不丢失用户输入</Descriptions.Item>
        </Descriptions>
      </Card>

      <RuleStrip
        items={[
          { label: '信息顺序', value: '对象 → 后果 → 原因' },
          { label: '确认按钮', value: '每层仅 1 个主按钮' },
          { label: '删除操作', value: 'danger + 原因必填' },
          { label: '失败处理', value: '保留输入与弹窗' }
        ]}
      />

      <GovernanceDialog action={action} open={Boolean(action)} onCancel={() => setAction(null)} />
    </Space>
  );
}

function PrototypeApp() {
  const [active, setActive] = useState<PatternKey>('overview');

  function renderPattern() {
    if (active === 'list') return <ListPattern />;
    if (active === 'detail') return <DetailPattern />;
    if (active === 'edit') return <EditPattern />;
    if (active === 'action') return <ActionPattern />;
    return <OverviewPattern />;
  }

  return (
    <Layout className="pp-shell">
      <Sider className="pp-sider" width={248} breakpoint="lg" collapsedWidth={0}>
        <div className="pp-brand">
          <Title level={4}>Genealogy</Title>
          <Text type="secondary">前端页面规范原型</Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[active]}
          items={navigationItems}
          onClick={info => setActive(info.key as PatternKey)}
        />
        <div className="pp-sider-note">
          <Text type="secondary">评审重点</Text>
          <Paragraph>信息层级、组件位置、状态反馈、表单分组、移动端规则。</Paragraph>
        </div>
      </Sider>
      <Layout>
        <Header className="pp-header">
          <div>
            <Text type="secondary">设计基线</Text>
            <div><Text strong>Ant Design 中后台页面模式</Text></div>
          </div>
          <Space>
            <Tag color="blue">交互原型</Tag>
            <Button href="./">返回正式系统</Button>
          </Space>
        </Header>
        <Content className="pp-content">
          <div className="pp-content-inner">{renderPattern()}</div>
        </Content>
      </Layout>
    </Layout>
  );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <AppTheme>
    <PrototypeApp />
  </AppTheme>
);
