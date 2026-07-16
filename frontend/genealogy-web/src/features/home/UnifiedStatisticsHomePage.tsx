import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Drawer,
  Empty,
  List,
  Progress,
  Row,
  Select,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tag,
  Typography
} from 'antd';
import { ApiRequestError, apiClient } from '../../shared/api/client';
import type { CultureOverviewResponse } from '../../shared/api/generated/culture-types';
import type { HomeDashboardResponse } from '../../shared/api/generated/home-types';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { toRecordList } from '../../shared/ui/DataTable';
import './UnifiedStatisticsHomePage.css';

const { Paragraph, Text, Title } = Typography;

type AreaKey = 'clans' | 'dashboard' | 'branches' | 'people' | 'sources' | 'pendingReviews' | 'logs' | 'culture';
type LoadStatus = 'idle' | 'loading' | 'success' | 'error' | 'forbidden';
type DrillKey = 'branches' | 'people' | 'sources' | 'pendingReviews' | 'logs' | 'generationReady' | 'vitalReady' | 'biographyReady' | 'branchCovered' | `gender:${string}` | `generation:${string}` | `living:${string}`;

type ResourceState<T> = {
  status: LoadStatus;
  data: T;
  error: string;
  stale: boolean;
  loaded: boolean;
};

type HomeCultureEntry = {
  type: 'compatibility' | 'culture_item' | 'migration_event' | 'culture_site' | string;
  category: string;
  title: string;
  subtitle: string;
  status: string;
  sourceCount: number;
  sourceCoverageRate: number;
  targetTab: 'items' | 'migrations' | 'sites';
  targetQueryKey?: string;
  targetQueryValue?: string;
};

type HomeCultureOverview = CultureOverviewResponse & { entries?: HomeCultureEntry[] };

type ChartItem = { key: DrillKey; label: string; value: number };

const cultureQueryKeys = [
  'cultureKeyword', 'cultureCategory', 'cultureBranch', 'cultureStatus', 'culturePrivacy',
  'cultureHasSource', 'cultureFeatured', 'cultureSort', 'culturePage', 'culturePageSize', 'cultureItem',
  'migrationKeyword', 'migrationBranch', 'migrationFrom', 'migrationTo', 'migrationTime',
  'migrationStatus', 'migrationSort', 'migrationPage', 'migrationPageSize', 'migrationItem',
  'siteKeyword', 'siteType', 'siteBranch', 'siteAddress', 'siteCurrentStatus',
  'siteStatus', 'siteSort', 'sitePage', 'sitePageSize', 'siteItem'
];

function emptyResource<T>(data: T): ResourceState<T> {
  return { status: 'idle', data, error: '', stale: false, loaded: false };
}

function startResource<T>(previous: ResourceState<T>): ResourceState<T> {
  return { ...previous, status: 'loading', error: '' };
}

function successResource<T>(data: T): ResourceState<T> {
  return { status: 'success', data, error: '', stale: false, loaded: true };
}

function failureResource<T>(previous: ResourceState<T>, error: unknown): ResourceState<T> {
  const forbidden = error instanceof ApiRequestError && error.status === 403;
  return {
    ...previous,
    status: forbidden ? 'forbidden' : 'error',
    error: formatError(error, forbidden ? '暂无权限查看该区域数据' : '数据加载失败'),
    stale: previous.loaded,
    loaded: previous.loaded
  };
}

function formatError(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError && error.status === 403) return '当前账号暂无权限查看该区域数据';
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function display(value: unknown, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function formatLoadedAt(value: Date | null) {
  if (!value) return '数据加载中…';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `数据更新于 ${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function clanLabel(clan: any) {
  return display(clan?.clanName || clan?.name, '未命名宗族');
}

function statusText(status: string) {
  const labels: Record<string, string> = {
    draft: '草稿', pending: '待审核', pending_review: '待审核', official: '正式发布',
    active: '正式', approved: '已通过', rejected: '已驳回', archived: '已归档', legacy_read_only: '只读兼容'
  };
  return labels[status] || status || '状态未知';
}

function statusColor(status: string) {
  const normalized = String(status || '').trim().toLowerCase();
  if (['official', 'active', 'approved'].includes(normalized)) return 'success';
  if (['pending', 'pending_review'].includes(normalized)) return 'processing';
  if (normalized === 'rejected') return 'error';
  if (normalized === 'legacy_read_only') return 'warning';
  return 'default';
}

function sourceTypeText(value: string) {
  const labels: Record<string, string> = {
    genealogy_book: '族谱原文', oral_record: '口述记录', tombstone: '墓碑墓志',
    photo: '照片', local_chronicle: '地方志', other: '其他'
  };
  return labels[value] || value || '未维护';
}

function categoryText(category: string) {
  const labels: Record<string, string> = {
    surname_origin: '姓氏源流', hall_name: '堂号', commandery: '郡望', family_instruction: '家训',
    ancestor_instruction: '祖训', clan_rule: '族规', genealogy_preface: '谱序', genealogy_rule: '凡例',
    person_story: '人物故事', custom_tradition: '民俗传统', ancestral_hall: '祠堂',
    ancestral_home: '祖居', cemetery: '墓园', memorial: '纪念设施', migration: '迁徙事件', other: '其他'
  };
  return labels[category] || category || '文化内容';
}

function bucketValue(dashboard: HomeDashboardResponse | null, dimension: 'genderDistribution' | 'livingDistribution', key: string) {
  return dashboard?.[dimension]?.find(item => item.key === key)?.count || 0;
}

function navigateToWizard() {
  const url = new URL(window.location.href);
  url.searchParams.set('view', 'mvp1Wizard');
  window.history.pushState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function MiniBarChart({ title, items, activeKey, onSelect }: { title: string; items: ChartItem[]; activeKey: DrillKey; onSelect: (key: DrillKey) => void }) {
  const max = Math.max(1, ...items.map(item => item.value));
  return (
    <Card title={title} size="small">
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        {items.length ? items.map(item => (
          <Button key={item.key} block type={activeKey === item.key ? 'primary' : 'default'} onClick={() => onSelect(item.key)}>
            <span style={{ display: 'inline-flex', justifyContent: 'space-between', width: '100%' }}>
              <span>{item.label}</span>
              <span>{item.value} · {Math.round(item.value / max * 100)}%</span>
            </span>
          </Button>
        )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />}
      </Space>
    </Card>
  );
}

export function UnifiedStatisticsHomePage() {
  const workspace = useWorkspace();
  const [clansState, setClansState] = useState<ResourceState<any[]>>(emptyResource([]));
  const [dashboardState, setDashboardState] = useState<ResourceState<HomeDashboardResponse | null>>(emptyResource(null));
  const [branchesState, setBranchesState] = useState<ResourceState<any[]>>(emptyResource([]));
  const [peopleState, setPeopleState] = useState<ResourceState<any[]>>(emptyResource([]));
  const [sourcesState, setSourcesState] = useState<ResourceState<any[]>>(emptyResource([]));
  const [reviewsState, setReviewsState] = useState<ResourceState<any[]>>(emptyResource([]));
  const [logsState, setLogsState] = useState<ResourceState<any | null>>(emptyResource(null));
  const [cultureState, setCultureState] = useState<ResourceState<HomeCultureOverview | null>>(emptyResource(null));
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);
  const [activeDrill, setActiveDrill] = useState<DrillKey>('people');
  const [drillOpen, setDrillOpen] = useState(false);

  const anyLoading = [clansState, dashboardState, branchesState, peopleState, sourcesState, reviewsState, logsState, cultureState]
    .some(state => state.status === 'loading');

  const currentClan = useMemo(() => {
    const clanId = String(workspace.clanId || '');
    return clansState.data.find(clan => String(clan.id) === clanId) || clansState.data[0] || null;
  }, [clansState.data, workspace.clanId]);
  const currentClanId = String(currentClan?.id || workspace.clanId || '').trim();

  function resetWorkspaceForClan(clanId: string) {
    workspace.patch({ clanId, branchId: '', personId: '', relationshipId: '', sourceId: '', sourceFocusReason: '', attachmentId: '', reviewTaskId: '' });
  }

  function clearClanAreaStates() {
    setDashboardState(emptyResource(null));
    setBranchesState(emptyResource([]));
    setPeopleState(emptyResource([]));
    setSourcesState(emptyResource([]));
    setReviewsState(emptyResource([]));
    setLogsState(emptyResource(null));
    setCultureState(emptyResource(null));
    setLastLoadedAt(null);
    setDrillOpen(false);
  }

  async function loadArea<T>(setter: Dispatch<SetStateAction<ResourceState<T>>>, request: () => Promise<T>, onSuccess?: (data: T) => void) {
    setter(previous => startResource(previous));
    try {
      const data = await request();
      setter(successResource(data));
      onSuccess?.(data);
    } catch (error) {
      setter(previous => failureResource(previous, error));
    }
  }

  async function loadClanAreas(clanId: string, areas: AreaKey[] = ['dashboard', 'branches', 'people', 'sources', 'pendingReviews', 'logs', 'culture']) {
    const tasks: Promise<void>[] = [];
    if (areas.includes('dashboard')) {
      tasks.push(loadArea(setDashboardState, () => apiClient.get<HomeDashboardResponse>(`/clans/${clanId}/dashboard`), dashboard => setLastLoadedAt(dashboard?.asOf ? new Date(dashboard.asOf) : new Date())));
    }
    if (areas.includes('branches')) tasks.push(loadArea(setBranchesState, async () => toRecordList(await apiClient.get(`/clans/${clanId}/branches`))));
    if (areas.includes('people')) tasks.push(loadArea(setPeopleState, async () => toRecordList(await apiClient.get(`/persons/search?clanId=${clanId}&pageNo=1&pageSize=200`))));
    if (areas.includes('sources')) tasks.push(loadArea(setSourcesState, async () => toRecordList(await apiClient.get(`/clans/${clanId}/sources`))));
    if (areas.includes('pendingReviews')) tasks.push(loadArea(setReviewsState, async () => toRecordList(await apiClient.get(`/clans/${clanId}/review-tasks/pending`))));
    if (areas.includes('logs')) tasks.push(loadArea(setLogsState, () => apiClient.get(`/logs/operations/stats?clanId=${clanId}`)));
    if (areas.includes('culture')) tasks.push(loadArea(setCultureState, () => apiClient.get<HomeCultureOverview>(`/clans/${clanId}/culture-overview`)));
    await Promise.all(tasks);
  }

  async function load(clanIdOverride?: string) {
    const hadLoadedClans = clansState.loaded;
    setClansState(previous => startResource(previous));
    try {
      const clans = toRecordList(await apiClient.get('/clans'));
      setClansState(successResource(clans));
      const requestedClanId = String(clanIdOverride || workspace.clanId || '').trim();
      const fallbackClanId = String((clans[0] as any)?.id || '');
      const clanId = requestedClanId && clans.some(clan => String(clan.id) === requestedClanId) ? requestedClanId : fallbackClanId;
      if (!clanId) {
        clearClanAreaStates();
        setLastLoadedAt(new Date());
        return;
      }
      if (workspace.clanId !== clanId) resetWorkspaceForClan(clanId);
      await loadClanAreas(clanId);
    } catch (error) {
      setClansState(previous => failureResource(previous, error));
      if (!hadLoadedClans) clearClanAreaStates();
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const dashboard = dashboardState.data;
  const generationItems = useMemo(
    () => (dashboard?.generationDistribution || []).slice(0, 8).map(item => ({ key: `generation:${item.label}` as DrillKey, label: item.label, value: item.count })),
    [dashboard]
  );
  const cultureEntries = cultureState.data?.entries || [];
  const coverage = Math.round((cultureState.data?.statistics.sourceCoverageRate || 0) * 100);
  const loadedAtText = `${formatLoadedAt(lastLoadedAt)}${anyLoading && lastLoadedAt ? ' · 正在更新…' : ''}`;

  async function switchClan(nextClanId: string) {
    if (!nextClanId || nextClanId === workspace.clanId) return;
    resetWorkspaceForClan(nextClanId);
    setActiveDrill('people');
    clearClanAreaStates();
    await loadClanAreas(nextClanId);
  }

  function retry(area: AreaKey) {
    if (area === 'clans') {
      void load();
      return;
    }
    if (!currentClanId) return;
    void loadClanAreas(currentClanId, [area]);
  }

  function openCulture(tab: 'items' | 'migrations' | 'sites', entry?: HomeCultureEntry) {
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'culture');
    url.searchParams.set('tab', tab);
    cultureQueryKeys.forEach(key => url.searchParams.delete(key));
    if (entry?.targetQueryKey && entry.targetQueryValue) url.searchParams.append(entry.targetQueryKey, entry.targetQueryValue);
    window.history.pushState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  function renderAreaAlert(area: AreaKey, label: string, state: ResourceState<unknown>) {
    if (state.status !== 'error' && state.status !== 'forbidden') return null;
    const isForbidden = state.status === 'forbidden';
    return (
      <Alert
        className="statistics-home-page__area-alert"
        type={state.stale ? 'warning' : isForbidden ? 'warning' : 'error'}
        showIcon
        message={state.stale ? `${label}刷新失败，当前展示上次成功数据` : isForbidden ? `暂无权限查看${label}` : `${label}加载失败`}
        description={state.stale ? '数据可能不是最新，请稍后重试。' : state.error}
        action={isForbidden ? undefined : <Button size="small" onClick={() => retry(area)}>重试</Button>}
      />
    );
  }

  function renderEntries(items: HomeCultureEntry[], emptyText: string) {
    if (!items.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />;
    return (
      <List
        size="small"
        dataSource={items}
        renderItem={entry => (
          <List.Item actions={[<Button key="open" type="link" onClick={() => openCulture(entry.targetTab, entry)}>查看</Button>]}> 
            <List.Item.Meta
              title={<Space wrap size={6}><Text strong>{entry.title}</Text><Tag>{categoryText(entry.category)}</Tag><Tag color={statusColor(entry.status)}>{statusText(entry.status)}</Tag></Space>}
              description={<Space direction="vertical" size={2}><Text type="secondary">{entry.subtitle || '暂无摘要'}</Text><Text type="secondary">来源：{entry.sourceCount} 条</Text></Space>}
            />
          </List.Item>
        )}
      />
    );
  }

  const cards: { key: DrillKey; label: string; value: number | string; hint: string }[] = [
    { key: 'people', label: '族人总数', value: dashboard ? dashboard.peopleTotal : '-', hint: '查看人物明细' },
    { key: 'branches', label: '支派数量', value: dashboard ? dashboard.branchCount : '-', hint: '查看支派' },
    { key: 'sources', label: '来源资料', value: dashboard ? dashboard.sourceCount : '-', hint: '查看来源' },
    { key: 'pendingReviews', label: '待审核', value: dashboard ? dashboard.pendingReviewCount : '-', hint: '查看审核事项' },
    { key: 'gender:男', label: '男性族人', value: dashboard ? bucketValue(dashboard, 'genderDistribution', 'male') : '-', hint: '查看男性族人' },
    { key: 'gender:女', label: '女性族人', value: dashboard ? bucketValue(dashboard, 'genderDistribution', 'female') : '-', hint: '查看女性族人' },
    { key: 'living:在世', label: '在世人员', value: dashboard ? bucketValue(dashboard, 'livingDistribution', 'living') : '-', hint: '查看在世人员' },
    { key: 'living:已故', label: '已故人员', value: dashboard ? bucketValue(dashboard, 'livingDistribution', 'deceased') : '-', hint: '查看已故人员' },
    { key: 'generationReady', label: '已维护字辈', value: dashboard ? dashboard.completeness.generationMaintainedCount : '-', hint: '查看已维护字辈人物' },
    { key: 'vitalReady', label: '已维护生卒', value: dashboard ? dashboard.completeness.vitalDatesMaintainedCount : '-', hint: '查看有生卒信息人物' },
    { key: 'biographyReady', label: '有传记人物', value: dashboard ? dashboard.completeness.biographyMaintainedCount : '-', hint: '查看已维护传记人物' },
    { key: 'branchCovered', label: '已覆盖支派', value: dashboard ? `${dashboard.branchCoverage.coveredBranchCount}/${dashboard.branchCoverage.totalBranchCount}` : '-', hint: '查看已有族人的支派' }
  ];

  function detailRows() {
    if (activeDrill === 'branches' || activeDrill === 'branchCovered') return branchesState.data;
    if (activeDrill === 'sources' || activeDrill.startsWith('sourceType:')) return sourcesState.data;
    if (activeDrill === 'pendingReviews') return reviewsState.data;
    if (activeDrill === 'logs') return logsState.data ? [logsState.data] : [];
    return peopleState.data;
  }

  function drillState(): ResourceState<unknown> {
    if (activeDrill === 'branches' || activeDrill === 'branchCovered') return branchesState;
    if (activeDrill === 'sources' || activeDrill.startsWith('sourceType:')) return sourcesState;
    if (activeDrill === 'pendingReviews') return reviewsState;
    if (activeDrill === 'logs') return logsState;
    return peopleState;
  }

  function drillArea(): AreaKey {
    if (activeDrill === 'branches' || activeDrill === 'branchCovered') return 'branches';
    if (activeDrill === 'sources' || activeDrill.startsWith('sourceType:')) return 'sources';
    if (activeDrill === 'pendingReviews') return 'pendingReviews';
    if (activeDrill === 'logs') return 'logs';
    return 'people';
  }

  function detailTitle() {
    if (activeDrill === 'branches') return '支派明细';
    if (activeDrill === 'sources' || activeDrill.startsWith('sourceType:')) return '资料明细';
    if (activeDrill === 'pendingReviews') return '待审核明细';
    if (activeDrill === 'logs') return '日志统计';
    return '人物明细';
  }

  function detailColumns() {
    if (activeDrill === 'sources' || activeDrill.startsWith('sourceType:')) return [
      { key: 'sourceName', title: '资料名称', render: (_value: unknown, row: any) => display(row.sourceName || row.title || row.name, '未命名资料') },
      { key: 'sourceType', title: '类型', render: (_value: unknown, row: any) => <Tag>{sourceTypeText(row.sourceType || row.category)}</Tag> }
    ];
    return [
      { key: 'name', title: '名称', render: (_value: unknown, row: any) => display(row.name || row.personName || row.branchName || row.title || row.comment, '待维护') },
      { key: 'status', title: '状态', render: (_value: unknown, row: any) => <Tag color={statusColor(row.status || row.dataStatus || row.reviewStatus)}>{statusText(row.status || row.dataStatus || row.reviewStatus)}</Tag> }
    ];
  }

  function renderDashboardSection() {
    if ((dashboardState.status === 'error' || dashboardState.status === 'forbidden') && !dashboardState.loaded) {
      return renderAreaAlert('dashboard', '核心指标', dashboardState);
    }
    return (
      <>
        {renderAreaAlert('dashboard', '核心指标', dashboardState)}
        <Row gutter={[16, 16]}>
          {cards.map(card => (
            <Col key={`${card.label}-${card.key}`} xs={24} sm={12} lg={8} xl={6}>
              <Card hoverable={dashboardState.loaded} onClick={() => dashboardState.loaded && setDrillOpen(true) || setActiveDrill(card.key)}>
                <Statistic title={card.label} value={card.value} />
                <Text type="secondary">{card.hint}</Text>
              </Card>
            </Col>
          ))}
        </Row>
      </>
    );
  }

  function renderCultureSection() {
    if ((cultureState.status === 'error' || cultureState.status === 'forbidden') && !cultureState.loaded) {
      return <Card title="宗族文化摘要">{renderAreaAlert('culture', '宗族文化摘要', cultureState)}</Card>;
    }
    const compatibilityEntries = cultureEntries.filter(entry => entry.type === 'compatibility');
    const itemEntries = cultureEntries.filter(entry => entry.type === 'culture_item');
    const migrationEntries = cultureEntries.filter(entry => entry.type === 'migration_event');
    const siteEntries = cultureEntries.filter(entry => entry.type === 'culture_site');
    return (
      <Card title="宗族文化摘要" loading={cultureState.status === 'loading' && !cultureState.loaded} extra={<Button type="primary" onClick={() => openCulture('items')}>进入宗族文化</Button>}>
        {renderAreaAlert('culture', '宗族文化摘要', cultureState)}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={8}><Statistic title="正式资料" value={cultureState.loaded ? cultureState.data?.statistics.officialItemCount || 0 : '-'} /></Col>
          <Col xs={24} md={8}><Statistic title="待审核资料" value={cultureState.loaded ? cultureState.data?.statistics.pendingReviewCount || 0 : '-'} /></Col>
          <Col xs={24} md={8}><Text type="secondary">来源覆盖率</Text><Progress percent={cultureState.loaded ? coverage : 0} status={coverage < 60 ? 'exception' : 'normal'} /></Col>
        </Row>
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={12}><Card size="small" title="堂号、郡望与祖籍兼容摘要">{renderEntries(compatibilityEntries, '暂无兼容摘要，请在文化资料中维护并审核发布。')}</Card></Col>
          <Col xs={24} xl={12}><Card size="small" title="精选文化资料">{renderEntries(itemEntries, '暂无正式精选文化资料。')}</Card></Col>
          <Col xs={24} xl={12}><Card size="small" title="迁徙脉络" extra={<Button type="link" onClick={() => openCulture('migrations')}>全部迁徙</Button>}>{renderEntries(migrationEntries, '暂无当前账号可见的正式迁徙事件。')}</Card></Col>
          <Col xs={24} xl={12}><Card size="small" title="祠堂与文化场所" extra={<Button type="link" onClick={() => openCulture('sites')}>全部场所</Button>}>{renderEntries(siteEntries, '暂无当前账号可见的正式文化场所。')}</Card></Col>
        </Row>
      </Card>
    );
  }

  const header = (
    <header className="statistics-home-page__header">
      <div className="statistics-home-page__heading"><Title level={3}>族谱首页</Title><Text type="secondary">查看当前宗族的成员、支派、来源与审核概览</Text></div>
      {clansState.loaded && clansState.data.length > 0 ? (
        <div className="statistics-home-page__context">
          <div className="statistics-home-page__scope">
            <Text id="statistics-home-current-clan-label" type="secondary">当前宗族</Text>
            <Select aria-labelledby="statistics-home-current-clan-label" className="statistics-home-page__clan-select" size="large" value={String(currentClan?.id || workspace.clanId || '') || undefined} loading={clansState.status === 'loading'} onChange={value => void switchClan(String(value))} options={clansState.data.map(clan => ({ value: String(clan.id), label: clanLabel(clan) }))} />
          </div>
          <Text className="statistics-home-page__updated-at" type="secondary" aria-live="polite">{loadedAtText}</Text>
        </div>
      ) : null}
    </header>
  );

  if ((clansState.status === 'error' || clansState.status === 'forbidden') && !clansState.loaded) {
    return <Space className="statistics-home-page" direction="vertical" size="middle" style={{ width: '100%' }}>{header}{renderAreaAlert('clans', '宗族列表', clansState)}</Space>;
  }

  if (clansState.status === 'loading' && !clansState.loaded) {
    return <Space className="statistics-home-page" direction="vertical" size="middle" style={{ width: '100%' }}>{header}<Card><Skeleton active paragraph={{ rows: 4 }} /></Card></Space>;
  }

  if (clansState.loaded && clansState.data.length === 0) {
    return (
      <Space className="statistics-home-page" direction="vertical" size="middle" style={{ width: '100%' }}>
        {header}
        <Card className="statistics-home-page__empty-onboarding">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<Space direction="vertical" size={6}><Text strong>当前账号尚未创建或加入可见宗族</Text><Text type="secondary">你可以从建谱向导开始创建宗族；如果需要加入已有宗族，请联系宗族管理员邀请。</Text></Space>}>
            <Button type="primary" size="large" onClick={navigateToWizard}>开始建谱</Button>
          </Empty>
        </Card>
      </Space>
    );
  }

  const rows = detailRows();
  const activeState = drillState();
  return (
    <Space className="statistics-home-page" direction="vertical" size="middle" style={{ width: '100%' }}>
      {header}
      {renderAreaAlert('clans', '宗族列表', clansState)}
      <Card className="statistics-home-page__clan-summary"><Title level={4}>{clanLabel(currentClan)}</Title><Paragraph type="secondary">{display(currentClan?.description, '暂未维护宗族简介')}</Paragraph></Card>
      {renderDashboardSection()}
      {renderCultureSection()}
      {dashboardState.loaded ? <MiniBarChart title="代次分布 TOP 8" items={generationItems} activeKey={activeDrill} onSelect={key => { setActiveDrill(key); setDrillOpen(true); }} /> : null}
      <Drawer title={detailTitle()} open={drillOpen} onClose={() => setDrillOpen(false)} width={980}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {renderAreaAlert(drillArea(), detailTitle(), activeState)}
          <Tag>共 {rows.length} 条记录</Tag>
          <Table size="small" bordered rowKey={(_row: any, index) => `${detailTitle()}-${index}`} dataSource={rows} columns={detailColumns()} pagination={{ pageSize: 10 }} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无下钻数据" /> }} scroll={{ x: 'max-content' }} />
        </Space>
      </Drawer>
    </Space>
  );
}
