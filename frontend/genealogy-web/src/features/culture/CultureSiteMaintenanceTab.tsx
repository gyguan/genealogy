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
  CultureSiteDetailResponse,
  CultureSiteSummaryResponse,
  CultureSiteType
} from '../../shared/api/generated/culture-types';
import type { TrackingTraceDetailResponse } from '../../shared/api/generated/tracking-types';
import { ApiRequestError } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { buildTrackingDeepLink } from '../../shared/navigation/trackingDeepLink.js';
import { CultureSiteEditorPage } from './CultureSiteEditorPage';
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
  archiveCultureSite,
  deleteCultureSite,
  downloadCultureSiteAttachment,
  getCultureSite,
  getCultureSiteTrace,
  listCultureSites,
  previewCultureSiteAttachment,
  submitCultureSiteReview
} from './cultureSiteService';
import {
  buildCultureSiteLocation,
  cultureSiteSearchKey,
  defaultCultureSiteSearch,
  readCultureSiteLocation
} from './cultureSiteUrlState';
import type { CultureSiteTabSearchState } from './cultureSiteUrlState';

import { feedback } from '../../shared/ui/OperationFeedback';

const { Paragraph, Text, Title } = Typography;

const siteTypeOptions: Array<{ value: CultureSiteType; label: string }> = [
  { value: 'ancestral_hall', label: '祠堂' },
  { value: 'ancestral_home', label: '祖居' },
  { value: 'cemetery', label: '墓园' },
  { value: 'memorial', label: '纪念设施' },
  { value: 'other', label: '其他' }
];
const siteSortOptions = [
  { value: 'sortOrder,asc', label: '展示顺序' },
  { value: 'updatedAt,desc', label: '最近更新' }
];
const multiSelectProps = {
  mode: 'multiple' as const,
  allowClear: true,
  maxTagCount: 'responsive' as const
};

type SearchFormValues = {
  keyword?: string;
  siteType?: CultureSiteType[];
  branchId?: number[];
  addressText?: string;
  currentStatus?: string;
  dataStatus?: CultureDataStatus[];
  sort?: string;
};

function errorText(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function forbidden(error: unknown) {
  return error instanceof ApiRequestError && error.status === 403;
}

function siteTypeLabel(value?: string | null) {
  return siteTypeOptions.find(option => option.value === value)?.label || '其他';
}

function can(item: CultureSiteSummaryResponse, ...actions: string[]) {
  return actions.some(action => item.allowedActions.includes(action));
}

function siteEditor(editor: CultureEditorState | null) {
  return editor?.target === 'site' ? editor : null;
}

function relativeHref() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function CultureSiteMaintenanceTab() {
  const workspace = useWorkspace();
  const clanId = workspace.clanId;
  const initialLocation = useRef(readCultureSiteLocation()).current;
  const initialEditor = useRef(siteEditor(readCultureEditorLocation().editor)).current;
  const previousClanId = useRef(clanId);
  const listRequest = useRef(0);
  const detailRequest = useRef(0);
  const visibleItems = useRef<CultureSiteSummaryResponse[]>([]);
  const editorRef = useRef<CultureEditorState | null>(initialEditor);
  const editorHrefRef = useRef(initialEditor ? relativeHref() : '');
  const editorDirtyRef = useRef(false);
  
  const [searchForm] = Form.useForm<SearchFormValues>();
  const [branches, setBranches] = useState<CultureBranchOption[]>([]);
  const [search, setSearch] = useState<CultureSiteTabSearchState>(initialLocation.search);
  const [items, setItems] = useState<CultureSiteSummaryResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [refreshError, setRefreshError] = useState('');
  const [listForbidden, setListForbidden] = useState(false);
  const [selectedId, setSelectedId] = useState<number | undefined>(initialLocation.selectedId);
  const [detail, setDetail] = useState<CultureSiteDetailResponse | null>(null);
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

  function buildLocation(nextSearch: CultureSiteTabSearchState, nextSelected?: number, nextEditor: CultureEditorState | null = editorRef.current) {
    const siteHref = buildCultureSiteLocation(window.location.href, nextSearch, nextSelected);
    return buildCultureEditorLocation(siteHref, nextEditor);
  }

  function writeLocation(
    nextSearch: CultureSiteTabSearchState,
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
      siteType: search.siteType,
      branchId: search.branchId,
      addressText: search.addressText || undefined,
      currentStatus: search.currentStatus || undefined,
      dataStatus: search.dataStatus,
      sort: search.sort
    });
  }, [search, searchForm]);

  useEffect(() => {
    const onPopState = () => {
      const nextLocation = readCultureSiteLocation();
      const nextEditor = siteEditor(readCultureEditorLocation().editor);
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
    const requestKey = cultureSiteSearchKey(clanId, search);
    setListLoading(true);
    setListError('');
    setRefreshError('');
    setListForbidden(false);
    listCultureSites(clanId, search)
      .then(page => {
        if (requestId !== listRequest.current || requestKey !== cultureSiteSearchKey(clanId, search)) return;
        visibleItems.current = page.items;
        setItems(page.items);
        setTotal(page.page.totalElements);
      })
      .catch(error => {
        if (requestId !== listRequest.current) return;
        const text = errorText(error, '文化场所加载失败');
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
    Promise.allSettled([getCultureSite(selectedId), getCultureSiteTrace(clanId, selectedId)])
      .then(([detailResult, traceResult]) => {
        if (requestId !== detailRequest.current) return;
        if (detailResult.status === 'fulfilled') setDetail(detailResult.value);
        else setDetailError(errorText(detailResult.reason, '文化场所详情加载失败'));
        if (traceResult.status === 'fulfilled') setTrace(traceResult.value);
        else setTraceError(errorText(traceResult.reason, '完整追踪暂不可用'));
      })
      .finally(() => { if (requestId === detailRequest.current) setDetailLoading(false); });
  }, [clanId, selectedId, refreshVersion]);

  function applySearch(values: SearchFormValues) {
    const nextSearch: CultureSiteTabSearchState = {
      ...search,
      keyword: values.keyword?.trim() || '',
      siteType: values.siteType,
      branchId: values.branchId,
      addressText: values.addressText?.trim() || '',
      currentStatus: values.currentStatus?.trim() || '',
      dataStatus: values.dataStatus,
      sort: values.sort || defaultCultureSiteSearch.sort,
      pageNo: 1
    };
    setSearch(nextSearch);
    setSelectedId(undefined);
    writeLocation(nextSearch, undefined);
  }

  function resetSearch() {
    const nextSearch = { ...defaultCultureSiteSearch, pageSize: search.pageSize };
    setSearch(nextSearch);
    setSelectedId(undefined);
    writeLocation(nextSearch, undefined);
  }

  function changePage(pageNo: number, pageSize: number) {
    const nextSearch = { ...search, pageNo, pageSize };
    setSearch(nextSearch);
    writeLocation(nextSearch, selectedId);
  }

  function openDetail(item: CultureSiteSummaryResponse) {
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
    openEditor({ target: 'site', mode: 'create' });
  }

  function openEdit(item: CultureSiteSummaryResponse | CultureSiteDetailResponse) {
    openEditor({ target: 'site', mode: 'edit', id: item.id });
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

  async function submitReview(item: CultureSiteSummaryResponse) {
    setActionLoading(true);
    try {
      const result = await submitCultureSiteReview(item.id, {});
      feedback.success(result.message || '文化场所已提交审核');
      refresh();
    } catch (error) {
      feedback.error(errorText(error, '提交审核失败'));
    } finally {
      setActionLoading(false);
    }
  }

  function archive(item: CultureSiteSummaryResponse) {
    let reason = '';
    Modal.confirm({
      title: can(item, 'request_archive') ? '申请归档正式文化场所' : '归档文化场所',
      content: <Input.TextArea autoFocus placeholder="请输入归档原因" onChange={event => { reason = event.target.value; }} />,
      okText: can(item, 'request_archive') ? '提交归档申请' : '确认归档',
      cancelText: '取消',
      async onOk() {
        if (!reason.trim()) throw new Error('请输入归档原因');
        const result = await archiveCultureSite(item.id, { reason: reason.trim() });
        feedback.success(result.message || '归档操作已提交');
        refresh();
      }
    });
  }

  async function remove(item: CultureSiteSummaryResponse) {
    setActionLoading(true);
    try {
      const reviewRequired = can(item, 'request_delete');
      const result = await deleteCultureSite(item.id);
      feedback.success(result.message || '删除操作已完成');
      if (!reviewRequired && selectedId === item.id) closeDetail();
      refresh();
    } catch (error) {
      feedback.error(errorText(error, '删除失败'));
    } finally {
      setActionLoading(false);
    }
  }

  async function previewAttachment(attachmentId: number) {
    try {
      const blob = await previewCultureSiteAttachment(attachmentId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      feedback.error(errorText(error, '附件预览失败'));
    }
  }

  async function downloadAttachment(attachmentId: number, fileName: string) {
    try {
      const blob = await downloadCultureSiteAttachment(attachmentId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      feedback.error(errorText(error, '附件下载失败'));
    }
  }

  function openTracking() {
    if (!clanId || !selectedId) return;
    const href = buildTrackingDeepLink(window.location.href, {
      clanId,
      targetType: 'culture_site',
      targetId: selectedId,
      reviewTaskId: detail?.review.reviewTaskId
    });
    window.history.pushState(window.history.state, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  function actionButtons(item: CultureSiteSummaryResponse) {
    return (
      <Space size={2} wrap onClick={event => event.stopPropagation()}>
        <Button type="link" onClick={() => openDetail(item)}>查看</Button>
        {can(item, 'update', 'request_update') ? <Button type="link" loading={actionLoading} onClick={() => openEdit(item)}>编辑</Button> : null}
        {can(item, 'submit_review') ? <Button type="link" loading={actionLoading} onClick={() => void submitReview(item)}>提交审核</Button> : null}
        {can(item, 'archive', 'request_archive') ? <Button type="link" onClick={() => archive(item)}>归档</Button> : null}
        {can(item, 'delete', 'request_delete') ? (
          <Popconfirm
            title={can(item, 'request_delete') ? '提交正式文化场所删除申请？' : '确认删除该文化场所？'}
            onConfirm={() => void remove(item)}
          >
            <Button danger type="link" loading={actionLoading}>删除</Button>
          </Popconfirm>
        ) : null}
      </Space>
    );
  }

  const columns: TableProps<CultureSiteSummaryResponse>['columns'] = [
    { title: '场所名称', dataIndex: 'name', key: 'name', width: 210, render: (value, item) => <Button type="link" onClick={() => openDetail(item)}>{value}</Button> },
    { title: '类型', dataIndex: 'siteType', key: 'siteType', width: 110, render: value => siteTypeLabel(value) },
    { title: '所属支派', key: 'branch', width: 150, render: (_, item) => item.scope.branchName || '宗族级' },
    { title: '地址', dataIndex: 'addressText', key: 'addressText', width: 260, render: value => value || <Text type="secondary">未披露/待补充</Text> },
    { title: '始建时期', dataIndex: 'foundedPeriod', key: 'foundedPeriod', width: 140, render: value => value || <Text type="secondary">待考证</Text> },
    { title: '可信度', dataIndex: 'confidenceLevel', key: 'confidenceLevel', width: 100, render: value => <Tag color={confidenceColor(value)}>{optionLabel(confidenceOptions, value)}</Tag> },
    { title: '来源/附件', key: 'evidence', width: 120, render: (_, item) => `${item.sourceCount} / ${item.attachmentCount}` },
    { title: '状态', dataIndex: 'dataStatus', key: 'dataStatus', width: 100, render: value => <Tag color={statusColor(value)}>{optionLabel(statusOptions, value)}</Tag> },
    { title: '最近更新', dataIndex: 'updatedAt', key: 'updatedAt', width: 170, render: value => formatDateTime(value) },
    { title: '操作', key: 'actions', fixed: 'right', width: 260, render: (_, item) => actionButtons(item) }
  ];

  if (editor) {
    return (
      <>
        
        <CultureSiteEditorPage
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
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      
      <Card title="文化场所查询" extra={<Button type="primary" disabled={!clanId} onClick={openCreate}>新增场所</Button>}>
        <Form form={searchForm} layout="vertical" onFinish={applySearch}>
          <Row gutter={[12, 0]}>
            <Col xs={24} md={8} xl={5}><Form.Item name="keyword" label="关键词"><Input allowClear placeholder="名称、摘要或历史说明" /></Form.Item></Col>
            <Col xs={24} md={8} xl={4}><Form.Item name="siteType" label="场所类型"><Select {...multiSelectProps} placeholder="可多选" options={siteTypeOptions} /></Form.Item></Col>
            <Col xs={24} md={8} xl={4}><Form.Item name="branchId" label="支派"><Select {...multiSelectProps} placeholder="可多选" showSearch optionFilterProp="label" options={branchOptions} /></Form.Item></Col>
            <Col xs={24} md={8} xl={4}><Form.Item name="addressText" label="地址"><Input allowClear /></Form.Item></Col>
            <Col xs={24} md={8} xl={3}><Form.Item name="dataStatus" label="状态"><Select {...multiSelectProps} placeholder="可多选" options={statusOptions} /></Form.Item></Col>
            <Col xs={24} md={8} xl={4}><Form.Item name="sort" label="排序"><Select options={siteSortOptions} /></Form.Item></Col>
            <Col xs={24}><Space><Button type="primary" htmlType="submit" loading={listLoading}>查询</Button><Button onClick={resetSearch}>重置</Button></Space></Col>
          </Row>
        </Form>
      </Card>

      <Card title="祠堂与文化场所">
        {refreshError ? <Alert type="warning" showIcon closable message="文化场所刷新失败，仍显示上次结果" description={refreshError} onClose={() => setRefreshError('')} style={{ marginBottom: 16 }} /> : null}
        {!clanId ? <Empty description="请选择宗族后查看文化场所" /> : null}
        {clanId && listForbidden ? <Result status="403" title="暂无权限" subTitle={listError || '当前账号无权查看该宗族文化场所'} /> : null}
        {clanId && listError && !listForbidden ? <Alert type="error" showIcon message="文化场所首次加载失败" description={listError} style={{ marginBottom: 16 }} /> : null}
        {clanId && !listForbidden ? (
          <Table<CultureSiteSummaryResponse>
            rowKey="id"
            size="middle"
            loading={listLoading}
            columns={columns}
            dataSource={items}
            scroll={{ x: 1700 }}
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
            locale={{ emptyText: '没有符合当前条件的文化场所' }}
          />
        ) : null}
      </Card>

      <Drawer open={Boolean(selectedId)} width={720} title={<Title level={4} style={{ margin: 0 }}>文化场所详情</Title>} loading={detailLoading} onClose={closeDetail}>
        {detailError ? <Alert type="error" showIcon message="文化场所详情加载失败" description={detailError} /> : null}
        {detail ? (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="场所名称">{detail.name}</Descriptions.Item>
              <Descriptions.Item label="类型">{siteTypeLabel(detail.siteType)}</Descriptions.Item>
              <Descriptions.Item label="所属支派">{detail.scope.branchName || '宗族级'}</Descriptions.Item>
              <Descriptions.Item label="关联人物">{detail.relatedPersonName || '未关联或姓名不可见'}</Descriptions.Item>
              <Descriptions.Item label="地址">{detail.addressText || '未披露/待补充'}</Descriptions.Item>
              <Descriptions.Item label="坐标">{detail.latitude != null && detail.longitude != null ? `${detail.latitude}, ${detail.longitude}` : '未披露/待补充'}</Descriptions.Item>
              <Descriptions.Item label="始建时期">{detail.foundedPeriod || '待考证'}</Descriptions.Item>
              <Descriptions.Item label="当前状态">{detail.currentStatus || '待补充'}</Descriptions.Item>
              <Descriptions.Item label="可信度">{optionLabel(confidenceOptions, detail.confidenceLevel)}</Descriptions.Item>
              <Descriptions.Item label="可见范围">{optionLabel(privacyOptions, detail.privacyLevel)}</Descriptions.Item>
              <Descriptions.Item label="数据状态">{optionLabel(statusOptions, detail.dataStatus)}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="摘要与历史说明"><Paragraph>{detail.summary || '暂无摘要'}</Paragraph><Paragraph>{detail.description || '暂无详细说明'}</Paragraph></Card>
            <Card size="small" title="来源证据">
              {detail.sources.length ? <List size="small" dataSource={detail.sources} renderItem={source => <List.Item><List.Item.Meta title={source.sourceName} description={source.excerpt || '来源摘录受限或尚未补录'} /></List.Item>} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚未绑定来源" />}
            </Card>
            <Card size="small" title="附件">
              {detail.attachments.length ? <List size="small" dataSource={detail.attachments} renderItem={attachment => <List.Item actions={[
                attachment.canPreview ? <Button key="preview" type="link" onClick={() => void previewAttachment(attachment.attachmentId)}>预览</Button> : null,
                attachment.canDownload ? <Button key="download" type="link" onClick={() => void downloadAttachment(attachment.attachmentId, attachment.fileName)}>下载</Button> : null
              ].filter(Boolean)}><List.Item.Meta title={attachment.fileName} description={attachment.contentType || '未知类型'} /></List.Item>} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可见附件" />}
            </Card>
            <Card size="small" title="审核与追踪">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text>审核状态：{detail.review.status || '尚未提交'}</Text>
                {detail.review.rejectedReason ? <Alert type="warning" showIcon message="驳回原因" description={detail.review.rejectedReason} /> : null}
                {traceError ? <Alert type="warning" showIcon message="完整追踪暂不可用" description={traceError} /> : null}
                <Text>可见历史事件：{trace?.timeline.length || 0}</Text>
                <Button onClick={openTracking}>打开完整追踪</Button>
              </Space>
              {trace?.timeline.length ? <Timeline style={{ marginTop: 16 }} items={trace.timeline.slice(0, 5).map(event => ({ children: `${event.title} · ${event.occurredAt || ''}` }))} /> : null}
            </Card>
            {selectedSummary ? actionButtons(selectedSummary) : null}
          </Space>
        ) : null}
      </Drawer>
    </Space>
  );
}
