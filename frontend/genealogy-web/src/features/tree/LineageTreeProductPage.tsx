import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Input,
  List,
  Pagination,
  Segmented,
  Select,
  Space,
  Switch,
  Tag,
  Typography
} from 'antd';
import { AimOutlined, BranchesOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import type {
  TreeDataView,
  TreeDirection,
  TreeEdgeResponse,
  TreeGraphResponse,
  TreeNodeResponse,
  TreeRelationScope
} from '../../shared/api/generated/tree-types';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Field } from '../../shared/ui/Form';
import { Panel } from '../../shared/ui/Panel';
import { LineageGraphCanvas } from './LineageGraphCanvas';
import { findLineagePath } from './lineageGraphModel';
import {
  edgeIndicators,
  edgeVisual,
  nodeIndicators,
  relationshipDisplayLabel,
  summaryText,
  type LineageIndicator
} from './lineageSemanticsModel';
import {
  readLineageUrlState,
  withLineageUrlState,
  type LineageMode,
  type PersonSearchScope
} from './lineageUrlState';
import { LineageRequestGate, type LineageRequestScope, type PersonSearchItem, type SearchPage } from './lineageRequestState';
import {
  loadBranchLineage,
  loadBranches,
  loadClans,
  loadPersonLineage,
  searchPersons,
  type BranchRow,
  type ClanRow
} from './treeService';
import {
  dataStatusText,
  graphCompletenessText,
  privacyLevelText,
  relationCategoryText,
  relationshipEndpointLabels,
  relationshipEndpointText,
  riskLevelText
} from './treeDisplayModel';

type NavigateTarget = 'personArchive' | 'sourceLibrary' | 'reviewCenter' | 'editingWorkspace';
type Props = {
  notify: (data: unknown, error?: boolean) => void;
  onNavigate?: (view: NavigateTarget) => void;
};
type LoadState = { loading: boolean; error: string };
type SummaryTarget = Pick<TreeNodeResponse, 'evidenceSummary' | 'reviewSummary' | 'anomalySummary'>;

type PersonCard = {
  id: string;
  nodeId?: string;
  name: string;
  gender: string;
  generation: string;
  word: string;
  branchId: string;
  branchName: string;
  years: string;
  status: string;
};

const IDLE: LoadState = { loading: false, error: '' };
const EMPTY_SEARCH: SearchPage<PersonSearchItem> = { records: [], total: 0, pageNo: 1, pageSize: 20, totalPages: 1 };
const PERSON_DEPTH_OPTIONS = [
  { value: '2', label: '上下各 2 代' },
  { value: '3', label: '上下各 3 代' },
  { value: '5', label: '上下各 5 代' },
  { value: '8', label: '上下各 8 代' }
];
const BRANCH_DEPTH_OPTIONS = [
  { value: '3', label: '展开 3 代' },
  { value: '5', label: '展开 5 代' },
  { value: '8', label: '展开 8 代' },
  { value: '12', label: '展开 12 代' }
];
const DIRECTION_OPTIONS = [
  { value: 'family', label: '直接家庭' },
  { value: 'ancestors', label: '上溯祖先' },
  { value: 'descendants', label: '下延后代' },
  { value: 'both', label: '祖先与后代' }
];
const RELATION_OPTIONS = [
  { value: 'blood', label: '血缘' },
  { value: 'ritual', label: '宗法承嗣' },
  { value: 'marriage', label: '婚配' },
  { value: 'status', label: '状态' }
];
const DATA_VIEW_OPTIONS = [
  { value: 'official', label: '正式谱' },
  { value: 'editing', label: '修谱视图' }
];

function text(value: unknown) {
  return value === null || value === undefined ? '' : String(value);
}

function firstChar(name?: string) {
  return (name || '谱').slice(0, 1);
}

function errorMessage(error: unknown) {
  return (error as Error)?.message || '请求失败，请重试';
}

function genderCn(value: string) {
  return ({ male: '男', female: '女', unknown: '未知' } as Record<string, string>)[value] || value || '未知';
}

function confidenceCn(value?: string) {
  return ({ high: '高', medium: '中', low: '低', unknown: '未知' } as Record<string, string>)[value || 'unknown'] || '未知';
}

function reviewCn(value?: string) {
  return ({ none: '无审核记录', pending: '待审核', approved: '已通过', rejected: '已驳回', mixed: '状态混合' } as Record<string, string>)[value || 'none'] || value || '无审核记录';
}

function toPersonFromNode(node: TreeNodeResponse, branches: BranchRow[]): PersonCard {
  const branchId = node.branchId ? String(node.branchId) : '';
  return {
    id: node.personId ? String(node.personId) : '',
    nodeId: node.nodeId,
    name: node.displayName,
    gender: node.gender || 'unknown',
    generation: node.generationNo ? `${node.generationNo}世` : '世次未维护',
    word: node.generationWord || '-',
    branchId,
    branchName: node.branchName || branches.find(item => text(item.id) === branchId)?.branchName || '未归属支派',
    years: node.birthText || node.deathText ? `${node.birthText || '?'}-${node.deathText || ''}` : '-',
    status: dataStatusText(node.dataStatus || (node.visibility === 'masked' ? '受保护' : '已记录'))
  };
}

function branchPath(branches: BranchRow[], branchId: string) {
  const current = branches.find(item => text(item.id) === branchId);
  if (!current) return '未选择支派';
  const map = new Map(branches.map(item => [text(item.id), item]));
  const chain: string[] = [];
  const guard = new Set<string>();
  let node: BranchRow | undefined = current;
  while (node && !guard.has(text(node.id))) {
    guard.add(text(node.id));
    chain.unshift(node.branchName || '未命名支派');
    node = node.parentId ? map.get(text(node.parentId)) : undefined;
  }
  return chain.join(' / ');
}

function relatedEdges(node: TreeNodeResponse, graph: TreeGraphResponse | null) {
  return graph?.edges.filter(edge => edge.fromNodeId === node.nodeId || edge.toNodeId === node.nodeId) || [];
}

function HighlightText({ value, keyword }: { value: string; keyword: string }) {
  const normalized = keyword.trim();
  if (!normalized) return <>{value}</>;
  const index = value.toLowerCase().indexOf(normalized.toLowerCase());
  if (index < 0) return <>{value}</>;
  return <>{value.slice(0, index)}<mark>{value.slice(index, index + normalized.length)}</mark>{value.slice(index + normalized.length)}</>;
}

function IndicatorTags({ indicators }: { indicators: LineageIndicator[] }) {
  if (!indicators.length) return null;
  return (
    <div className="lineage-detail-tags">
      {indicators.map(indicator => (
        <span key={indicator.code} className={`lineage-detail-tag tone-${indicator.tone}`}>{indicator.glyph} · {indicator.label}</span>
      ))}
    </div>
  );
}

function DetailSummary({ target, indicators }: { target: SummaryTarget; indicators: LineageIndicator[] }) {
  if (!target.evidenceSummary && !target.reviewSummary && !target.anomalySummary) return null;
  return (
    <div className="lineage-detail-summary">
      <div className="lineage-detail-summary-grid">
        {target.evidenceSummary ? (
          <div className="lineage-detail-summary-card">
            <span>来源证据</span>
            <strong>{target.evidenceSummary.officialBindingCount}/{target.evidenceSummary.bindingCount} 条正式 · 可信度{confidenceCn(target.evidenceSummary.confidenceLevel)}</strong>
          </div>
        ) : null}
        {target.reviewSummary ? (
          <div className="lineage-detail-summary-card">
            <span>审核状态</span>
            <strong>{reviewCn(target.reviewSummary.state)} · 待审 {target.reviewSummary.pendingTaskCount} · 驳回 {target.reviewSummary.rejectedTaskCount}</strong>
          </div>
        ) : null}
        {target.anomalySummary ? (
          <div className="lineage-detail-summary-card">
            <span>修谱提示</span>
            <strong>{target.anomalySummary.count ? `${target.anomalySummary.count} 项 · ${riskLevelText(target.anomalySummary.highestRisk)}` : '暂无异常'}</strong>
          </div>
        ) : null}
      </div>
      <IndicatorTags indicators={indicators} />
    </div>
  );
}

export function LineageTreeProductPage({ notify, onNavigate }: Props) {
  const workspace = useWorkspace();
  const requestGate = useRef(new LineageRequestGate());
  const initialized = useRef(false);
  const initialUrlState = useRef(readLineageUrlState(window.location.href)).current;

  const [clans, setClans] = useState<ClanRow[]>([]);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [searchScope, setSearchScope] = useState<PersonSearchScope>(initialUrlState.searchScope);
  const [searchPage, setSearchPage] = useState<SearchPage<PersonSearchItem>>(EMPTY_SEARCH);
  const [searchNotice, setSearchNotice] = useState('');
  const [searchCollapsed, setSearchCollapsed] = useState(false);
  const [mode, setMode] = useState<LineageMode>(initialUrlState.mode);
  const [personDepth, setPersonDepth] = useState(initialUrlState.personDepth);
  const [branchDepth, setBranchDepth] = useState(initialUrlState.branchDepth);
  const [direction, setDirection] = useState<TreeDirection>(initialUrlState.direction);
  const [relationScopes, setRelationScopes] = useState<TreeRelationScope[]>(initialUrlState.relationScopes);
  const [dataView, setDataView] = useState<TreeDataView>(initialUrlState.dataView);
  const [includeSubBranches, setIncludeSubBranches] = useState(initialUrlState.includeSubBranches);
  const [selectedBranchId, setSelectedBranchId] = useState(initialUrlState.branchId || workspace.branchId || '');
  const [personGraph, setPersonGraph] = useState<TreeGraphResponse | null>(null);
  const [branchGraph, setBranchGraph] = useState<TreeGraphResponse | null>(null);
  const [selectedNode, setSelectedNode] = useState<TreeNodeResponse | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<TreeEdgeResponse | null>(null);
  const [loadState, setLoadState] = useState<Record<LineageRequestScope, LoadState>>({
    clan: IDLE, search: IDLE, personGraph: IDLE, branchGraph: IDLE
  });

  function setScope(scope: LineageRequestScope, patch: Partial<LoadState>) {
    setLoadState(previous => ({ ...previous, [scope]: { ...previous[scope], ...patch } }));
  }

  function clearSelection() {
    setSelectedNode(null);
    setSelectedEdge(null);
  }

  function clearClanState(clanId: string) {
    requestGate.current.resetClan(clanId);
    setBranches([]);
    setSearchPage(EMPTY_SEARCH);
    setSearchInput('');
    setAppliedKeyword('');
    setSearchNotice('');
    setSelectedBranchId('');
    setPersonGraph(null);
    setBranchGraph(null);
    clearSelection();
    setLoadState({ clan: IDLE, search: IDLE, personGraph: IDLE, branchGraph: IDLE });
    workspace.patch({ clanId, branchId: '', personId: '', relationshipId: '', sourceId: '', sourceFocusReason: '', reviewTaskId: '' });
  }

  async function requestPersonPage(
    clanId: string,
    pageNo: number,
    keyword: string,
    nextBranches = branches,
    requestedScope = searchScope,
    branchId = selectedBranchId
  ) {
    const token = requestGate.current.begin('search');
    setScope('search', { loading: true, error: '' });
    try {
      const page = await searchPersons({
        clanId,
        branchId: requestedScope === 'branch' ? branchId : undefined,
        keyword,
        pageNo,
        branches: nextBranches
      });
      if (!requestGate.current.isCurrent(token)) return null;
      setAppliedKeyword(keyword.trim());
      setSearchPage(page);
      setSearchNotice(page.records.length ? `共匹配 ${page.total} 位人物` : '未找到匹配人物，请调整姓名、谱名、字号或搜索范围。');
      return page;
    } catch (error) {
      if (!requestGate.current.isCurrent(token)) return null;
      const message = errorMessage(error);
      setScope('search', { error: message });
      setSearchNotice('人物搜索失败，可保留当前图谱并重试。');
      return null;
    } finally {
      if (requestGate.current.isCurrent(token)) setScope('search', { loading: false });
    }
  }

  async function loadPersonGraph(
    personId: string,
    options: Partial<{ depth: string; direction: TreeDirection; relationScopes: TreeRelationScope[]; dataView: TreeDataView }> = {}
  ) {
    requestGate.current.invalidate('personGraph');
    if (!personId) {
      setPersonGraph(null);
      setScope('personGraph', IDLE);
      return;
    }
    const token = requestGate.current.begin('personGraph');
    setScope('personGraph', { loading: true, error: '' });
    try {
      const graph = await loadPersonLineage({
        personId,
        direction: options.direction || direction,
        relationScopes: options.relationScopes || relationScopes,
        dataView: options.dataView || dataView,
        depth: options.depth || personDepth
      });
      if (requestGate.current.isCurrent(token)) setPersonGraph(graph);
    } catch (error) {
      if (requestGate.current.isCurrent(token)) setScope('personGraph', { error: errorMessage(error) });
    } finally {
      if (requestGate.current.isCurrent(token)) setScope('personGraph', { loading: false });
    }
  }

  async function loadBranchGraph(
    branchId: string,
    clanId: string,
    options: Partial<{ depth: string; relationScopes: TreeRelationScope[]; dataView: TreeDataView; includeSubBranches: boolean }> = {},
    showNotice = false
  ) {
    requestGate.current.invalidate('branchGraph');
    if (!branchId || !clanId) {
      setBranchGraph(null);
      setScope('branchGraph', IDLE);
      return;
    }
    const token = requestGate.current.begin('branchGraph');
    setScope('branchGraph', { loading: true, error: '' });
    try {
      const graph = await loadBranchLineage({
        clanId,
        branchId,
        relationScopes: options.relationScopes || relationScopes,
        dataView: options.dataView || dataView,
        includeSubBranches: options.includeSubBranches ?? includeSubBranches,
        depth: options.depth || branchDepth
      });
      if (!requestGate.current.isCurrent(token)) return;
      setBranchGraph(graph);
      if (showNotice) notify({ message: `当前支派图已生成：展示 ${graph.meta.nodeCount} 位人物、${graph.meta.edgeCount} 条关系` });
    } catch (error) {
      if (requestGate.current.isCurrent(token)) setScope('branchGraph', { error: errorMessage(error) });
    } finally {
      if (requestGate.current.isCurrent(token)) setScope('branchGraph', { loading: false });
    }
  }

  async function initializeClan(clanId: string, preferredBranchId = '', preferredPersonId = '') {
    clearClanState(clanId);
    if (!clanId) return;
    const token = requestGate.current.begin('clan');
    setScope('clan', { loading: true, error: '' });
    try {
      const branchRows = await loadBranches(clanId);
      if (!requestGate.current.isCurrent(token)) return;
      setBranches(branchRows);
      const nextBranchId = branchRows.some(item => text(item.id) === preferredBranchId) ? preferredBranchId : text(branchRows[0]?.id);
      setSelectedBranchId(nextBranchId);
      const page = await requestPersonPage(clanId, 1, '', branchRows, searchScope, nextBranchId);
      if (!requestGate.current.isCurrent(token)) return;
      const nextPersonId = preferredPersonId || page?.records[0]?.id || '';
      workspace.patch({ clanId, branchId: nextBranchId, personId: nextPersonId, relationshipId: '', sourceId: '', sourceFocusReason: '', reviewTaskId: '' });
      await Promise.all([
        loadPersonGraph(nextPersonId),
        loadBranchGraph(nextBranchId, clanId)
      ]);
    } catch (error) {
      if (requestGate.current.isCurrent(token)) setScope('clan', { error: errorMessage(error) });
    } finally {
      if (requestGate.current.isCurrent(token)) setScope('clan', { loading: false });
    }
  }

  async function loadBase() {
    setScope('clan', { loading: true, error: '' });
    try {
      const clanRows = await loadClans();
      if (initialized.current) return;
      setClans(clanRows);
      const nextClanId = initialUrlState.clanId || workspace.clanId || text(clanRows[0]?.id);
      initialized.current = true;
      await initializeClan(nextClanId, initialUrlState.branchId, initialUrlState.personId);
    } catch (error) {
      setScope('clan', { loading: false, error: errorMessage(error) });
    }
  }

  async function handleClanChange(clanId: string) {
    await initializeClan(clanId);
    notify({ message: clanId ? '宗族已切换，旧图谱和人物状态已清空' : '已清空宗族选择' });
  }

  async function handleBranchChange(branchId: string) {
    setSelectedBranchId(branchId);
    workspace.patch({ branchId, relationshipId: '' });
    clearSelection();
    const tasks: Promise<unknown>[] = [loadBranchGraph(branchId, workspace.clanId, {}, true)];
    if (searchScope === 'branch') tasks.push(requestPersonPage(workspace.clanId, 1, appliedKeyword, branches, 'branch', branchId));
    await Promise.all(tasks);
  }

  async function handleSearchScopeChange(nextScope: PersonSearchScope) {
    setSearchScope(nextScope);
    await requestPersonPage(workspace.clanId, 1, appliedKeyword, branches, nextScope, selectedBranchId);
  }

  async function handlePersonSelection(item: PersonSearchItem) {
    const nextBranchId = item.branchId || selectedBranchId;
    setSelectedBranchId(nextBranchId);
    clearSelection();
    workspace.patch({ personId: item.id, branchId: nextBranchId, relationshipId: '' });
    await Promise.all([
      loadPersonGraph(item.id),
      nextBranchId !== selectedBranchId ? loadBranchGraph(nextBranchId, workspace.clanId) : Promise.resolve()
    ]);
  }

  async function handlePersonDepthChange(nextDepth: string) {
    setPersonDepth(nextDepth);
    clearSelection();
    await loadPersonGraph(workspace.personId, { depth: nextDepth });
  }

  async function handleBranchDepthChange(nextDepth: string) {
    setBranchDepth(nextDepth);
    clearSelection();
    await loadBranchGraph(selectedBranchId, workspace.clanId, { depth: nextDepth }, true);
  }

  async function handleDirectionChange(nextDirection: TreeDirection) {
    setDirection(nextDirection);
    clearSelection();
    await loadPersonGraph(workspace.personId, { direction: nextDirection });
  }

  async function handleRelationScopeChange(nextScopes: TreeRelationScope[]) {
    if (!nextScopes.length) return;
    setRelationScopes(nextScopes);
    clearSelection();
    await Promise.all([
      loadPersonGraph(workspace.personId, { relationScopes: nextScopes }),
      loadBranchGraph(selectedBranchId, workspace.clanId, { relationScopes: nextScopes })
    ]);
  }

  async function handleDataViewChange(nextDataView: TreeDataView) {
    setDataView(nextDataView);
    clearSelection();
    await Promise.all([
      loadPersonGraph(workspace.personId, { dataView: nextDataView }),
      loadBranchGraph(selectedBranchId, workspace.clanId, { dataView: nextDataView })
    ]);
  }

  async function handleIncludeSubBranchesChange(nextValue: boolean) {
    setIncludeSubBranches(nextValue);
    clearSelection();
    await loadBranchGraph(selectedBranchId, workspace.clanId, { includeSubBranches: nextValue }, true);
  }

  async function setAsCenter(node: TreeNodeResponse) {
    if (!node.personId) return;
    const personId = String(node.personId);
    const branchId = node.branchId ? String(node.branchId) : selectedBranchId;
    setSelectedBranchId(branchId);
    setMode('person');
    clearSelection();
    workspace.patch({ personId, branchId, relationshipId: '' });
    await Promise.all([
      loadPersonGraph(personId),
      branchId !== selectedBranchId ? loadBranchGraph(branchId, workspace.clanId) : Promise.resolve()
    ]);
  }

  function selectNode(node: TreeNodeResponse) {
    setSelectedEdge(null);
    setSelectedNode(node);
  }

  function selectEdge(edge: TreeEdgeResponse) {
    setSelectedNode(null);
    setSelectedEdge(edge);
    workspace.setRelationshipId(edge.relationshipId ? String(edge.relationshipId) : '');
  }

  function navigateFromNode(target: NavigateTarget, node: TreeNodeResponse) {
    if (!onNavigate || node.visibility === 'masked') return;
    const personId = node.personId ? String(node.personId) : '';
    const branchId = node.branchId ? String(node.branchId) : selectedBranchId;
    const patch = { personId, branchId, relationshipId: '', sourceId: '', reviewTaskId: '' };
    if (target === 'sourceLibrary') workspace.patch({ ...patch, sourceFocusReason: 'tree_person_evidence' });
    else workspace.patch({ ...patch, sourceFocusReason: '' });
    clearSelection();
    onNavigate(target);
  }

  function navigateFromEdge(target: NavigateTarget, edge: TreeEdgeResponse) {
    if (!onNavigate || edge.visibility === 'masked') return;
    const relationshipId = edge.relationshipId ? String(edge.relationshipId) : '';
    const patch = { relationshipId, sourceId: '', reviewTaskId: '' };
    if (target === 'sourceLibrary') workspace.patch({ ...patch, sourceFocusReason: 'tree_relationship_evidence' });
    else workspace.patch({ ...patch, sourceFocusReason: '' });
    clearSelection();
    onNavigate(target);
  }

  useEffect(() => { void loadBase(); }, []);

  useEffect(() => {
    if (!initialized.current) return;
    const nextUrl = withLineageUrlState(window.location.href, {
      clanId: workspace.clanId,
      branchId: selectedBranchId,
      personId: workspace.personId,
      mode,
      personDepth,
      branchDepth,
      direction,
      relationScopes,
      dataView,
      includeSubBranches,
      searchScope
    });
    window.history.replaceState(window.history.state, '', nextUrl);
  }, [workspace.clanId, selectedBranchId, workspace.personId, mode, personDepth, branchDepth, direction, relationScopes, dataView, includeSubBranches, searchScope]);

  const centerNode = personGraph?.nodes.find(node => node.nodeId === personGraph.rootNodeId)
    || personGraph?.nodes.find(node => node.personId && String(node.personId) === workspace.personId)
    || personGraph?.nodes[0]
    || null;
  const center = centerNode ? toPersonFromNode(centerNode, branches) : null;
  const branchName = branches.find(item => text(item.id) === selectedBranchId)?.branchName || '支派';
  const currentClanName = clans.find(item => text(item.id) === workspace.clanId)?.clanName || '族谱';
  const activeGraph = mode === 'person' ? personGraph : branchGraph;
  const activeLoadState = mode === 'person' ? loadState.personGraph : loadState.branchGraph;
  const activeRoot = activeGraph?.nodes.find(node => node.nodeId === activeGraph.rootNodeId) || activeGraph?.nodes[0] || null;
  const graphCenterNodeId = mode === 'person'
    ? centerNode?.nodeId || activeGraph?.rootNodeId
    : activeGraph?.nodes.some(node => node.nodeId === centerNode?.nodeId) ? centerNode?.nodeId : activeGraph?.rootNodeId;
  const selectedEdges = selectedNode ? relatedEdges(selectedNode, activeGraph) : [];
  const nodeMap = useMemo(() => new Map(activeGraph?.nodes.map(node => [node.nodeId, node]) || []), [activeGraph]);
  const highlightedPath = useMemo(
    () => activeGraph && selectedNode && graphCenterNodeId
      ? findLineagePath(activeGraph, graphCenterNodeId, selectedNode.nodeId)
      : { nodeIds: [], edgeIds: [] },
    [activeGraph, selectedNode, graphCenterNodeId]
  );
  const orderedSearchRecords = useMemo(
    () => [...searchPage.records].sort((left, right) => Number(right.id === workspace.personId) - Number(left.id === workspace.personId)),
    [searchPage.records, workspace.personId]
  );
  const currentDepth = mode === 'person' ? personDepth : branchDepth;
  const currentScopeText = mode === 'person' ? `${center?.name || '中心人物'} · ${DIRECTION_OPTIONS.find(item => item.value === direction)?.label}` : branchPath(branches, selectedBranchId);
  const graphOptions = activeGraph?.nodes
    .filter(node => node.visibility === 'visible')
    .map(node => ({ value: node.nodeId, label: `${node.displayName}${node.generationNo ? ` · ${node.generationNo}世` : ''}` })) || [];

  function locateNode(nodeId: string) {
    const node = activeGraph?.nodes.find(item => item.nodeId === nodeId);
    if (node) selectNode(node);
  }

  const drawerTitle = selectedNode ? '人物详情' : selectedEdge ? '关系详情' : '';
  const endpointLabels = selectedEdge ? relationshipEndpointLabels(selectedEdge) : ['起点人物', '终点人物'] as const;

  return (
    <div className="lineage-page lineage-tree-page">
      <Panel title="世系图谱" description="查询人物后进入单画布工作台，可切换支派全局与人物中心视角，并通过 URL 恢复当前现场。">
        <div className="lineage-search-grid lineage-search-grid--workbench">
          <Field label="宗族">
            <Select
              aria-label="宗族"
              disabled={loadState.clan.loading}
              value={workspace.clanId || undefined}
              placeholder="请选择宗族"
              options={clans.map(clan => ({ value: text(clan.id), label: clan.clanName || clan.surname || '未命名宗族' }))}
              onChange={value => void handleClanChange(value)}
            />
          </Field>
          <Field label="支派图范围">
            <Select
              aria-label="支派图范围"
              value={selectedBranchId || undefined}
              placeholder="请选择支派"
              options={branches.map(branch => ({ value: text(branch.id), label: branch.branchName || '未命名支派' }))}
              onChange={value => void handleBranchChange(value)}
            />
          </Field>
          <Field label="人物搜索范围">
            <Select
              aria-label="人物搜索范围"
              value={searchScope}
              options={[{ value: 'clan', label: '全宗族' }, { value: 'branch', label: '当前支派' }]}
              onChange={value => void handleSearchScopeChange(value as PersonSearchScope)}
            />
          </Field>
          <Field label="搜索人物">
            <Input.Search
              allowClear
              value={searchInput}
              loading={loadState.search.loading}
              enterButton={<><SearchOutlined /> 搜索</>}
              placeholder="输入姓名、谱名或字号"
              onChange={event => setSearchInput(event.target.value)}
              onSearch={value => void requestPersonPage(workspace.clanId, 1, value)}
              disabled={!workspace.clanId || (searchScope === 'branch' && !selectedBranchId)}
            />
          </Field>
        </div>

        <div className={`lineage-search-results ${searchCollapsed ? 'is-collapsed' : ''}`}>
          <div className="lineage-search-results-head">
            <div>
              <Typography.Text strong>查询结果</Typography.Text>
              <Typography.Text type="secondary">
                {loadState.search.error ? `搜索失败：${loadState.search.error}` : searchNotice || `共 ${searchPage.total} 位人物`}
              </Typography.Text>
              <Tag>{searchScope === 'branch' ? '当前支派' : '全宗族'}</Tag>
              {appliedKeyword ? <Tag>条件：{appliedKeyword}</Tag> : null}
            </div>
            <Button type="link" onClick={() => setSearchCollapsed(value => !value)}>{searchCollapsed ? '展开结果' : '收起结果'}</Button>
          </div>
          {!searchCollapsed ? (
            <>
              <div className="lineage-search-results-list">
                <List
                  loading={loadState.search.loading}
                  locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无匹配人物" /> }}
                  dataSource={orderedSearchRecords}
                  renderItem={item => {
                    const active = item.id === workspace.personId;
                    return (
                      <List.Item
                        className={`lineage-search-result-item ${active ? 'is-active' : ''}`}
                        onClick={() => void handlePersonSelection(item)}
                        actions={[<Button key="center" type={active ? 'primary' : 'link'} size="small">{active ? '当前中心' : '设为中心'}</Button>]}
                      >
                        <List.Item.Meta
                          avatar={<span className="lineage-avatar lineage-avatar--search">{firstChar(item.name)}</span>}
                          title={<Space size={8}><Typography.Text strong><HighlightText value={item.name} keyword={appliedKeyword} /></Typography.Text>{item.alias ? <Typography.Text type="secondary"><HighlightText value={item.alias} keyword={appliedKeyword} /></Typography.Text> : null}</Space>}
                          description={<Space size={[6, 4]} wrap><Tag>{item.generation}</Tag><Tag>{item.branchName}</Tag></Space>}
                        />
                      </List.Item>
                    );
                  }}
                />
              </div>
              {searchPage.total > searchPage.pageSize ? (
                <div className="lineage-search-results-pagination">
                  <Pagination
                    current={searchPage.pageNo}
                    pageSize={searchPage.pageSize}
                    total={searchPage.total}
                    showSizeChanger={false}
                    showTotal={total => `共 ${total} 条`}
                    disabled={loadState.search.loading}
                    onChange={page => void requestPersonPage(workspace.clanId, page, appliedKeyword)}
                  />
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </Panel>

      <section className="lineage-workbench">
        <div className="lineage-workbench-head">
          <div><span>{currentClanName}</span><h3>中国式世系关系工作台</h3><p>围绕当前人物或支派定位真实关系路径，详情在右侧展开，不遮挡图谱。</p></div>
          <Segmented
            aria-label="图谱视角"
            value={mode}
            options={[
              { value: 'person', label: <Space size={6}><UserOutlined />人物中心</Space> },
              { value: 'branch', label: <Space size={6}><BranchesOutlined />支派全局</Space> }
            ]}
            onChange={value => { setMode(value as LineageMode); clearSelection(); }}
          />
        </div>

        <div className="summary-card lineage-workbench-summary">
          <div><span>当前范围</span><strong>{mode === 'person' ? center?.name || '-' : branchName}</strong></div>
          <div><span>当前展示人物</span><strong>{activeGraph?.meta.nodeCount ?? '-'}</strong></div>
          <div><span>当前展示关系</span><strong>{activeGraph?.meta.edgeCount ?? '-'}</strong></div>
          <div><span>当前图谱起点</span><strong>{activeRoot?.displayName || '-'}</strong></div>
          <div><span>实际展开深度</span><strong>{activeGraph?.meta.appliedDepth ?? currentDepth} 代</strong></div>
          <div><span>数据完整性</span><strong title={graphCompletenessText(activeGraph?.meta)}>{graphCompletenessText(activeGraph?.meta)}</strong></div>
        </div>

        <div className="lineage-query-toolbar">
          <Field label="图内定位">
            <Select
              aria-label="图内定位人物"
              showSearch
              allowClear
              value={selectedNode?.nodeId}
              placeholder="搜索当前图人物"
              optionFilterProp="label"
              options={graphOptions}
              suffixIcon={<AimOutlined />}
              onChange={value => value ? locateNode(value) : clearSelection()}
            />
          </Field>
          {mode === 'person' ? (
            <Field label="查看方向">
              <Select aria-label="人物图查看方向" value={direction} options={DIRECTION_OPTIONS} onChange={value => void handleDirectionChange(value as TreeDirection)} />
            </Field>
          ) : null}
          <Field label="关系范围">
            <Select
              aria-label="关系范围"
              mode="multiple"
              value={relationScopes}
              maxTagCount="responsive"
              options={RELATION_OPTIONS}
              onChange={values => void handleRelationScopeChange(values as TreeRelationScope[])}
            />
          </Field>
          <Field label="数据视图">
            <Select aria-label="数据视图" value={dataView} options={DATA_VIEW_OPTIONS} onChange={value => void handleDataViewChange(value as TreeDataView)} />
          </Field>
          <Field label="展开深度">
            <Select
              aria-label={mode === 'person' ? '人物中心展开深度' : '支派全局展开深度'}
              value={mode === 'person' ? personDepth : branchDepth}
              options={mode === 'person' ? PERSON_DEPTH_OPTIONS : BRANCH_DEPTH_OPTIONS}
              onChange={value => mode === 'person' ? void handlePersonDepthChange(value) : void handleBranchDepthChange(value)}
            />
          </Field>
          {mode === 'branch' ? (
            <Field label="包含下级支派">
              <div className="lineage-switch-field"><Switch checked={includeSubBranches} onChange={value => void handleIncludeSubBranchesChange(value)} /><span>{includeSubBranches ? '包含' : '仅当前支派'}</span></div>
            </Field>
          ) : null}
        </div>

        <section className={`lineage-logic-card lineage-logic-card--${mode}`}>
          <div className="lineage-tree-title">
            <div><span>{currentScopeText}</span><h3>{mode === 'person' ? `${center?.name || '中心人物'} 的中心世系拓扑` : '支派全局拓扑'}</h3></div>
            <small>{relationScopes.map(value => RELATION_OPTIONS.find(item => item.value === value)?.label).filter(Boolean).join(' · ')}</small>
          </div>
          {activeLoadState.error ? <Alert type="error" showIcon message={`${mode === 'person' ? '人物图' : '支派图'}加载失败：${activeLoadState.error}`} action={<Button type="link" size="small" onClick={() => mode === 'person' ? void loadPersonGraph(workspace.personId) : void loadBranchGraph(selectedBranchId, workspace.clanId)}>重试</Button>} /> : null}
          <LineageGraphCanvas
            graph={activeGraph}
            loading={activeLoadState.loading}
            emptyText={mode === 'person' ? '请从查询结果中选择中心人物。' : '暂无支派世系数据。'}
            activeNodeId={graphCenterNodeId}
            selectedNodeId={selectedNode?.nodeId}
            selectedEdgeId={selectedEdge?.edgeId}
            highlightedNodeIds={highlightedPath.nodeIds}
            highlightedEdgeIds={highlightedPath.edgeIds}
            focusNodeId={selectedNode?.nodeId}
            autoFocus={mode === 'person' ? 'active' : 'fit'}
            relationScopes={relationScopes}
            onSelectNode={selectNode}
            onSelectEdge={selectEdge}
            onSetCenter={node => void setAsCenter(node)}
          />
        </section>
      </section>

      <Drawer
        title={drawerTitle}
        width={560}
        open={Boolean(selectedNode || selectedEdge)}
        onClose={clearSelection}
        destroyOnClose
      >
        {selectedNode ? (
          <div className="lineage-drawer-content">
            <div className="lineage-pop-head"><span className="lineage-avatar">{firstChar(selectedNode.displayName)}</span><div><h3>{selectedNode.displayName}</h3><p>{selectedNode.visibility === 'masked' ? '隐私保护人物' : `${genderCn(selectedNode.gender || 'unknown')} · ${selectedNode.generationNo ? `${selectedNode.generationNo}世` : '世次未维护'} · ${selectedNode.generationWord || '-'}字辈`}</p></div></div>
            <Descriptions
              bordered
              size="small"
              column={1}
              items={[
                { key: 'branch', label: '所属支派', children: selectedNode.visibility === 'masked' ? '受保护' : selectedNode.branchName || '未标注' },
                { key: 'years', label: '生卒信息', children: selectedNode.visibility === 'masked' ? '受保护' : selectedNode.birthText || selectedNode.deathText ? `${selectedNode.birthText || '?'}-${selectedNode.deathText || ''}` : '-' },
                { key: 'status', label: '数据状态', children: dataStatusText(selectedNode.dataStatus || (selectedNode.visibility === 'masked' ? '受保护' : '已记录')) },
                { key: 'privacy', label: '可见范围', children: selectedNode.visibility === 'masked' ? '安全占位' : privacyLevelText(selectedNode.privacyLevel) }
              ]}
            />
            {selectedNode.visibility !== 'masked' ? <DetailSummary target={selectedNode} indicators={nodeIndicators(selectedNode)} /> : <IndicatorTags indicators={nodeIndicators(selectedNode)} />}
            <Divider orientation="left">相关关系</Divider>
            <List
              size="small"
              locale={{ emptyText: '暂无可见关系记录' }}
              dataSource={selectedEdges}
              renderItem={edge => {
                const fromName = nodeMap.get(edge.fromNodeId)?.displayName || '受保护人物';
                const toName = nodeMap.get(edge.toNodeId)?.displayName || '受保护人物';
                return <List.Item onClick={() => selectEdge(edge)} className="lineage-related-edge"><List.Item.Meta title={relationshipDisplayLabel(edge)} description={`${relationshipEndpointText(edge, fromName, toName)}${summaryText(edge.evidenceSummary, edge.reviewSummary, edge.anomalySummary) ? ` · ${summaryText(edge.evidenceSummary, edge.reviewSummary, edge.anomalySummary)}` : ''}`} /></List.Item>;
              }}
            />
            <Divider />
            <Space wrap>
              {selectedNode.personId ? <Button type="primary" onClick={() => void setAsCenter(selectedNode)}>设为中心人物</Button> : null}
              {selectedNode.personId && onNavigate ? <Button onClick={() => navigateFromNode('personArchive', selectedNode)}>查看人物档案</Button> : null}
              {selectedNode.evidenceSummary && onNavigate ? <Button onClick={() => navigateFromNode('sourceLibrary', selectedNode)}>查看来源证据</Button> : null}
              {selectedNode.reviewSummary && selectedNode.reviewSummary.state !== 'none' && onNavigate ? <Button onClick={() => navigateFromNode('reviewCenter', selectedNode)}>进入审核中心</Button> : null}
              {selectedNode.anomalySummary?.count && onNavigate ? <Button onClick={() => navigateFromNode('editingWorkspace', selectedNode)}>进入修谱工作台</Button> : null}
            </Space>
          </div>
        ) : null}

        {selectedEdge ? (
          <div className="lineage-drawer-content">
            <div className="lineage-edge-pop-head"><h3>{relationshipDisplayLabel(selectedEdge)}</h3><p>{edgeVisual(selectedEdge).description}</p></div>
            <Descriptions
              bordered
              size="small"
              column={1}
              items={[
                { key: 'from', label: endpointLabels[0], children: nodeMap.get(selectedEdge.fromNodeId)?.displayName || '受保护人物' },
                { key: 'to', label: endpointLabels[1], children: nodeMap.get(selectedEdge.toNodeId)?.displayName || '受保护人物' },
                { key: 'category', label: '关系类别', children: relationCategoryText(selectedEdge.relationCategory) },
                { key: 'status', label: '数据状态', children: dataStatusText(selectedEdge.dataStatus) }
              ]}
            />
            <DetailSummary target={selectedEdge} indicators={edgeIndicators(selectedEdge)} />
            <Divider />
            <Space wrap>
              {selectedEdge.evidenceSummary && onNavigate ? <Button type="primary" onClick={() => navigateFromEdge('sourceLibrary', selectedEdge)}>查看来源证据</Button> : null}
              {selectedEdge.reviewSummary && selectedEdge.reviewSummary.state !== 'none' && onNavigate ? <Button onClick={() => navigateFromEdge('reviewCenter', selectedEdge)}>进入审核中心</Button> : null}
              {selectedEdge.anomalySummary?.count && onNavigate ? <Button onClick={() => navigateFromEdge('editingWorkspace', selectedEdge)}>进入修谱工作台</Button> : null}
            </Space>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
