import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Button, Card, Descriptions, Drawer, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, Timeline, Typography } from 'antd';
import type {
  CultureConfidenceLevel,
  CulturePrivacyLevel,
  CultureSensitiveLevel,
  MigrationEventCreateRequest,
  MigrationEventDetailResponse,
  MigrationEventSummaryResponse,
  MigrationEventUpdateRequest
} from '../../shared/api/generated/culture-types';
import type { CultureBranchOption } from './cultureLibraryService';
import {
  archiveMigrationEvent,
  createMigrationEvent,
  deleteMigrationEvent,
  getMigrationEvent,
  listMigrationEvents,
  submitMigrationEventReview,
  updateMigrationEvent
} from './migrationEventService';
import type { MigrationSearchState } from './migrationEventService';

import { feedback } from '../../shared/ui/OperationFeedback';

import { PageFeedback } from '../../shared/ui/Feedback';

import { EmptyState } from '../../shared/ui/EmptyState';

const { Paragraph, Text, Title } = Typography;

const initialSearch: MigrationSearchState = { pageNo: 1, pageSize: 10 };

function text(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function statusLabel(status: string) {
  return ({ draft: '草稿', pending_review: '审核中', official: '正式', rejected: '已驳回', archived: '已归档' } as Record<string, string>)[status] || status;
}

function completeness(item: MigrationEventSummaryResponse) {
  const missing: string[] = [];
  if (!item.migrationTimeText) missing.push('时间');
  if (!item.fromLocation || !item.toLocation) missing.push('地点');
  if (!item.sourceCount) missing.push('来源');
  return missing;
}

export function MigrationTimelinePanel({ clanId, branches }: { clanId?: string; branches: CultureBranchOption[] }) {
  
  const [search, setSearch] = useState<MigrationSearchState>(initialSearch);
  const [items, setItems] = useState<MigrationEventSummaryResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<number>();
  const [detail, setDetail] = useState<MigrationEventDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MigrationEventDetailResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [form] = Form.useForm<MigrationEventCreateRequest & { version?: number }>();
  const requestSeq = useRef(0);

  const branchNames = useMemo(() => new Map(branches.map(branch => [Number(branch.id), branch.name])), [branches]);

  useEffect(() => {
    if (!clanId) {
      setItems([]);
      setTotal(0);
      return;
    }
    const seq = ++requestSeq.current;
    setLoading(true);
    setError('');
    listMigrationEvents(clanId, search)
      .then(page => {
        if (seq !== requestSeq.current) return;
        setItems(page.items);
        setTotal(page.page.totalElements);
      })
      .catch(reason => {
        if (seq !== requestSeq.current) return;
        setItems([]);
        setTotal(0);
        setError(text(reason, '迁徙事件加载失败'));
      })
      .finally(() => { if (seq === requestSeq.current) setLoading(false); });
  }, [clanId, search, refreshVersion]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    getMigrationEvent(selectedId)
      .then(setDetail)
      .catch(reason => feedback.error(text(reason, '迁徙详情加载失败')))
      .finally(() => setDetailLoading(false));
  }, [selectedId, refreshVersion]);

  function refresh() {
    setRefreshVersion(value => value + 1);
  }

  function openCreate() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      sequenceNo: 1,
      confidenceLevel: 'unknown',
      privacyLevel: 'clan_only',
      sensitiveLevel: 'normal'
    });
    setFormOpen(true);
  }

  async function openEdit(item: MigrationEventSummaryResponse | MigrationEventDetailResponse) {
    try {
      const data = 'description' in item ? item : await getMigrationEvent(item.id);
      setEditing(data);
      form.setFieldsValue({
        branchId: data.scope.branchId || undefined,
        sequenceNo: data.sequenceNo,
        fromLocation: data.fromLocation || undefined,
        toLocation: data.toLocation || undefined,
        migrationTimeText: data.migrationTimeText || undefined,
        founderPersonId: data.founderPersonId || undefined,
        reason: data.reason || undefined,
        description: data.description || undefined,
        confidenceLevel: data.confidenceLevel,
        privacyLevel: data.privacyLevel,
        sensitiveLevel: data.sensitiveLevel,
        version: data.version
      });
      setFormOpen(true);
    } catch (reason) {
      feedback.error(text(reason, '迁徙事件加载失败'));
    }
  }

  async function save() {
    if (!clanId) return;
    const values = await form.validateFields();
    setSaving(true);
    try {
      const saved = editing
        ? await updateMigrationEvent(editing.id, values as MigrationEventUpdateRequest)
        : await createMigrationEvent(clanId, values as MigrationEventCreateRequest);
      feedback.success(editing?.dataStatus === 'official' ? '正式迁徙变更已提交审核' : '迁徙事件已保存为草稿');
      setFormOpen(false);
      setEditing(null);
      setSelectedId(saved.id);
      refresh();
    } catch (reason) {
      feedback.error(text(reason, '迁徙事件保存失败'));
    } finally {
      setSaving(false);
    }
  }

  async function submitReview(item: MigrationEventSummaryResponse) {
    try {
      const result = await submitMigrationEventReview(item.id, {});
      feedback.success(result.message || '迁徙事件已提交审核');
      refresh();
    } catch (reason) {
      feedback.error(text(reason, '提交审核失败'));
    }
  }

  function archive(item: MigrationEventSummaryResponse) {
    let reason = '';
    Modal.confirm({
      title: '归档迁徙事件',
      content: <Input.TextArea autoFocus placeholder="请输入归档原因" onChange={event => { reason = event.target.value; }} />,
      okText: '确认归档',
      cancelText: '取消',
      async onOk() {
        if (!reason.trim()) throw new Error('请输入归档原因');
        const result = await archiveMigrationEvent(item.id, { reason: reason.trim() });
        feedback.success(result.message || '归档操作已提交');
        refresh();
      }
    });
  }

  async function remove(item: MigrationEventSummaryResponse) {
    try {
      const result = await deleteMigrationEvent(item.id);
      feedback.success(result.message || '删除操作已完成');
      if (selectedId === item.id) setSelectedId(undefined);
      refresh();
    } catch (reason) {
      feedback.error(text(reason, '删除失败'));
    }
  }

  const columns = [
    { title: '顺序', dataIndex: 'sequenceNo', width: 72 },
    { title: '支派', render: (_: unknown, row: MigrationEventSummaryResponse) => row.scope.branchName || branchNames.get(row.scope.branchId || 0) || '未命名支派' },
    { title: '迁徙路线', render: (_: unknown, row: MigrationEventSummaryResponse) => <Button type="link" onClick={() => setSelectedId(row.id)}>{row.fromLocation} → {row.toLocation}</Button> },
    { title: '时期', dataIndex: 'migrationTimeText', render: (value?: string) => value || <Text type="secondary">待补充</Text> },
    { title: '始迁祖', dataIndex: 'founderPersonName', render: (value?: string) => value || <Text type="secondary">暂未关联</Text> },
    { title: '状态', render: (_: unknown, row: MigrationEventSummaryResponse) => <Tag>{statusLabel(row.dataStatus)}</Tag> },
    { title: '完整度', render: (_: unknown, row: MigrationEventSummaryResponse) => { const missing = completeness(row); return missing.length ? <Tag color="orange">缺 {missing.join('、')}</Tag> : <Tag color="green">完整</Tag>; } },
    {
      title: '操作',
      width: 260,
      render: (_: unknown, row: MigrationEventSummaryResponse) => <Space wrap>
        <Button size="small" onClick={() => setSelectedId(row.id)}>详情</Button>
        {(row.allowedActions.includes('update') || row.allowedActions.includes('request_update')) && <Button size="small" onClick={() => void openEdit(row)}>编辑</Button>}
        {row.allowedActions.includes('submit_review') && <Button size="small" type="primary" onClick={() => void submitReview(row)}>提交审核</Button>}
        {(row.allowedActions.includes('archive') || row.allowedActions.includes('request_archive')) && <Button size="small" onClick={() => archive(row)}>归档</Button>}
        {(row.allowedActions.includes('delete') || row.allowedActions.includes('request_delete')) && <Popconfirm title="确认删除该迁徙事件？" onConfirm={() => void remove(row)}><Button danger size="small">删除</Button></Popconfirm>}
      </Space>
    }
  ];

  return <Card title="迁徙脉络" extra={<Button type="primary" disabled={!clanId} onClick={openCreate}>新增迁徙事件</Button>}>
    
    <Paragraph type="secondary">按支派和顺序展示真实迁徙事件。时间、地点或来源缺失时仅提示完整度，不拼接推测路线。</Paragraph>
    <Space wrap style={{ marginBottom: 16 }}>
      <Input.Search allowClear placeholder="搜索地点、时期、原因" style={{ width: 240 }} onSearch={keyword => setSearch({ ...search, keyword: keyword || undefined, pageNo: 1 })} />
      <Select allowClear placeholder="筛选支派" style={{ width: 180 }} options={branches.map(branch => ({ label: branch.name, value: Number(branch.id) }))} onChange={branchId => setSearch({ ...search, branchId, pageNo: 1 })} />
      <Select allowClear placeholder="状态" style={{ width: 140 }} options={['draft', 'pending_review', 'official', 'rejected', 'archived'].map(value => ({ value, label: statusLabel(value) }))} onChange={dataStatus => setSearch({ ...search, dataStatus, pageNo: 1 })} />
    </Space>
    {error && <PageFeedback tone="error" title="迁徙事件加载失败" description={error} style={{ marginBottom: 16 }} />}
    {!clanId ? <EmptyState description="请选择宗族后查看迁徙脉络" /> : <>
      <Timeline items={items.filter(item => item.dataStatus === 'official').map(item => ({
        children: <Space direction="vertical" size={0}>
          <Text strong>{item.fromLocation} → {item.toLocation}</Text>
          <Text type="secondary">{item.migrationTimeText || '时期待补充'} · {item.scope.branchName || '支派待补充'} · {item.founderPersonName || '始迁祖待补充'}</Text>
        </Space>
      }))} />
      <Table rowKey="id" size="small" loading={loading} columns={columns} dataSource={items} pagination={{ current: search.pageNo, pageSize: search.pageSize, total, showSizeChanger: true, onChange: (pageNo, pageSize) => setSearch({ ...search, pageNo, pageSize }) }} scroll={{ x: 1100 }} />
    </>}

    <Drawer open={Boolean(selectedId)} width={640} title={<Title level={4} style={{ margin: 0 }}>迁徙事件详情</Title>} loading={detailLoading} onClose={() => setSelectedId(undefined)}>
      {detail ? <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Descriptions bordered size="small" column={1}>
          <Descriptions.Item label="支派">{detail.scope.branchName}</Descriptions.Item>
          <Descriptions.Item label="路线">{detail.fromLocation} → {detail.toLocation}</Descriptions.Item>
          <Descriptions.Item label="顺序">{detail.sequenceNo}</Descriptions.Item>
          <Descriptions.Item label="时期">{detail.migrationTimeText || '待补充'}</Descriptions.Item>
          <Descriptions.Item label="始迁祖">{detail.founderPersonName || '暂未关联'}</Descriptions.Item>
          <Descriptions.Item label="原因">{detail.reason || '待补充'}</Descriptions.Item>
          <Descriptions.Item label="可信度">{detail.confidenceLevel}</Descriptions.Item>
          <Descriptions.Item label="状态">{statusLabel(detail.dataStatus)}</Descriptions.Item>
        </Descriptions>
        <Card size="small" title="说明"><Paragraph>{detail.description || '暂无说明'}</Paragraph></Card>
        <Card size="small" title={`来源证据（${detail.sources.length}）`}>
          {detail.sources.length ? detail.sources.map(source => <Paragraph key={source.sourceId}><Text strong>{source.sourceName}</Text>{source.excerpt ? `：${source.excerpt}` : ''}</Paragraph>) : <PageFeedback tone="warning" title="尚未绑定来源，不能形成可信正式迁徙结论" />}
        </Card>
        {detail.review.status && <PageFeedback tone="info" title={`审核状态：${detail.review.status}`} description={detail.review.rejectedReason || undefined} />}
      </Space> : <EmptyState description="暂无可见详情" />}
    </Drawer>

    <Modal open={formOpen} title={editing ? (editing.dataStatus === 'official' ? '提交正式迁徙变更申请' : '编辑迁徙事件') : '新增迁徙事件'} okText={editing?.dataStatus === 'official' ? '提交变更申请' : '保存草稿'} confirmLoading={saving} onOk={() => void save()} onCancel={() => { if (!saving) { setFormOpen(false); setEditing(null); } }} destroyOnClose>
      <Form form={form} layout="vertical">
        <Form.Item name="branchId" label="支派" rules={[{ required: true, message: '请选择支派' }]}><Select options={branches.map(branch => ({ label: branch.name, value: Number(branch.id) }))} /></Form.Item>
        <Form.Item name="sequenceNo" label="迁徙顺序" rules={[{ required: true, message: '请输入顺序' }]}><InputNumber min={1} max={100000} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="fromLocation" label="迁出地" rules={[{ required: true, whitespace: true, message: '请输入迁出地' }]}><Input maxLength={500} /></Form.Item>
        <Form.Item name="toLocation" label="迁入地" rules={[{ required: true, whitespace: true, message: '请输入迁入地' }]}><Input maxLength={500} /></Form.Item>
        <Form.Item name="migrationTimeText" label="历史时期"><Input maxLength={200} placeholder="可填写朝代、年号或模糊年代" /></Form.Item>
        <Form.Item name="founderPersonId" label="始迁祖业务编号"><InputNumber min={1} style={{ width: '100%' }} placeholder="允许暂缺，后续可补绑" /></Form.Item>
        <Form.Item name="reason" label="迁徙原因"><Input.TextArea maxLength={1000} /></Form.Item>
        <Form.Item name="description" label="详细说明"><Input.TextArea rows={4} /></Form.Item>
        <Space wrap>
          <Form.Item name="confidenceLevel" label="可信度" rules={[{ required: true }]}><Select style={{ width: 130 }} options={(['high', 'medium', 'low', 'unknown'] as CultureConfidenceLevel[]).map(value => ({ value, label: value }))} /></Form.Item>
          <Form.Item name="privacyLevel" label="隐私级别" rules={[{ required: true }]}><Select style={{ width: 150 }} options={(['public', 'clan_only', 'branch_only', 'relatives_only', 'private', 'sealed'] as CulturePrivacyLevel[]).map(value => ({ value, label: value }))} /></Form.Item>
          <Form.Item name="sensitiveLevel" label="敏感级别" rules={[{ required: true }]}><Select style={{ width: 160 }} options={(['normal', 'sensitive', 'highly_sensitive'] as CultureSensitiveLevel[]).map(value => ({ value, label: value }))} /></Form.Item>
        </Space>
        {editing && <Form.Item name="version" hidden><InputNumber /></Form.Item>}
      </Form>
    </Modal>
  </Card>;
}
