import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Result,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Timeline,
  Typography
} from 'antd';
import type { TableProps } from 'antd';
import type {
  CultureDataStatus,
  MigrationEventDetailResponse,
  MigrationEventSummaryResponse
} from '../../shared/api/generated/culture-types';
import type { TrackingTraceDetailResponse } from '../../shared/api/generated/tracking-types';
import { ApiRequestError } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { buildTrackingDeepLink } from '../../shared/navigation/trackingDeepLink.js';
import { MigrationEventEditorPage } from './MigrationEventEditorPage';
import {
  buildCultureEditorLocation,
  confirmCultureEditorLeave,
  isSameCultureEditor,
  readCultureEditorLocation
} from './cultureEditorState';
import type { CultureEditorState } from './cultureEditorState';
import {
  confidenceColor,
  confidenceOptions,
  formatDateTime,
  optionLabel,
  privacyOptions,
  statusColor,
  statusOptions
} from './cultureOptions';
import { listCultureBranches } from './cultureLibraryService';
import type { CultureBranchOption } from './cultureLibraryService';
import {
  archiveMigrationEvent,
  deleteMigrationEvent,
  getMigrationEvent,
  getMigrationEventTrace,
  listMigrationEvents,
  submitMigrationEventReview
} from './migrationEventService';
import {
  buildMigrationLocation,
  defaultMigrationSearch,
  migrationSearchKey,
  readMigrationLocation
} from './migrationEventUrlState';
import type { MigrationSearchState } from './migrationEventUrlState';

import { feedback } from '../../shared/ui/OperationFeedback';

const { Paragraph, Text, Title } = Typography;

const migrationSortOptions = [
  { value: 'sequenceNo,asc', label: '迁徙顺序' },
  { value: 'updatedAt,desc', label: '最近更新' },
  { value: 'migrationTimeText,asc', label: '历史时期' }
];
const multiSelectProps = {
  mode: 'multiple' as const,
  allowClear: true,
  maxTagCount: 'responsive' as const
};

type SearchFormValues = {
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

function forbidden(error: unknown) {
  return error instanceof ApiRequestError && error.status === 403;
}

function routeText(item: Pick<MigrationEventSummaryResponse, 'fromLocation' | 'toLocation'>) {
  return `${item.fromLocation || '迁出地待补充'} → ${item.toLocation || '迁入地待补充'}`;
}

function can(item: MigrationEventSummaryResponse, ...actions: string[]) {
  return actions.some(action => item.allowedActions.includes(action));
}

function migrationEditor(editor: CultureEditorState | null) {
  return editor?.target === 'migration' ? editor : null;
}

function relativeHref() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function MigrationEventMaintenanceTab() {
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
  
  const [searchForm] = Form.useForm<SearchFormValues>();
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
  const [traceError, setTraceError] = useState('');
  const [editor, setEditor] = useState<CultureEditorState | null>(initialEditor);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);

  const branchOptions = useMemo(
    () => branches.filter(branch => branch.id).map(branch => ({ value: Number(branch.id), label: branch.name })),
    [branches]
  );

  const handleEditorDirtyChange = useCallback((dirty: boolean) => {
    editorDirtyRef.current = dirty;
  }, []);

  function buildLocation(nextSearch: MigrationSearchState, nextSelected?: number, nextEditor: CultureEditorState | null = editorRef.current) {
    const migrationHref = buildMigrationLocation(window.location.href, nextSearch, nextSelected);
    return buildCultureEditorLocation(migrationHref, nextEditor);
  }

  function writeLocation(
    nextSearch: MigrationSearchState,
    nextSelected?: number,
    mode: 'push' | 'replace' = 'push',
    nextEditor: CultureEditorState | null = editorRef.current
  ) {
    const href = buildLocation(nextSearch, nextSelected, nextEditor);
    window.history[mode === 'push' ? 'pushState' : 'replaceState'](window.history.state, '', href);
    if (nextEditor) editorHrefRef.current = href;
  }

  function refresh() {
    setRefreshVersion(value => value + 1);
  }

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    searchForm.setFieldsValue({
      keyword: search.keyword || undefined,
      branchId: search.branchId,
      fromLocation: search.fromLocation || undefined,
      toLocation: search.toLocation || undefined,
      migrationTimeText: search.migrationTimeText || undefined,
      dataStatus: search.dataStatus,
      sort: search.sort
    });
  }, [search, searchForm]);

  useEffect(() => {
    const onPopState = () => {
      const nextLocation = readMigrationLocation();
      const nextEditor = migrationEditor(readCultureEditorLocation().editor);
      if (editorRef.current && editorDirtyRef.current && !isSameCultureEditor(editorRef.current, nextEditor)) {
        if (!confirmCultureEditorLeave(true)) {
          window.history.pushState(window.history.state, '', editorHrefRef.current || relativeHref());
          return;
        }
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
    listRequest.current += 1;
    detailRequest.current += 1;
    visibleItems.current = [];
    editorDirtyRef.current = false;
    editorRef.current = null;
    setEditor(null);
    setItems([]);
    setTotal(0);
    setSelectedId(undefined);
    setDetail(null);
    setTrace(null);
    setListError('');
    setRefreshError('');
    setListForbidden(false);
    const nextSearch = { ...search, branchId: undefined, pageNo: 1 };
    setSearch(nextSearch);
    writeLocation(nextSearch, undefined, 'replace', null);
  }, [clanId]);

  useEffect(() => {
    if (!clanId) {
      setBranches([]);
      return;
    }
    let active = true;
    listCultureBranches(clanId)
      .then(rows => { if (active) setBranches(rows); })
      .catch(error => {
        if (!active) return;
        setBranches([]);
        feedback.error(errorText(error, '支派列表加载失败'));
      });
    return () => { active = false; };
  }, [clanId, messageApi]);

  useEffect(() => {
    if (!clanId) {
      listRequest.current += 1;
      visibleItems.current = [];
      setItems([]);
      setTotal(0);
      return;
    }
    const requestId = ++listRequest.current;
    const requestKey = migrationSearchKey(clanId, search);
    setListLoading(true);
    setListError('');
    setRefreshError('');
    setListForbidden(false);
    listMigrationEvents(clanId, search)
      .then(page => {
        if (requestId !== listRequest.current || requestKey !== migrationSearchKey(clanId, search)) return;
        visibleItems.current = page.items;
        setItems(page.items);
        setTotal(page.page.totalElements);
      })
      .catch(error => {
        if (requestId !== listRequest.current) return;
        const text = errorText(error, '迁徙事件加载失败');
        if (forbidden(error)) {
          visibleItems.current = [];
          setItems([]);
          setTotal(0);
          setListForbidden(true);
          setListError(text);
        } else if (visibleItems.current.length) {
          setRefreshError(text);
        } else {
          setListError(text);
          setItems([]);
          setTotal(0);
        }
      })
      .finally(() => { if (requestId === listRequest.current) setListLoading(false); });
  }, [clanId, search, refreshVersion]);

  useEffect(() => {
    if (!clanId || !selectedId) {
      detailRequest.current += 1;
      setDetail(null);
      setTrace(null);
      setDetailError('');
      setTraceError('');
      return;
    }
    const requestId = ++detailRequest.current;
    setDetail(null);
    setTrace(null);
    setDetailError('');
    setTraceError('');
    setDetailLoading(true);
    Promise.allSettled([getMigrationEvent(selectedId), getMigrationEventTrace(clanId, selectedId)])
      .then(([detailResult, traceResult]) => {
        if (requestId !== detailRequest.current) return;
        if (detailResult.status === 'fulfilled') setDetail(detailResult.value);
        else setDetailError(errorText(detailResult.reason, '迁徙事件详情加载失败'));
        if (traceResult.status === 'fulfilled') setTrace(traceResult.value);
        else setTraceError(errorText(traceResult.reason, '完整追踪暂不可用'));
      })
      .finally(() => { if (requestId === detailRequest.current) setDetailLoading(false); });
  }, [clanId, selectedId, refreshVersion]);

  function applySearch(values: SearchFormValues) {
    const nextSearch: MigrationSearchState = {
      ...search,
      keyword: values.keyword?.trim() || '',
      branchId: values.branchId,
      fromLocation: values.fromLocation?.trim() || '',
      toLocation: values.toLocation?.trim() || '',
      migrationTimeText: values.migrationTimeText?.trim() || '',
      dataStatus: values.dataStatus,
      sort: values.sort || defaultMigrationSearch.sort,
      pageNo: 1
    };
    setSearch(nextSearch);
    setSelectedId(undefined);
    writeLocation(nextSearch, undefined);
  }

  function resetSearch() {
    const nextSearch = { ...defaultMigrationSearch, pageSize: search.pageSize };
    setSearch(nextSearch);
    setSelectedId(undefined);
    writeLocation(nextSearch, undefined);
  }

  function changePage(pageNo: number, pageSize: number) {
    const nextSearch = { ...search, pageNo, pageSize };
    setSearch(nextSearch);
    writeLocation(nextSearch, selectedId);
  }

  function openDetail(item: MigrationEventSummaryResponse) {
    setSelectedId(item.id);
    writeLocation(search, item.id);
  }

  function closeDetail() {
    setSelectedId(undefined);
    setDetail(null);
    setTrace(null);
    writeLocation(search, undefined, 'replace');
  }

  function openEditor(nextEditor: CultureEditorState) {
    editorDirtyRef.current = false;
    editorRef.current = nextEditor;
    setEditor(nextEditor);
    writeLocation(search, selectedId, 'push', nextEditor);
  }

  function openCreate() {
    openEditor({ target: 'migration', mode: 'create' });
  }

  function openEdit(item: MigrationEventSummaryResponse | MigrationEventDetailResponse) {
    openEditor({ target: 'migration', mode: 'edit', id: item.id });
  }

  function closeEditor() {
    editorDirtyRef.current = false;
    editorRef.current = null;
    setEditor(null);
    writeLocation(search, selectedId, 'replace', null);
  }

  function editorSaved(id: number) {
    editorDirtyRef.current = false;
    editorRef.current = null;
    setEditor(null);
    setSelectedId(id);
    writeLocation(search, id, 'replace', null);
    refresh();
  }

  async function submitReview(item: MigrationEventSummaryResponse) {
    setActionLoading(true);
    try {
      const result = await submitMigrationEventReview(item.id, {});
      feedback.success(result.message || '迁徙事件已提交审核');
      refresh();
    } catch (error) {
      feedback.error(errorText(error, '提交审核失败'));
    } finally {
      setActionLoading(false);
    }
  }

  function archive(item: MigrationEventSummaryResponse) {
    let reason = '';
    Modal.confirm({
      title: can(item, 'request_archive') ? '申请归档正式迁徙事件' : '归档迁徙事件',
      content: <Input.TextArea autoFocus placeholder="请输入归档原因" onChange={event => { reason = event.target.value; }} />,
      okText: can(item, 'request_archive') ? '提交归档申请' : '确认归档',
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
    setActionLoading(true);
    try {
      const reviewRequired = can(item, 'request_delete');
      const result = await deleteMigrationEvent(item.id);
      feedback.success(result.message || '删除操作已完成');
      if (!reviewRequired && selectedId === item.id) closeDetail();
      refresh();
    } catch (error) {
      feedback.error(errorText(error, '删除失败'));
    } finally {
      setActionLoading(false);
    }
  }

  function openTracking() {
    if (!clanId || !selectedId) return;
    const href = buildTrackingDeepLink(window.location.href, {
      clanId,
      targetType: 'migration_event',
      targetId: selectedId,
      reviewTaskId: detail?.review.reviewTaskId
    });
    window.history.pushState(window.history.state, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  function actionButtons(item: MigrationEventSummaryResponse) {
    return (
      <Space size={2} wrap onClick={event => event.stopPropagation()}>
        <Button type="link" onClick={() => openDetail(item)}>查看</Button>
        {can(item, 'update', 'request_update') ? <Button type="link" loading={actionLoading} onClick={() => openEdit(item)}>编辑</Button> : null}
        {can(item, 'submit_review') ? <Button type="link" loading={actionLoading} onClick={() => void submitReview(item)}>提交审核</Button> : null}
        {can(item, 'archive', 'request_archive') ? <Button type="link" onClick={() => archive(item)}>归档</Button> : null}
        {can(item, 'delete', 'request_delete') ? (
          <Popconfirm
            title={can(item, 'request_delete') ? '提交正式迁徙事件删除申请？' : '确认删除该迁徙事件？'}
            onConfirm={() => void remove(item)}
          >
            <Button danger type="link" loading={actionLoading}>删除</Button>
          </Popconfirm>
        ) : null}
      </Space>
    );
  }

  const columns: TableProps<MigrationEventSummaryResponse>['columns'] = [
    { title: '顺序', dataIndex: 'sequenceNo', key: 'sequenceNo', width: 72 },
    { title: '所属支派', key: 'branch', width: 150, render: (_, item) => item.scope.branchName || '未命名支派' },
    { title: '迁徙路线', key: 'route', width: 260, render: (_, item) => <Button type="link" onClick={() => openDetail(item)}>{routeText(item)}</Button> },
    { title: '历史时期', dataIndex: 'migrationTimeText', key: 'migrationTimeText', width: 150, render: value => value || <Text type="secondary">待补充</Text> },
    { title: '始迁祖', dataIndex: 'founderPersonName', key: 'founderPersonName', width: 140, render: value => value || <Text type="secondary">暂未关联</Text> },
    { title: '可信度', dataIndex: 'confidenceLevel', key: 'confidenceLevel', width: 100, render: value => <Tag color={confidenceColor(value)}>{optionLabel(confidenceOptions, value)}</Tag> },
    { title: '来源', dataIndex: 'sourceCount', key: 'sourceCount', width: 90, render: value => `${value} 条` },
    { title: '状态', dataIndex: 'dataStatus', key: 'dataStatus', width: 100, render: value => <Tag color={statusColor(value)}>{optionLabel(statusOptions, value)}</Tag> },
    { title: '最近更新', dataIndex: 'updatedAt', key: 'updatedAt', width: 170, render: value => formatDateTime(value) },
    { title: '操作', key: 'actions', fixed: 'right', width: 260, render: (_, item) => actionButtons(item) }
  ];

  if (editor) {
    return (
      <>
        
        <MigrationEventEditorPage
          clanId={clanId}
          editor={editor}
          branches={branches}
          onCancel={closeEditor}
          onSaved={editorSaved}
          onDirtyChange={handleEditorDirtyChange}
        />
      </>
    );
  }

  const selectedSummary = detail || items.find(item => item.id === selectedId) || null;

  return (
    <Card title="迁徙脉络" extra={<Button type="primary" disabled={!clanId} onClick={openCreate}>新增迁徙事件</Button>}>
      
      <Paragraph type="secondary">按支派维护真实迁徙事件。页面只展示查询列表和维护入口，不拼接推测路线。</Paragraph>

      <Form form={searchForm} layout="vertical" onFinish={applySearch}>
        <Row gutter={[12, 0]}>
          <Col xs={24} md={8} xl={5}><Form.Item name="keyword" label="关键词"><Input allowClear placeholder="地点、时期、原因或始迁祖" /></Form.Item></Col>
          <Col xs={24} md={8} xl={4}><Form.Item name="branchId" label="支派"><Select {...multiSelectProps} placeholder="可多选" showSearch optionFilterProp="label" options={branchOptions} /></Form.Item></Col>
          <Col xs={24} md={8} xl={4}><Form.Item name="fromLocation" label="迁出地"><Input allowClear /></Form.Item></Col>
          <Col xs={24} md={8} xl={4}><Form.Item name="toLocation" label="迁入地"><Input allowClear /></Form.Item></Col>
          <Col xs={24} md={8} xl={3}><Form.Item name="dataStatus" label="状态"><Select {...multiSelectProps} placeholder="可多选" options={statusOptions} /></Form.Item></Col>
          <Col xs={24} md={8} xl={4}><Form.Item name="sort" label="排序"><Select options={migrationSortOptions} /></Form.Item></Col>
          <Col xs={24}><Space style={{ marginBottom: 16 }}><Button type="primary" htmlType="submit" loading={listLoading}>查询</Button><Button onClick={resetSearch}>重置</Button></Space></Col>
        </Row>
      </Form>

      {refreshError ? <Alert type="warning" showIcon closable message="迁徙事件刷新失败，仍显示上次结果" description={refreshError} onClose={() => setRefreshError('')} style={{ marginBottom: 16 }} /> : null}
      {!clanId ? <Empty description="请选择宗族后查看迁徙脉络" /> : null}
      {clanId && listForbidden ? <Result status="403" title="暂无权限" subTitle={listError || '当前账号无权查看该宗族迁徙事件'} /> : null}
      {clanId && listError && !listForbidden ? <Alert type="error" showIcon message="迁徙事件首次加载失败" description={listError} style={{ marginBottom: 16 }} /> : null}
      {clanId && !listForbidden ? (
        <Table<MigrationEventSummaryResponse>
          rowKey="id"
          size="middle"
          loading={listLoading}
          columns={columns}
          dataSource={items}
          scroll={{ x: 1500 }}
          onRow={item => ({ onClick: () => openDetail(item) })}
          pagination={{
            current: search.pageNo,
            pageSize: search.pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
            showTotal: value => `共 ${value} 条`,
            onChange: changePage
          }}
          locale={{ emptyText: '没有符合当前条件的迁徙事件' }}
        />
      ) : null}

      <Drawer open={Boolean(selectedId)} width={680} title={<Title level={4} style={{ margin: 0 }}>迁徙事件详情</Title>} loading={detailLoading} onClose={closeDetail}>
        {detailError ? <Alert type="error" showIcon message="迁徙事件详情加载失败" description={detailError} /> : null}
        {detail ? (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="所属支派">{detail.scope.branchName || '未命名支派'}</Descriptions.Item>
              <Descriptions.Item label="迁徙路线">{routeText(detail)}</Descriptions.Item>
              <Descriptions.Item label="迁徙顺序">{detail.sequenceNo}</Descriptions.Item>
              <Descriptions.Item label="历史时期">{detail.migrationTimeText || '待补充'}</Descriptions.Item>
              <Descriptions.Item label="始迁祖">{detail.founderPersonName || '未关联或姓名不可见'}</Descriptions.Item>
              <Descriptions.Item label="迁徙原因">{detail.reason || '待补充'}</Descriptions.Item>
              <Descriptions.Item label="可信度">{optionLabel(confidenceOptions, detail.confidenceLevel)}</Descriptions.Item>
              <Descriptions.Item label="可见范围">{optionLabel(privacyOptions, detail.privacyLevel)}</Descriptions.Item>
              <Descriptions.Item label="数据状态">{optionLabel(statusOptions, detail.dataStatus)}</Descriptions.Item>
              <Descriptions.Item label="最近更新">{formatDateTime(detail.updatedAt)}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="详细说明"><Paragraph>{detail.description || '暂无详细说明'}</Paragraph></Card>
            <Card size="small" title={`来源证据（${detail.sources.length}）`}>
              {detail.sources.length ? (
                <List size="small" dataSource={detail.sources} renderItem={source => <List.Item><List.Item.Meta title={source.sourceName} description={source.excerpt || '来源摘录受限或尚未补录'} /></List.Item>} />
              ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚未绑定来源" />}
            </Card>
            <Card size="small" title="审核与追踪">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text>审核状态：{detail.review.status || '尚未提交'}</Text>
                {detail.review.rejectedReason ? <Alert type="warning" showIcon message="驳回原因" description={detail.review.rejectedReason} /> : null}
                {traceError ? <Alert type="warning" showIcon message="Tracking 加载失败" description={traceError} /> : null}
                <Text>可见历史事件：{trace?.timeline.length || 0}</Text>
                <Button onClick={openTracking}>打开完整追踪</Button>
                {trace?.timeline.length ? <Timeline items={trace.timeline.slice(0, 5).map(event => ({ children: `${event.title} · ${event.occurredAt || ''}` }))} /> : null}
              </Space>
            </Card>
            {selectedSummary ? actionButtons(selectedSummary) : null}
          </Space>
        ) : null}
      </Drawer>
    </Card>
  );
}
