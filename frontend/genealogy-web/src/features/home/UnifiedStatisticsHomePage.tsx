import { type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
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
import type {
  HomeDashboardActivityResponse,
  HomeDashboardBucketResponse,
  HomeDashboardResponse,
  HomeDashboardRiskResponse,
  HomeDashboardTrendPointResponse
} from '../../shared/api/generated/home-types';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { toRecordList } from '../../shared/ui/DataTable';
import './UnifiedStatisticsHomePage.css';

const { Paragraph, Text, Title } = Typography;

type AreaKey = 'clans' | 'dashboard' | 'branches' | 'people' | 'sources' | 'pendingReviews' | 'logs' | 'culture';
type LoadStatus = 'idle' | 'loading' | 'success' | 'error' | 'forbidden';
type SimpleDrillKey = 'branches' | 'people' | 'sources' | 'pendingReviews' | 'logs' | 'generationReady' | 'vitalReady' | 'biographyReady' | 'branchCovered';
type CategoryMetric = 'gender' | 'generation' | 'living' | 'sourceType' | 'branch';
type DrillKey = SimpleDrillKey | `${CategoryMetric}:${string}`;

type ResourceState<T> = { status: LoadStatus; data: T; error: string; stale: boolean; loaded: boolean };
type HomeCultureEntry = { type: 'compatibility' | 'culture_item' | 'migration_event' | 'culture_site' | string; category: string; title: string; subtitle: string; status: string; sourceCount: number; sourceCoverageRate: number; targetTab: 'items' | 'migrations' | 'sites'; targetQueryKey?: string; targetQueryValue?: string };
type HomeCultureOverview = CultureOverviewResponse & { entries?: HomeCultureEntry[] };
type Metric = { key: DrillKey; title: string; value: number | string; unit: string; description: string; status?: 'success' | 'warning' | 'error' | 'default' };
type DistributionSpec = { title: string; denominator: number; denominatorLabel: string; items: HomeDashboardBucketResponse[]; drillPrefix: CategoryMetric };
type TrendSpec = { title: string; unit: string; getter: (point: HomeDashboardTrendPointResponse) => number };

type UrlDrillState = { key: DrillKey | null; valid: boolean };

const simpleMetrics: SimpleDrillKey[] = ['branches', 'people', 'sources', 'pendingReviews', 'logs', 'generationReady', 'vitalReady', 'biographyReady', 'branchCovered'];
const categoryMetrics: CategoryMetric[] = ['gender', 'generation', 'living', 'sourceType', 'branch'];
const cultureQueryKeys = ['cultureKeyword', 'cultureCategory', 'cultureBranch', 'cultureStatus', 'culturePrivacy', 'cultureHasSource', 'cultureFeatured', 'cultureSort', 'culturePage', 'culturePageSize', 'cultureItem', 'migrationKeyword', 'migrationBranch', 'migrationFrom', 'migrationTo', 'migrationTime', 'migrationStatus', 'migrationSort', 'migrationPage', 'migrationPageSize', 'migrationItem', 'siteKeyword', 'siteType', 'siteBranch', 'siteAddress', 'siteCurrentStatus', 'siteStatus', 'siteSort', 'sitePage', 'sitePageSize', 'siteItem'];

function emptyResource<T>(data: T): ResourceState<T> { return { status: 'idle', data, error: '', stale: false, loaded: false }; }
function startResource<T>(previous: ResourceState<T>): ResourceState<T> { return { ...previous, status: 'loading', error: '' }; }
function successResource<T>(data: T): ResourceState<T> { return { status: 'success', data, error: '', stale: false, loaded: true }; }
function failureResource<T>(previous: ResourceState<T>, error: unknown): ResourceState<T> {
  const forbidden = error instanceof ApiRequestError && error.status === 403;
  return { ...previous, status: forbidden ? 'forbidden' : 'error', error: formatError(error, forbidden ? '暂无权限查看该区域数据' : '数据加载失败'), stale: previous.loaded, loaded: previous.loaded };
}
function formatError(error: unknown, fallback: string) { if (error instanceof ApiRequestError && error.status === 403) return '当前账号暂无权限查看该区域数据'; if (error instanceof Error && error.message) return error.message; return fallback; }
function display(value: unknown, fallback = '-') { const text = String(value ?? '').trim(); return text || fallback; }
function clanLabel(clan: any) { return display(clan?.clanName || clan?.name, '未命名宗族'); }
function statusText(status: string) { const labels: Record<string, string> = { draft: '草稿', pending: '待审核', pending_review: '待审核', official: '正式发布', active: '正式', approved: '已通过', rejected: '已驳回', archived: '已归档', legacy_read_only: '只读兼容' }; return labels[status] || status || '状态未知'; }
function statusColor(status: string) { const normalized = String(status || '').trim().toLowerCase(); if (['official', 'active', 'approved', '已完成', '正常', 'ok'].includes(normalized)) return 'success'; if (['pending', 'pending_review', '待处理', 'medium', 'low'].includes(normalized)) return 'processing'; if (['rejected', 'high'].includes(normalized)) return 'error'; if (normalized === 'legacy_read_only') return 'warning'; return 'default'; }
function sourceTypeText(value: string) { const labels: Record<string, string> = { genealogy_book: '族谱原文', oral_record: '口述记录', tombstone: '墓碑墓志', photo: '照片', local_chronicle: '地方志', other: '其他' }; return labels[value] || value || '未维护'; }
function categoryText(category: string) { const labels: Record<string, string> = { surname_origin: '姓氏源流', hall_name: '堂号', commandery: '郡望', family_instruction: '家训', ancestor_instruction: '祖训', clan_rule: '族规', genealogy_preface: '谱序', genealogy_rule: '凡例', person_story: '人物故事', custom_tradition: '民俗传统', ancestral_hall: '祠堂', ancestral_home: '祖居', cemetery: '墓园', memorial: '纪念设施', migration: '迁徙事件', other: '其他' }; return labels[category] || category || '文化内容'; }
function percent(value: number, denominator: number) { if (!denominator || denominator <= 0) return 0; return Math.round(value * 10000 / denominator) / 100; }
function sum(values: number[]) { return values.reduce((total, value) => total + value, 0); }
function riskLabel(severity: string) { return severity === 'high' ? '高风险' : severity === 'medium' ? '中风险' : severity === 'low' ? '低风险' : '正常'; }
function formatDateTime(value: string) { if (!value) return '-'; const date = new Date(value); if (Number.isNaN(date.getTime())) return value; const pad = (part: number) => String(part).padStart(2, '0'); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`; }
function isSimpleMetric(value: string): value is SimpleDrillKey { return simpleMetrics.includes(value as SimpleDrillKey); }
function isCategoryMetric(value: string): value is CategoryMetric { return categoryMetrics.includes(value as CategoryMetric); }
function parseUrlDrill(search = window.location.search): UrlDrillState {
  const params = new URLSearchParams(search);
  const metric = params.get('metric') || '';
  const category = params.get('category') || '';
  if (!metric) return { key: null, valid: true };
  if (isSimpleMetric(metric)) return { key: metric, valid: true };
  if (isCategoryMetric(metric) && category.trim()) return { key: `${metric}:${category.trim()}` as DrillKey, valid: true };
  return { key: null, valid: false };
}
function parseUrlClanId(search = window.location.search) { return new URLSearchParams(search).get('clanId') || ''; }
function encodeDrillToUrl(url: URL, key: DrillKey | null) {
  if (!key) {
    url.searchParams.delete('metric');
    url.searchParams.delete('category');
    return;
  }
  const text = String(key);
  if (text.includes(':')) {
    const [metric, ...rest] = text.split(':');
    url.searchParams.set('metric', metric);
    url.searchParams.set('category', rest.join(':'));
  } else {
    url.searchParams.set('metric', text);
    url.searchParams.delete('category');
  }
}
function updateHomeUrl({ clanId, drillKey, mode = 'push' }: { clanId?: string; drillKey?: DrillKey | null; mode?: 'push' | 'replace' }) {
  const url = new URL(window.location.href);
  if (clanId) url.searchParams.set('clanId', clanId);
  if (drillKey !== undefined) encodeDrillToUrl(url, drillKey);
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (next === `${window.location.pathname}${window.location.search}${window.location.hash}`) return;
  window.history[mode === 'replace' ? 'replaceState' : 'pushState'](window.history.state, '', next);
}
function navigateToWizard() { const url = new URL(window.location.href); url.searchParams.set('view', 'mvp1Wizard'); window.history.pushState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`); window.dispatchEvent(new PopStateEvent('popstate')); }
function navigateToTarget(view: string, query: string) { const url = new URL(window.location.href); if (view === 'home') url.searchParams.delete('view'); else url.searchParams.set('view', view); if (query) new URLSearchParams(query).forEach((value, key) => url.searchParams.set(key, value)); window.history.pushState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`); window.dispatchEvent(new PopStateEvent('popstate')); }
function useMobileDrawer() { const [mobile, setMobile] = useState(false); useEffect(() => { const update = () => setMobile(window.innerWidth < 768); update(); window.addEventListener('resize', update); return () => window.removeEventListener('resize', update); }, []); return mobile; }

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
  const [activeDrill, setActiveDrill] = useState<DrillKey>('people');
  const [drillOpen, setDrillOpen] = useState(false);
  const [invalidUrlDrill, setInvalidUrlDrill] = useState(false);
  const drawerTitleRef = useRef<HTMLHeadingElement | null>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);
  const isMobileDrawer = useMobileDrawer();

  const currentClan = useMemo(() => { const clanId = String(workspace.clanId || ''); return clansState.data.find(clan => String(clan.id) === clanId) || clansState.data[0] || null; }, [clansState.data, workspace.clanId]);
  const currentClanId = String(currentClan?.id || workspace.clanId || '').trim();

  function resetWorkspaceForClan(clanId: string) { workspace.patch({ clanId, branchId: '', personId: '', relationshipId: '', sourceId: '', sourceFocusReason: '', attachmentId: '', reviewTaskId: '' }); }
  function clearClanAreaStates() { setDashboardState(emptyResource(null)); setBranchesState(emptyResource([])); setPeopleState(emptyResource([])); setSourcesState(emptyResource([])); setReviewsState(emptyResource([])); setLogsState(emptyResource(null)); setCultureState(emptyResource(null)); setDrillOpen(false); }
  async function loadArea<T>(setter: Dispatch<SetStateAction<ResourceState<T>>>, request: () => Promise<T>, onSuccess?: (data: T) => void) { setter(previous => startResource(previous)); try { const data = await request(); setter(successResource(data)); onSuccess?.(data); } catch (error) { setter(previous => failureResource(previous, error)); } }
  async function loadClanAreas(clanId: string, areas: AreaKey[] = ['dashboard', 'branches', 'people', 'sources', 'pendingReviews', 'logs', 'culture']) {
    const tasks: Promise<void>[] = [];
    if (areas.includes('dashboard')) tasks.push(loadArea(setDashboardState, () => apiClient.get<HomeDashboardResponse>(`/clans/${clanId}/dashboard`)));
    if (areas.includes('branches')) tasks.push(loadArea(setBranchesState, async () => toRecordList(await apiClient.get(`/clans/${clanId}/branches`))));
    if (areas.includes('people')) tasks.push(loadArea(setPeopleState, async () => toRecordList(await apiClient.get(`/persons/search?clanId=${clanId}&pageNo=1&pageSize=200`))));
    if (areas.includes('sources')) tasks.push(loadArea(setSourcesState, async () => toRecordList(await apiClient.get(`/clans/${clanId}/sources`))));
    if (areas.includes('pendingReviews')) tasks.push(loadArea(setReviewsState, async () => toRecordList(await apiClient.get(`/clans/${clanId}/review-tasks/pending`))));
    if (areas.includes('logs')) tasks.push(loadArea(setLogsState, () => apiClient.get(`/logs/operations/stats?clanId=${clanId}`)));
    if (areas.includes('culture')) tasks.push(loadArea(setCultureState, () => apiClient.get<HomeCultureOverview>(`/clans/${clanId}/culture-overview`)));
    await Promise.all(tasks);
  }
  async function load(clanIdOverride?: string, options: { syncUrl?: boolean } = {}) {
    const hadLoadedClans = clansState.loaded;
    setClansState(previous => startResource(previous));
    try {
      const clans = toRecordList(await apiClient.get('/clans'));
      setClansState(successResource(clans));
      const requestedClanId = String(clanIdOverride || workspace.clanId || '').trim();
      const fallbackClanId = String((clans[0] as any)?.id || '');
      const clanId = requestedClanId && clans.some(clan => String(clan.id) === requestedClanId) ? requestedClanId : fallbackClanId;
      if (!clanId) { clearClanAreaStates(); updateHomeUrl({ drillKey: null, mode: 'replace' }); return; }
      if (workspace.clanId !== clanId) resetWorkspaceForClan(clanId);
      if (options.syncUrl !== false) updateHomeUrl({ clanId, mode: 'replace' });
      await loadClanAreas(clanId);
    } catch (error) {
      setClansState(previous => failureResource(previous, error));
      if (!hadLoadedClans) clearClanAreaStates();
    }
  }
  function applyUrlDrillState() {
    const parsed = parseUrlDrill();
    setInvalidUrlDrill(!parsed.valid);
    if (parsed.key) { setActiveDrill(parsed.key); setDrillOpen(true); }
    else { setDrillOpen(false); }
  }

  useEffect(() => { const drill = parseUrlDrill(); setInvalidUrlDrill(!drill.valid); if (drill.key) { setActiveDrill(drill.key); setDrillOpen(true); } void load(parseUrlClanId() || undefined); }, []);
  useEffect(() => {
    const onPopState = () => {
      const clanId = parseUrlClanId();
      const parsed = parseUrlDrill();
      setInvalidUrlDrill(!parsed.valid);
      if (parsed.key) { setActiveDrill(parsed.key); setDrillOpen(true); } else setDrillOpen(false);
      void load(clanId || undefined, { syncUrl: false });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  useEffect(() => { if (!drillOpen) return; const timer = window.setTimeout(() => drawerTitleRef.current?.focus(), 0); return () => window.clearTimeout(timer); }, [drillOpen, activeDrill]);
  useEffect(() => { if (dashboardState.loaded) applyUrlDrillState(); }, [dashboardState.loaded]);

  const dashboard = dashboardState.data;
  const profileCompletenessRate = dashboard ? Math.round((dashboard.completeness.generationMaintainedRate + dashboard.completeness.vitalDatesMaintainedRate + dashboard.completeness.biographyMaintainedRate) * 100 / 3) / 100 : 0;
  const sourceCoverageRate = dashboard ? percent(dashboard.sourceCount, dashboard.peopleTotal) : 0;
  const metrics: Metric[] = dashboard ? [
    { key: 'people', title: '族人总数', value: dashboard.peopleTotal, unit: '人', description: '正式入谱族人总量，分母为当前宗族可见正式人物。' },
    { key: 'branches', title: '支派数量', value: dashboard.branchCount, unit: '个', description: '当前宗族已维护支派数量。' },
    { key: 'sources', title: '来源资料', value: dashboard.sourceCount, unit: '条', description: '当前宗族已维护来源资料数量。' },
    { key: 'pendingReviews', title: '待审核事项', value: dashboard.pendingReviewCount, unit: '件', description: dashboard.pendingReviewCount > 0 ? '存在待处理审核，请优先处理。' : '当前没有待审核事项。', status: dashboard.pendingReviewCount > 0 ? 'warning' : 'success' },
    { key: 'generationReady', title: '档案完整率', value: `${profileCompletenessRate}%`, unit: '平均', description: '按字辈、生卒、传记三项维护率平均，分母为正式族人。' },
    { key: 'sources', title: '来源覆盖率', value: `${sourceCoverageRate}%`, unit: '覆盖', description: '以来源资料数量 / 正式族人数量估算，超过 100% 按实际值展示。' }
  ] : [];
  const distributions: DistributionSpec[] = dashboard ? [
    { title: '性别结构', denominator: dashboard.peopleTotal, denominatorLabel: '正式族人', items: dashboard.genderDistribution, drillPrefix: 'gender' },
    { title: '在世状态', denominator: dashboard.peopleTotal, denominatorLabel: '正式族人', items: dashboard.livingDistribution, drillPrefix: 'living' },
    { title: '代次分布', denominator: dashboard.peopleTotal, denominatorLabel: '正式族人', items: dashboard.generationDistribution, drillPrefix: 'generation' },
    { title: '支派覆盖', denominator: dashboard.peopleTotal, denominatorLabel: '正式族人', items: dashboard.branchDistribution, drillPrefix: 'branch' },
    { title: '来源类型', denominator: dashboard.sourceCount, denominatorLabel: '来源资料', items: dashboard.sourceTypeDistribution, drillPrefix: 'sourceType' }
  ] : [];
  const trendSpecs: TrendSpec[] = [{ title: '人物新增', unit: '人', getter: point => point.peopleCreatedCount }, { title: '资料新增', unit: '条', getter: point => point.sourceCreatedCount }, { title: '审核完成', unit: '件', getter: point => point.reviewCompletedCount }];
  const cultureEntries = cultureState.data?.entries || [];
  const coverage = Math.round((cultureState.data?.statistics.sourceCoverageRate || 0) * 100);

  async function switchClan(nextClanId: string) { if (!nextClanId || nextClanId === workspace.clanId) return; resetWorkspaceForClan(nextClanId); setActiveDrill('people'); clearClanAreaStates(); updateHomeUrl({ clanId: nextClanId, drillKey: null }); await loadClanAreas(nextClanId); }
  function retry(area: AreaKey) { if (area === 'clans') { void load(parseUrlClanId() || undefined); return; } if (!currentClanId) return; void loadClanAreas(currentClanId, [area]); }
  function openCulture(tab: 'items' | 'migrations' | 'sites', entry?: HomeCultureEntry) { const url = new URL(window.location.href); url.searchParams.set('view', 'culture'); url.searchParams.set('tab', tab); cultureQueryKeys.forEach(key => url.searchParams.delete(key)); if (entry?.targetQueryKey && entry.targetQueryValue) url.searchParams.append(entry.targetQueryKey, entry.targetQueryValue); window.history.pushState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`); window.dispatchEvent(new PopStateEvent('popstate')); }
  function renderAreaAlert(area: AreaKey, label: string, state: ResourceState<unknown>) { if (state.status !== 'error' && state.status !== 'forbidden') return null; const isForbidden = state.status === 'forbidden'; return <Alert className="statistics-home-page__area-alert" type={state.stale ? 'warning' : isForbidden ? 'warning' : 'error'} showIcon role="status" message={state.stale ? `${label}刷新失败，当前展示上次成功数据` : isForbidden ? `暂无权限查看${label}` : `${label}加载失败`} description={state.stale ? '数据可能不是最新，请稍后重试。' : state.error} action={isForbidden ? undefined : <Button size="small" onClick={() => retry(area)}>重试</Button>} />; }
  function openDrill(key: DrillKey, trigger?: HTMLElement | null) { if (!dashboardState.loaded) return; lastTriggerRef.current = trigger || document.activeElement as HTMLElement | null; setActiveDrill(key); setDrillOpen(true); setInvalidUrlDrill(false); updateHomeUrl({ clanId: currentClanId, drillKey: key }); }
  function closeDrill() { setDrillOpen(false); setInvalidUrlDrill(false); updateHomeUrl({ clanId: currentClanId, drillKey: null }); window.setTimeout(() => lastTriggerRef.current?.focus(), 0); }
  function renderEntries(items: HomeCultureEntry[], emptyText: string) { if (!items.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />; return <List size="small" dataSource={items} renderItem={entry => <List.Item actions={[<Button key="open" type="link" onClick={() => openCulture(entry.targetTab, entry)}>查看</Button>]}><List.Item.Meta title={<Space wrap size={6}><Text strong>{entry.title}</Text><Tag>{categoryText(entry.category)}</Tag><Tag color={statusColor(entry.status)}>{statusText(entry.status)}</Tag></Space>} description={<Space direction="vertical" size={2}><Text type="secondary">{entry.subtitle || '暂无摘要'}</Text><Text type="secondary">来源：{entry.sourceCount} 条</Text></Space>} /></List.Item>} />; }
  function detailRows() { const condition = drillConditionText(); if (activeDrill === 'branches' || activeDrill === 'branchCovered' || activeDrill.startsWith('branch:')) return activeDrill.startsWith('branch:') ? branchesState.data.filter(row => display(row.branchName || row.name) === condition) : branchesState.data; if (activeDrill === 'sources' || activeDrill.startsWith('sourceType:')) return activeDrill.startsWith('sourceType:') ? sourcesState.data.filter(row => sourceTypeText(row.sourceType || row.category) === condition) : sourcesState.data; if (activeDrill === 'pendingReviews') return reviewsState.data; if (activeDrill === 'logs') return logsState.data ? [logsState.data] : []; if (activeDrill.startsWith('gender:')) return peopleState.data.filter(row => display(row.gender, '未知') === condition || (condition === '男' && row.gender === 'male') || (condition === '女' && row.gender === 'female')); if (activeDrill.startsWith('generation:')) return peopleState.data.filter(row => `${row.generationNo}世` === condition || (condition === '未维护' && !row.generationNo)); if (activeDrill.startsWith('living:')) return peopleState.data.filter(row => (condition === '在世' && row.isLiving === true) || (condition === '已故' && row.isLiving === false) || (condition === '未维护' && row.isLiving == null)); return peopleState.data; }
  function drillState(): ResourceState<any> { if (activeDrill === 'branches' || activeDrill === 'branchCovered' || activeDrill.startsWith('branch:')) return branchesState; if (activeDrill === 'sources' || activeDrill.startsWith('sourceType:')) return sourcesState; if (activeDrill === 'pendingReviews') return reviewsState; if (activeDrill === 'logs') return logsState; return peopleState; }
  function drillArea(): AreaKey { if (activeDrill === 'branches' || activeDrill === 'branchCovered' || activeDrill.startsWith('branch:')) return 'branches'; if (activeDrill === 'sources' || activeDrill.startsWith('sourceType:')) return 'sources'; if (activeDrill === 'pendingReviews') return 'pendingReviews'; if (activeDrill === 'logs') return 'logs'; return 'people'; }
  function detailBaseTitle() { if (activeDrill === 'branches' || activeDrill.startsWith('branch:')) return '支派明细'; if (activeDrill === 'sources' || activeDrill.startsWith('sourceType:')) return '资料明细'; if (activeDrill === 'pendingReviews') return '待审核明细'; if (activeDrill === 'logs') return '日志统计'; return '人物明细'; }
  function drillConditionText() { const text = String(activeDrill); if (text.includes(':')) return text.split(':').slice(1).join(':'); const labels: Partial<Record<DrillKey, string>> = { people: '族人总数', branches: '支派数量', sources: '来源资料', pendingReviews: '待审核事项', logs: '日志统计', generationReady: '档案完整率', vitalReady: '生卒维护情况', biographyReady: '传记维护情况', branchCovered: '支派覆盖情况' }; return labels[activeDrill] || detailBaseTitle(); }
  function detailColumns() { if (activeDrill === 'sources' || activeDrill.startsWith('sourceType:')) return [{ key: 'sourceName', title: '资料名称', render: (_value: unknown, row: any) => display(row.sourceName || row.title || row.name, '未命名资料') }, { key: 'sourceType', title: '类型', render: (_value: unknown, row: any) => <Tag>{sourceTypeText(row.sourceType || row.category)}</Tag> }]; return [{ key: 'name', title: '名称', render: (_value: unknown, row: any) => display(row.name || row.personName || row.branchName || row.title || row.comment, '待维护') }, { key: 'status', title: '状态', render: (_value: unknown, row: any) => <Tag color={statusColor(row.status || row.dataStatus || row.reviewStatus)}>{statusText(row.status || row.dataStatus || row.reviewStatus)}</Tag> }]; }

  function renderMetricSection() {
    if ((dashboardState.status === 'error' || dashboardState.status === 'forbidden') && !dashboardState.loaded) return renderAreaAlert('dashboard', '核心指标', dashboardState);
    if (dashboardState.status === 'loading' && !dashboardState.loaded) return <Row gutter={[16, 16]}>{Array.from({ length: 6 }).map((_item, index) => <Col key={index} xs={24} sm={12} lg={8} xl={4}><Card><Skeleton active paragraph={{ rows: 2 }} /></Card></Col>)}</Row>;
    return <><div className="statistics-home-page__section-header"><Title level={4}>核心指标</Title><Text type="secondary">首屏保留 6 个核心 KPI，范围为当前宗族。</Text></div>{renderAreaAlert('dashboard', '核心指标', dashboardState)}<Row gutter={[16, 16]}>{metrics.map(metric => <Col key={metric.title} xs={24} sm={12} lg={8} xl={4}><Card className={`statistics-home-page__metric-card statistics-home-page__metric-card--${metric.status || 'default'}`} hoverable={dashboardState.loaded}><button type="button" className="statistics-home-page__metric-button" onClick={event => openDrill(metric.key, event.currentTarget)} aria-label={`${metric.title}，${metric.value}${metric.unit}，查看明细`}><Space direction="vertical" size={4} style={{ width: '100%' }}><Text type="secondary">{metric.title}</Text><span className="statistics-home-page__metric-value">{metric.value}<Text className="statistics-home-page__metric-unit">{metric.unit}</Text></span><Text type={metric.status === 'warning' ? 'warning' : 'secondary'}>{metric.description}</Text><Text className="statistics-home-page__drill-hint" type="secondary">按 Enter 或点击查看明细</Text></Space></button></Card></Col>)}</Row></>;
  }
  function renderDistributionSection() { if (!dashboardState.loaded || !dashboard) return null; return <Card title="结构分布" extra={<Text type="secondary">{clanLabel(currentClan)} · 百分比按分类数 / 有效分母计算</Text>}><Row gutter={[16, 16]}>{distributions.map(spec => <Col key={spec.title} xs={24} lg={12} xl={8}><Card size="small" title={spec.title} extra={<Text type="secondary">分母：{spec.denominatorLabel} {spec.denominator}</Text>}><Space direction="vertical" size="small" style={{ width: '100%' }}>{spec.items.length ? spec.items.map(item => { const p = percent(item.count, spec.denominator); const drillKey = `${spec.drillPrefix}:${item.label}` as DrillKey; return <button key={`${spec.title}-${item.key}`} type="button" className="statistics-home-page__distribution-button" onClick={event => openDrill(drillKey, event.currentTarget)} aria-label={`${spec.title}${item.label} ${item.count}，占比 ${p}%，查看明细`}><span><Text strong>{item.label}</Text><Text type="secondary">{item.count} · {p}% · 查看明细</Text></span><Progress percent={p} size="small" showInfo={false} /></button>; }) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无结构数据" />}</Space></Card></Col>)}</Row></Card>; }
  function renderTrendSection() { if (!dashboardState.loaded || !dashboard) return null; const hasActivity = dashboard.trendPoints.some(point => point.peopleCreatedCount || point.sourceCreatedCount || point.reviewCompletedCount); return <Card title="趋势分析" extra={<Text type="secondary">近 30 天 · 按日统计</Text>}>{hasActivity ? <Row gutter={[16, 16]}>{trendSpecs.map(spec => { const total = sum(dashboard.trendPoints.map(spec.getter)); const max = Math.max(1, ...dashboard.trendPoints.map(spec.getter)); const recent = dashboard.trendPoints.slice(-14); return <Col key={spec.title} xs={24} md={8}><Card size="small" title={spec.title} extra={<Text>{total} {spec.unit}</Text>}><div className="statistics-home-page__trend-bars" role="img" aria-label={`${spec.title}近 30 天合计 ${total}${spec.unit}`}>{recent.map(point => { const value = spec.getter(point); return <span key={`${spec.title}-${point.date}`} className="statistics-home-page__trend-bar" style={{ height: `${Math.max(6, Math.round(value / max * 48))}px` }} title={`${point.date}: ${value}${spec.unit}`} />; })}</div><Text type="secondary">横轴为最近 14 天，完整口径为近 30 天。</Text></Card></Col>; })}</Row> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="近 30 天暂无修谱活动" />}</Card>; }
  function renderRiskSection() { if (!dashboardState.loaded || !dashboard) return null; const activeRisks = dashboard.risks.filter(risk => risk.count > 0); return <Card title="待办与风险" extra={<Text type="secondary">服务端规则集中计算，点击进入处理现场</Text>}>{activeRisks.length ? <List dataSource={dashboard.risks} renderItem={(risk: HomeDashboardRiskResponse) => <List.Item actions={[risk.count > 0 ? <Button key="open" type="link" onClick={() => navigateToTarget(risk.targetView, risk.targetQuery)}>处理</Button> : null]}><List.Item.Meta title={<Space><Text strong>{risk.label}</Text><Tag color={statusColor(risk.severity)}>{riskLabel(risk.severity)}</Tag><Tag>{risk.count} 项</Tag></Space>} description={risk.count > 0 ? risk.reason : '当前未发现该类风险'} /></List.Item>} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前未发现待处理风险" />}</Card>; }
  function renderRecentActivitySection() { if (!dashboardState.loaded || !dashboard) return null; return <Card title="最近活动" extra={<Button type="link" onClick={() => navigateToTarget('auditTrace', '')}>进入审计追踪</Button>}>{dashboard.recentActivities.length ? <List dataSource={dashboard.recentActivities} renderItem={(activity: HomeDashboardActivityResponse) => <List.Item actions={[<Button key="open" type="link" onClick={() => navigateToTarget(activity.targetView, activity.targetQuery)}>打开</Button>]}><List.Item.Meta title={<Space wrap><Text strong>{activity.action}</Text><Tag>{activity.status}</Tag></Space>} description={<Space direction="vertical" size={2}><Text>{activity.objectName}</Text><Text type="secondary">{activity.actorName} · {formatDateTime(activity.occurredAt)}</Text></Space>} /></List.Item>} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无最近活动" />}</Card>; }
  function renderCultureSection() { if ((cultureState.status === 'error' || cultureState.status === 'forbidden') && !cultureState.loaded) return <Card title="宗族文化摘要">{renderAreaAlert('culture', '宗族文化摘要', cultureState)}</Card>; const compatibilityEntries = cultureEntries.filter(entry => entry.type === 'compatibility'); const itemEntries = cultureEntries.filter(entry => entry.type === 'culture_item'); const migrationEntries = cultureEntries.filter(entry => entry.type === 'migration_event'); const siteEntries = cultureEntries.filter(entry => entry.type === 'culture_site'); return <Card title="宗族文化摘要" loading={cultureState.status === 'loading' && !cultureState.loaded} extra={<Button type="primary" onClick={() => openCulture('items')}>进入宗族文化</Button>}>{renderAreaAlert('culture', '宗族文化摘要', cultureState)}<Row gutter={[16, 16]} style={{ marginBottom: 16 }}><Col xs={24} md={8}><Statistic title="正式资料" value={cultureState.loaded ? cultureState.data?.statistics.officialItemCount || 0 : '-'} /></Col><Col xs={24} md={8}><Statistic title="待审核资料" value={cultureState.loaded ? cultureState.data?.statistics.pendingReviewCount || 0 : '-'} /></Col><Col xs={24} md={8}><Text type="secondary">来源覆盖率</Text><Progress percent={cultureState.loaded ? coverage : 0} status={coverage < 60 ? 'exception' : 'normal'} /></Col></Row><Row gutter={[16, 16]}><Col xs={24} xl={12}><Card size="small" title="堂号、郡望与祖籍兼容摘要">{renderEntries(compatibilityEntries, '暂无兼容摘要，请在文化资料中维护并审核发布。')}</Card></Col><Col xs={24} xl={12}><Card size="small" title="精选文化资料">{renderEntries(itemEntries, '暂无正式精选文化资料。')}</Card></Col><Col xs={24} xl={12}><Card size="small" title="迁徙脉络">{renderEntries(migrationEntries, '暂无正式迁徙事件。')}</Card></Col><Col xs={24} xl={12}><Card size="small" title="文化地点">{renderEntries(siteEntries, '暂无正式文化地点。')}</Card></Col></Row></Card>; }

  if ((clansState.status === 'error' || clansState.status === 'forbidden') && !clansState.loaded) return <Space className="statistics-home-page" direction="vertical" size="middle" style={{ width: '100%' }}>{renderAreaAlert('clans', '宗族列表', clansState)}</Space>;
  if (clansState.status === 'loading' && !clansState.loaded) return <Space className="statistics-home-page" direction="vertical" size="middle" style={{ width: '100%' }}><Card><Skeleton active paragraph={{ rows: 4 }} /></Card></Space>;
  if (clansState.loaded && clansState.data.length === 0) return <Space className="statistics-home-page" direction="vertical" size="middle" style={{ width: '100%' }}><Card className="statistics-home-page__empty-onboarding"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<Space direction="vertical" size={6}><Text strong>当前账号尚未创建或加入可见宗族</Text><Text type="secondary">你可以从建谱向导开始创建宗族；如果需要加入已有宗族，请联系宗族管理员邀请。</Text></Space>}><Button type="primary" size="large" onClick={navigateToWizard}>开始建谱</Button></Empty></Card></Space>;
  const rows = detailRows();
  const activeState = drillState();
  const drawerTitle = `${detailBaseTitle()} · ${drillConditionText()} · 共 ${rows.length} 条记录`;
  return <Space className="statistics-home-page" direction="vertical" size="middle" style={{ width: '100%' }}>{renderAreaAlert('clans', '宗族列表', clansState)}{invalidUrlDrill ? <Alert type="warning" showIcon message="下钻参数无效，已安全回到首页概览" description="请从首页指标或结构分布重新打开明细。" /> : null}<Card className="statistics-home-page__clan-summary"><div className="statistics-home-page__clan-summary-header"><div className="statistics-home-page__clan-summary-copy"><Title level={4}>{clanLabel(currentClan)}</Title><Paragraph type="secondary">{display(currentClan?.description, '暂未维护宗族简介')}</Paragraph></div><div className="statistics-home-page__scope"><Text id="statistics-home-current-clan-label" type="secondary">当前宗族</Text><Select aria-labelledby="statistics-home-current-clan-label" className="statistics-home-page__clan-select" size="large" value={String(currentClan?.id || workspace.clanId || '') || undefined} loading={clansState.status === 'loading'} onChange={value => void switchClan(String(value))} options={clansState.data.map(clan => ({ value: String(clan.id), label: clanLabel(clan) }))} /></div></div></Card>{renderMetricSection()}{renderDistributionSection()}{renderTrendSection()}{renderRiskSection()}{renderRecentActivitySection()}{renderCultureSection()}<Drawer title={<Title ref={drawerTitleRef} tabIndex={-1} level={4} className="statistics-home-page__drawer-title">{drawerTitle}</Title>} open={drillOpen} onClose={closeDrill} width={isMobileDrawer ? '100vw' : 720} rootClassName="statistics-home-page__drawer" destroyOnClose><Space direction="vertical" size="middle" style={{ width: '100%' }}>{renderAreaAlert(drillArea(), detailBaseTitle(), activeState)}<Alert type="info" showIcon role="status" message={`当前条件：${drillConditionText()}`} description={`当前明细来自 ${detailBaseTitle()}，共 ${rows.length} 条记录。`} /><div className="statistics-home-page__drawer-table"><Table size="small" bordered rowKey={(_row: any, index) => `${detailBaseTitle()}-${index}`} dataSource={rows} columns={detailColumns()} pagination={{ pageSize: 10 }} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无下钻数据" /> }} scroll={{ x: 'max-content' }} /></div></Space></Drawer></Space>;
}
