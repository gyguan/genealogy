import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Button, Card, Col, Input, Row, Select, Skeleton, Space, Statistic, Tag, Typography } from 'antd';
import { ApiRequestError, apiClient } from '../../shared/api/client';
import type { CultureOverviewResponse } from '../../shared/api/generated/culture-types';
import type { HomeDashboardResponse } from '../../shared/api/generated/home-types';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { EmptyState, PageFeedback } from '../../shared/ui/Feedback';
import { toRecordList } from '../../shared/ui/DataTable';
import { emptyPersonArchiveSearch, writePersonArchiveUrl } from '../persons/personArchiveUrlState';
import './UnifiedStatisticsHomePage.css';

const { Paragraph, Text, Title } = Typography;

type LoadStatus = 'idle' | 'loading' | 'success' | 'error' | 'forbidden';
type ResourceState<T> = { status: LoadStatus; data: T; error: string; loaded: boolean };
type HomeCultureEntry = {
  type: 'compatibility' | 'culture_item' | 'migration_event' | 'culture_site' | string;
  category: string;
  title: string;
  subtitle: string;
  status: string;
  sourceCount: number;
  targetTab: 'items' | 'migrations' | 'sites';
  targetQueryKey?: string;
  targetQueryValue?: string;
};
type HomeCultureOverview = CultureOverviewResponse & { entries?: HomeCultureEntry[] };
type HomeView = 'treeProduct' | 'personArchive' | 'sourceLibrary' | 'culture' | 'editingWorkspace';
type RecentView = { key: string; title: string; subtitle: string; kind: string; view: HomeView; visitedAt: string };
type UserIdentity = { id?: string | number; userId?: string | number; username?: string };

const cultureQueryKeys = [
  'cultureKeyword', 'cultureCategory', 'cultureBranch', 'cultureStatus', 'culturePrivacy',
  'cultureHasSource', 'cultureFeatured', 'cultureSort', 'culturePage', 'culturePageSize',
  'cultureItem', 'migrationKeyword', 'migrationBranch', 'migrationFrom', 'migrationTo',
  'migrationTime', 'migrationStatus', 'migrationSort', 'migrationPage', 'migrationPageSize',
  'migrationItem', 'siteKeyword', 'siteType', 'siteBranch', 'siteAddress', 'siteCurrentStatus',
  'siteStatus', 'siteSort', 'sitePage', 'sitePageSize', 'siteItem'
];

function emptyResource<T>(data: T): ResourceState<T> { return { status: 'idle', data, error: '', loaded: false }; }
function loadingResource<T>(previous: ResourceState<T>): ResourceState<T> { return { ...previous, status: 'loading', error: '' }; }
function successResource<T>(data: T): ResourceState<T> { return { status: 'success', data, error: '', loaded: true }; }
function failureResource<T>(previous: ResourceState<T>, error: unknown): ResourceState<T> {
  const forbidden = error instanceof ApiRequestError && error.status === 403;
  const fallback = forbidden ? '当前账号暂无权限查看该区域数据' : '数据加载失败';
  return { ...previous, status: forbidden ? 'forbidden' : 'error', error: error instanceof Error && error.message ? error.message : fallback };
}
function display(value: unknown, fallback = '-') { const text = String(value ?? '').trim(); return text || fallback; }
function clanLabel(clan: any) { return display(clan?.clanName || clan?.name || clan?.surname, '未命名宗族'); }
function clanMark(clan: any) { return display(clan?.surname || clanLabel(clan).slice(0, 1), '族').slice(0, 1); }
function isPublicEntry(entry: HomeCultureEntry) {
  const status = String(entry.status || '').trim().toLowerCase();
  return ['official', 'active', 'approved'].includes(status) || entry.type === 'compatibility';
}
function categoryText(category: string) {
  const labels: Record<string, string> = {
    surname_origin: '姓氏源流', hall_name: '堂号', commandery: '郡望', family_instruction: '家训',
    ancestor_instruction: '祖训', clan_rule: '族规', genealogy_preface: '谱序', genealogy_rule: '凡例',
    person_story: '人物故事', custom_tradition: '民俗传统', ancestral_hall: '祠堂', ancestral_home: '祖居',
    cemetery: '墓园', memorial: '纪念设施', migration: '迁徙事件', other: '其他'
  };
  return labels[category] || category || '宗族文化';
}
function entryMark(entry: HomeCultureEntry) {
  if (entry.type === 'migration_event' || entry.category === 'migration') return '迁';
  if (entry.type === 'culture_site') return '址';
  if (['genealogy_preface', 'genealogy_rule'].includes(entry.category)) return '谱';
  if (entry.category === 'person_story') return '人';
  return categoryText(entry.category).slice(0, 1);
}
function percent(value: number, denominator: number) {
  if (!denominator || denominator <= 0) return 0;
  return Math.min(100, Math.round(value * 10000 / denominator) / 100);
}
function relativeTime(value: string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return '最近浏览';
  const minutes = Math.max(1, Math.floor((Date.now() - time) / 60000));
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}
function cardTitle(label: ReactNode, action?: ReactNode) {
  return <div className="public-home-page__card-title"><span>{label}</span>{action ? <div>{action}</div> : null}</div>;
}
function updateHomeUrl(clanId: string) {
  const url = new URL(window.location.href);
  if (clanId) url.searchParams.set('clanId', clanId); else url.searchParams.delete('clanId');
  url.searchParams.delete('metric');
  url.searchParams.delete('category');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}
function readClanIdFromUrl() { return new URLSearchParams(window.location.search).get('clanId') || ''; }

export function UnifiedStatisticsHomePage() {
  const workspace = useWorkspace();
  const [clansState, setClansState] = useState<ResourceState<any[]>>(emptyResource([]));
  const [dashboardState, setDashboardState] = useState<ResourceState<HomeDashboardResponse | null>>(emptyResource(null));
  const [cultureState, setCultureState] = useState<ResourceState<HomeCultureOverview | null>>(emptyResource(null));
  const [searchKeyword, setSearchKeyword] = useState('');
  const [userKey, setUserKey] = useState('session');
  const [recentViews, setRecentViews] = useState<RecentView[]>([]);

  const currentClan = useMemo(() => {
    const clanId = String(workspace.clanId || '');
    return clansState.data.find(clan => String(clan.id) === clanId) || clansState.data[0] || null;
  }, [clansState.data, workspace.clanId]);
  const currentClanId = String(currentClan?.id || workspace.clanId || '').trim();
  const dashboard = dashboardState.data;
  const cultureEntries = useMemo(() => (cultureState.data?.entries || []).filter(isPublicEntry), [cultureState.data]);
  const recentStorageKey = `genealogy.home.recent.${userKey}.${currentClanId || 'none'}`;

  function resetWorkspaceForClan(clanId: string) {
    workspace.patch({ clanId, branchId: '', personId: '', relationshipId: '', sourceId: '', sourceFocusReason: '', attachmentId: '', reviewTaskId: '' });
  }
  function saveRecent(entry: Omit<RecentView, 'visitedAt'>) {
    const next = [{ ...entry, visitedAt: new Date().toISOString() }, ...recentViews.filter(item => item.key !== entry.key)].slice(0, 6);
    setRecentViews(next);
    try { sessionStorage.setItem(recentStorageKey, JSON.stringify(next)); } catch { /* 浏览器禁用存储时不影响导航 */ }
  }
  function navigateToView(view: HomeView, recent?: Omit<RecentView, 'visitedAt' | 'view'>) {
    if (recent) saveRecent({ ...recent, view });
    const url = new URL(window.location.href);
    url.searchParams.set('view', view);
    if (currentClanId) url.searchParams.set('clanId', currentClanId);
    window.history.pushState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
  function openPersonSearch(keyword = searchKeyword) {
    const normalized = keyword.trim();
    const state = { ...emptyPersonArchiveSearch(), keyword: normalized };
    if (currentClanId) workspace.setClanId(currentClanId);
    saveRecent({ key: `person-search:${normalized || 'all'}`, title: normalized ? `查找“${normalized}”` : '人物档案', subtitle: '人物、字辈、支派与籍贯查询', kind: '人物', view: 'personArchive' });
    writePersonArchiveUrl(state);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
  function openCulture(tab: 'items' | 'migrations' | 'sites', entry?: HomeCultureEntry) {
    if (entry) saveRecent({ key: `culture:${entry.type}:${entry.title}`, title: entry.title, subtitle: display(entry.subtitle, categoryText(entry.category)), kind: categoryText(entry.category), view: 'culture' });
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'culture');
    url.searchParams.set('tab', tab);
    if (currentClanId) url.searchParams.set('clanId', currentClanId);
    cultureQueryKeys.forEach(key => url.searchParams.delete(key));
    if (entry?.targetQueryKey && entry.targetQueryValue) url.searchParams.set(entry.targetQueryKey, entry.targetQueryValue);
    window.history.pushState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
  async function loadPublicAreas(clanId: string) {
    setDashboardState(previous => loadingResource(previous));
    setCultureState(previous => loadingResource(previous));
    await Promise.all([
      apiClient.get<HomeDashboardResponse>(`/clans/${clanId}/dashboard`).then(data => setDashboardState(successResource(data))).catch(error => setDashboardState(previous => failureResource(previous, error))),
      apiClient.get<HomeCultureOverview>(`/clans/${clanId}/culture-overview`).then(data => setCultureState(successResource(data))).catch(error => setCultureState(previous => failureResource(previous, error)))
    ]);
  }
  async function load(clanIdOverride?: string) {
    setClansState(previous => loadingResource(previous));
    try {
      const clans = toRecordList(await apiClient.get('/clans'));
      setClansState(successResource(clans));
      const requestedClanId = String(clanIdOverride || workspace.clanId || '').trim();
      const fallbackClanId = String((clans[0] as any)?.id || '');
      const clanId = requestedClanId && clans.some(clan => String(clan.id) === requestedClanId) ? requestedClanId : fallbackClanId;
      if (!clanId) {
        setDashboardState(emptyResource(null));
        setCultureState(emptyResource(null));
        updateHomeUrl('');
        return;
      }
      if (workspace.clanId !== clanId) resetWorkspaceForClan(clanId);
      updateHomeUrl(clanId);
      await loadPublicAreas(clanId);
    } catch (error) {
      setClansState(previous => failureResource(previous, error));
    }
  }
  async function switchClan(nextClanId: string) {
    if (!nextClanId || nextClanId === currentClanId) return;
    resetWorkspaceForClan(nextClanId);
    updateHomeUrl(nextClanId);
    setRecentViews([]);
    await loadPublicAreas(nextClanId);
  }
  function renderAreaAlert(label: string, state: ResourceState<unknown>, retry: () => void) {
    if (state.status !== 'error' && state.status !== 'forbidden') return null;
    const forbidden = state.status === 'forbidden';
    return <PageFeedback tone="warning" title={forbidden ? `暂无权限查看${label}` : `${label}加载失败`} description={state.error} action={forbidden ? undefined : <Button size="small" onClick={retry}>重试</Button>} />;
  }

  useEffect(() => {
    apiClient.get<UserIdentity>('/auth/me').then(user => setUserKey(String(user.id || user.userId || user.username || 'session'))).catch(() => setUserKey('session'));
    void load(readClanIdFromUrl() || undefined);
  }, []);
  useEffect(() => {
    if (!currentClanId) { setRecentViews([]); return; }
    try {
      const parsed = JSON.parse(sessionStorage.getItem(recentStorageKey) || '[]');
      setRecentViews(Array.isArray(parsed) ? parsed.slice(0, 6) : []);
    } catch {
      setRecentViews([]);
    }
  }, [recentStorageKey]);

  const generationBuckets = (dashboard?.generationDistribution || []).filter(item => item.count > 0);
  const generationCount = generationBuckets.length;
  const branches = (dashboard?.branchDistribution || []).filter(item => item.count > 0).slice(0, 5);
  const latestEntries = cultureEntries.filter(entry => entry.type !== 'compatibility').slice(0, 5);
  const timelineEntries = cultureEntries.filter(entry => entry.type === 'migration_event' || ['migration', 'genealogy_preface', 'genealogy_rule', 'ancestral_hall', 'ancestral_home'].includes(entry.category)).slice(0, 6);
  const memoryEntries = cultureEntries.filter(entry => entry.type === 'culture_site' || ['person_story', 'genealogy_preface', 'ancestral_hall', 'ancestral_home', 'memorial'].includes(entry.category)).slice(0, 6);
  const featuredCulture = cultureEntries.filter(entry => entry.type !== 'compatibility').slice(0, 4);
  const improvementHints = [
    ...(!currentClan?.description ? [{ title: '宗族简介尚未完善', subtitle: '补充公开历史沿革与宗族概况', kind: '资料' }] : []),
    ...(!currentClan?.hallName && !currentClan?.commandery ? [{ title: '堂号与郡望尚未维护', subtitle: '可在宗族文化中补充相关考证', kind: '文化' }] : []),
    ...cultureEntries.filter(entry => entry.type !== 'compatibility' && Number(entry.sourceCount || 0) === 0).slice(0, 3).map(entry => ({ title: `${entry.title}缺少关联来源`, subtitle: '建议补充谱页、照片或口述记录', kind: '来源' }))
  ].slice(0, 4);
  const metrics = [
    { title: '收录族人', value: dashboard?.peopleTotal || 0, suffix: '人', action: () => openPersonSearch('') },
    { title: '已传代数', value: generationCount, suffix: '代', action: () => navigateToView('treeProduct', { key: 'tree:generation', title: '世系代次概览', subtitle: `当前已记录 ${generationCount} 代`, kind: '世系' }) },
    { title: '主要支派', value: dashboard?.branchCount || 0, suffix: '支', action: () => navigateToView('treeProduct', { key: 'tree:branches', title: '主要支派', subtitle: '查看支派与世系关系', kind: '支派' }) },
    { title: '可考来源', value: dashboard?.sourceCount || 0, suffix: '条', action: () => navigateToView('sourceLibrary', { key: 'source:all', title: '来源资料库', subtitle: '谱书、照片与口述记录', kind: '资料' }) }
  ];

  if ((clansState.status === 'error' || clansState.status === 'forbidden') && !clansState.loaded) {
    return <Space className="public-home-page" direction="vertical" size="middle" style={{ width: '100%' }}>{renderAreaAlert('宗族列表', clansState, () => void load(readClanIdFromUrl() || undefined))}</Space>;
  }
  if (clansState.status === 'loading' && !clansState.loaded) {
    return <Space className="public-home-page" direction="vertical" size="middle" style={{ width: '100%' }}><Card><Skeleton active paragraph={{ rows: 8 }} /></Card></Space>;
  }
  if (clansState.loaded && clansState.data.length === 0) {
    return <Card className="public-home-page__empty"><EmptyState image={EmptyState.PRESENTED_IMAGE_SIMPLE} description={<Space direction="vertical" size={6}><Text strong>当前没有可浏览的宗族</Text><Text type="secondary">请联系宗族管理员确认成员身份与访问范围。</Text></Space>} /></Card>;
  }

  return <Space className="public-home-page" direction="vertical" size="middle" style={{ width: '100%' }}>
    <Card className="public-home-page__hero">
      <div className="public-home-page__hero-layout">
        <div className="public-home-page__identity">
          <div className="public-home-page__seal" aria-hidden="true">{clanMark(currentClan)}</div>
          <div className="public-home-page__hero-copy">
            <Title level={3}>{clanLabel(currentClan)}</Title>
            <Paragraph type="secondary" ellipsis={{ rows: 3, expandable: true, symbol: '展开' }}>{display(currentClan?.description, '暂未维护宗族简介，可在宗族资料中补充公开的历史沿革与宗族概况。')}</Paragraph>
            <Space wrap size={[8, 8]} className="public-home-page__identity-tags">
              {currentClan?.hallName ? <Tag>堂号：{currentClan.hallName}</Tag> : null}
              {currentClan?.commandery ? <Tag>郡望：{currentClan.commandery}</Tag> : null}
              {currentClan?.ancestorName ? <Tag>始迁祖：{currentClan.ancestorName}</Tag> : null}
              {currentClan?.ancestralHome ? <Tag>祖居地：{currentClan.ancestralHome}</Tag> : null}
            </Space>
          </div>
        </div>
        <div className="public-home-page__scope">
          <Text id="public-home-current-clan-label" type="secondary">当前宗族</Text>
          <Select aria-labelledby="public-home-current-clan-label" className="public-home-page__clan-select" size="large" value={currentClanId || undefined} loading={clansState.status === 'loading'} onChange={value => void switchClan(String(value))} options={clansState.data.map(clan => ({ value: String(clan.id), label: clanLabel(clan) }))} />
        </div>
      </div>
      <div className="public-home-page__search">
        <Input.Search size="large" allowClear value={searchKeyword} onChange={event => setSearchKeyword(event.target.value)} onSearch={value => openPersonSearch(value)} placeholder="输入姓名、字辈、支派、籍贯或资料关键词" enterButton="查找族人" />
        <Button size="large" onClick={() => navigateToView('treeProduct', { key: 'tree:home', title: '世系图谱', subtitle: '继续浏览公开世系关系', kind: '世系' })}>进入世系图谱</Button>
      </div>
      <Space wrap size={[12, 6]} className="public-home-page__quick-search"><Text type="secondary">快捷查询：</Text>{['始祖', '字辈', '支派', '迁徙'].map(keyword => <Button key={keyword} type="link" size="small" onClick={() => keyword === '迁徙' ? openCulture('migrations') : openPersonSearch(keyword)}>查{keyword}</Button>)}<Button type="link" size="small" onClick={() => navigateToView('sourceLibrary')}>查历史资料</Button></Space>
    </Card>

    {renderAreaAlert('宗族概况', dashboardState, () => void loadPublicAreas(currentClanId))}
    <Row gutter={[16, 16]}>{dashboardState.status === 'loading' && !dashboardState.loaded ? Array.from({ length: 4 }).map((_item, index) => <Col key={index} xs={24} sm={12} xl={6}><Card><Skeleton active paragraph={{ rows: 2 }} /></Card></Col>) : metrics.map(metric => <Col key={metric.title} xs={24} sm={12} xl={6}><Card className="public-home-page__metric-card" hoverable onClick={metric.action}><Statistic title={metric.title} value={metric.value} suffix={metric.suffix} /><Button type="link">查看详情</Button></Card></Col>)}</Row>

    <Row gutter={[16, 16]}>
      <Col xs={24} xl={8}><Card title="最近浏览" className="public-home-page__discovery-card">{recentViews.length ? <div className="public-home-page__compact-list">{recentViews.map(item => <button key={item.key} type="button" onClick={() => navigateToView(item.view)}><span><strong>{item.title}</strong><small>{item.subtitle} · {relativeTime(item.visitedAt)}</small></span><Tag>{item.kind}</Tag></button>)}</div> : <EmptyState image={EmptyState.PRESENTED_IMAGE_SIMPLE} description="从首页进入人物、世系或资料后，将在这里显示最近浏览" />}</Card></Col>
      <Col xs={24} xl={8}><Card title={cardTitle('最新收录', <Button type="link" onClick={() => openCulture('items')}>查看全部</Button>)} className="public-home-page__discovery-card">{cultureState.status === 'loading' && !cultureState.loaded ? <Skeleton active paragraph={{ rows: 4 }} /> : latestEntries.length ? <div className="public-home-page__compact-list">{latestEntries.map(entry => <button key={`${entry.type}-${entry.title}`} type="button" onClick={() => openCulture(entry.targetTab, entry)}><span><strong>{entry.title}</strong><small>{display(entry.subtitle, `已关联 ${entry.sourceCount || 0} 条来源`)}</small></span><Tag>{categoryText(entry.category)}</Tag></button>)}</div> : <EmptyState image={EmptyState.PRESENTED_IMAGE_SIMPLE} description="暂无已公开的最新收录内容" />}</Card></Col>
      <Col xs={24} xl={8}><Card title={cardTitle('待补充线索', <Button type="link" onClick={() => navigateToView('editingWorkspace')}>进入修谱</Button>)} className="public-home-page__discovery-card">{improvementHints.length ? <div className="public-home-page__compact-list">{improvementHints.map((item, index) => <button key={`${item.title}-${index}`} type="button" onClick={() => item.kind === '来源' ? navigateToView('sourceLibrary') : openCulture('items')}><span><strong>{item.title}</strong><small>{item.subtitle}</small></span><Tag color="orange">{item.kind}</Tag></button>)}</div> : <EmptyState image={EmptyState.PRESENTED_IMAGE_SIMPLE} description="当前公开内容暂无待补充线索" />}</Card></Col>
    </Row>

    <Card title={cardTitle('世系概览', <Button type="link" onClick={() => navigateToView('treeProduct')}>进入完整世系图谱</Button>)}>
      <div className="public-home-page__lineage-preview">
        <div className="public-home-page__lineage-root"><strong>{display(currentClan?.ancestorName, clanLabel(currentClan))}</strong><small>{generationCount ? `已记录 ${generationCount} 代` : '宗族世系'}</small></div>
        <div className="public-home-page__lineage-branches">
          {branches.length ? branches.map(branch => {
            const branchPercent = percent(branch.count, dashboard?.peopleTotal || 0);
            return <button key={branch.key} type="button" onClick={() => navigateToView('treeProduct', { key: `branch:${branch.key}`, title: display(branch.label, '未命名支派'), subtitle: `${branch.count} 人`, kind: '支派' })}>
              <strong>{display(branch.label, '未命名支派')}</strong>
              <small>{branch.count} 人 · {branchPercent}%</small>
              <span className="public-home-page__lineage-share" aria-hidden="true"><span style={{ width: `${branchPercent}%` }} /></span>
            </button>;
          }) : <EmptyState image={EmptyState.PRESENTED_IMAGE_SIMPLE} description="暂无公开世系与支派数据" />}
        </div>
      </div>
    </Card>

    <Row gutter={[16, 16]}>
      <Col xs={24} xl={12}><Card title={cardTitle('宗族时间轴', <Button type="link" onClick={() => openCulture('items')}>查看完整大事记</Button>)}>{timelineEntries.length ? <div className="public-home-page__timeline">{timelineEntries.map((entry, index) => <button type="button" key={`${entry.title}-${index}`} onClick={() => openCulture(entry.targetTab, entry)}><span className="public-home-page__timeline-dot" /><Text type="secondary">{categoryText(entry.category)}</Text><strong>{entry.title}</strong><small>{display(entry.subtitle, `已关联 ${entry.sourceCount || 0} 条来源`)}</small></button>)}</div> : <EmptyState image={EmptyState.PRESENTED_IMAGE_SIMPLE} description="暂无已公开的迁徙、修谱或宗族纪事" />}</Card></Col>
      <Col xs={24} xl={12}><Card title={cardTitle('家族记忆', <Button type="link" onClick={() => openCulture('items')}>查看更多</Button>)}>{memoryEntries.length ? <div className="public-home-page__memory-grid">{memoryEntries.map(entry => <button key={`${entry.type}-${entry.title}`} type="button" onClick={() => openCulture(entry.targetTab, entry)}><span aria-hidden="true">{entryMark(entry)}</span><strong>{entry.title}</strong><small>{display(entry.subtitle, categoryText(entry.category))}</small></button>)}</div> : <EmptyState image={EmptyState.PRESENTED_IMAGE_SIMPLE} description="暂无公开的照片、谱页、人物故事或宗族场所资料" />}</Card></Col>
    </Row>

    {featuredCulture.length ? <Card title={cardTitle('宗族历史与文化', <Button type="link" onClick={() => openCulture('items')}>查看全部文化资料</Button>)}><div className="public-home-page__feature-list">{featuredCulture.map(entry => <button key={`${entry.type}-${entry.title}`} type="button" className="public-home-page__feature-item" onClick={() => openCulture(entry.targetTab, entry)}><div className="public-home-page__feature-mark" aria-hidden="true">{entryMark(entry)}</div><div className="public-home-page__feature-copy"><Text strong>{entry.title}</Text><Paragraph type="secondary" ellipsis={{ rows: 2 }}>{display(entry.subtitle, `已关联 ${entry.sourceCount || 0} 条来源`)}</Paragraph></div><Tag>{categoryText(entry.category)}</Tag></button>)}</div></Card> : null}
  </Space>;
}
