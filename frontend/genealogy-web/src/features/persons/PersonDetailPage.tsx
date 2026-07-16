import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Breadcrumb, Button, Card, Descriptions, Empty, Progress, Result, Skeleton, Space, Table, Tabs, Tag, Timeline, Typography } from 'antd';
import { ApiRequestError, apiClient } from '../../shared/api/client';
import type { TrackingTraceDetailResponse } from '../../shared/api/generated/tracking-types';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { TrackingLinkButton } from '../../shared/navigation/TrackingLinkButton';
import { toRecordList } from '../../shared/utils/records';
import { navigateToPersonEdit } from './personEditNavigation';
import { readPersonDetailTab, writePersonDetailTab } from './personArchiveUrlState';
import type { PersonDetailTab } from './personArchiveUrlState';
import {
  boolText, branchText, completenessOf, display, eventDateText, eventTypeText, genderText, generationText, lifeText,
  livingText, personName, personStatus, personStatusColor, personStatusText, privacyText, relationshipName,
  relationshipTypeText, sourceTitle, sourceTypeText, updatedText
} from './personDetailModel';
import type { PersonEvent } from './personDetailModel';

type Props = { personId: string; onBack: () => void };
type PageError = { status: 403 | 404 | 500; title: string; description: string };
type ResourceState<T> = { status: 'loading' | 'success' | 'error'; data: T; error: string };

function listState<T>(): ResourceState<T[]> { return { status: 'loading', data: [], error: '' }; }
function objectState<T>(): ResourceState<T | null> { return { status: 'loading', data: null, error: '' }; }
function errorText(error: unknown, fallback: string) { return error instanceof Error && error.message ? error.message : fallback; }
function pageErrorFrom(error: unknown): PageError {
  const status = error instanceof ApiRequestError ? error.status : Number((error as { status?: number } | null)?.status || 0);
  if (status === 403) return { status: 403, title: '无权查看该人物档案', description: '当前账号没有查看此人物档案的权限，页面不会展示受限人物名称、摘要或数量。' };
  if (status === 404) return { status: 404, title: '人物档案不存在', description: '该人物可能已被删除、合并，或链接已经失效。' };
  return { status: 500, title: '人物档案加载失败', description: errorText(error, '服务暂时不可用，请稍后重试。') };
}

function SectionFrame<T>({ state, emptyText, errorTitle, onRetry, children }: {
  state: ResourceState<T[]>; emptyText: string; errorTitle: string; onRetry: () => void; children: ReactNode;
}) {
  if (state.status === 'loading' && !state.data.length) return <Skeleton active paragraph={{ rows: 4 }} />;
  if (state.status === 'error') return <Space direction="vertical" size="middle" style={{ width: '100%' }}><Alert type="error" showIcon message={errorTitle} description={state.error} action={<Button onClick={onRetry}>重新加载</Button>} />{state.data.length ? children : null}</Space>;
  if (!state.data.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />;
  return <>{children}</>;
}
function countText(state: ResourceState<unknown[]>) { if (state.status === 'loading' && !state.data.length) return '加载中'; if (state.status === 'error' && !state.data.length) return '加载失败'; return `${state.data.length} 条`; }

export function PersonDetailPage({ personId, onBack }: Props) {
  const workspace = useWorkspace();
  const [activeTab, setActiveTab] = useState<PersonDetailTab>(() => readPersonDetailTab());
  const [person, setPerson] = useState<any>();
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<PageError | null>(null);
  const [events, setEvents] = useState<ResourceState<PersonEvent[]>>(() => listState<PersonEvent>());
  const [relationships, setRelationships] = useState<ResourceState<any[]>>(() => listState<any>());
  const [sources, setSources] = useState<ResourceState<any[]>>(() => listState<any>());
  const [tracking, setTracking] = useState<ResourceState<TrackingTraceDetailResponse | null>>(() => objectState<TrackingTraceDetailResponse>());
  const pageRequest = useRef(0);
  const eventsRequest = useRef(0);
  const relationshipsRequest = useRef(0);
  const sourcesRequest = useRef(0);
  const trackingRequest = useRef(0);

  useEffect(() => { void loadPerson(); return () => { pageRequest.current += 1; eventsRequest.current += 1; relationshipsRequest.current += 1; sourcesRequest.current += 1; trackingRequest.current += 1; }; }, [personId]);
  useEffect(() => {
    const onPopState = () => setActiveTab(readPersonDetailTab());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function changeTab(key: string) {
    const tab = key as PersonDetailTab;
    setActiveTab(tab);
    writePersonDetailTab(tab, 'push');
  }

  async function loadPerson() {
    const requestId = ++pageRequest.current;
    eventsRequest.current += 1; relationshipsRequest.current += 1; sourcesRequest.current += 1; trackingRequest.current += 1;
    setLoading(true); setPageError(null); setPerson(undefined);
    setEvents(listState<PersonEvent>()); setRelationships(listState<any>()); setSources(listState<any>()); setTracking(objectState<TrackingTraceDetailResponse>());
    try {
      const detail = await apiClient.get(`/persons/${personId}`);
      if (requestId !== pageRequest.current) return;
      setPerson(detail); workspace.setPersonId(personId);
      const clanId = String((detail as any)?.clanId || (detail as any)?.clan?.id || workspace.clanId || '');
      if (clanId && !workspace.clanId) workspace.setClanId(clanId);
      setLoading(false);
      void loadEvents(); void loadRelationships(); void loadSources(); void loadTracking(clanId);
    } catch (error) { if (requestId !== pageRequest.current) return; setPageError(pageErrorFrom(error)); setLoading(false); }
  }
  async function loadEvents() {
    const requestId = ++eventsRequest.current; setEvents(previous => ({ ...previous, status: 'loading', error: '' }));
    try { const data = await apiClient.get(`/persons/${personId}/events`); if (requestId === eventsRequest.current) setEvents({ status: 'success', data: toRecordList<PersonEvent>(data), error: '' }); }
    catch (error) { if (requestId === eventsRequest.current) setEvents(previous => ({ status: 'error', data: previous.data, error: errorText(error, '事件加载失败') })); }
  }
  async function loadRelationships() {
    const requestId = ++relationshipsRequest.current; setRelationships(previous => ({ ...previous, status: 'loading', error: '' }));
    try { const data = await apiClient.get(`/persons/${personId}/relationships`); if (requestId === relationshipsRequest.current) setRelationships({ status: 'success', data: toRecordList<any>(data), error: '' }); }
    catch (error) { if (requestId === relationshipsRequest.current) setRelationships(previous => ({ status: 'error', data: previous.data, error: errorText(error, '关系加载失败') })); }
  }
  async function loadSources() {
    const requestId = ++sourcesRequest.current; setSources(previous => ({ ...previous, status: 'loading', error: '' }));
    try { const data = await apiClient.get(`/source-bindings/target/person/${personId}`); if (requestId === sourcesRequest.current) setSources({ status: 'success', data: toRecordList<any>(data), error: '' }); }
    catch (error) { if (requestId === sourcesRequest.current) setSources(previous => ({ status: 'error', data: previous.data, error: errorText(error, '来源加载失败') })); }
  }
  async function loadTracking(clanId = workspace.clanId) {
    const requestId = ++trackingRequest.current; setTracking(previous => ({ ...previous, status: 'loading', error: '' }));
    if (!clanId) { setTracking({ status: 'error', data: null, error: '缺少宗族上下文，无法加载审核追踪。' }); return; }
    try { const data = await apiClient.get<TrackingTraceDetailResponse>(`/tracking/objects/person/${personId}/trace?clanId=${encodeURIComponent(clanId)}`); if (requestId === trackingRequest.current) setTracking({ status: 'success', data, error: '' }); }
    catch (error) { if (requestId === trackingRequest.current) setTracking(previous => ({ status: 'error', data: previous.data, error: errorText(error, '审核追踪加载失败') })); }
  }

  const completeness = person ? completenessOf(person, relationships.status === 'success' ? relationships.data.length : 0, sources.status === 'success' ? sources.data.length : 0, events.status === 'success' ? events.data.length : 0) : 0;
  const eventItems = useMemo(() => events.data.map(event => ({ key: String(event.id), children: <div className="person-detail-event"><Typography.Text strong>{display(event.eventTitle, eventTypeText(event.eventType))}</Typography.Text><Typography.Text type="secondary">{eventDateText(event)} · {display(event.eventPlace, '地点未详')}</Typography.Text><Typography.Paragraph>{display(event.eventDescription, '暂无事件说明。')}</Typography.Paragraph>{event.sourceName || event.sourceTitle || event.sourceType ? <Tag>{sourceTitle(event)}</Tag> : null}</div> })), [events.data]);

  if (loading) return <div className="person-detail-page"><Breadcrumb items={[{ title: '人物档案' }, { title: '正在加载' }]} /><Card><Skeleton active paragraph={{ rows: 12 }} /></Card></div>;
  if (pageError) return <div className="person-detail-page"><Breadcrumb items={[{ title: '人物档案' }, { title: '无法打开' }]} /><Card><Result status={pageError.status} title={pageError.title} subTitle={pageError.description} extra={[<Button key="back" onClick={onBack}>返回人物列表</Button>, pageError.status === 500 ? <Button key="retry" type="primary" onClick={() => void loadPerson()}>重新加载</Button> : null].filter(Boolean)} /></Card></div>;
  if (!person) return null;

  const status = personStatus(person);
  const clanId = workspace.clanId || String(person.clanId || person.clan?.id || '');
  const trackingTimeline = tracking.data?.timeline || [];

  return <div className="person-detail-page">
    <Breadcrumb items={[{ title: '人物档案' }, { title: personName(person) }]} />
    <div className="person-detail-header"><div className="person-detail-header-main"><Button onClick={onBack}>返回</Button><div><Space align="center" wrap><Typography.Title level={3}>{personName(person)}</Typography.Title><Tag color={personStatusColor(status)}>{personStatusText(status)}</Tag></Space><Typography.Text type="secondary">人物档案详情与证据追踪</Typography.Text></div></div><Space wrap><TrackingLinkButton clanId={clanId} targetType="person" targetId={personId} label="审核追踪" /><Button type="primary" onClick={() => navigateToPersonEdit(personId)}>编辑档案</Button></Space></div>
    <Card className="person-detail-summary-card"><div className="person-detail-completeness"><Typography.Text type="secondary">资料完整度</Typography.Text><Progress percent={completeness} /></div><Descriptions column={{ xs: 1, sm: 2, lg: 4 }} size="small"><Descriptions.Item label="支派">{branchText(person)}</Descriptions.Item><Descriptions.Item label="字辈">{display(person.generationWord)}</Descriptions.Item><Descriptions.Item label="代次">{generationText(person)}</Descriptions.Item><Descriptions.Item label="生卒">{lifeText(person)}</Descriptions.Item><Descriptions.Item label="隐私级别">{privacyText(person.privacyLevel)}</Descriptions.Item><Descriptions.Item label="亲属关系">{countText(relationships)}</Descriptions.Item><Descriptions.Item label="来源证据">{countText(sources)}</Descriptions.Item><Descriptions.Item label="更新时间">{updatedText(person)}</Descriptions.Item></Descriptions></Card>
    <Card className="person-detail-content-card"><Tabs activeKey={activeTab} onChange={changeTab} items={[
      { key: 'basic', label: '基本信息', children: <Space direction="vertical" size="middle" className="person-detail-section-stack"><Card size="small" title="身份与世系"><Descriptions column={{ xs: 1, md: 2 }} bordered size="small"><Descriptions.Item label="姓名">{personName(person)}</Descriptions.Item><Descriptions.Item label="谱名">{display(person.genealogyName)}</Descriptions.Item><Descriptions.Item label="字号">{display(person.courtesyName)}</Descriptions.Item><Descriptions.Item label="别名">{display(person.aliasName)}</Descriptions.Item><Descriptions.Item label="性别">{genderText(person.gender)}</Descriptions.Item><Descriptions.Item label="排行">{display(person.rankInFamily)}</Descriptions.Item><Descriptions.Item label="支派">{branchText(person)}</Descriptions.Item><Descriptions.Item label="字辈与代次">{display(person.generationWord)} · {generationText(person)}</Descriptions.Item></Descriptions></Card><Card size="small" title="生活与治理"><Descriptions column={{ xs: 1, md: 2 }} bordered size="small"><Descriptions.Item label="生卒">{lifeText(person)}</Descriptions.Item><Descriptions.Item label="是否在世">{livingText(person.isLiving)}</Descriptions.Item><Descriptions.Item label="出生地">{display(person.birthPlace)}</Descriptions.Item><Descriptions.Item label="居住地">{display(person.residencePlace)}</Descriptions.Item><Descriptions.Item label="职业">{display(person.occupation)}</Descriptions.Item><Descriptions.Item label="教育程度">{display(person.education)}</Descriptions.Item><Descriptions.Item label="称号荣誉">{display(person.titleOrHonor)}</Descriptions.Item><Descriptions.Item label="墓葬地">{display(person.tombPlace)}</Descriptions.Item><Descriptions.Item label="是否有后裔">{boolText(person.hasDescendant)}</Descriptions.Item><Descriptions.Item label="世系状态">{display(person.lineageStatus)}</Descriptions.Item><Descriptions.Item label="隐私级别">{privacyText(person.privacyLevel)}</Descriptions.Item><Descriptions.Item label="档案状态"><Tag color={personStatusColor(status)}>{personStatusText(status)}</Tag></Descriptions.Item></Descriptions></Card></Space> },
      { key: 'events', label: '生平事迹', children: <Space direction="vertical" size="middle" className="person-detail-section-stack"><Card size="small" title="关键事件"><SectionFrame state={events} emptyText="暂无关键事件记录" errorTitle="事件加载失败" onRetry={() => void loadEvents()}><Timeline items={eventItems} /></SectionFrame></Card><Card size="small" title="人物传记"><Typography.Paragraph>{display(person.biography, '暂无人物传记。')}</Typography.Paragraph></Card><Card size="small" title="墓志铭"><Typography.Paragraph>{display(person.epitaph, '暂无墓志铭。')}</Typography.Paragraph></Card></Space> },
      { key: 'relations', label: '亲属关系', children: <SectionFrame state={relationships} emptyText="暂无亲属关系记录" errorTitle="关系加载失败" onRetry={() => void loadRelationships()}><Table<any> size="small" bordered rowKey={(row, index) => String(row.id || `${relationshipName(row, 'from')}-${relationshipName(row, 'to')}-${index}`)} dataSource={relationships.data} pagination={false} columns={[{ key: 'from', title: '起点人物', render: (_value, row) => relationshipName(row, 'from') }, { key: 'to', title: '关联人物', render: (_value, row) => relationshipName(row, 'to') }, { key: 'type', title: '关系', render: (_value, row) => relationshipTypeText(row.relationType || row.relationLabel) }, { key: 'status', title: '状态', render: (_value, row) => <Tag color={personStatusColor(personStatus(row))}>{personStatusText(personStatus(row))}</Tag> }]} scroll={{ x: 'max-content' }} /></SectionFrame> },
      { key: 'sources', label: '来源证据', children: <SectionFrame state={sources} emptyText="暂无来源证据" errorTitle="来源加载失败" onRetry={() => void loadSources()}><Table<any> size="small" bordered rowKey={(row, index) => String(row.id || row.sourceId || index)} dataSource={sources.data} pagination={false} columns={[{ key: 'sourceName', title: '来源名称', render: (_value, row) => sourceTitle(row) }, { key: 'sourceType', title: '来源类型', render: (_value, row) => sourceTypeText(row.sourceType) }, { key: 'evidence', title: '证据说明', render: (_value, row) => display(row.evidenceText || row.description, '暂无说明') }]} scroll={{ x: 'max-content' }} /></SectionFrame> },
      { key: 'tracking', label: '审核追踪', children: tracking.status === 'loading' && !tracking.data ? <Skeleton active paragraph={{ rows: 5 }} /> : tracking.status === 'error' ? <Alert type="error" showIcon message="审核追踪加载失败" description={tracking.error} action={<Button onClick={() => void loadTracking(clanId)}>重新加载</Button>} /> : !trackingTimeline.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无审核与操作追踪记录" /> : <Space direction="vertical" size="middle" className="person-detail-section-stack"><Card size="small" title="档案治理状态"><Descriptions column={{ xs: 1, md: 2 }} bordered size="small"><Descriptions.Item label="当前状态"><Tag color={personStatusColor(status)}>{personStatusText(status)}</Tag></Descriptions.Item><Descriptions.Item label="最近更新">{updatedText(person)}</Descriptions.Item><Descriptions.Item label="可见范围">{privacyText(person.privacyLevel)}</Descriptions.Item><Descriptions.Item label="追踪入口"><TrackingLinkButton clanId={clanId} targetType="person" targetId={personId} label="打开完整追踪" /></Descriptions.Item></Descriptions></Card><Timeline items={trackingTimeline.map(item => ({ key: item.eventKey, children: <div><Typography.Text strong>{item.title}</Typography.Text><br /><Typography.Text type="secondary">{display(item.occurredAt)} · {display(item.actorDisplayName, '系统')}</Typography.Text><Typography.Paragraph>{display(item.summary, '暂无说明')}</Typography.Paragraph></div> }))} /></Space> }
    ]} /></Card>
  </div>;
}
