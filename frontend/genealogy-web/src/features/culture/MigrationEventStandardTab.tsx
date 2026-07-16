import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Input,
  List,
  Result,
  Row,
  Select,
  Skeleton,
  Space,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography,
  message
} from 'antd';
import type { MenuProps, TableProps } from 'antd';
import type { CultureDataStatus, MigrationEventDetailResponse, MigrationEventSummaryResponse } from '../../shared/api/generated/culture-types';
import type { TrackingTraceDetailResponse } from '../../shared/api/generated/tracking-types';
import { ApiRequestError } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { buildTrackingDeepLink } from '../../shared/navigation/trackingDeepLink.js';
import { CultureGovernanceModal } from './CultureGovernanceModal';
import type { CultureGovernanceTarget } from './CultureGovernanceModal';
import { MigrationEventEditorPage } from './MigrationEventEditorPage';
import { buildCultureEditorLocation, confirmCultureEditorLeave, isSameCultureEditor, readCultureEditorLocation } from './cultureEditorState';
import type { CultureEditorState } from './cultureEditorState';
import { confidenceColor, confidenceOptions, formatDateTime, optionLabel, privacyOptions, statusColor, statusOptions } from './cultureOptions';
import { listCultureBranches } from './cultureLibraryService';
import type { CultureBranchOption } from './cultureLibraryService';
import { archiveMigrationEvent, deleteMigrationEvent, getMigrationEvent, getMigrationEventTrace, listMigrationEvents, submitMigrationEventReview } from './migrationEventService';
import { buildMigrationLocation, defaultMigrationSearch, migrationSearchKey, readMigrationLocation } from './migrationEventUrlState';
import type { MigrationSearchState } from './migrationEventUrlState';

const { Paragraph, Text, Title } = Typography;
const migrationSortOptions = [
  { value: 'sequenceNo,asc', label: '迁徙顺序' },
  { value: 'updatedAt,desc', label: '最近更新' },
  { value: 'migrationTimeText,asc', label: '历史时期' }
];
const multiSelectProps = { mode: 'multiple' as const, allowClear: true, maxTagCount: 'responsive' as const };

type SearchValues = {
  keyword?: string;
  branchId?: number[];
  fromLocation?: string;
  toLocation?: string;
  migrationTimeText?: string;
  dataStatus?: CultureDataStatus[];
  sort?: string;
};

function errorText(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
function statusOf(error: unknown) {
  return error instanceof ApiRequestError ? error.status : undefined;
}
function routeText(item: Pick<MigrationEventSummaryResponse, 'fromLocation' | 'toLocation'>) {
  return `${item.fromLocation || '迁出地待补充'} → ${item.toLocation || '迁入地待补充'}`;
}
function can(item: MigrationEventSummaryResponse | MigrationEventDetailResponse, ...actions: string[]) {
  return actions.some(action => item.allowedActions.includes(action));
}
function migrationEditor(editor: CultureEditorState | null) {
  return editor?.target === 'migration' ? editor : null;
}
function relativeHref() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function MigrationEventStandardTab() {
  const workspace = useWorkspace();
  const clanId = workspace.clanId;
  const initialLocation = useRef(readMigrationLocation()).current;
  const initialEditor = useRef(migrationEditor(readCultureEditorLocation().editor)).current;
  const previousClanId = useRef(clanId);
  const listRequest = useRef(0);
  const detailRequest = useRef(0);
  const visibleItems = useRef<MigrationEventSummaryResponse[]>([]);
  const editorRef = useRef<CultureEditorState | null>(initialEditor);
  const editorHrefRef = useRef(initialEditor ? relativeHref() : '');
  const editorDirtyRef = useRef(false);
  const [messageApi, messageContext] = message.useMessage();
  const [searchForm] = Form.useForm<SearchValues>();
  const [branches, setBranches] = useState<CultureBranchOption[]>([]);
  const [search, setSearch] = useState<MigrationSearchState>(initialLocation.search);
  const [items, setItems] = useState<MigrationEventSummaryResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [refreshError, setRefreshError] = useState('');
  const [listForbidden, setListForbidden] = useState(false);
  const [selectedId, setSelectedId] = useState<number | undefined>(initialLocation.selectedId);
  const [detail, setDetail] = useState<MigrationEventDetailResponse | null>(null);
  const [trace, setTrace] = useState<TrackingTraceDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [detailStatus, setDetailStatus] = useState<number | undefined>();
  const [traceError, setTraceError] = useState('');
  const [editor, setEditor] = useState<CultureEditorState | null>(initialEditor);
  const [governanceTarget, setGovernanceTarget] = useState<CultureGovernanceTarget | null>(null);
  const [governanceItem, setGovernanceItem] = useState<MigrationEventSummaryResponse | MigrationEventDetailResponse | null>(null);
  const [governanceReason, setGovernanceReason] = useState('');
  const [governanceError, setGovernanceError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);

  const branchOptions = useMemo(() => branches.filter(branch => branch.id).map(branch => ({ value: Number(branch.id), label: branch.name })), [branches]);
  const handleEditorDirtyChange = useCallback((dirty: boolean) => { editorDirtyRef.current = dirty; }, []);

  function buildLocation(nextSearch: MigrationSearchState, nextSelected?: number, nextEditor: CultureEditorState | null = editorRef.current) {
    return buildCultureEditorLocation(buildMigrationLocation(window.location.href, nextSearch, nextSelected), nextEditor);
  }
  function writeLocation(nextSearch: MigrationSearchState, nextSelected?: number, mode: 'push' | 'replace' = 'push', nextEditor: CultureEditorState | null = editorRef.current) {
    const href = buildLocation(nextSearch, nextSelected, nextEditor);
    window.history[mode === 'push' ? 'pushState' : 'replaceState'](window.history.state, '', href);
    if (nextEditor) editorHrefRef.current = href;
  }
  function refresh() { setRefreshVersion(value => value + 1); }

  useEffect(() => { editorRef.current = editor; }, [editor]);
  useEffect(() => {
    searchForm.setFieldsValue({ keyword: search.keyword || undefined, branchId: search.branchId, fromLocation: search.fromLocation || undefined, toLocation: search.toLocation || undefined, migrationTimeText: search.migrationTimeText || undefined, dataStatus: search.dataStatus, sort: search.sort });
  }, [search, searchForm]);
  useEffect(() => {
    const onPopState = () => {
      const nextLocation = readMigrationLocation();
      const nextEditor = migrationEditor(readCultureEditorLocation().editor);
      if (editorRef.current && editorDirtyRef.current && !isSameCultureEditor(editorRef.current, nextEditor) && !confirmCultureEditorLeave(true)) {
        window.history.pushState(window.history.state, '', editorHrefRef.current || relativeHref());
        return;
      }
      editorDirtyRef.current = false;
      editorRef.current = nextEditor;
      setSearch(nextLocation.search);
      setSelectedId(nextLocation.selectedId);
      setEditor(nextEditor);
      if (nextEditor) editorHrefRef.current = relativeHref();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  useEffect(() => {
    if (previousClanId.current === clanId) return;
    previousClanId.current = clanId;
    visibleItems.current = [];
    editorDirtyRef.current = false;
    editorRef.current = null;
    setEditor(null);
    setItems([]);
    setTotal(0);
    setSelectedId(undefined);
    setDetail(null);
    setTrace(null);
    const nextSearch = { ...search, branchId: undefined, pageNo: 1 };
    setSearch(nextSearch);
    writeLocation(nextSearch, undefined, 'replace', null);
  }, [clanId]);
  useEffect(() => {
    if (!clanId) { setBranches([]); return; }
    let active = true;
    listCultureBranches(clanId).then(rows => { if (active) setBranches(rows); }).catch(error => { if (active) messageApi.error(errorText(error, '支派列表加载失败')); });
    return () => { active = false; };
  }, [clanId, messageApi]);
  useEffect(() => {
    if (!clanId) { visibleItems.current = []; setItems([]); setTotal(0); return; }
    const requestId = ++listRequest.current;
    const requestKey = migrationSearchKey(clanId, search);
    setListLoading(true); setListError(''); setRefreshError(''); setListForbidden(false);
    listMigrationEvents(clanId, search)
      .then(data => { if (requestId === listRequest.current && requestKey === migrationSearchKey(clanId, search)) { visibleItems.current = data.items; setItems(data.items); setTotal(data.page.totalElements); } })
      .catch(error => {
        if (requestId !== listRequest.current) return;
        const text = errorText(error, '迁徙事件加载失败');
        if (statusOf(error) === 403) { visibleItems.current = []; setItems([]); setTotal(0); setListForbidden(true); setListError(text); }
        else if (visibleItems.current.length) setRefreshError(text);
        else { setItems([]); setTotal(0); setListError(text); }
      })
      .finally(() => { if (requestId === listRequest.current) setListLoading(false); });
  }, [clanId, search, refreshVersion]);
  useEffect(() => {
    if (!clanId || !selectedId) { detailRequest.current += 1; setDetail(null); setTrace(null); setDetailError(''); setTraceError(''); return; }
    const requestId = ++detailRequest.current;
    setDetail(null); setTrace(null); setDetailError(''); setDetailStatus(undefined); setTraceError(''); setDetailLoading(true);
    Promise.allSettled([getMigrationEvent(selectedId), getMigrationEventTrace(clanId, selectedId)])
      .then(([detailResult, traceResult]) => {
        if (requestId !== detailRequest.current) return;
        if (detailResult.status === 'fulfilled') setDetail(detailResult.value);
        else { setDetailError(errorText(detailResult.reason, '迁徙事件详情加载失败')); setDetailStatus(statusOf(detailResult.reason)); }
        if (traceResult.status === 'fulfilled') setTrace(traceResult.value);
        else setTraceError(errorText(traceResult.reason, '完整追踪暂不可用'));
      })
      .finally(() => { if (requestId === detailRequest.current) setDetailLoading(false); });
  }, [clanId, selectedId, refreshVersion]);

  function applySearch(values: SearchValues) {
    const next: MigrationSearchState = { ...search, keyword: values.keyword?.trim() || '', branchId: values.branchId, fromLocation: values.fromLocation?.trim() || '', toLocation: values.toLocation?.trim() || '', migrationTimeText: values.migrationTimeText?.trim() || '', dataStatus: values.dataStatus, sort: values.sort || defaultMigrationSearch.sort, pageNo: 1 };
    setSearch(next); setSelectedId(undefined); writeLocation(next, undefined);
  }
  function resetSearch() { const next = { ...defaultMigrationSearch, pageSize: search.pageSize }; searchForm.resetFields(); setSearch(next); setSelectedId(undefined); writeLocation(next, undefined); }
  function openDetail(item: MigrationEventSummaryResponse) { setSelectedId(item.id); writeLocation(search, item.id); }
  function closeDetail() { setSelectedId(undefined); setDetail(null); setTrace(null); writeLocation(search, undefined, 'replace'); }
  function openEditor(nextEditor: CultureEditorState) { editorDirtyRef.current = false; editorRef.current = nextEditor; setEditor(nextEditor); writeLocation(search, selectedId, 'push', nextEditor); }
  function closeEditor() { if (!confirmCultureEditorLeave(editorDirtyRef.current)) return; editorDirtyRef.current = false; editorRef.current = null; setEditor(null); writeLocation(search, selectedId, 'replace', null); }
  function editorSaved(id: number) { editorDirtyRef.current = false; editorRef.current = null; setEditor(null); setSelectedId(id); writeLocation(search, id, 'replace', null); refresh(); }

  function openGovernance(item: MigrationEventSummaryResponse | MigrationEventDetailResponse, kind: CultureGovernanceTarget['kind']) {
    setGovernanceItem(item);
    setGovernanceTarget({ id: item.id, name: routeText(item), kind, reviewRequired: kind === 'archive' ? can(item, 'request_archive') : kind === 'delete' ? can(item, 'request_delete') : undefined });
    setGovernanceReason(''); setGovernanceError('');
  }
  async function confirmGovernance() {
    if (!governanceTarget || !governanceItem || actionLoading) return;
    if (governanceTarget.kind === 'archive' && !governanceReason.trim()) { setGovernanceError('请填写归档原因'); return; }
    setActionLoading(true); setGovernanceError('');
    try {
      const result = governanceTarget.kind === 'review'
        ? await submitMigrationEventReview(governanceTarget.id, { comment: governanceReason.trim() || undefined })
        : governanceTarget.kind === 'archive'
          ? await archiveMigrationEvent(governanceTarget.id, { reason: governanceReason.trim() })
          : await deleteMigrationEvent(governanceTarget.id);
      messageApi.success(result.message || '操作已完成');
      if (governanceTarget.kind === 'delete' && !governanceTarget.reviewRequired && selectedId === governanceTarget.id) closeDetail();
      setGovernanceTarget(null); setGovernanceItem(null); setGovernanceReason(''); refresh();
    } catch (error) { setGovernanceError(errorText(error, statusOf(error) === 409 ? '对象状态已变化，请刷新后重试' : '操作失败')); }
    finally { setActionLoading(false); }
  }
  function openTracking() {
    if (!clanId || !selectedId) return;
    const href = buildTrackingDeepLink(window.location.href, { clanId, targetType: 'migration_event', targetId: selectedId, reviewTaskId: detail?.review.reviewTaskId });
    window.history.pushState(window.history.state, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  function rowActions(item: MigrationEventSummaryResponse) {
    const more: MenuProps['items'] = [];
    if (can(item, 'submit_review')) more.push({ key: 'review', label: '提交审核' });
    if (can(item, 'archive', 'request_archive')) more.push({ key: 'archive', label: '归档' });
    if (can(item, 'delete', 'request_delete')) more.push({ key: 'delete', label: <Text type="danger">删除</Text> });
    return <Space size={2} onClick={event => event.stopPropagation()}><Button type="link" onClick={() => openDetail(item)}>查看</Button>{can(item, 'update', 'request_update') ? <Button type="link" onClick={() => openEditor({ target: 'migration', mode: 'edit', id: item.id })}>编辑</Button> : null}{more.length ? <Dropdown menu={{ items: more, onClick: ({ key }) => openGovernance(item, key as CultureGovernanceTarget['kind']) }}><Button type="link">更多</Button></Dropdown> : null}</Space>;
  }
  const columns: TableProps<MigrationEventSummaryResponse>['columns'] = [
    { title: '顺序', dataIndex: 'sequenceNo', key: 'sequenceNo', width: 72 },
    { title: '所属支派', key: 'branch', width: 150, render: (_, item) => item.scope.branchName || '未命名支派' },
    { title: '迁徙路线', key: 'route', width: 260, render: (_, item) => <Button type="link" onClick={event => { event.stopPropagation(); openDetail(item); }}>{routeText(item)}</Button> },
    { title: '历史时期', dataIndex: 'migrationTimeText', key: 'migrationTimeText', width: 150, render: value => value || <Text type="secondary">待补充</Text> },
    { title: '始迁祖', dataIndex: 'founderPersonName', key: 'founderPersonName', width: 140, render: value => value || <Text type="secondary">暂未关联</Text> },
    { title: '可信度', dataIndex: 'confidenceLevel', key: 'confidenceLevel', width: 100, render: value => <Tag color={confidenceColor(value)}>{optionLabel(confidenceOptions, value)}</Tag> },
    { title: '来源', dataIndex: 'sourceCount', key: 'sourceCount', width: 90, render: value => `${value} 条` },
    { title: '状态', dataIndex: 'dataStatus', key: 'dataStatus', width: 100, render: value => <Tag color={statusColor(value)}>{optionLabel(statusOptions, value)}</Tag> },
    { title: '最近更新', dataIndex: 'updatedAt', key: 'updatedAt', width: 170, render: value => formatDateTime(value) },
    { title: '操作', key: 'actions', fixed: 'right', width: 190, render: (_, item) => rowActions(item) }
  ];

  if (editor?.mode === 'edit') return <>{messageContext}<MigrationEventEditorPage clanId={clanId} editor={editor} branches={branches} onCancel={closeEditor} onSaved={editorSaved} onDirtyChange={handleEditorDirtyChange} /></>;

  const selectedSummary = detail || items.find(item => item.id === selectedId) || null;
  const drawerMore: MenuProps['items'] = selectedSummary ? [can(selectedSummary, 'archive', 'request_archive') ? { key: 'archive', label: '归档' } : null, can(selectedSummary, 'delete', 'request_delete') ? { key: 'delete', label: <Text type="danger">删除</Text> } : null].filter(Boolean) as MenuProps['items'] : [];

  return <Space direction="vertical" size="middle" style={{ width: '100%' }}>
    {messageContext}
    <Card size="small" title="迁徙事件查询">
      <Paragraph type="secondary">按支派维护真实迁徙事件，不拼接或推测缺失路线。</Paragraph>
      <Form form={searchForm} layout="vertical" onFinish={applySearch}><Row gutter={[12, 0]}><Col xs={24} md={8} xl={5}><Form.Item name="keyword" label="关键词"><Input allowClear placeholder="地点、时期、原因或始迁祖" /></Form.Item></Col><Col xs={24} md={8} xl={4}><Form.Item name="branchId" label="支派"><Select {...multiSelectProps} placeholder="可多选" showSearch optionFilterProp="label" options={branchOptions} /></Form.Item></Col><Col xs={24} md={8} xl={4}><Form.Item name="fromLocation" label="迁出地"><Input allowClear /></Form.Item></Col><Col xs={24} md={8} xl={4}><Form.Item name="toLocation" label="迁入地"><Input allowClear /></Form.Item></Col><Col xs={24} md={8} xl={3}><Form.Item name="dataStatus" label="状态"><Select {...multiSelectProps} placeholder="可多选" options={statusOptions} /></Form.Item></Col><Col xs={24} md={8} xl={4}><Form.Item name="sort" label="排序"><Select options={migrationSortOptions} /></Form.Item></Col><Col xs={24} className="culture-search-actions"><Space><Button onClick={resetSearch}>重置</Button><Button type="primary" htmlType="submit" loading={listLoading}>查询</Button></Space></Col></Row></Form>
    </Card>
    <Card title={`迁徙事件（${total}）`}>
      {refreshError ? <Alert type="warning" showIcon closable message="迁徙事件刷新失败，仍显示上次结果" description={refreshError} onClose={() => setRefreshError('')} style={{ marginBottom: 16 }} /> : null}
      {!clanId ? <Empty description="请选择宗族后查看迁徙脉络" /> : null}
      {clanId && listForbidden ? <Result status="403" title="暂无权限" subTitle={listError || '当前账号无权查看该宗族迁徙事件'} /> : null}
      {clanId && listError && !listForbidden ? <Result status="error" title="迁徙事件首次加载失败" subTitle={listError} extra={<Button onClick={refresh}>重新加载</Button>} /> : null}
      {clanId && !listForbidden && !listError ? <Table<MigrationEventSummaryResponse> rowKey="id" size="middle" loading={listLoading} columns={columns} dataSource={items} scroll={{ x: 1400 }} onRow={item => ({ onClick: () => openDetail(item), tabIndex: 0, onKeyDown: event => { if (event.key === 'Enter') openDetail(item); } })} pagination={{ current: search.pageNo, pageSize: search.pageSize, total, showSizeChanger: true, pageSizeOptions: [10, 20, 50], showTotal: value => `共 ${value} 条`, onChange: (pageNo, pageSize) => { const next = { ...search, pageNo, pageSize }; setSearch(next); writeLocation(next, selectedId); } }} locale={{ emptyText: <Empty description="没有符合当前条件的迁徙事件"><Space><Button onClick={resetSearch}>重置筛选</Button><Button type="primary" onClick={() => openEditor({ target: 'migration', mode: 'create' })}>新增迁徙事件</Button></Space></Empty> }} /> : null}
    </Card>
    <Drawer open={Boolean(selectedId)} width={720} title={<Space><Title level={4} style={{ margin: 0 }}>{detail ? routeText(detail) : selectedSummary ? routeText(selectedSummary) : '迁徙事件详情'}</Title>{detail ? <Tag color={statusColor(detail.dataStatus)}>{optionLabel(statusOptions, detail.dataStatus)}</Tag> : null}</Space>} extra={selectedSummary ? <Space>{can(selectedSummary, 'update', 'request_update') ? <Button onClick={() => openEditor({ target: 'migration', mode: 'edit', id: selectedSummary.id })}>编辑</Button> : null}{can(selectedSummary, 'submit_review') ? <Button type="primary" onClick={() => openGovernance(selectedSummary, 'review')}>提交审核</Button> : null}{drawerMore?.length ? <Dropdown menu={{ items: drawerMore, onClick: ({ key }) => openGovernance(selectedSummary, key as CultureGovernanceTarget['kind']) }}><Button>更多</Button></Dropdown> : null}</Space> : null} onClose={closeDetail} destroyOnHidden>
      {detailLoading && !detail ? <Skeleton active paragraph={{ rows: 9 }} /> : null}
      {!detailLoading && detailError ? <Result status={detailStatus === 403 ? '403' : detailStatus === 404 ? '404' : 'error'} title={detailStatus === 403 ? '暂无权限' : detailStatus === 404 ? '迁徙事件不存在' : '详情加载失败'} subTitle={detailError} extra={<Button onClick={refresh}>重新加载</Button>} /> : null}
      {detail ? <Tabs items={[
        { key: 'basic', label: '基本信息', children: <Space direction="vertical" size="middle" style={{ width: '100%' }}><Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}><Descriptions.Item label="所属支派">{detail.scope.branchName || '未命名支派'}</Descriptions.Item><Descriptions.Item label="迁徙顺序">{detail.sequenceNo}</Descriptions.Item><Descriptions.Item label="历史时期">{detail.migrationTimeText || '待补充'}</Descriptions.Item><Descriptions.Item label="始迁祖">{detail.founderPersonName || '未关联或姓名不可见'}</Descriptions.Item><Descriptions.Item label="迁徙原因" span={2}>{detail.reason || '待补充'}</Descriptions.Item><Descriptions.Item label="可信度">{optionLabel(confidenceOptions, detail.confidenceLevel)}</Descriptions.Item><Descriptions.Item label="可见范围">{optionLabel(privacyOptions, detail.privacyLevel)}</Descriptions.Item><Descriptions.Item label="最近更新">{formatDateTime(detail.updatedAt)}</Descriptions.Item></Descriptions><Card size="small" title="详细说明"><Paragraph>{detail.description || '暂无详细说明'}</Paragraph></Card></Space> },
        { key: 'sources', label: '来源证据', children: <List bordered dataSource={detail.sources} locale={{ emptyText: '尚未绑定来源' }} renderItem={source => <List.Item><List.Item.Meta title={source.sourceName} description={source.excerpt || '来源摘录受限或尚未补录'} /></List.Item>} /> },
        { key: 'history', label: '审核与追踪', children: <Space direction="vertical" size="middle" style={{ width: '100%' }}><Descriptions bordered size="small" column={1}><Descriptions.Item label="审核状态">{detail.review.status || '尚未提交'}</Descriptions.Item><Descriptions.Item label="驳回原因">{detail.review.rejectedReason || '-'}</Descriptions.Item></Descriptions>{traceError ? <Alert type="warning" showIcon message="追踪局部加载失败" description={traceError} /> : null}{trace ? <Timeline items={trace.timeline.slice(0, 8).map(event => ({ children: `${event.title} · ${formatDateTime(event.occurredAt)}` }))} /> : !traceError ? <Skeleton active paragraph={{ rows: 4 }} /> : null}<Button onClick={openTracking}>打开完整追踪</Button></Space> }
      ]} /> : null}
    </Drawer>
    {editor?.mode === 'create' ? <Drawer open width={720} title="新增迁徙事件" className="culture-create-drawer" onClose={closeEditor} destroyOnHidden><MigrationEventEditorPage clanId={clanId} editor={editor} branches={branches} onCancel={closeEditor} onSaved={editorSaved} onDirtyChange={handleEditorDirtyChange} /></Drawer> : null}
    <CultureGovernanceModal target={governanceTarget} reason={governanceReason} loading={actionLoading} error={governanceError} onReasonChange={setGovernanceReason} onCancel={() => { if (!actionLoading) setGovernanceTarget(null); }} onConfirm={() => void confirmGovernance()} />
  </Space>;
}
