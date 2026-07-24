import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Button, Card, Checkbox, Col, Descriptions, Drawer, Form, Image, Input, InputNumber, List, Modal, Popconfirm, Row, Select, Space, Table, Tag, Timeline, Typography } from 'antd';
import type {
  CultureSiteCreateRequest,
  CultureSiteDetailResponse,
  CultureSiteSummaryResponse,
  CultureSiteType,
  CultureSiteUpdateRequest
} from '../../shared/api/generated/culture-types';
import type { TrackingTraceDetailResponse } from '../../shared/api/generated/tracking-types';
import { buildTrackingDeepLink } from '../../shared/navigation/trackingDeepLink.js';
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
import type { CultureSiteSearchState } from './cultureSiteService';

import { feedback } from '../../shared/ui/OperationFeedback';

import { PageFeedback } from '../../shared/ui/Feedback';

import { EmptyState } from '../../shared/ui/Feedback';

const { Paragraph, Text, Title } = Typography;

const siteTypes: { value: CultureSiteType; label: string }[] = [
  { value: 'ancestral_hall', label: '祠堂' },
  { value: 'ancestral_home', label: '祖居' },
  { value: 'cemetery', label: '墓园' },
  { value: 'memorial', label: '纪念设施' },
  { value: 'other', label: '其他场所' }
];
const confidenceOptions = ['high', 'medium', 'low', 'unknown'].map(value => ({ value, label: ({ high: '高', medium: '中', low: '低', unknown: '待考证' } as Record<string, string>)[value] }));
const privacyOptions = ['public', 'clan_only', 'branch_only', 'relatives_only', 'private', 'sealed'].map(value => ({ value, label: ({ public: '公开', clan_only: '宗族可见', branch_only: '支派可见', relatives_only: '亲属可见', private: '私有', sealed: '封存' } as Record<string, string>)[value] }));
const sensitiveOptions = ['normal', 'sensitive', 'highly_sensitive'].map(value => ({ value, label: ({ normal: '普通', sensitive: '敏感', highly_sensitive: '高度敏感' } as Record<string, string>)[value] }));
const statusOptions = ['draft', 'pending_review', 'official', 'rejected', 'archived'].map(value => ({ value, label: statusLabel(value) }));
const initialSearch: CultureSiteSearchState = { sort: 'sortOrder,asc', pageNo: 1, pageSize: 12 };

type SiteForm = CultureSiteCreateRequest & { version?: number };

function errorText(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function statusLabel(status: string) {
  return ({ draft: '草稿', pending_review: '审核中', official: '正式', rejected: '已驳回', archived: '已归档' } as Record<string, string>)[status] || status;
}

function siteTypeLabel(type: string) {
  return siteTypes.find(option => option.value === type)?.label || type;
}

function missingFields(item: CultureSiteSummaryResponse) {
  const missing: string[] = [];
  if (!item.addressText) missing.push('地址');
  if (!item.foundedPeriod) missing.push('年代');
  if (!item.sourceCount) missing.push('来源');
  if (!item.attachmentCount) missing.push('影像');
  return missing;
}

export function CultureSitePanel({ clanId, branches }: { clanId?: string; branches: CultureBranchOption[] }) {
  
  const [search, setSearch] = useState<CultureSiteSearchState>(initialSearch);
  const [items, setItems] = useState<CultureSiteSummaryResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [selectedId, setSelectedId] = useState<number>();
  const [detail, setDetail] = useState<CultureSiteDetailResponse | null>(null);
  const [trace, setTrace] = useState<TrackingTraceDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CultureSiteDetailResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [form] = Form.useForm<SiteForm>();
  const requestSeq = useRef(0);

  const branchOptions = useMemo(
    () => branches.filter(branch => branch.id).map(branch => ({ value: Number(branch.id), label: branch.name || `支派 ${branch.id}` })),
    [branches]
  );

  useEffect(() => {
    if (!clanId) {
      setItems([]);
      setTotal(0);
      return;
    }
    const seq = ++requestSeq.current;
    setLoading(true);
    setListError('');
    listCultureSites(clanId, search)
      .then(page => {
        if (seq !== requestSeq.current) return;
        setItems(page.items);
        setTotal(page.page.totalElements);
      })
      .catch(error => {
        if (seq !== requestSeq.current) return;
        setItems([]);
        setTotal(0);
        setListError(errorText(error, '文化场所加载失败'));
      })
      .finally(() => { if (seq === requestSeq.current) setLoading(false); });
  }, [clanId, search, refreshVersion]);

  useEffect(() => {
    if (!selectedId || !clanId) {
      setDetail(null);
      setTrace(null);
      return;
    }
    setDetailLoading(true);
    Promise.allSettled([getCultureSite(selectedId), getCultureSiteTrace(clanId, selectedId)])
      .then(([detailResult, traceResult]) => {
        if (detailResult.status === 'fulfilled') setDetail(detailResult.value);
        else feedback.error(errorText(detailResult.reason, '文化场所详情加载失败'));
        if (traceResult.status === 'fulfilled') setTrace(traceResult.value);
        else setTrace(null);
      })
      .finally(() => setDetailLoading(false));
  }, [clanId, selectedId, refreshVersion]);

  function refresh() {
    setRefreshVersion(value => value + 1);
  }

  function openCreate() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
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
      const data = 'description' in item ? item : await getCultureSite(item.id);
      setEditing(data);
      form.setFieldsValue({
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
      feedback.error(errorText(error, '文化场所加载失败'));
    }
  }

  async function save() {
    if (!clanId) return;
    const values = await form.validateFields();
    setSaving(true);
    try {
      const result = editing
        ? await updateCultureSite(editing.id, values as CultureSiteUpdateRequest)
        : await createCultureSite(clanId, values as CultureSiteCreateRequest);
      feedback.success(editing?.dataStatus === 'official' ? '正式场所变更已提交审核' : '文化场所已保存为草稿');
      setFormOpen(false);
      setEditing(null);
      setSelectedId(result.id);
      refresh();
    } catch (error) {
      feedback.error(errorText(error, '文化场所保存失败'));
    } finally {
      setSaving(false);
    }
  }

  async function submitReview(item: CultureSiteSummaryResponse) {
    try {
      const result = await submitCultureSiteReview(item.id, {});
      feedback.success(result.message || '文化场所已提交审核');
      refresh();
    } catch (error) {
      feedback.error(errorText(error, '提交审核失败'));
    }
  }

  function archive(item: CultureSiteSummaryResponse) {
    let reason = '';
    Modal.confirm({
      title: item.allowedActions.includes('request_archive') ? '申请归档正式场所' : '归档文化场所',
      content: <Input.TextArea autoFocus placeholder="请输入归档原因" onChange={event => { reason = event.target.value; }} />,
      okText: item.allowedActions.includes('request_archive') ? '提交归档申请' : '确认归档',
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
      const result = await deleteCultureSite(item.id);
      feedback.success(result.message || '删除操作已完成');
      if (selectedId === item.id && !item.allowedActions.includes('request_delete')) setSelectedId(undefined);
      refresh();
    } catch (error) {
      feedback.error(errorText(error, '删除失败'));
    }
  }

  async function previewAttachment(attachmentId: number) {
    try {
      const blob = await previewCultureSiteAttachment(attachmentId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      feedback.error(errorText(error, '影像预览失败'));
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
      feedback.error(errorText(error, '影像下载失败'));
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
    if (href) {
      window.history.pushState(window.history.state, '', href);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }

  const actionButtons = (item: CultureSiteSummaryResponse) => <Space wrap>
    <Button size="small" onClick={() => setSelectedId(item.id)}>详情</Button>
    {(item.allowedActions.includes('update') || item.allowedActions.includes('request_update')) && <Button size="small" onClick={() => void openEdit(item)}>编辑</Button>}
    {item.allowedActions.includes('submit_review') && <Button size="small" type="primary" onClick={() => void submitReview(item)}>提交审核</Button>}
    {(item.allowedActions.includes('archive') || item.allowedActions.includes('request_archive')) && <Button size="small" onClick={() => archive(item)}>归档</Button>}
    {(item.allowedActions.includes('delete') || item.allowedActions.includes('request_delete')) && <Popconfirm title={item.allowedActions.includes('request_delete') ? '提交正式场所删除申请？' : '确认删除该场所草稿？'} onConfirm={() => void remove(item)}><Button danger size="small">删除</Button></Popconfirm>}
  </Space>;

  const columns = [
    { title: '场所', render: (_: unknown, row: CultureSiteSummaryResponse) => <Button type="link" onClick={() => setSelectedId(row.id)}>{row.name}</Button> },
    { title: '类型', render: (_: unknown, row: CultureSiteSummaryResponse) => siteTypeLabel(row.siteType) },
    { title: '支派', render: (_: unknown, row: CultureSiteSummaryResponse) => row.scope.branchName || '宗族级' },
    { title: '地址', dataIndex: 'addressText', render: (value?: string) => value || <Text type="secondary">未披露/待补充</Text> },
    { title: '始建年代', dataIndex: 'foundedPeriod', render: (value?: string) => value || <Text type="secondary">待考证</Text> },
    { title: '现实状态', dataIndex: 'currentStatus', render: (value?: string) => value || <Text type="secondary">待补充</Text> },
    { title: '数据状态', render: (_: unknown, row: CultureSiteSummaryResponse) => <Tag>{statusLabel(row.dataStatus)}</Tag> },
    { title: '完整度', render: (_: unknown, row: CultureSiteSummaryResponse) => { const missing = missingFields(row); return missing.length ? <Tag color="orange">缺 {missing.join('、')}</Tag> : <Tag color="green">完整</Tag>; } },
    { title: '操作', width: 300, render: (_: unknown, row: CultureSiteSummaryResponse) => actionButtons(row) }
  ];

  return <Card title="祠堂与文化场所" extra={<Button type="primary" disabled={!clanId} onClick={openCreate}>新增场所</Button>}>
    
    <Paragraph type="secondary">维护祠堂、祖居、墓园与纪念设施的可信资料。地图与导航不是前置条件；缺失地址、年代、来源或影像时仅提示完整度。</Paragraph>
    <Space wrap style={{ marginBottom: 16 }}>
      <Input.Search allowClear placeholder="搜索名称、地址、年代或现状" style={{ width: 280 }} onSearch={keyword => setSearch({ ...search, keyword: keyword || undefined, pageNo: 1 })} />
      <Select allowClear placeholder="场所类型" style={{ width: 160 }} options={siteTypes} onChange={siteType => setSearch({ ...search, siteType, pageNo: 1 })} />
      <Select allowClear placeholder="支派" style={{ width: 180 }} options={branchOptions} onChange={branchId => setSearch({ ...search, branchId, pageNo: 1 })} />
      <Select allowClear placeholder="数据状态" style={{ width: 140 }} options={statusOptions} onChange={dataStatus => setSearch({ ...search, dataStatus, pageNo: 1 })} />
    </Space>
    {listError ? <PageFeedback tone="error" title="文化场所加载失败" description={listError} style={{ marginBottom: 16 }} /> : null}
    {!clanId ? <EmptyState description="请选择宗族后查看文化场所" /> : <>
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {items.slice(0, 4).map(item => <Col key={item.id} xs={24} sm={12} xl={6}>
          <Card size="small" loading={loading} title={item.name} extra={<Tag>{siteTypeLabel(item.siteType)}</Tag>}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text type="secondary">{item.scope.branchName || '宗族级'} · {item.foundedPeriod || '年代待考证'}</Text>
              <Text>{item.addressText || '地址未披露或待补充'}</Text>
              <Paragraph ellipsis={{ rows: 2 }}>{item.summary || '暂无场所摘要'}</Paragraph>
              <Space wrap><Tag>{statusLabel(item.dataStatus)}</Tag>{item.featuredOnHome ? <Tag color="gold">首页精选</Tag> : null}<Tag>{item.sourceCount} 条来源</Tag></Space>
              {actionButtons(item)}
            </Space>
          </Card>
        </Col>)}
      </Row>
      <Table rowKey="id" size="small" loading={loading} columns={columns} dataSource={items} pagination={{ current: search.pageNo, pageSize: search.pageSize, total, showSizeChanger: true, onChange: (pageNo, pageSize) => setSearch({ ...search, pageNo, pageSize }) }} scroll={{ x: 1280 }} />
    </>}

    <Drawer open={Boolean(selectedId)} width={680} title={<Title level={4} style={{ margin: 0 }}>文化场所详情</Title>} loading={detailLoading} onClose={() => setSelectedId(undefined)}>
      {detail ? <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Descriptions bordered size="small" column={1}>
          <Descriptions.Item label="场所名称">{detail.name}</Descriptions.Item>
          <Descriptions.Item label="类型">{siteTypeLabel(detail.siteType)}</Descriptions.Item>
          <Descriptions.Item label="支派">{detail.scope.branchName || '宗族级'}</Descriptions.Item>
          <Descriptions.Item label="关联人物">{detail.relatedPersonName || (detail.relatedPersonId ? `人物 #${detail.relatedPersonId}` : '未关联')}</Descriptions.Item>
          <Descriptions.Item label="地址">{detail.addressText || '未披露/待补充'}</Descriptions.Item>
          <Descriptions.Item label="坐标">{detail.latitude != null && detail.longitude != null ? `${detail.latitude}, ${detail.longitude}` : '未披露/待补充'}</Descriptions.Item>
          <Descriptions.Item label="始建年代">{detail.foundedPeriod || '待考证'}</Descriptions.Item>
          <Descriptions.Item label="现实状态">{detail.currentStatus || '待补充'}</Descriptions.Item>
          <Descriptions.Item label="数据状态">{statusLabel(detail.dataStatus)}</Descriptions.Item>
          <Descriptions.Item label="可信度/隐私">{detail.confidenceLevel} / {detail.privacyLevel} / {detail.sensitiveLevel}</Descriptions.Item>
          <Descriptions.Item label="来源/影像">{detail.sourceCount} / {detail.attachmentCount}</Descriptions.Item>
        </Descriptions>
        <Card size="small" title="摘要与说明"><Paragraph>{detail.summary || '暂无摘要'}</Paragraph><Paragraph>{detail.description || '暂无详细说明'}</Paragraph></Card>
        <Card size="small" title="来源证据">
          {detail.sources.length ? <List size="small" dataSource={detail.sources} renderItem={source => <List.Item><List.Item.Meta title={source.sourceName} description={source.excerpt || '来源摘录受限或尚未补录'} /></List.Item>} /> : <EmptyState image={EmptyState.PRESENTED_IMAGE_SIMPLE} description="尚未绑定来源" />}
        </Card>
        <Card size="small" title="影像附件">
          {detail.attachments.length ? <List grid={{ gutter: 12, xs: 1, sm: 2 }} dataSource={detail.attachments} renderItem={attachment => <List.Item><Card size="small"><Space direction="vertical"><Image preview={false} width={64} height={48} style={{ objectFit: 'cover' }} fallback="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" src={attachment.contentType?.startsWith('image/') && attachment.canPreview ? `/api/v1/source-attachments/${attachment.attachmentId}/preview` : undefined} /><Text ellipsis>{attachment.fileName}</Text><Space>{attachment.canPreview ? <Button size="small" onClick={() => void previewAttachment(attachment.attachmentId)}>预览</Button> : null}{attachment.canDownload ? <Button size="small" onClick={() => void downloadAttachment(attachment.attachmentId, attachment.fileName)}>下载</Button> : null}</Space></Space></Card></List.Item>} /> : <EmptyState image={EmptyState.PRESENTED_IMAGE_SIMPLE} description="暂无可见影像" />}
        </Card>
        <Card size="small" title="审核与追踪">
          <Space direction="vertical"><Text>审核状态：{detail.review.status || '尚未提交'}</Text>{detail.review.rejectedReason ? <PageFeedback tone="warning" title="驳回原因" description={detail.review.rejectedReason} /> : null}<Text>可见历史事件：{trace?.timeline.length || 0}</Text><Button onClick={openTracking}>打开完整追踪</Button></Space>
          {trace?.timeline.length ? <Timeline style={{ marginTop: 16 }} items={trace.timeline.slice(0, 5).map(event => ({ children: `${event.title} · ${event.occurredAt || ''}` }))} /> : null}
        </Card>
        {actionButtons(detail)}
      </Space> : null}
    </Drawer>

    <Modal open={formOpen} width={760} title={editing ? (editing.dataStatus === 'official' ? '提交正式场所变更申请' : '编辑文化场所') : '新增文化场所'} okText={editing?.dataStatus === 'official' ? '提交变更审核' : '保存草稿'} cancelText="取消" confirmLoading={saving} onOk={() => void save()} onCancel={() => { if (!saving) { setFormOpen(false); setEditing(null); } }}>
      {editing?.dataStatus === 'official' ? <PageFeedback tone="info" title="正式场所不会被直接覆盖" description="本次修改将生成审核任务，审核通过后才生效；地址、坐标和说明不会写入通用差异快照。" style={{ marginBottom: 16 }} /> : null}
      <Form form={form} layout="vertical">
        <Row gutter={12}>
          <Col xs={24} md={12}><Form.Item name="siteType" label="场所类型" rules={[{ required: true }]}><Select options={siteTypes} /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="siteName" label="场所名称" rules={[{ required: true, whitespace: true, max: 200 }]}><Input /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="branchId" label="所属支派"><Select allowClear showSearch optionFilterProp="label" options={branchOptions} /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="relatedPersonId" label="关联人物 ID（可选）"><InputNumber min={1} precision={0} style={{ width: '100%' }} /></Form.Item></Col>
          <Col xs={24}><Form.Item name="addressText" label="地址"><Input maxLength={500} /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="foundedPeriod" label="始建年代"><Input maxLength={200} /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="currentStatus" label="现实状态"><Input maxLength={100} placeholder="如：存续、重建、遗址、迁建" /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="latitude" label="纬度"><InputNumber min={-90} max={90} style={{ width: '100%' }} /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="longitude" label="经度"><InputNumber min={-180} max={180} style={{ width: '100%' }} /></Form.Item></Col>
          <Col xs={24}><Form.Item name="summary" label="摘要"><Input.TextArea rows={2} maxLength={1000} showCount /></Form.Item></Col>
          <Col xs={24}><Form.Item name="description" label="详细说明"><Input.TextArea rows={5} maxLength={200000} /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item name="confidenceLevel" label="可信度" rules={[{ required: true }]}><Select options={confidenceOptions} /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item name="privacyLevel" label="可见范围" rules={[{ required: true }]}><Select options={privacyOptions} /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item name="sensitiveLevel" label="敏感级别" rules={[{ required: true }]}><Select options={sensitiveOptions} /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="sortOrder" label="排序"><InputNumber min={0} precision={0} style={{ width: '100%' }} /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="featuredOnHome" valuePropName="checked"><Checkbox>首页精选</Checkbox></Form.Item></Col>
        </Row>
        <Form.Item name="version" hidden><Input /></Form.Item>
      </Form>
    </Modal>
  </Card>;
}
