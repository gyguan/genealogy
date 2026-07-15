import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Empty, Input, List, Modal, Pagination, Result, Select, Space, Tag, Timeline, Typography, message } from 'antd';
import type { MigrationEventCreateRequest, MigrationEventDetailResponse, MigrationEventSummaryResponse, MigrationEventUpdateRequest } from '../../shared/api/generated/culture-types';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { optionLabel, statusColor, statusOptions } from './cultureOptions';
import { MigrationDetailDrawer, MigrationEventFormModal } from './MigrationEventDialogs';
import {
  archiveMigrationEvent, createMigrationEvent, deleteMigrationEvent, getMigrationEvent, getMigrationTrace,
  listMigrationBranches, listMigrationEvents, listMigrationPersons, submitMigrationEventReview,
  updateMigrationEvent, type MigrationBranchOption, type MigrationPersonOption, type MigrationSearchState
} from './migrationTimelineService';

const { Text } = Typography;
const initialSearch: MigrationSearchState = { keyword: '', pageNo: 1, pageSize: 10 };

function errorText(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function branchLabel(item: MigrationBranchOption) {
  return item.branchName || item.branchPath || '未命名支派';
}

function readLocation() {
  const params = new URLSearchParams(window.location.search);
  return {
    search: {
      keyword: params.get('migrationKeyword') || '',
      branchId: Number(params.get('migrationBranch')) || undefined,
      dataStatus: params.get('migrationStatus') || undefined,
      pageNo: Math.max(1, Number(params.get('migrationPage')) || 1),
      pageSize: Math.min(100, Math.max(1, Number(params.get('migrationPageSize')) || 10))
    } as MigrationSearchState,
    selected: Number(params.get('migrationEvent')) || undefined
  };
}

function writeLocation(search: MigrationSearchState, selected?: number) {
  const url = new URL(window.location.href);
  ['migrationKeyword', 'migrationBranch', 'migrationStatus', 'migrationPage', 'migrationPageSize', 'migrationEvent'].forEach(key => url.searchParams.delete(key));
  if (search.keyword.trim()) url.searchParams.set('migrationKeyword', search.keyword.trim());
  if (search.branchId) url.searchParams.set('migrationBranch', String(search.branchId));
  if (search.dataStatus) url.searchParams.set('migrationStatus', search.dataStatus);
  if (search.pageNo !== 1) url.searchParams.set('migrationPage', String(search.pageNo));
  if (search.pageSize !== 10) url.searchParams.set('migrationPageSize', String(search.pageSize));
  if (selected) url.searchParams.set('migrationEvent', String(selected));
  window.history.pushState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

function completeness(item: MigrationEventSummaryResponse) {
  const missing = [!item.migrationTimeText && '时间', (!item.fromLocation || !item.toLocation) && '地点', !item.sourceCount && '来源'].filter(Boolean);
  return missing.length ? `待补充：${missing.join('、')}` : '信息完整';
}

export function MigrationTimelinePanel() {
  const { clanId } = useWorkspace();
  const initial = useRef(readLocation()).current;
  const [messageApi, contextHolder] = message.useMessage();
  const [search, setSearch] = useState(initial.search || initialSearch);
  const [selectedId, setSelectedId] = useState<number | undefined>(initial.selected);
  const [items, setItems] = useState<MigrationEventSummaryResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [branches, setBranches] = useState<MigrationBranchOption[]>([]);
  const [persons, setPersons] = useState<MigrationPersonOption[]>([]);
  const [detail, setDetail] = useState<MigrationEventDetailResponse | null>(null);
  const [trace, setTrace] = useState<any>(null);
  const [editing, setEditing] = useState<MigrationEventDetailResponse | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const request = useRef(0);

  useEffect(() => {
    if (!clanId) return;
    void Promise.all([listMigrationBranches(clanId), listMigrationPersons(clanId)])
      .then(([nextBranches, nextPersons]) => { setBranches(nextBranches); setPersons(nextPersons); })
      .catch(error => messageApi.warning(errorText(error, '迁徙关联数据加载失败')));
  }, [clanId]);

  useEffect(() => {
    if (!clanId) { setItems([]); setTotal(0); return; }
    const token = ++request.current;
    setLoading(true); setError('');
    listMigrationEvents(clanId, search)
      .then(data => { if (token === request.current) { setItems(data.items); setTotal(data.page.totalElements); } })
      .catch(error => { if (token === request.current) { setItems([]); setTotal(0); setError(errorText(error, '迁徙事件加载失败')); } })
      .finally(() => { if (token === request.current) setLoading(false); });
  }, [clanId, search, refresh]);

  useEffect(() => {
    if (!clanId || !selectedId) { setDetail(null); setTrace(null); return; }
    Promise.allSettled([getMigrationEvent(selectedId), getMigrationTrace(clanId, selectedId)])
      .then(([detailResult, traceResult]) => {
        if (detailResult.status === 'fulfilled') setDetail(detailResult.value);
        else messageApi.error(errorText(detailResult.reason, '迁徙详情加载失败'));
        setTrace(traceResult.status === 'fulfilled' ? traceResult.value : null);
      });
  }, [clanId, selectedId, refresh]);

  function applySearch(next: MigrationSearchState) {
    setSearch(next); setSelectedId(undefined); writeLocation(next);
  }

  function openDetail(id: number) {
    setSelectedId(id); writeLocation(search, id);
  }

  function openForm(item?: MigrationEventSummaryResponse | MigrationEventDetailResponse) {
    const detailRequest = item ? (detail?.id === item.id ? Promise.resolve(detail) : getMigrationEvent(item.id)) : Promise.resolve(null);
    void detailRequest.then(value => { setEditing(value); setFormOpen(true); }).catch(error => messageApi.error(errorText(error, '无法打开迁徙编辑表单')));
  }

  async function save(values: MigrationEventCreateRequest) {
    if (!clanId) return;
    setSaving(true);
    try {
      const result = editing
        ? await updateMigrationEvent(editing.id, { ...values, version: editing.version } as MigrationEventUpdateRequest)
        : await createMigrationEvent(clanId, values);
      messageApi.success(editing?.dataStatus === 'official' ? '正式迁徙变更申请已提交' : '迁徙事件已保存');
      setFormOpen(false); setEditing(null); setSelectedId(result.id); setRefresh(value => value + 1);
    } catch (error) { messageApi.error(errorText(error, '迁徙事件保存失败')); }
    finally { setSaving(false); }
  }

  async function submitReview(item: MigrationEventSummaryResponse) {
    try { const result = await submitMigrationEventReview(item.id, {}); messageApi.success(result.message || '已提交审核'); setRefresh(value => value + 1); }
    catch (error) { messageApi.error(errorText(error, '提交审核失败')); }
  }

  function archive(item: MigrationEventSummaryResponse) {
    let reason = '';
    Modal.confirm({ title: `归档：${item.fromLocation || '未知'} → ${item.toLocation || '未知'}`, content: <Input.TextArea placeholder="请填写归档原因" onChange={event => { reason = event.target.value; }} />, async onOk() { if (!reason.trim()) throw new Error('请填写归档原因'); await archiveMigrationEvent(item.id, { reason: reason.trim() }); setRefresh(value => value + 1); } });
  }

  function remove(item: MigrationEventSummaryResponse) {
    Modal.confirm({ title: `删除：${item.fromLocation || '未知'} → ${item.toLocation || '未知'}`, content: item.allowedActions.includes('request_delete') ? '正式事件将创建删除审核申请。' : '草稿删除后无法恢复。', okButtonProps: { danger: true }, async onOk() { await deleteMigrationEvent(item.id); setRefresh(value => value + 1); } });
  }

  const timeline = items.filter(item => item.dataStatus === 'official').map(item => ({ children: <Button type="text" onClick={() => openDetail(item.id)}><Space direction="vertical" align="start" size={1}><Text strong>{item.scope.branchName || '宗族支派'} · 第 {item.sequenceNo} 段</Text><Text>{item.fromLocation || '地点待补'} → {item.toLocation || '地点待补'}</Text><Text type="secondary">{item.migrationTimeText || '时间待考'} · {item.founderPersonName || '始迁祖待补'} · 来源 {item.sourceCount} 条</Text></Space></Button> }));

  return (
    <Card title="迁徙脉络" extra={clanId ? <Button type="primary" onClick={() => openForm()}>新增迁徙事件</Button> : null}>
      {contextHolder}
      {!clanId ? <Empty description="请选择宗族后查看迁徙脉络" /> : <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Alert type="info" showIcon message="仅展示真实迁徙事件" description="缺失时间、地点、始迁祖或来源时只提示完整度，不根据旧字段拼接路线。" />
        <Space wrap>
          <Input.Search aria-label="迁徙关键词" value={search.keyword} allowClear placeholder="迁出地、迁入地、时期或原因" onChange={event => setSearch({ ...search, keyword: event.target.value })} onSearch={() => applySearch({ ...search, pageNo: 1 })} style={{ width: 280 }} />
          <Select allowClear placeholder="全部支派" value={search.branchId} onChange={branchId => applySearch({ ...search, branchId, pageNo: 1 })} options={branches.map(item => ({ value: item.id, label: branchLabel(item) }))} style={{ width: 180 }} />
          <Select allowClear placeholder="全部状态" value={search.dataStatus} onChange={dataStatus => applySearch({ ...search, dataStatus, pageNo: 1 })} options={statusOptions} style={{ width: 150 }} />
        </Space>
        {error ? (error.includes('权限') ? <Result status="403" title="暂无权限" subTitle={error} /> : <Alert type="error" showIcon message="迁徙事件加载失败" description={error} />) : null}
        <Card size="small" title="正式迁徙时间轴">{timeline.length ? <Timeline items={timeline} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无审核通过的迁徙事件" />}</Card>
        <List loading={loading} dataSource={items} locale={{ emptyText: '暂无符合条件的迁徙事件' }} renderItem={item => <List.Item actions={[
          <Button key="detail" type="link" onClick={() => openDetail(item.id)}>详情</Button>,
          item.allowedActions.some(action => ['update', 'request_update'].includes(action)) ? <Button key="edit" type="link" onClick={() => openForm(item)}>编辑</Button> : null,
          item.allowedActions.includes('submit_review') ? <Button key="review" type="link" onClick={() => void submitReview(item)}>提交审核</Button> : null,
          item.allowedActions.some(action => ['archive', 'request_archive'].includes(action)) ? <Button key="archive" type="link" onClick={() => archive(item)}>归档</Button> : null,
          item.allowedActions.some(action => ['delete', 'request_delete'].includes(action)) ? <Button key="delete" danger type="link" onClick={() => remove(item)}>删除</Button> : null
        ].filter(Boolean)}><List.Item.Meta title={<Space wrap><Text strong>{item.scope.branchName || '宗族支派'} · 第 {item.sequenceNo} 段</Text><Tag color={statusColor(item.dataStatus)}>{optionLabel(statusOptions, item.dataStatus)}</Tag></Space>} description={<Space direction="vertical" size={1}><Text>{item.fromLocation || '地点待补'} → {item.toLocation || '地点待补'}</Text><Text type="secondary">{item.migrationTimeText || '时间待考'} · {item.founderPersonName || '始迁祖待补'} · {completeness(item)}</Text></Space>} /></List.Item>} />
        <Pagination current={search.pageNo} pageSize={search.pageSize} total={total} showSizeChanger onChange={(pageNo, pageSize) => applySearch({ ...search, pageNo, pageSize })} />
      </Space>}
      <MigrationDetailDrawer open={Boolean(selectedId)} clanId={clanId} detail={detail} trace={trace} onClose={() => { setSelectedId(undefined); setDetail(null); writeLocation(search); }} />
      <MigrationEventFormModal open={formOpen} item={editing} branches={branches} persons={persons} saving={saving} defaultSequence={Math.max(1, ...items.map(item => item.sequenceNo + 1))} onCancel={() => { if (!saving) { setFormOpen(false); setEditing(null); } }} onSubmit={save} />
    </Card>
  );
}
