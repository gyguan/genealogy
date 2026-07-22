import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
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
import type { CultureDataStatus, CultureSiteDetailResponse, CultureSiteSummaryResponse, CultureSiteType } from '../../shared/api/generated/culture-types';
import type { TrackingTraceDetailResponse } from '../../shared/api/generated/tracking-types';
import { ApiRequestError } from '../../shared/api/client';
import { buildTrackingDeepLink } from '../../shared/navigation/trackingDeepLink.js';
import { CultureClanSelect } from './CultureClanSelect';
import { CultureGovernanceModal } from './CultureGovernanceModal';
import { CultureMultiSelect } from './CultureMultiSelect';
import { CultureSearchHeader } from './CultureSearchHeader';
import type { CultureGovernanceTarget } from './CultureGovernanceModal';
import { CultureSiteEditorPage } from './CultureSiteEditorPage';
import { buildCultureEditorLocation, confirmCultureEditorLeave, isSameCultureEditor, readCultureEditorLocation } from './cultureEditorState';
import type { CultureEditorState } from './cultureEditorState';
import { confidenceColor, confidenceOptions, formatDateTime, optionLabel, privacyOptions, statusColor, statusOptions } from './cultureOptions';
import { listCultureBranches } from './cultureLibraryService';
import type { CultureBranchOption, CultureClanOption } from './cultureLibraryService';
import { archiveCultureSite, deleteCultureSite, downloadCultureSiteAttachment, getCultureSite, getCultureSiteTrace, listCultureSites, previewCultureSiteAttachment, submitCultureSiteReview } from './cultureSiteService';
import { culturePrimaryAction } from './culturePagePattern';
import { buildCultureSiteLocation, cultureSiteSearchKey, defaultCultureSiteSearch, readCultureSiteLocation } from './cultureSiteUrlState';
import type { CultureSiteTabSearchState } from './cultureSiteUrlState';
import type { CultureTabKey } from './cultureTabState';
import { QueryResultCard } from '../../shared/ui/QueryResultCards';

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

type SearchValues = {
  keyword?: string;
  siteType?: CultureSiteType[];
  branchId?: number[];
  addressText?: string;
  currentStatus?: string;
  dataStatus?: CultureDataStatus[];
};

function errorText(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
function statusOf(error: unknown) {
  return error instanceof ApiRequestError ? error.status : undefined;
}
function siteTypeLabel(value?: string | null) {
  return siteTypeOptions.find(option => option.value === value)?.label || '其他';
}
function can(item: CultureSiteSummaryResponse | CultureSiteDetailResponse, ...actions: string[]) {
  return actions.some(action => item.allowedActions.includes(action));
}
function siteEditor(editor: CultureEditorState | null) {
  return editor?.target === 'site' ? editor : null;
}
function relativeHref() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

type Props = {
  clanId?: string;
  clans: CultureClanOption[];
  clansLoading: boolean;
  onClanChange: (clanId: string) => void;
  activeTab: CultureTabKey;
  onTabChange: (tab: string) => void;
};

export function CultureSiteStandardTab({ clanId, clans, clansLoading, onClanChange, activeTab, onTabChange }: Props) {
  const initialLocation = useRef(readCultureSiteLocation()).current;
  const initialEditor = useRef(siteEditor(readCultureEditorLocation().editor)).current;
  const previousClanId = useRef(clanId);
  const listRequest = useRef(0);
  const detailRequest = useRef(0);
  const visibleItems = useRef<CultureSiteSummaryResponse[]>([]);
  const editorRef = useRef<CultureEditorState | null>(initialEditor);
  const editorHrefRef = useRef(initialEditor ? relativeHref() : '');
  const editorDirtyRef = useRef(false);
  const [messageApi, messageContext] = message.useMessage();
  const [searchForm] = Form.useForm<SearchValues>();
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
  const [detailStatus, setDetailStatus] = useState<number | undefined>();
  const [traceError, setTraceError] = useState('');
  const [editor, setEditor] = useState<CultureEditorState | null>(initialEditor);
  const [governanceTarget, setGovernanceTarget] = useState<CultureGovernanceTarget | null>(null);
  const [governanceItem, setGovernanceItem] = useState<CultureSiteSummaryResponse | CultureSiteDetailResponse | null>(null);
  const [governanceReason, setGovernanceReason] = useState('');
  const [governanceError, setGovernanceError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);

  const branchOptions = useMemo(() => branches.filter(branch => branch.id).map(branch => ({ value: Number(branch.id), label: branch.name })), [branches]);
  const handleEditorDirtyChange = useCallback((dirty: boolean) => { editorDirtyRef.current = dirty; }, []);

  function buildLocation(nextSearch: CultureSiteTabSearchState, nextSelected?: number, nextEditor: CultureEditorState | null = editorRef.current) {
    return buildCultureEditorLocation(buildCultureSiteLocation(window.location.href, nextSearch, nextSelected), nextEditor);
  }
  function writeLocation(nextSearch: CultureSiteTabSearchState, nextSelected?: number, mode: 'push' | 'replace' = 'push', nextEditor: CultureEditorState | null = editorRef.current) {
    const href = buildLocation(nextSearch, nextSelected, nextEditor);
    window.history[mode === 'push' ? 'pushState' : 'replaceState'](window.history.state, '', href);
    if (nextEditor) editorHrefRef.current = href;
  }
  function refresh() { setRefreshVersion(value => value + 1); }

  useEffect(() => { editorRef.current = editor; }, [editor]);
  useEffect(() => {
    searchForm.setFieldsValue({ keyword: search.keyword || undefined, siteType: search.siteType, branchId: search.branchId, addressText: search.addressText || undefined, currentStatus: search.currentStatus || undefined, dataStatus: search.dataStatus });
  }, [search, searchForm]);
  useEffect(() => {
    const onPopState = () => {
      const nextLocation = readCultureSiteLocation();
      const nextEditor = siteEditor(readCultureEditorLocation().editor);
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
    const requestKey = cultureSiteSearchKey(clanId, search);
    setListLoading(true); setListError(''); setRefreshError(''); setListForbidden(false);
    listCultureSites(clanId, search)
      .then(data => { if (requestId === listRequest.current && requestKey === cultureSiteSearchKey(clanId, search)) { visibleItems.current = data.items; setItems(data.items); setTotal(data.page.totalElements); } })
      .catch(error => {
        if (requestId !== listRequest.current) return;
        const text = errorText(error, '文化场所加载失败');
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
    Promise.allSettled([getCultureSite(selectedId), getCultureSiteTrace(clanId, selectedId)])
      .then(([detailResult, traceResult]) => {
        if (requestId !== detailRequest.current) return;
        if (detailResult.status === 'fulfilled') setDetail(detailResult.value);
        else { setDetailError(errorText(detailResult.reason, '文化场所详情加载失败')); setDetailStatus(statusOf(detailResult.reason)); }
        if (traceResult.status === 'fulfilled') setTrace(traceResult.value);
        else setTraceError(errorText(traceResult.reason, '完整追踪暂不可用'));
      })
      .finally(() => { if (requestId === detailRequest.current) setDetailLoading(false); });
  }, [clanId, selectedId, refreshVersion]);

  function applySearch(values: SearchValues) {
    const next: CultureSiteTabSearchState = { ...search, keyword: values.keyword?.trim() || '', siteType: values.siteType, branchId: values.branchId, addressText: values.addressText?.trim() || '', currentStatus: values.currentStatus?.trim() || '', dataStatus: values.dataStatus, sort: search.sort || defaultCultureSiteSearch.sort, pageNo: 1 };
    setSearch(next); setSelectedId(undefined); writeLocation(next, undefined);
  }
  function resetSearch() { const next = { ...defaultCultureSiteSearch, pageSize: search.pageSize }; searchForm.resetFields(); setSearch(next); setSelectedId(undefined); writeLocation(next, undefined); }
  function changeSort(sort: string) { const next = { ...search, sort, pageNo: 1 }; setSearch(next); setSelectedId(undefined); writeLocation(next, undefined); }
  function openDetail(item: CultureSiteSummaryResponse) { setSelectedId(item.id); writeLocation(search, item.id); }
  function closeDetail() { setSelectedId(undefined); setDetail(null); setTrace(null); writeLocation(search, undefined, 'replace'); }
  function openEditor(nextEditor: CultureEditorState) { editorDirtyRef.current = false; editorRef.current = nextEditor; setEditor(nextEditor); writeLocation(search, selectedId, 'push', nextEditor); }
  function closeEditor() { if (!confirmCultureEditorLeave(editorDirtyRef.current)) return; editorDirtyRef.current = false; editorRef.current = null; setEditor(null); writeLocation(search, selectedId, 'replace', null); }
  function editorSaved(id: number) { editorDirtyRef.current = false; editorRef.current = null; setEditor(null); setSelectedId(id); writeLocation(search, id, 'replace', null); refresh(); }

  function openGovernance(item: CultureSiteSummaryResponse | CultureSiteDetailResponse, kind: CultureGovernanceTarget['kind']) {
    setGovernanceItem(item);
    setGovernanceTarget({ id: item.id, name: item.name, kind, reviewRequired: kind === 'archive' ? can(item, 'request_archive') : kind === 'delete' ? can(item, 'request_delete') : undefined });
    setGovernanceReason(''); setGovernanceError('');
  }
  async function confirmGovernance() {
    if (!governanceTarget || !governanceItem || actionLoading) return;
    if (governanceTarget.kind === 'archive' && !governanceReason.trim()) { setGovernanceError('请填写归档原因'); return; }
    setActionLoading(true); setGovernanceError('');
    try {
      const result = governanceTarget.kind === 'review'
        ? await submitCultureSiteReview(governanceTarget.id, { comment: governanceReason.trim() || undefined })
        : governanceTarget.kind === 'archive'
          ? await archiveCultureSite(governanceTarget.id, { reason: governanceReason.trim() })
          : await deleteCultureSite(governanceTarget.id);
      messageApi.success(result.message || '操作已完成');
      if (governanceTarget.kind === 'delete' && !governanceTarget.reviewRequired && selectedId === governanceTarget.id) closeDetail();
      setGovernanceTarget(null); setGovernanceItem(null); setGovernanceReason(''); refresh();
    } catch (error) { setGovernanceError(errorText(error, statusOf(error) === 409 ? '对象状态已变化，请刷新后重试' : '操作失败')); }
    finally { setActionLoading(false); }
  }
  async function previewAttachment(id: number) {
    try {
      const blob = await previewCultureSiteAttachment(id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) { messageApi.error(errorText(error, '附件预览失败，仍可尝试下载')); }
  }
  async function downloadAttachment(id: number, fileName: string) {
    try {
      const blob = await downloadCultureSiteAttachment(id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = fileName; anchor.click(); URL.revokeObjectURL(url);
    } catch (error) { messageApi.error(errorText(error, '附件下载失败')); }
  }
  function openTracking() {
    if (!clanId || !selectedId) return;
    const href = buildTrackingDeepLink(window.location.href, { clanId, targetType: 'culture_site', targetId: selectedId, reviewTaskId: detail?.review.reviewTaskId });
    window.history.pushState(window.history.state, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  function rowActions(item: CultureSiteSummaryResponse) {
    const more: MenuProps['items'] = [];
    if (can(item, 'submit_review')) more.push({ key: 'review', label: '提交审核' });
    if (can(item, 'archive', 'request_archive')) more.push({ key: 'archive', label: '归档' });
    if (can(item, 'delete', 'request_delete')) more.push({ key: 'delete', label: <Text type="danger">删除</Text> });
    return <Space size={2} onClick={event => event.stopPropagation()}><Button type="link" onClick={() => openDetail(item)}>查看</Button>{can(item, 'update', 'request_update') ? <Button type="link" onClick={() => openEditor({ target: 'site', mode: 'edit', id: item.id })}>编辑</Button> : null}{more.length ? <Dropdown menu={{ items: more, onClick: ({ key }) => openGovernance(item, key as CultureGovernanceTarget['kind']) }}><Button type="link">更多</Button></Dropdown> : null}</Space>;
  }
  const columns: TableProps<CultureSiteSummaryResponse>['columns'] = [
    { title: '场所名称', dataIndex: 'name', key: 'name', width: 210, render: (value, item) => <Button type="link" onClick={event => { event.stopPropagation(); openDetail(item); }}>{value}</Button> },
    { title: '类型', dataIndex: 'siteType', key: 'siteType', width: 110, render: value => siteTypeLabel(value) },
    { title: '所属支派', key: 'branch', width: 150, render: (_, item) => item.scope.branchName || '宗族级' },
    { title: '地址', dataIndex: 'addressText', key: 'addressText', width: 260, render: value => value || <Text type="secondary">未披露/待补充</Text> },
    { title: '始建时期', dataIndex: 'foundedPeriod', key: 'foundedPeriod', width: 140, render: value => value || <Text type="secondary">待考证</Text> },
    { title: '可信度', dataIndex: 'confidenceLevel', key: 'confidenceLevel', width: 100, render: value => <Tag color={confidenceColor(value)}>{optionLabel(confidenceOptions, value)}</Tag> },
    { title: '来源/附件', key: 'evidence', width: 120, render: (_, item) => `${item.sourceCount} / ${item.attachmentCount}` },
    { title: '状态', dataIndex: 'dataStatus', key: 'dataStatus', width: 100, render: value => <Tag color={statusColor(value)}>{optionLabel(statusOptions, value)}</Tag> },
    { title: '最近更新', dataIndex: 'updatedAt', key: 'updatedAt', width: 170, render: value => formatDateTime(value) },
    { title: '操作', key: 'actions', fixed: 'right', width: 190, render: (_, item) => rowActions(item) }
  ];

  if (editor?.mode === 'edit' && clanId) return <>{messageContext}<CultureSiteEditorPage clanId={clanId} editor={editor} branches={branches} onCancel={closeEditor} onSaved={editorSaved} onDirtyChange={handleEditorDirtyChange} /></>;

  const selectedSummary = detail || items.find(item => item.id === selectedId) || null;
  const drawerMore: MenuProps['items'] = selectedSummary ? [can(selectedSummary, 'archive', 'request_archive') ? { key: 'archive', label: '归档' } : null, can(selectedSummary, 'delete', 'request_delete') ? { key: 'delete', label: <Text type="danger">删除</Text> } : null].filter(Boolean) as MenuProps['items'] : [];

  return <Space direction="vertical" size="middle" style={{ width: '100%' }}>
    {messageContext}
    <Card size="small" className="culture-page-header culture-search-card" title="宗族文化">
      <CultureSearchHeader activeTab={activeTab} onTabChange={onTabChange} />
      <Form form={searchForm} layout="vertical" onFinish={applySearch}>
        <Row gutter={[16, 0]}>
          <Col xs={24} sm={12} lg={6}><Form.Item label="宗族"><CultureClanSelect value={clanId} clans={clans} loading={clansLoading} onChange={onClanChange} /></Form.Item></Col>
          <Col xs={24} sm={12} lg={6}><Form.Item name="siteType" label="场所类型"><CultureMultiSelect aria-label="场所类型" options={siteTypeOptions} /></Form.Item></Col>
          <Col xs={24} sm={12} lg={6}><Form.Item name="branchId" label="支派"><CultureMultiSelect aria-label="支派" options={branchOptions} /></Form.Item></Col>
          <Col xs={24} sm={12} lg={6}><Form.Item name="keyword" label="关键词"><Input allowClear placeholder="名称、摘要或历史说明" /></Form.Item></Col>
        </Row>
        <Collapse ghost className="culture-more-filters" items={[{ key: 'more', label: '更多筛选', children: <Row gutter={[16, 0]}><Col xs={24} sm={12} lg={6}><Form.Item name="addressText" label="地址"><Input allowClear /></Form.Item></Col><Col xs={24} sm={12} lg={6}><Form.Item name="currentStatus" label="当前状态"><Input allowClear /></Form.Item></Col><Col xs={24} sm={12} lg={6}><Form.Item name="dataStatus" label="状态"><CultureMultiSelect aria-label="状态" options={statusOptions} /></Form.Item></Col></Row> }]} />
        <div className="culture-search-actions"><Space><Button onClick={resetSearch}>重置</Button><Button htmlType="submit" loading={listLoading}>查询</Button></Space></div>
      </Form>
    </Card>
    <QueryResultCard className="culture-result-card" extra={<Button type="primary" disabled={!clanId} onClick={() => openEditor({ target: 'site', mode: 'create' })}>{culturePrimaryAction(activeTab)}</Button>} total={total} businessTitle="文化场所" businessExtra={<Select aria-label="文化场所排序" className="culture-result-sort" value={search.sort} options={siteSortOptions} onChange={changeSort} />} businessClassName="culture-result-sort">
      
      {refreshError ? <Alert type="warning" showIcon closable message="文化场所刷新失败，仍显示上次结果" description={refreshError} onClose={() => setRefreshError('')} style={{ marginBottom: 16 }} /> : null}
      {!clanId ? <Empty description="请选择宗族后查看文化场所" /> : null}
      {clanId && listForbidden ? <Result status="403" title="暂无权限" subTitle={listError || '当前账号无权查看该宗族文化场所'} /> : null}
      {clanId && listError && !listForbidden ? <Result status="error" title="文化场所首次加载失败" subTitle={listError} extra={<Button onClick={refresh}>重新加载</Button>} /> : null}
      {clanId && !listForbidden && !listError ? <Table<CultureSiteSummaryResponse> rowKey="id" size="middle" loading={listLoading} columns={columns} dataSource={items} scroll={{ x: 1300 }} onRow={item => ({ onClick: () => openDetail(item), tabIndex: 0, onKeyDown: event => { if (event.key === 'Enter') openDetail(item); } })} pagination={{ current: search.pageNo, pageSize: search.pageSize, total, showSizeChanger: true, pageSizeOptions: [10, 20, 50], showTotal: value => `共 ${value} 条`, onChange: (pageNo, pageSize) => { const next = { ...search, pageNo, pageSize }; setSearch(next); writeLocation(next, selectedId); } }} locale={{ emptyText: <Empty description="没有符合当前条件的文化场所"><Button onClick={resetSearch}>重置筛选</Button></Empty> }} /> : null}
      
    </QueryResultCard>
    <Drawer open={Boolean(selectedId)} width={720} title={<Space><Title level={4} style={{ margin: 0 }}>{detail?.name || selectedSummary?.name || '文化场所详情'}</Title>{detail ? <Tag color={statusColor(detail.dataStatus)}>{optionLabel(statusOptions, detail.dataStatus)}</Tag> : null}</Space>} extra={selectedSummary ? <Space>{can(selectedSummary, 'update', 'request_update') ? <Button onClick={() => openEditor({ target: 'site', mode: 'edit', id: selectedSummary.id })}>编辑</Button> : null}{can(selectedSummary, 'submit_review') ? <Button type="primary" onClick={() => openGovernance(selectedSummary, 'review')}>提交审核</Button> : null}{drawerMore?.length ? <Dropdown menu={{ items: drawerMore, onClick: ({ key }) => openGovernance(selectedSummary, key as CultureGovernanceTarget['kind']) }}><Button>更多</Button></Dropdown> : null}</Space> : null} onClose={closeDetail} destroyOnHidden>
      {detailLoading && !detail ? <Skeleton active paragraph={{ rows: 10 }} /> : null}
      {!detailLoading && detailError ? <Result status={detailStatus === 403 ? '403' : detailStatus === 404 ? '404' : 'error'} title={detailStatus === 403 ? '暂无权限' : detailStatus === 404 ? '文化场所不存在' : '详情加载失败'} subTitle={detailError} extra={<Button onClick={refresh}>重新加载</Button>} /> : null}
      {detail ? <Tabs items={[
        { key: 'basic', label: '基本信息', children: <Space direction="vertical" size="middle" style={{ width: '100%' }}><Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}><Descriptions.Item label="场所名称">{detail.name}</Descriptions.Item><Descriptions.Item label="类型">{siteTypeLabel(detail.siteType)}</Descriptions.Item><Descriptions.Item label="所属支派">{detail.scope.branchName || '宗族级'}</Descriptions.Item><Descriptions.Item label="关联人物">{detail.relatedPersonName || '未关联或姓名不可见'}</Descriptions.Item><Descriptions.Item label="地址" span={2}>{detail.addressText || '未披露/待补充'}</Descriptions.Item><Descriptions.Item label="坐标">{detail.latitude != null && detail.longitude != null ? `${detail.latitude}, ${detail.longitude}` : '未披露/待补充'}</Descriptions.Item><Descriptions.Item label="始建时期">{detail.foundedPeriod || '待考证'}</Descriptions.Item><Descriptions.Item label="当前状态">{detail.currentStatus || '待补充'}</Descriptions.Item><Descriptions.Item label="可见范围">{optionLabel(privacyOptions, detail.privacyLevel)}</Descriptions.Item></Descriptions><Card size="small" title="摘要与历史说明"><Paragraph>{detail.summary || '暂无摘要'}</Paragraph><Paragraph>{detail.description || '暂无详细说明'}</Paragraph></Card></Space> },
        { key: 'evidence', label: '来源与附件', children: <Space direction="vertical" size="middle" style={{ width: '100%' }}><List bordered header={`来源证据（${detail.sources.length}）`} dataSource={detail.sources} locale={{ emptyText: '尚未绑定来源' }} renderItem={source => <List.Item><List.Item.Meta title={source.sourceName} description={source.excerpt || '来源摘录受限或尚未补录'} /></List.Item>} /><List bordered header={`附件（${detail.attachments.length}）`} dataSource={detail.attachments} locale={{ emptyText: '暂无可见附件' }} renderItem={attachment => <List.Item actions={[attachment.canPreview ? <Button key="preview" type="link" onClick={() => void previewAttachment(attachment.attachmentId)}>预览</Button> : null, attachment.canDownload ? <Button key="download" type="link" onClick={() => void downloadAttachment(attachment.attachmentId, attachment.fileName)}>下载</Button> : null].filter(Boolean)}><List.Item.Meta title={attachment.fileName} description={attachment.contentType || '未知类型'} /></List.Item>} /></Space> },
        { key: 'history', label: '审核与追踪', children: <Space direction="vertical" size="middle" style={{ width: '100%' }}><Descriptions bordered size="small" column={1}><Descriptions.Item label="审核状态">{detail.review.status || '尚未提交'}</Descriptions.Item><Descriptions.Item label="驳回原因">{detail.review.rejectedReason || '-'}</Descriptions.Item></Descriptions>{traceError ? <Alert type="warning" showIcon message="追踪局部加载失败" description={traceError} /> : null}{trace ? <Timeline items={trace.timeline.slice(0, 8).map(event => ({ children: `${event.title} · ${formatDateTime(event.occurredAt)}` }))} /> : !traceError ? <Skeleton active paragraph={{ rows: 4 }} /> : null}<Button onClick={openTracking}>打开完整追踪</Button></Space> }
      ]} /> : null}
    </Drawer>
    {editor?.mode === 'create' && clanId ? <Drawer open width={720} title="新增文化场所" className="culture-create-drawer" onClose={closeEditor} destroyOnHidden><CultureSiteEditorPage clanId={clanId} editor={editor} branches={branches} onCancel={closeEditor} onSaved={editorSaved} onDirtyChange={handleEditorDirtyChange} /></Drawer> : null}
    <CultureGovernanceModal target={governanceTarget} reason={governanceReason} loading={actionLoading} error={governanceError} onReasonChange={setGovernanceReason} onCancel={() => { if (!actionLoading) setGovernanceTarget(null); }} onConfirm={() => void confirmGovernance()} />
  </Space>;
}
