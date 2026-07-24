import {
  useEffect,
  useMemo,
  useRef,
  useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
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
  CultureSiteCreateRequest,
  CultureSiteDetailResponse,
  CultureSiteSummaryResponse,
  CultureSiteType,
  CultureSiteUpdateRequest
} from '../../shared/api/generated/culture-types';
import type { TrackingTraceDetailResponse } from '../../shared/api/generated/tracking-types';
import { ApiRequestError } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { buildTrackingDeepLink } from '../../shared/navigation/trackingDeepLink.js';
import {
  confidenceColor,
  confidenceOptions,
  formatDateTime,
  optionLabel,
  privacyOptions,
  sensitiveOptions,
  statusColor,
  statusOptions
} from './cultureOptions';
import { listCultureBranches } from './cultureLibraryService';
import type { CultureBranchOption } from './cultureLibraryService';
import {
  archiveCultureSite,
  createCultureSite,
  deleteCultureSite,
  downloadCultureSiteAttachment,
  getCultureSite,
  getCultureSiteTrace,
  listCultureSites,
  previewCultureSiteAttachment,
  submitCultureSiteReview,
  updateCultureSite
} from './cultureSiteService';
import {
  buildCultureSiteLocation,
  cultureSiteSearchKey,
  defaultCultureSiteSearch,
  readCultureSiteLocation
} from './cultureSiteUrlState';
import type { CultureSiteTabSearchState } from './cultureSiteUrlState';

import { feedback } from '../../shared/ui/OperationFeedback';

import { PageFeedback } from '../../shared/ui/Feedback';

const { Paragraph, Text, Title } = Typography;

const siteTypes: Array<{ value: CultureSiteType; label: string }> = [
  { value: 'ancestral_hall', label: '祠堂' },
  { value: 'ancestral_home', label: '祖居' },
  { value: 'cemetery', label: '墓园' },
  { value: 'memorial', label: '纪念设施' },
  { value: 'other', label: '其他场所' }
];
const sortOptions = [
  { value: 'sortOrder,asc', label: '业务顺序' },
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
type SiteFormValues = CultureSiteCreateRequest & { version?: number };

function errorText(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function forbidden(error: unknown) {
  return error instanceof ApiRequestError && error.status === 403;
}

function can(item: CultureSiteSummaryResponse, ...actions: string[]) {
  return actions.some(action => item.allowedActions.includes(action));
}

function siteTypeLabel(value: string) {
  return siteTypes.find(item => item.value === value)?.label || value;
}

export function CultureSiteTab() {
  const workspace = useWorkspace();
  const clanId = workspace.clanId;
  const initialLocation = useRef(readCultureSiteLocation()).current;
  const previousClanId = useRef(clanId);
  const listRequest = useRef(0);
  const detailRequest = useRef(0);
  const visibleItems = useRef<CultureSiteSummaryResponse[]>([]);
  
  const [searchForm] = Form.useForm<SearchFormValues>();
  const [editForm] = Form.useForm<SiteFormValues>();
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
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CultureSiteDetailResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);

  const branchOptions = useMemo(
    () => branches.filter(branch => branch.id).map(branch => ({ value: Number(branch.id), label: branch.name })),
    [branches]
  );

  function writeLocation(nextSearch: CultureSiteTabSearchState, nextSelected?: number, mode: 'push' | 'replace' = 'push') {
    const href = buildCultureSiteLocation(window.location.href, nextSearch, nextSelected);
    window.history[mode === 'push' ? 'pushState' : 'replaceState'](window.history.state, '', href);
  }

  function refresh() {
    setRefreshVersion(value => value + 1);
  }

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
      const next = readCultureSiteLocation();
      setSearch(next.search);
      setSelectedId(next.selectedId);
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
    writeLocation(nextSearch, undefined, 'replace');
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
  }, [clanId]);

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
          setItems([]);
          setTotal(0);
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

  function openCreate() {
    setEditing(null);
    editForm.resetFields();
    editForm.setFieldsValue({
      siteType: 'ancestral_hall',
      confidenceLevel: 'unknown',
      privacyLevel: 'clan_only',
      sensitiveLevel: 'normal',
      featuredOnHome: false,
      sortOrder: 0
    });
    setFormOpen(true);
  }

  async function openEdit(item: CultureSiteSummaryResponse | CultureSiteDetailResponse) {
    try {
      setActionLoading(true);
      const data = 'description' in item ? item : await getCultureSite(item.id);
      setEditing(data);
      editForm.setFieldsValue({
        branchId: data.scope.branchId || undefined,
        relatedPersonId: data.relatedPersonId || undefined,
        siteType: data.siteType,
        siteName: data.name,
        addressText: data.addressText || undefined,
        foundedPeriod: data.foundedPeriod || undefined,
        currentStatus: data.currentStatus || undefined,
        summary: data.summary || undefined,
        description: data.description || undefined,
        latitude: data.latitude ?? undefined,
        longitude: data.longitude ?? undefined,
        confidenceLevel: data.confidenceLevel,
        privacyLevel: data.privacyLevel,
        sensitiveLevel: data.sensitiveLevel,
        featuredOnHome: data.featuredOnHome,
        sortOrder: data.sortOrder,
        version: data.version
      });
      setFormOpen(true);
    } catch (error) {
      feedback.error(errorText(error, '文化场所加载失败，无法编辑'));
    } finally {
      setActionLoading(false);
    }
  }

  async function save() {
    if (!clanId) return;
    const values = await editForm.validateFields();
    setSaving(true);
    try {
      const saved = editing
        ? await updateCultureSite(editing.id, values as CultureSiteUpdateRequest)
        : await createCultureSite(clanId, values as CultureSiteCreateRequest);
      feedback.success(editing?.dataStatus === 'official' ? '正式场所变更已提交审核' : '文化场所已保存为草稿');
      setFormOpen(false);
      setEditing(null);
      setSelectedId(saved.id);
      writeLocation(search, saved.id, 'replace');
      refresh();
    } catch (error) {
      feedback.error(errorText(error, '文化场所保存失败'));
    } finally {
      setSaving(false);
    }
  }

  async function submitReview(item: CultureSiteSummaryResponse) {
    try {
      setActionLoading(true);
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
      title: can(item, 'request_archive') ? '申请归档正式场所' : '归档文化场所',
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
    try {
      setActionLoading(true);
      const result = await deleteCultureSite(item.id);
      feedback.success(result.message || '删除操作已完成');
      if (selectedId === item.id && !can(item, 'request_delete')) closeDetail();
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
    if (!href) return;
    window.history.pushState(window.history.state, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  const columns: TableProps<CultureSiteSummaryResponse>['columns'] = [
    { title: '场所名称', dataIndex: 'name', width: 220, render: (_, item) => <Button type="link" onClick={() => openDetail(item)}>{item.name}</Button> },
    { title: '类型', dataIndex: 'siteType', width: 120, render: value => <Tag>{siteTypeLabel(value)}</Tag> },
    { title: '所属支派', width: 150, render: (_, item) => item.scope.branchName || '宗族级' },
    { title: '地址', dataIndex: 'addressText', width: 240, render: value => value || <Text type="secondary">未披露/待补充</Text> },
    { title: '始建时期', dataIndex: 'foundedPeriod', width: 150, render: value => value || <Text type="secondary">待考证</Text> },
    { title: '当前状态', dataIndex: 'currentStatus', width: 140, render: value => value || <Text type="secondary">待补充</Text> },
    { title: '来源', dataIndex: 'sourceCount', width: 90, render: value => `${value} 条` },
    { title: '可信度', dataIndex: 'confidenceLevel', width: 100, render: value => <Tag color={confidenceColor(value)}>{optionLabel(confidenceOptions, value)}</Tag> },
    { title: '数据状态', dataIndex: 'dataStatus', width: 110, render: value => <Tag color={statusColor(value)}>{optionLabel(statusOptions, value)}</Tag> },
    { title: '更新时间', dataIndex: 'updatedAt', width: 170, render: value => formatDateTime(value) },
    {
      title: '操作', fixed: 'right', width: 290,
      render: (_, item) => <Space size={2} wrap>
        <Button type="link" onClick={() => openDetail(item)}>查看</Button>
        {can(item, 'update', 'request_update') ? <Button type="link" onClick={() => void openEdit(item)}>编辑</Button> : null}
        {can(item, 'submit_review') ? <Button type="link" onClick={() => void submitReview(item)}>提交审核</Button> : null}
        {can(item, 'archive', 'request_archive') ? <Button type="link" onClick={() => archive(item)}>归档</Button> : null}
        {can(item, 'delete', 'request_delete') ? <Popconfirm title={can(item, 'request_delete') ? '提交正式场所删除申请？' : '确认删除该场所草稿？'} onConfirm={() => void remove(item)}><Button danger type="link">删除</Button></Popconfirm> : null}
      </Space>
    }
  ];

  const selectedSummary = detail || items.find(item => item.id === selectedId) || null;

  return <Space direction="vertical" size="middle" style={{ width: '100%' }}>
    
    <Card size="small" title="祠堂与文化场所" extra={<Button type="primary" disabled={!clanId} onClick={openCreate}>新增场所</Button>}>
      <Paragraph type="secondary">查询和维护祠堂、祖居、墓园与纪念设施；地图与 GIS 不在本期范围。</Paragraph>
      <Form form={searchForm} layout="vertical" onFinish={applySearch}>
        <Row gutter={[12, 0]}>
          <Col xs={24} md={8} xl={5}><Form.Item name="keyword" label="关键词"><Input allowClear placeholder="名称、年代或说明" /></Form.Item></Col>
          <Col xs={24} md={8} xl={3}><Form.Item name="siteType" label="场所类型"><Select {...multiSelectProps} placeholder="可多选" options={siteTypes} /></Form.Item></Col>
          <Col xs={24} md={8} xl={4}><Form.Item name="branchId" label="所属支派"><Select {...multiSelectProps} placeholder="可多选" showSearch optionFilterProp="label" options={branchOptions} /></Form.Item></Col>
          <Col xs={24} md={8} xl={4}><Form.Item name="addressText" label="地址"><Input allowClear /></Form.Item></Col>
          <Col xs={24} md={8} xl={3}><Form.Item name="currentStatus" label="当前状态"><Input allowClear placeholder="存续、遗址等" /></Form.Item></Col>
          <Col xs={24} md={8} xl={3}><Form.Item name="dataStatus" label="数据状态"><Select {...multiSelectProps} placeholder="可多选" options={statusOptions} /></Form.Item></Col>
          <Col xs={24} md={8} xl={3}><Form.Item name="sort" label="排序"><Select options={sortOptions} /></Form.Item></Col>
          <Col xs={24} xl={6} className="culture-search-actions"><Space><Button type="primary" htmlType="submit" loading={listLoading}>查询</Button><Button onClick={resetSearch}>重置</Button></Space></Col>
        </Row>
      </Form>
    </Card>

    {refreshError ? <PageFeedback tone="warning" title="刷新失败，已保留上次结果" description={refreshError} closable onClose={() => setRefreshError('')} /> : null}
    <Card title="文化场所列表">
      {!clanId ? <Empty description="请选择宗族后查看文化场所" /> : null}
      {clanId && listForbidden ? <Result status="403" title="暂无权限" subTitle={listError || '当前账号无权查看该宗族文化场所'} /> : null}
      {clanId && listError && !listForbidden ? <PageFeedback tone="error" title="文化场所加载失败" description={listError} style={{ marginBottom: 12 }} /> : null}
      {clanId && !listForbidden ? <Table<CultureSiteSummaryResponse>
        rowKey="id"
        size="middle"
        loading={listLoading}
        columns={columns}
        dataSource={items}
        scroll={{ x: 1700 }}
        locale={{ emptyText: '没有符合当前条件的文化场所' }}
        pagination={{
          current: search.pageNo,
          pageSize: search.pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50],
          showTotal: value => `共 ${value} 条`,
          onChange: (pageNo, pageSize) => {
            const nextSearch = { ...search, pageNo, pageSize };
            setSearch(nextSearch);
            writeLocation(nextSearch, selectedId);
          }
        }}
      /> : null}
    </Card>

    <Drawer open={Boolean(selectedId)} width={720} title={<Title level={4} style={{ margin: 0 }}>文化场所详情</Title>} loading={detailLoading} onClose={closeDetail}>
      {detailError ? <PageFeedback tone="error" title="详情加载失败" description={detailError} /> : null}
      {detail ? <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Descriptions bordered size="small" column={1}>
          <Descriptions.Item label="场所名称">{detail.name}</Descriptions.Item>
          <Descriptions.Item label="类型">{siteTypeLabel(detail.siteType)}</Descriptions.Item>
          <Descriptions.Item label="所属支派">{detail.scope.branchName || '宗族级'}</Descriptions.Item>
          <Descriptions.Item label="关联人物">{detail.relatedPersonName || (detail.relatedPersonId ? `人物 #${detail.relatedPersonId}` : '未关联')}</Descriptions.Item>
          <Descriptions.Item label="地址">{detail.addressText || '未披露/待补充'}</Descriptions.Item>
          <Descriptions.Item label="坐标">{detail.latitude != null && detail.longitude != null ? `${detail.latitude}, ${detail.longitude}` : '未披露/待补充'}</Descriptions.Item>
          <Descriptions.Item label="始建时期">{detail.foundedPeriod || '待考证'}</Descriptions.Item>
          <Descriptions.Item label="当前状态">{detail.currentStatus || '待补充'}</Descriptions.Item>
          <Descriptions.Item label="可信度">{optionLabel(confidenceOptions, detail.confidenceLevel)}</Descriptions.Item>
          <Descriptions.Item label="可见与敏感级别">{optionLabel(privacyOptions, detail.privacyLevel)} / {optionLabel(sensitiveOptions, detail.sensitiveLevel)}</Descriptions.Item>
          <Descriptions.Item label="来源与附件">{detail.sourceCount} 条 / {detail.attachmentCount} 个</Descriptions.Item>
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
            {detail.review.rejectedReason ? <PageFeedback tone="warning" title="驳回原因" description={detail.review.rejectedReason} /> : null}
            {traceError ? <PageFeedback tone="warning" title="完整追踪暂不可用" description={traceError} /> : null}
            <Text>可见历史事件：{trace?.timeline.length || 0}</Text>
            <Button onClick={openTracking}>打开完整追踪</Button>
          </Space>
          {trace?.timeline.length ? <Timeline style={{ marginTop: 16 }} items={trace.timeline.slice(0, 5).map(event => ({ children: `${event.title} · ${event.occurredAt || ''}` }))} /> : null}
        </Card>
        {selectedSummary ? <Space wrap>
          {can(selectedSummary, 'update', 'request_update') ? <Button loading={actionLoading} onClick={() => void openEdit(selectedSummary)}>编辑</Button> : null}
          {can(selectedSummary, 'submit_review') ? <Button type="primary" loading={actionLoading} onClick={() => void submitReview(selectedSummary)}>提交审核</Button> : null}
          {can(selectedSummary, 'archive', 'request_archive') ? <Button loading={actionLoading} onClick={() => archive(selectedSummary)}>归档</Button> : null}
          {can(selectedSummary, 'delete', 'request_delete') ? <Popconfirm title={can(selectedSummary, 'request_delete') ? '提交正式场所删除申请？' : '确认删除该场所草稿？'} onConfirm={() => void remove(selectedSummary)}><Button danger loading={actionLoading}>删除</Button></Popconfirm> : null}
        </Space> : null}
      </Space> : null}
    </Drawer>

    <Modal open={formOpen} width={780} title={editing ? (editing.dataStatus === 'official' ? '提交正式场所变更申请' : '编辑文化场所') : '新增文化场所'} okText={editing?.dataStatus === 'official' ? '提交变更审核' : '保存草稿'} cancelText="取消" confirmLoading={saving} onOk={() => void save()} onCancel={() => { if (!saving) { setFormOpen(false); setEditing(null); } }}>
      {editing?.dataStatus === 'official' ? <PageFeedback tone="info" title="正式场所不会被直接覆盖" description="本次修改将生成审核任务，审核通过后才生效。" style={{ marginBottom: 16 }} /> : null}
      <Form form={editForm} layout="vertical">
        <Row gutter={12}>
          <Col xs={24} md={12}><Form.Item name="siteType" label="场所类型" rules={[{ required: true }]}><Select options={siteTypes} /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="siteName" label="场所名称" rules={[{ required: true, whitespace: true, max: 200 }]}><Input /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="branchId" label="所属支派"><Select allowClear showSearch optionFilterProp="label" options={branchOptions} /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="relatedPersonId" label="关联人物 ID"><InputNumber min={1} precision={0} style={{ width: '100%' }} /></Form.Item></Col>
          <Col xs={24}><Form.Item name="addressText" label="地址"><Input maxLength={500} /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="foundedPeriod" label="始建时期"><Input maxLength={200} /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="currentStatus" label="当前状态"><Input maxLength={100} placeholder="如：存续、重建、遗址、迁建" /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="latitude" label="纬度"><InputNumber min={-90} max={90} style={{ width: '100%' }} /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="longitude" label="经度"><InputNumber min={-180} max={180} style={{ width: '100%' }} /></Form.Item></Col>
          <Col xs={24}><Form.Item name="summary" label="摘要"><Input.TextArea rows={2} maxLength={1000} showCount /></Form.Item></Col>
          <Col xs={24}><Form.Item name="description" label="历史说明"><Input.TextArea rows={5} maxLength={200000} /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item name="confidenceLevel" label="可信度" rules={[{ required: true }]}><Select options={confidenceOptions} /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item name="privacyLevel" label="可见范围" rules={[{ required: true }]}><Select options={privacyOptions} /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item name="sensitiveLevel" label="敏感级别" rules={[{ required: true }]}><Select options={sensitiveOptions} /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="sortOrder" label="排序"><InputNumber min={0} precision={0} style={{ width: '100%' }} /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="featuredOnHome" valuePropName="checked"><Checkbox>首页精选</Checkbox></Form.Item></Col>
        </Row>
        <Form.Item name="version" hidden><Input /></Form.Item>
      </Form>
    </Modal>
  </Space>;
}
