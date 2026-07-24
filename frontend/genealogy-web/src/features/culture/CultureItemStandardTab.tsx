import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Button, Card, Col, Collapse, Descriptions, Drawer, Dropdown, Form, Input, List, Result, Row, Select, Skeleton, Space, Table, Tabs, Tag, Timeline, Typography } from 'antd';
import type { MenuProps, TableProps } from 'antd';
import type {
  CultureCategory,
  CultureDataStatus,
  CultureItemDetailResponse,
  CultureItemPage,
  CultureItemSummaryResponse,
  CulturePrivacyLevel
} from '../../shared/api/generated/culture-types';
import type { TrackingTraceDetailResponse } from '../../shared/api/generated/tracking-types';
import { ApiRequestError } from '../../shared/api/client';
import { TrackingLinkButton } from '../../shared/navigation/TrackingLinkButton';
import { CultureClanSelect } from './CultureClanSelect';
import { CultureGovernanceModal } from './CultureGovernanceModal';
import { CultureMultiSelect } from './CultureMultiSelect';
import { CultureSearchHeader } from './CultureSearchHeader';
import type { CultureGovernanceTarget } from './CultureGovernanceModal';
import { CultureItemEditorPage } from './CultureItemEditorPage';
import {
  buildCultureEditorLocation,
  confirmCultureEditorLeave,
  isSameCultureEditor,
  readCultureEditorLocation
} from './cultureEditorState';
import type { CultureEditorState } from './cultureEditorState';
import {
  archiveCultureItem,
  deleteCultureItem,
  downloadCultureAttachment,
  getCultureItem,
  getCultureTrace,
  listCultureBranches,
  listCultureItems,
  previewCultureAttachment,
  submitCultureItemReview
} from './cultureLibraryService';
import type { CultureBranchOption, CultureClanOption } from './cultureLibraryService';
import {
  booleanOptions,
  categoryOptions,
  confidenceColor,
  confidenceOptions,
  formatDateTime,
  formatFileSize,
  optionLabel,
  privacyColor,
  privacyOptions,
  sensitiveOptions,
  sortOptions,
  statusColor,
  statusOptions
} from './cultureOptions';
import { culturePrimaryAction } from './culturePagePattern';
import { buildCultureLocation, cultureSearchKey, defaultCultureSearch, readCultureLocation } from './cultureUrlState';
import type { CultureSearchState } from './cultureUrlState';
import type { CultureTabKey } from './cultureTabState';
import { QueryResultCard } from '../../shared/ui/QueryResultCards';

import { feedback } from '../../shared/ui/OperationFeedback';

import { PageFeedback } from '../../shared/ui/Feedback';

import { EmptyState } from '../../shared/ui/EmptyState';

const { Paragraph, Text, Title } = Typography;
type BooleanText = 'true' | 'false';

type SearchValues = {
  keyword?: string;
  category?: CultureCategory[];
  branchId?: number[];
  dataStatus?: CultureDataStatus[];
  privacyLevel?: CulturePrivacyLevel[];
  hasSource?: BooleanText[];
  featuredOnHome?: BooleanText[];
};

function errorText(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function statusOf(error: unknown) {
  return error instanceof ApiRequestError ? error.status : undefined;
}

function can(item: CultureItemSummaryResponse | CultureItemDetailResponse, ...actions: string[]) {
  return actions.some(action => item.allowedActions.includes(action));
}

function branchLabel(branch: CultureBranchOption) {
  return branch.branchName || branch.branchPath || '未命名支派';
}

function boolText(values?: boolean[]): BooleanText[] | undefined {
  return values?.map(value => String(value) as BooleanText);
}

function boolValues(values?: BooleanText[]): boolean[] | undefined {
  return values?.map(value => value === 'true');
}

function itemEditor(editor: CultureEditorState | null) {
  return editor?.target === 'item' ? editor : null;
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

export function CultureItemStandardTab({ clanId, clans, clansLoading, onClanChange, activeTab, onTabChange }: Props) {
  const initialLocation = useRef(readCultureLocation()).current;
  const initialEditor = useRef(itemEditor(readCultureEditorLocation().editor)).current;
  const previousClanId = useRef(clanId);
  const listRequest = useRef(0);
  const detailRequest = useRef(0);
  const visibleItems = useRef<CultureItemSummaryResponse[]>([]);
  const editorRef = useRef<CultureEditorState | null>(initialEditor);
  const editorHrefRef = useRef(initialEditor ? relativeHref() : '');
  const editorDirtyRef = useRef(false);
  
  const [searchForm] = Form.useForm<SearchValues>();
  const [search, setSearch] = useState<CultureSearchState>(initialLocation.search);
  const [branches, setBranches] = useState<CultureBranchOption[]>([]);
  const [items, setItems] = useState<CultureItemSummaryResponse[]>([]);
  const [page, setPage] = useState<CultureItemPage['page']>({ pageNo: 1, pageSize: 10, totalElements: 0, totalPages: 0 });
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [refreshError, setRefreshError] = useState('');
  const [listForbidden, setListForbidden] = useState(false);
  const [selectedId, setSelectedId] = useState<number | undefined>(initialLocation.selectedItemId);
  const [detail, setDetail] = useState<CultureItemDetailResponse | null>(null);
  const [trace, setTrace] = useState<TrackingTraceDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [detailStatus, setDetailStatus] = useState<number | undefined>();
  const [traceError, setTraceError] = useState('');
  const [editor, setEditor] = useState<CultureEditorState | null>(initialEditor);
  const [governanceTarget, setGovernanceTarget] = useState<CultureGovernanceTarget | null>(null);
  const [governanceItem, setGovernanceItem] = useState<CultureItemSummaryResponse | CultureItemDetailResponse | null>(null);
  const [governanceReason, setGovernanceReason] = useState('');
  const [governanceError, setGovernanceError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);

  const handleEditorDirtyChange = useCallback((dirty: boolean) => {
    editorDirtyRef.current = dirty;
  }, []);

  function buildLocation(nextSearch: CultureSearchState, nextSelected?: number, nextEditor: CultureEditorState | null = editorRef.current) {
    return buildCultureEditorLocation(buildCultureLocation(window.location.href, nextSearch, nextSelected), nextEditor);
  }

  function writeLocation(nextSearch: CultureSearchState, nextSelected?: number, mode: 'push' | 'replace' = 'push', nextEditor: CultureEditorState | null = editorRef.current) {
    const href = buildLocation(nextSearch, nextSelected, nextEditor);
    window.history[mode === 'push' ? 'pushState' : 'replaceState'](window.history.state, '', href);
    if (nextEditor) editorHrefRef.current = href;
  }

  function refresh() {
    setRefreshVersion(value => value + 1);
  }

  function openEditor(next: CultureEditorState) {
    editorDirtyRef.current = false;
    editorRef.current = next;
    setEditor(next);
    writeLocation(search, selectedId, 'push', next);
  }

  function closeEditor() {
    if (!confirmCultureEditorLeave(editorDirtyRef.current)) return;
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

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    searchForm.setFieldsValue({
      keyword: search.keyword,
      category: search.category,
      branchId: search.branchId,
      dataStatus: search.dataStatus,
      privacyLevel: search.privacyLevel,
      hasSource: boolText(search.hasSource),
      featuredOnHome: boolText(search.featuredOnHome)
    });
  }, [search, searchForm]);

  useEffect(() => {
    const onPopState = () => {
      const nextLocation = readCultureLocation();
      const nextEditor = itemEditor(readCultureEditorLocation().editor);
      if (editorRef.current && editorDirtyRef.current && !isSameCultureEditor(editorRef.current, nextEditor) && !confirmCultureEditorLeave(true)) {
        window.history.pushState(window.history.state, '', editorHrefRef.current || relativeHref());
        return;
      }
      editorDirtyRef.current = false;
      editorRef.current = nextEditor;
      setSearch(nextLocation.search);
      setSelectedId(nextLocation.selectedItemId);
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
    setSelectedId(undefined);
    setDetail(null);
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
      .catch(error => { if (active) feedback.error(errorText(error, '支派列表加载失败')); });
    return () => { active = false; };
  }, [clanId]);

  useEffect(() => {
    if (!clanId) {
      visibleItems.current = [];
      setItems([]);
      setPage({ pageNo: search.pageNo, pageSize: search.pageSize, totalElements: 0, totalPages: 0 });
      return;
    }
    const requestId = ++listRequest.current;
    const requestKey = cultureSearchKey(clanId, search);
    setListLoading(true);
    setListError('');
    setRefreshError('');
    setListForbidden(false);
    listCultureItems(clanId, search)
      .then(data => {
        if (requestId !== listRequest.current || requestKey !== cultureSearchKey(clanId, search)) return;
        visibleItems.current = data.items;
        setItems(data.items);
        setPage(data.page);
      })
      .catch(error => {
        if (requestId !== listRequest.current) return;
        const text = errorText(error, '文化资料列表加载失败');
        if (statusOf(error) === 403) {
          visibleItems.current = [];
          setItems([]);
          setPage({ pageNo: search.pageNo, pageSize: search.pageSize, totalElements: 0, totalPages: 0 });
          setListForbidden(true);
          setListError(text);
        } else if (visibleItems.current.length) {
          setRefreshError(text);
        } else {
          setItems([]);
          setPage({ pageNo: search.pageNo, pageSize: search.pageSize, totalElements: 0, totalPages: 0 });
          setListError(text);
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
    setDetailStatus(undefined);
    setTraceError('');
    setDetailLoading(true);
    Promise.allSettled([getCultureItem(selectedId), getCultureTrace(clanId, selectedId)])
      .then(([detailResult, traceResult]) => {
        if (requestId !== detailRequest.current) return;
        if (detailResult.status === 'fulfilled') setDetail(detailResult.value);
        else {
          setDetailError(errorText(detailResult.reason, '文化资料详情加载失败'));
          setDetailStatus(statusOf(detailResult.reason));
        }
        if (traceResult.status === 'fulfilled') setTrace(traceResult.value);
        else setTraceError(errorText(traceResult.reason, '完整追踪暂不可用'));
      })
      .finally(() => { if (requestId === detailRequest.current) setDetailLoading(false); });
  }, [clanId, selectedId, refreshVersion]);

  function applySearch(values: SearchValues) {
    const nextSearch: CultureSearchState = {
      ...search,
      keyword: values.keyword?.trim() || '',
      category: values.category?.length ? values.category : undefined,
      branchId: values.branchId?.length ? values.branchId : undefined,
      dataStatus: values.dataStatus?.length ? values.dataStatus : undefined,
      privacyLevel: values.privacyLevel?.length ? values.privacyLevel : undefined,
      hasSource: values.hasSource?.length ? boolValues(values.hasSource) : undefined,
      featuredOnHome: values.featuredOnHome?.length ? boolValues(values.featuredOnHome) : undefined,
      sort: search.sort || defaultCultureSearch.sort,
      pageNo: 1
    };
    setSearch(nextSearch);
    setSelectedId(undefined);
    writeLocation(nextSearch, undefined);
  }

  function resetSearch() {
    const nextSearch = { ...defaultCultureSearch, pageSize: search.pageSize };
    searchForm.resetFields();
    setSearch(nextSearch);
    setSelectedId(undefined);
    writeLocation(nextSearch, undefined);
  }

  function changeSort(sort: string) {
    const nextSearch = { ...search, sort, pageNo: 1 };
    setSearch(nextSearch);
    setSelectedId(undefined);
    writeLocation(nextSearch, undefined);
  }

  function openDetail(item: CultureItemSummaryResponse) {
    setSelectedId(item.id);
    writeLocation(search, item.id);
  }

  function closeDetail() {
    setSelectedId(undefined);
    setDetail(null);
    setTrace(null);
    writeLocation(search, undefined, 'replace');
  }

  function openGovernance(item: CultureItemSummaryResponse | CultureItemDetailResponse, kind: CultureGovernanceTarget['kind']) {
    setGovernanceItem(item);
    setGovernanceTarget({
      id: item.id,
      name: item.title,
      kind,
      reviewRequired: kind === 'archive'
        ? can(item, 'request_archive')
        : kind === 'delete' ? can(item, 'request_delete') : undefined
    });
    setGovernanceReason('');
    setGovernanceError('');
  }

  async function confirmGovernance() {
    if (!governanceTarget || !governanceItem || actionLoading) return;
    if (governanceTarget.kind === 'archive' && !governanceReason.trim()) {
      setGovernanceError('请填写归档原因');
      return;
    }
    setActionLoading(true);
    setGovernanceError('');
    try {
      const result = governanceTarget.kind === 'review'
        ? await submitCultureItemReview(governanceTarget.id, { comment: governanceReason.trim() || undefined })
        : governanceTarget.kind === 'archive'
          ? await archiveCultureItem(governanceTarget.id, { reason: governanceReason.trim() })
          : await deleteCultureItem(governanceTarget.id);
      feedback.success(result.message || '操作已完成');
      if (governanceTarget.kind === 'delete' && !governanceTarget.reviewRequired && selectedId === governanceTarget.id) closeDetail();
      setGovernanceTarget(null);
      setGovernanceItem(null);
      setGovernanceReason('');
      refresh();
    } catch (error) {
      setGovernanceError(errorText(error, '操作失败'));
    } finally {
      setActionLoading(false);
    }
  }

  async function previewAttachment(id: number) {
    try {
      const blob = await previewCultureAttachment(id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      feedback.error(errorText(error, '附件预览失败，仍可尝试下载'));
    }
  }

  async function downloadAttachment(id: number, fileName: string) {
    try {
      const blob = await downloadCultureAttachment(id);
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

  function rowActions(item: CultureItemSummaryResponse) {
    const more: MenuProps['items'] = [];
    if (can(item, 'submit_review')) more.push({ key: 'review', label: '提交审核' });
    if (can(item, 'archive', 'request_archive')) more.push({ key: 'archive', label: '归档' });
    if (can(item, 'delete', 'request_delete')) more.push({ key: 'delete', label: <Text type="danger">删除</Text> });
    return (
      <Space size={2} onClick={event => event.stopPropagation()}>
        <Button type="link" onClick={() => openDetail(item)}>查看</Button>
        {can(item, 'update', 'request_update') ? <Button type="link" onClick={() => openEditor({ target: 'item', mode: 'edit', id: item.id })}>编辑</Button> : null}
        {more.length ? <Dropdown menu={{ items: more, onClick: ({ key }) => openGovernance(item, key as CultureGovernanceTarget['kind']) }}><Button type="link">更多</Button></Dropdown> : null}
      </Space>
    );
  }

  const columns: TableProps<CultureItemSummaryResponse>['columns'] = [
    { title: '文化资料', dataIndex: 'title', key: 'title', width: 280, render: (_, item) => <Space direction="vertical" size={2}><Button type="link" className="culture-title-button" onClick={event => { event.stopPropagation(); openDetail(item); }}>{item.title}</Button><Text type="secondary" ellipsis>{item.summary || '暂无摘要'}</Text></Space> },
    { title: '分类', dataIndex: 'category', key: 'category', width: 110, render: value => <Tag>{optionLabel(categoryOptions, value)}</Tag> },
    { title: '所属范围', key: 'scope', width: 150, render: (_, item) => item.scope.branchName || item.scope.clanName },
    { title: '可信度', dataIndex: 'confidenceLevel', key: 'confidenceLevel', width: 100, render: value => <Tag color={confidenceColor(value)}>{optionLabel(confidenceOptions, value)}</Tag> },
    { title: '状态', dataIndex: 'dataStatus', key: 'dataStatus', width: 110, render: value => <Tag color={statusColor(value)}>{optionLabel(statusOptions, value)}</Tag> },
    { title: '可见范围', dataIndex: 'privacyLevel', key: 'privacyLevel', width: 130, render: value => <Tag color={privacyColor(value)}>{optionLabel(privacyOptions, value)}</Tag> },
    { title: '证据', key: 'evidence', width: 120, render: (_, item) => <Text type="secondary">来源 {item.sourceCount} · 附件 {item.attachmentCount}</Text> },
    { title: '最近更新', dataIndex: 'updatedAt', key: 'updatedAt', width: 170, render: value => formatDateTime(value) },
    { title: '操作', key: 'actions', fixed: 'right', width: 190, render: (_, item) => rowActions(item) }
  ];

  if (editor?.mode === 'edit' && clanId) {
    return <><CultureItemEditorPage clanId={clanId} editor={editor} branches={branches} onCancel={closeEditor} onSaved={editorSaved} onDirtyChange={handleEditorDirtyChange} /></>;
  }

  const selectedSummary = detail || items.find(item => item.id === selectedId) || null;
  const drawerMore: MenuProps['items'] = selectedSummary ? [
    can(selectedSummary, 'archive', 'request_archive') ? { key: 'archive', label: '归档' } : null,
    can(selectedSummary, 'delete', 'request_delete') ? { key: 'delete', label: <Text type="danger">删除</Text> } : null
  ].filter(Boolean) as MenuProps['items'] : [];

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      
      <Card size="small" className="culture-page-header culture-search-card" title="宗族文化">
        <CultureSearchHeader activeTab={activeTab} onTabChange={onTabChange} />
        <Form form={searchForm} layout="vertical" onFinish={applySearch}>
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12} lg={6}><Form.Item label="宗族"><CultureClanSelect value={clanId} clans={clans} loading={clansLoading} onChange={onClanChange} /></Form.Item></Col>
            <Col xs={24} sm={12} lg={6}><Form.Item name="category" label="分类"><CultureMultiSelect aria-label="分类" options={categoryOptions} /></Form.Item></Col>
            <Col xs={24} sm={12} lg={6}><Form.Item name="branchId" label="支派"><CultureMultiSelect aria-label="支派" options={branches.filter(branch => branch.id).map(branch => ({ value: Number(branch.id), label: branchLabel(branch) }))} /></Form.Item></Col>
            <Col xs={24} sm={12} lg={6}><Form.Item name="keyword" label="关键词"><Input allowClear placeholder="标题、摘要、时期或地点" /></Form.Item></Col>
          </Row>
          <Collapse
            ghost
            className="culture-more-filters"
            items={[{
              key: 'more',
              label: '更多筛选',
              children: (
                <Row gutter={[16, 0]}>
                  <Col xs={24} sm={12} lg={6}><Form.Item name="dataStatus" label="状态"><CultureMultiSelect aria-label="状态" options={statusOptions} /></Form.Item></Col>
                  <Col xs={24} sm={12} lg={6}><Form.Item name="privacyLevel" label="可见范围"><CultureMultiSelect aria-label="可见范围" options={privacyOptions} /></Form.Item></Col>
                  <Col xs={24} sm={12} lg={6}><Form.Item name="hasSource" label="已有来源"><CultureMultiSelect aria-label="已有来源" options={booleanOptions} /></Form.Item></Col>
                  <Col xs={24} sm={12} lg={6}><Form.Item name="featuredOnHome" label="首页精选"><CultureMultiSelect aria-label="首页精选" options={booleanOptions} /></Form.Item></Col>
                </Row>
              )
            }]}
          />
          <div className="culture-search-actions"><Space><Button onClick={resetSearch}>重置</Button><Button htmlType="submit" loading={listLoading}>查询</Button></Space></div>
        </Form>
      </Card>

      <QueryResultCard
        className="culture-result-card"
        extra={<Button type="primary" disabled={!clanId} onClick={() => openEditor({ target: 'item', mode: 'create' })}>{culturePrimaryAction(activeTab)}</Button>}
       total={page.totalElements} resultExtra={<Select aria-label="文化资料排序" className="culture-result-sort" value={search.sort} options={sortOptions} onChange={changeSort} />}>
        
        {refreshError ? <PageFeedback tone="warning" closable title="文化资料刷新失败，仍显示上次结果" description={refreshError} onClose={() => setRefreshError('')} style={{ marginBottom: 12 }} /> : null}
        {!clanId ? <EmptyState description="请选择宗族后浏览文化资料" /> : null}
        {clanId && listForbidden ? <Result status="403" title="暂无权限" subTitle={listError || '当前账号无权查看该宗族文化资料'} /> : null}
        {clanId && listError && !listForbidden ? <Result status="error" title="文化资料首次加载失败" subTitle={listError} extra={<Button onClick={refresh}>重新加载</Button>} /> : null}
        {clanId && !listForbidden && !listError ? (
          <Table<CultureItemSummaryResponse>
            rowKey="id"
            size="middle"
            loading={listLoading}
            columns={columns}
            dataSource={items}
            scroll={{ x: 1300 }}
            onRow={item => ({ onClick: () => openDetail(item), tabIndex: 0, onKeyDown: event => { if (event.key === 'Enter') openDetail(item); } })}
            pagination={{ current: page.pageNo, pageSize: page.pageSize, total: page.totalElements, showSizeChanger: true, pageSizeOptions: [10, 20, 50], showTotal: total => `共 ${total} 条`, onChange: (pageNo, pageSize) => { const next = { ...search, pageNo, pageSize }; setSearch(next); writeLocation(next, selectedId); } }}
            locale={{ emptyText: <EmptyState description="没有符合当前条件的文化资料"><Button onClick={resetSearch}>重置筛选</Button></EmptyState> }}
          />
        ) : null}
        
      </QueryResultCard>

      <Drawer
        open={Boolean(selectedId)}
        width={720}
        title={<Space><Title level={4} style={{ margin: 0 }}>{detail?.title || selectedSummary?.title || '文化资料详情'}</Title>{detail ? <Tag color={statusColor(detail.dataStatus)}>{optionLabel(statusOptions, detail.dataStatus)}</Tag> : null}</Space>}
        extra={selectedSummary ? <Space>{can(selectedSummary, 'update', 'request_update') ? <Button onClick={() => openEditor({ target: 'item', mode: 'edit', id: selectedSummary.id })}>编辑</Button> : null}{can(selectedSummary, 'submit_review') ? <Button type="primary" loading={actionLoading} onClick={() => openGovernance(selectedSummary, 'review')}>提交审核</Button> : null}{drawerMore?.length ? <Dropdown menu={{ items: drawerMore, onClick: ({ key }) => openGovernance(selectedSummary, key as CultureGovernanceTarget['kind']) }}><Button>更多</Button></Dropdown> : null}</Space> : null}
        onClose={closeDetail}
        destroyOnHidden
      >
        {detailLoading && !detail ? <Skeleton active paragraph={{ rows: 10 }} /> : null}
        {!detailLoading && detailError ? <Result status={detailStatus === 403 ? '403' : detailStatus === 404 ? '404' : 'error'} title={detailStatus === 403 ? '暂无权限' : detailStatus === 404 ? '资料不存在' : '详情加载失败'} subTitle={detailError} extra={<Button onClick={refresh}>重新加载</Button>} /> : null}
        {detail ? <Tabs items={[
          { key: 'basic', label: '基本信息', children: <Space direction="vertical" size="large" style={{ width: '100%' }}><Space wrap><Tag>{optionLabel(categoryOptions, detail.category)}</Tag><Tag color={privacyColor(detail.privacyLevel)}>{optionLabel(privacyOptions, detail.privacyLevel)}</Tag><Tag color={confidenceColor(detail.confidenceLevel)}>可信度：{optionLabel(confidenceOptions, detail.confidenceLevel)}</Tag></Space><Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}><Descriptions.Item label="所属宗族">{detail.scope.clanName}</Descriptions.Item><Descriptions.Item label="所属支派">{detail.scope.branchName || '宗族级资料'}</Descriptions.Item><Descriptions.Item label="历史时期">{detail.historicalPeriod || '待维护'}</Descriptions.Item><Descriptions.Item label="相关地点">{detail.locationText || '待维护'}</Descriptions.Item><Descriptions.Item label="敏感级别">{optionLabel(sensitiveOptions, detail.sensitiveLevel)}</Descriptions.Item><Descriptions.Item label="最近更新">{formatDateTime(detail.updatedAt)}</Descriptions.Item></Descriptions><div><Title level={5}>摘要</Title><Paragraph>{detail.summary || '暂无摘要'}</Paragraph></div><div><Title level={5}>正文</Title><Paragraph className="culture-detail-content">{detail.content || '暂无正文或当前响应未返回正文'}</Paragraph></div></Space> },
          { key: 'evidence', label: '来源与附件', children: <Space direction="vertical" size="large" style={{ width: '100%' }}><List bordered header={`来源证据（${detail.sources.length}）`} dataSource={detail.sources} locale={{ emptyText: '尚未绑定可见来源' }} renderItem={source => <List.Item><List.Item.Meta title={source.sourceName} description={source.excerpt || '未返回可见摘录'} /></List.Item>} /><List bordered header={`附件（${detail.attachments.length}）`} dataSource={detail.attachments} locale={{ emptyText: '尚无可见附件' }} renderItem={attachment => <List.Item actions={[attachment.canPreview ? <Button key="preview" type="link" onClick={() => void previewAttachment(attachment.attachmentId)}>预览</Button> : null, attachment.canDownload ? <Button key="download" type="link" onClick={() => void downloadAttachment(attachment.attachmentId, attachment.fileName)}>下载</Button> : null].filter(Boolean)}><List.Item.Meta title={attachment.fileName} description={`${attachment.contentType || '未知类型'} · ${formatFileSize(attachment.fileSize)}`} /></List.Item>} /></Space> },
          { key: 'history', label: '审核与追踪', children: <Space direction="vertical" size="large" style={{ width: '100%' }}><Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}><Descriptions.Item label="审核状态">{detail.review.status || '暂无审核任务'}</Descriptions.Item><Descriptions.Item label="提交人">{detail.review.submitterName || '未返回'}</Descriptions.Item><Descriptions.Item label="审核人">{detail.review.reviewerName || '待分配'}</Descriptions.Item><Descriptions.Item label="处理时间">{formatDateTime(detail.review.reviewedAt)}</Descriptions.Item><Descriptions.Item label="驳回原因" span={2}>{detail.review.rejectedReason || '-'}</Descriptions.Item></Descriptions>{traceError ? <PageFeedback tone="warning" title="追踪局部加载失败" description={traceError} /> : null}{trace ? <Timeline items={trace.timeline.slice(0, 8).map(event => ({ children: `${event.title} · ${formatDateTime(event.occurredAt)}` }))} /> : !traceError ? <Skeleton active paragraph={{ rows: 4 }} /> : null}<TrackingLinkButton clanId={clanId} targetType="culture_item" targetId={detail.id} reviewTaskId={detail.review.reviewTaskId} label="打开完整追踪" /></Space> }
        ]} /> : null}
      </Drawer>

      {editor?.mode === 'create' && clanId ? (
        <Drawer open width={720} title="新增文化资料" className="culture-create-drawer" onClose={closeEditor} destroyOnHidden>
          <CultureItemEditorPage clanId={clanId} editor={editor} branches={branches} onCancel={closeEditor} onSaved={editorSaved} onDirtyChange={handleEditorDirtyChange} />
        </Drawer>
      ) : null}
      <CultureGovernanceModal target={governanceTarget} reason={governanceReason} loading={actionLoading} error={governanceError} onReasonChange={setGovernanceReason} onCancel={() => { if (!actionLoading) setGovernanceTarget(null); }} onConfirm={() => void confirmGovernance()} />
    </Space>
  );
}
