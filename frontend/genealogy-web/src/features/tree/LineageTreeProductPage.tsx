import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Divider,
  Drawer,
  Dropdown,
  Empty,
  Grid,
  List,
  Pagination,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography
} from 'antd';
import type { MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  AimOutlined,
  ApartmentOutlined,
  BranchesOutlined,
  DownOutlined,
  MoreOutlined,
  SearchOutlined,
  UnorderedListOutlined,
  UpOutlined,
  UserOutlined
} from '@ant-design/icons';
import type {
  TreeDirection,
  TreeEdgeResponse,
  TreeGraphResponse,
  TreeNodeResponse,
  TreeRelationScope
} from '../../shared/api/generated/tree-types';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Field } from '../../shared/ui/Form';
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
  type LineageMode
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
  privacyLevelText,
  relationCategoryText,
  relationshipEndpointLabels,
  relationshipEndpointText,
  riskLevelText
} from './treeDisplayModel';
import './lineage-workbench-issue376.css';
import './lineage-double-card.css';

type NavigateTarget = 'personArchive' | 'sourceLibrary' | 'reviewCenter' | 'editingWorkspace';
type Props = {
  notify: (data: unknown, error?: boolean) => void;
  onNavigate?: (view: NavigateTarget) => void;
};
type LoadState = { loading: boolean; error: string };
type SummaryTarget = Pick<TreeNodeResponse, 'evidenceSummary' | 'reviewSummary' | 'anomalySummary'>;
type CanvasView = 'graph' | 'list';

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
const LIST_PAGE_SIZE = 10;
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
const RELATION_OPTIONS: Array<{ value: TreeRelationScope; label: string }> = [
  { value: 'blood', label: '血缘' },
  { value: 'ritual', label: '宗法承嗣' },
  { value: 'marriage', label: '婚配' },
  { value: 'status', label: '状态' }
];
const ALL_RELATION_SCOPES = RELATION_OPTIONS.map(item => item.value);

function text(value: unknown) {
  return value === null || value === undefined ? '' : String(value);
}

function sameRelationScopes(left: TreeRelationScope[], right: TreeRelationScope[]) {
  if (left.length !== right.length) return false;
  const normalizedLeft = [...left].sort();
  const normalizedRight = [...right].sort();
  return normalizedLeft.every((value, index) => value === normalizedRight[index]);
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
  return ({ high: '高可信', medium: '中可信', low: '低可信', unknown: '可信度未知' } as Record<string, string>)[value || 'unknown'] || '可信度未知';
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
    status: dataStatusText(node.dataStatus || (node.visibility === 'masked' ? '受保护' : 'official'))
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
            <strong>{target.evidenceSummary.officialBindingCount}/{target.evidenceSummary.bindingCount} 条正式 · {confidenceCn(target.evidenceSummary.confidenceLevel)}</strong>
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

function RelationScopeSelect({ value, onChange }: { value: TreeRelationScope[]; onChange: (value: TreeRelationScope[]) => void }) {
  function renderPopup(menu: ReactNode) {
    return (
      <div>
        <div className="lineage-select-all-actions" onMouseDown={event => event.preventDefault()}>
          <Button type="link" size="small" onClick={() => onChange([...ALL_RELATION_SCOPES])}>全选</Button>
          <Button type="link" size="small" onClick={() => onChange([])}>清空</Button>
        </div>
        <Divider className="lineage-select-all-divider" />
        {menu}
      </div>
    );
  }

  return (
    <Select<TreeRelationScope[]>
      aria-label="关系范围"
      mode="multiple"
      allowClear
      showSearch
      optionFilterProp="label"
      value={value}
      maxTagCount="responsive"
      options={RELATION_OPTIONS}
      placeholder="请选择关系范围"
      popupRender={renderPopup}
      onChange={values => onChange(values as TreeRelationScope[])}
    />
  );
}

export function LineageTreeProductPage({ notify, onNavigate }: Props) {
  const workspace = useWorkspace();
  const screens = Grid.useBreakpoint();
  const requestGate = useRef(new LineageRequestGate());
  const initialized = useRef(false);
  const initialUrlState = useRef(readLineageUrlState(window.location.href)).current;

  const [clans, setClans] = useState<ClanRow[]>([]);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchPage, setSearchPage] = useState<SearchPage<PersonSearchItem>>(EMPTY_SEARCH);
  const [mode, setMode] = useState<LineageMode>(initialUrlState.mode);
  const [canvasView, setCanvasView] = useState<CanvasView>('graph');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [listPage, setListPage] = useState(1);
  const [personDepth, setPersonDepth] = useState(initialUrlState.personDepth);
  const [branchDepth, setBranchDepth] = useState(initialUrlState.branchDepth);
  const [direction, setDirection] = useState<TreeDirection>(initialUrlState.direction);
  const [relationScopes, setRelationScopes] = useState<TreeRelationScope[]>([...initialUrlState.relationScopes]);
  const [includeSubBranches, setIncludeSubBranches] = useState(initialUrlState.includeSubBranches);
  const initialBranchId = initialUrlState.branchId || workspace.branchId || '';
  const [selectedBranchId, setSelectedBranchId] = useState(initialBranchId);
  const [appliedPersonDepth, setAppliedPersonDepth] = useState(initialUrlState.personDepth);
  const [appliedBranchDepth, setAppliedBranchDepth] = useState(initialUrlState.branchDepth);
  const [appliedDirection, setAppliedDirection] = useState<TreeDirection>(initialUrlState.direction);
  const [appliedPersonRelationScopes, setAppliedPersonRelationScopes] = useState<TreeRelationScope[]>([...initialUrlState.relationScopes]);
  const [appliedBranchRelationScopes, setAppliedBranchRelationScopes] = useState<TreeRelationScope[]>([...initialUrlState.relationScopes]);
  const [appliedIncludeSubBranches, setAppliedIncludeSubBranches] = useState(initialUrlState.includeSubBranches);
  const [appliedBranchId, setAppliedBranchId] = useState(initialBranchId);
  const [personGraph, setPersonGraph] = useState<TreeGraphResponse | null>(null);
  const [branchGraph, setBranchGraph] = useState<TreeGraphResponse | null>(null);
  const [selectedNode, setSelectedNode] = useState<TreeNodeResponse | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<TreeEdgeResponse | null>(null);
  const [locatedNodeId, setLocatedNodeId] = useState('');
  const [personGraphVersion, setPersonGraphVersion] = useState(0);
  const [loadState, setLoadState] = useState<Record<LineageRequestScope, LoadState>>({ clan: IDLE, search: IDLE, personGraph: IDLE, branchGraph: IDLE });

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
    setSelectedBranchId('');
    setAppliedBranchId('');
    setLocatedNodeId('');
    setPersonGraph(null);
    setBranchGraph(null);
    setListPage(1);
    clearSelection();
    setLoadState({ clan: IDLE, search: IDLE, personGraph: IDLE, branchGraph: IDLE });
    workspace.patch({ clanId, branchId: '', personId: '', relationshipId: '', sourceId: '', sourceFocusReason: '', reviewTaskId: '' });
  }

  async function requestPersonPage(clanId: string, pageNo: number, keyword: string, nextBranches = branches, branchId = selectedBranchId) {
    const token = requestGate.current.begin('search');
    setScope('search', { loading: true, error: '' });
    try {
      const page = await searchPersons({ clanId, branchId: branchId || undefined, keyword, pageNo, branches: nextBranches });
      if (!requestGate.current.isCurrent(token)) return null;
      setSearchPage(page);
      return page;
    } catch (error) {
      if (!requestGate.current.isCurrent(token)) return null;
      setScope('search', { error: errorMessage(error) });
      return null;
    } finally {
      if (requestGate.current.isCurrent(token)) setScope('search', { loading: false });
    }
  }

  async function loadPersonGraph(personId: string, options: Partial<{ depth: string; direction: TreeDirection; relationScopes: TreeRelationScope[]; branchId: string }> = {}) {
    requestGate.current.invalidate('personGraph');
    if (!personId) {
      setPersonGraph(null);
      setScope('personGraph', IDLE);
      return null;
    }
    const token = requestGate.current.begin('personGraph');
    setScope('personGraph', { loading: true, error: '' });
    try {
      const graph = await loadPersonLineage({
        personId,
        branchId: options.branchId || selectedBranchId || undefined,
        direction: options.direction || appliedDirection,
        relationScopes: options.relationScopes || appliedPersonRelationScopes,
        dataView: 'official',
        depth: options.depth || appliedPersonDepth
      });
      if (!requestGate.current.isCurrent(token)) return null;
      setPersonGraph(graph);
      setPersonGraphVersion(version => version + 1);
      return graph;
    } catch (error) {
      if (requestGate.current.isCurrent(token)) setScope('personGraph', { error: errorMessage(error) });
      return null;
    } finally {
      if (requestGate.current.isCurrent(token)) setScope('personGraph', { loading: false });
    }
  }

  async function loadBranchGraph(branchId: string, clanId: string, options: Partial<{ depth: string; relationScopes: TreeRelationScope[]; includeSubBranches: boolean }> = {}) {
    requestGate.current.invalidate('branchGraph');
    if (!branchId || !clanId) {
      setBranchGraph(null);
      setScope('branchGraph', IDLE);
      return null;
    }
    const token = requestGate.current.begin('branchGraph');
    setScope('branchGraph', { loading: true, error: '' });
    try {
      const graph = await loadBranchLineage({
        clanId,
        branchId,
        relationScopes: options.relationScopes || appliedBranchRelationScopes,
        dataView: 'official',
        includeSubBranches: options.includeSubBranches ?? appliedIncludeSubBranches,
        depth: options.depth || appliedBranchDepth
      });
      if (!requestGate.current.isCurrent(token)) return null;
      setBranchGraph(graph);
      return graph;
    } catch (error) {
      if (requestGate.current.isCurrent(token)) setScope('branchGraph', { error: errorMessage(error) });
      return null;
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
      setAppliedBranchId(nextBranchId);
      const page = await requestPersonPage(clanId, 1, '', branchRows, nextBranchId);
      if (!requestGate.current.isCurrent(token)) return;
      const nextPersonId = preferredPersonId || page?.records[0]?.id || '';
      workspace.patch({ clanId, branchId: nextBranchId, personId: nextPersonId, relationshipId: '', sourceId: '', sourceFocusReason: '', reviewTaskId: '' });
      await Promise.all([
        loadPersonGraph(nextPersonId, { branchId: nextBranchId }),
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

  function handleBranchChange(branchId: string) {
    setSelectedBranchId(branchId || '');
    setListPage(1);
    clearSelection();
    setLocatedNodeId('');
    if (workspace.clanId) void requestPersonPage(workspace.clanId, 1, searchInput, branches, branchId || '');
  }

  async function applyGraphQuery() {
    clearSelection();
    setLocatedNodeId('');
    setListPage(1);
    if (mode === 'person') {
      const graph = await loadPersonGraph(workspace.personId, { depth: personDepth, direction, relationScopes, branchId: selectedBranchId });
      if (!graph) return;
      setAppliedPersonDepth(personDepth);
      setAppliedDirection(direction);
      setAppliedPersonRelationScopes([...relationScopes]);
      setAppliedBranchId(selectedBranchId);
      return;
    }
    const graph = await loadBranchGraph(selectedBranchId, workspace.clanId, { depth: branchDepth, relationScopes, includeSubBranches });
    if (!graph) return;
    setAppliedBranchId(selectedBranchId);
    setAppliedBranchDepth(branchDepth);
    setAppliedBranchRelationScopes([...relationScopes]);
    setAppliedIncludeSubBranches(includeSubBranches);
  }

  async function handlePersonSearch(keyword: string) {
    setSearchInput(keyword);
    if (!workspace.clanId) return;
    await requestPersonPage(workspace.clanId, 1, keyword, branches, selectedBranchId);
  }

  function resetQuery() {
    setShowMoreFilters(false);
    setListPage(1);
    setLocatedNodeId('');
    clearSelection();
    if (mode === 'person') {
      setSearchInput(center?.name || '');
      setRelationScopes([...appliedPersonRelationScopes]);
      setPersonDepth(appliedPersonDepth);
      setDirection(appliedDirection);
      setSelectedBranchId(center?.branchId || appliedBranchId || selectedBranchId);
      return;
    }
    setRelationScopes([...appliedBranchRelationScopes]);
    setBranchDepth(appliedBranchDepth);
    setSelectedBranchId(appliedBranchId || selectedBranchId);
    setIncludeSubBranches(appliedIncludeSubBranches);
  }

  async function handlePersonSelection(item: PersonSearchItem) {
    const nextBranchId = item.branchId || selectedBranchId;
    setSearchInput(item.name);
    setSelectedBranchId(nextBranchId);
    setRelationScopes([...appliedPersonRelationScopes]);
    setLocatedNodeId('');
    setListPage(1);
    clearSelection();
    workspace.patch({ personId: item.id, branchId: nextBranchId, relationshipId: '' });
    await loadPersonGraph(item.id, { branchId: nextBranchId });
  }

  async function setAsCenter(node: TreeNodeResponse) {
    if (!node.personId) return;
    const personId = String(node.personId);
    const branchId = node.branchId ? String(node.branchId) : selectedBranchId;
    setSelectedBranchId(branchId);
    setMode('person');
    setRelationScopes([...appliedPersonRelationScopes]);
    setLocatedNodeId('');
    setListPage(1);
    clearSelection();
    workspace.patch({ personId, branchId, relationshipId: '' });
    await loadPersonGraph(personId, { branchId });
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

  useEffect(() => {
    void loadBase();
  }, []);

  useEffect(() => {
    if (!initialized.current) return;
    const nextUrl = withLineageUrlState(window.location.href, {
      clanId: workspace.clanId,
      branchId: appliedBranchId,
      personId: workspace.personId,
      mode,
      personDepth: appliedPersonDepth,
      branchDepth: appliedBranchDepth,
      direction: appliedDirection,
      relationScopes: mode === 'person' ? appliedPersonRelationScopes : appliedBranchRelationScopes,
      includeSubBranches: appliedIncludeSubBranches
    });
    window.history.replaceState(window.history.state, '', nextUrl);
  }, [workspace.clanId, appliedBranchId, workspace.personId, mode, appliedPersonDepth, appliedBranchDepth, appliedDirection, appliedPersonRelationScopes, appliedBranchRelationScopes, appliedIncludeSubBranches]);

  const centerNode = personGraph?.nodes.find(node => node.nodeId === personGraph.rootNodeId)
    || personGraph?.nodes.find(node => node.personId && String(node.personId) === workspace.personId)
    || personGraph?.nodes[0]
    || null;
  const center = centerNode ? toPersonFromNode(centerNode, branches) : null;
  const personOptions = [
    ...(center && !searchPage.records.some(item => item.id === center.id)
      ? [{ value: center.id, label: `${center.name} · ${center.generation} · ${center.branchName}` }]
      : []),
    ...searchPage.records.map(item => ({ value: item.id, label: item.label }))
  ];
  const currentClanName = clans.find(item => text(item.id) === workspace.clanId)?.clanName || '族谱';
  const activeGraph = mode === 'person' ? personGraph : branchGraph;
  const activeLoadState = mode === 'person' ? loadState.personGraph : loadState.branchGraph;
  const activeRelationScopes = mode === 'person' ? appliedPersonRelationScopes : appliedBranchRelationScopes;
  const graphCenterNodeId = mode === 'person'
    ? centerNode?.nodeId || activeGraph?.rootNodeId
    : activeGraph?.nodes.some(node => node.nodeId === centerNode?.nodeId) ? centerNode?.nodeId : activeGraph?.rootNodeId;
  const selectedEdges = selectedNode ? relatedEdges(selectedNode, activeGraph) : [];
  const nodeMap = useMemo(() => new Map(activeGraph?.nodes.map(node => [node.nodeId, node]) || []), [activeGraph]);
  const locatedNode = activeGraph?.nodes.find(node => node.nodeId === locatedNodeId) || null;
  const highlightedPath = useMemo(
    () => activeGraph && locatedNode && graphCenterNodeId
      ? findLineagePath(activeGraph, graphCenterNodeId, locatedNode.nodeId)
      : { nodeIds: [], edgeIds: [] },
    [activeGraph, locatedNode, graphCenterNodeId]
  );
  const graphOptions = activeGraph?.nodes
    .filter(node => node.visibility === 'visible')
    .map(node => ({ value: node.nodeId, label: `${node.displayName}${node.generationNo ? ` · ${node.generationNo}世` : ''}${node.branchName ? ` · ${node.branchName}` : ''}` })) || [];
  const appliedDepthText = mode === 'person'
    ? PERSON_DEPTH_OPTIONS.find(item => item.value === appliedPersonDepth)?.label
    : BRANCH_DEPTH_OPTIONS.find(item => item.value === appliedBranchDepth)?.label;
  const queryDirty = mode === 'person'
    ? personDepth !== appliedPersonDepth
      || direction !== appliedDirection
      || selectedBranchId !== appliedBranchId
      || !sameRelationScopes(relationScopes, appliedPersonRelationScopes)
    : selectedBranchId !== appliedBranchId
      || branchDepth !== appliedBranchDepth
      || includeSubBranches !== appliedIncludeSubBranches
      || !sameRelationScopes(relationScopes, appliedBranchRelationScopes);

  useEffect(() => {
    if (locatedNodeId && !activeGraph?.nodes.some(node => node.nodeId === locatedNodeId)) setLocatedNodeId('');
    setListPage(1);
  }, [activeGraph, locatedNodeId]);

  function locateNode(nodeId: string) {
    setLocatedNodeId(activeGraph?.nodes.some(item => item.nodeId === nodeId) ? nodeId : '');
  }

  async function handleModeChange(nextMode: LineageMode) {
    setMode(nextMode);
    setRelationScopes([...(nextMode === 'person' ? appliedPersonRelationScopes : appliedBranchRelationScopes)]);
    setShowMoreFilters(false);
    setListPage(1);
    clearSelection();
    setLocatedNodeId('');
    if (nextMode === 'person') await loadPersonGraph(workspace.personId, { branchId: selectedBranchId });
    else await loadBranchGraph(appliedBranchId || selectedBranchId, workspace.clanId);
  }

  function relationToCenter(node: TreeNodeResponse) {
    if (node.nodeId === graphCenterNodeId) return '中心人物';
    const edge = activeGraph?.edges.find(item => (
      item.fromNodeId === graphCenterNodeId && item.toNodeId === node.nodeId
    ) || (
      item.toNodeId === graphCenterNodeId && item.fromNodeId === node.nodeId
    ));
    return edge ? relationshipDisplayLabel(edge) : '间接关联';
  }

  const sortedNodes = useMemo(
    () => [...(activeGraph?.nodes || [])].sort((left, right) => (
      (left.generationNo || 9999) - (right.generationNo || 9999)
      || left.displayName.localeCompare(right.displayName)
    )),
    [activeGraph]
  );
  const pagedNodes = sortedNodes.slice((listPage - 1) * LIST_PAGE_SIZE, listPage * LIST_PAGE_SIZE);
  const listColumns: ColumnsType<TreeNodeResponse> = [
    {
      title: '人物',
      dataIndex: 'displayName',
      key: 'displayName',
      fixed: 'left',
      width: 160,
      render: (_value, node) => (
        <Space size={8}>
          <span className="lineage-avatar lineage-avatar--table">{firstChar(node.displayName)}</span>
          <Typography.Link onClick={() => selectNode(node)}>{node.displayName}</Typography.Link>
          {node.nodeId === graphCenterNodeId ? <Tag color="processing">中心</Tag> : null}
        </Space>
      )
    },
    {
      title: '世次 / 字辈',
      key: 'generation',
      width: 150,
      render: (_value, node) => node.visibility === 'masked'
        ? '信息受保护'
        : `${node.generationNo ? `${node.generationNo}世` : '世次未维护'} · ${node.generationWord || '-'}字辈`
    },
    {
      title: '所属支派',
      dataIndex: 'branchName',
      key: 'branchName',
      width: 140,
      render: (value, node) => node.visibility === 'masked' ? '受保护' : value || '未标注'
    },
    {
      title: '关系',
      key: 'relationship',
      width: 140,
      render: (_value, node) => relationToCenter(node)
    },
    {
      title: '状态',
      key: 'status',
      width: 120,
      render: (_value, node) => <Tag>{dataStatusText(node.dataStatus || (node.visibility === 'masked' ? '受保护' : 'official'))}</Tag>
    },
    {
      title: '证据',
      key: 'evidence',
      width: 160,
      render: (_value, node) => node.evidenceSummary
        ? `${node.evidenceSummary.bindingCount} 条 · ${confidenceCn(node.evidenceSummary.confidenceLevel)}`
        : '-'
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 92,
      render: (_value, node) => <Button type="link" onClick={() => selectNode(node)}>查看</Button>
    }
  ];

  const resultMeta = (
    <div className="lineage-result-meta">
      <Space size={[4, 6]} wrap>
        <Tag color="blue">{mode === 'person' ? '人物中心' : '支派全局'}</Tag>
        <Tag>{currentClanName}</Tag>
        <Tag>{mode === 'person' ? center?.name || '未选择中心人物' : branchPath(branches, appliedBranchId)}</Tag>
        {mode === 'person' ? <Tag>{DIRECTION_OPTIONS.find(item => item.value === appliedDirection)?.label}</Tag> : null}
        {appliedDepthText ? <Tag>{appliedDepthText}</Tag> : null}
        {activeRelationScopes.map(value => <Tag key={value}>{RELATION_OPTIONS.find(item => item.value === value)?.label}</Tag>)}
      </Space>
      <div className="lineage-result-legend" aria-label="图谱图例">
        <span><i className="tone-center" />中心人物</span>
        <span><i className="tone-official" />正式数据</span>
        <span><i className="tone-review" />待核验</span>
        <span><i className="tone-marriage" />婚配关系</span>
      </div>
    </div>
  );

  const graphResult = (
    <div className="lineage-result-pane">
      {resultMeta}
      <div className="lineage-result-toolbar lineage-result-toolbar--double-card">
        <Field label="图内定位">
          <Select
            aria-label="图内定位人物"
            showSearch
            allowClear
            value={locatedNodeId || undefined}
            placeholder="搜索当前图人物"
            optionFilterProp="label"
            options={graphOptions}
            suffixIcon={<AimOutlined />}
            onChange={value => locateNode(value || '')}
          />
        </Field>
      </div>
      {activeLoadState.error ? (
        <Alert
          type="error"
          showIcon
          message={`${mode === 'person' ? '人物图' : '支派图'}加载失败：${activeLoadState.error}`}
          action={(
            <Space>
              <Button type="link" onClick={() => setCanvasView('list')}>查看列表</Button>
              <Button type="link" onClick={() => mode === 'person'
                ? void loadPersonGraph(workspace.personId, { branchId: selectedBranchId })
                : void loadBranchGraph(selectedBranchId, workspace.clanId)}>
                重试
              </Button>
            </Space>
          )}
        />
      ) : null}
      <section className={`lineage-logic-card lineage-logic-card--${mode}`}>
        <LineageGraphCanvas
          key={`graph-${mode}-${personGraphVersion}`}
          graph={activeGraph}
          loading={activeLoadState.loading}
          emptyText={mode === 'person' ? '请选择中心人物后查询。' : '请选择支派后查询。'}
          activeNodeId={graphCenterNodeId}
          selectedNodeId={selectedNode?.nodeId}
          selectedEdgeId={selectedEdge?.edgeId}
          highlightedNodeIds={highlightedPath.nodeIds}
          highlightedEdgeIds={highlightedPath.edgeIds}
          focusNodeId={locatedNodeId}
          autoFocus={mode === 'person' ? 'active' : 'fit'}
          relationScopes={activeRelationScopes}
          onSelectNode={selectNode}
          onSelectEdge={selectEdge}
          onSetCenter={node => void setAsCenter(node)}
        />
      </section>
    </div>
  );

  const listResult = (
    <div className="lineage-result-pane">
      {resultMeta}
      {activeLoadState.error ? (
        <Alert
          type="error"
          showIcon
          message={`${mode === 'person' ? '人物图' : '支派图'}加载失败：${activeLoadState.error}`}
          action={<Button type="link" onClick={() => mode === 'person' ? void loadPersonGraph(workspace.personId, { branchId: selectedBranchId }) : void loadBranchGraph(selectedBranchId, workspace.clanId)}>重试</Button>}
        />
      ) : null}
      {activeGraph?.nodes.length ? (
        <>
          <Table<TreeNodeResponse>
            className="lineage-result-table"
            size="middle"
            rowKey="nodeId"
            loading={activeLoadState.loading}
            columns={listColumns}
            dataSource={pagedNodes}
            pagination={false}
            scroll={{ x: 980 }}
          />
          <div className="lineage-list-pagination">
            <Typography.Text type="secondary">共 {sortedNodes.length} 条</Typography.Text>
            <Pagination
              current={listPage}
              pageSize={LIST_PAGE_SIZE}
              total={sortedNodes.length}
              showSizeChanger={false}
              hideOnSinglePage={false}
              onChange={setListPage}
            />
          </div>
        </>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前图谱暂无可展示人物" />
      )}
    </div>
  );

  const drawerTitle = selectedNode
    ? `人物 · ${selectedNode.displayName || '隐私保护'}`
    : selectedEdge ? `关系 · ${relationshipDisplayLabel(selectedEdge)}` : '';
  const endpointLabels = selectedEdge ? relationshipEndpointLabels(selectedEdge) : ['起点人物', '终点人物'] as const;
  const drawerWidth = screens.md ? 560 : '100%';
  const queryDisabled = !workspace.clanId || !selectedBranchId || !relationScopes.length || (mode === 'person' && !workspace.personId);

  return (
    <div className="lineage-page lineage-tree-page lineage-tree-page--standardized lineage-double-card-page">
      <Card className="lineage-double-card-query" title="世系图谱" size="small">
        {loadState.clan.error ? <Alert type="error" showIcon message={`宗族范围加载失败：${loadState.clan.error}`} /> : null}
        <Tabs
          className="lineage-query-tabs lineage-double-card-query-tabs"
          activeKey={mode}
          onChange={value => void handleModeChange(value as LineageMode)}
          items={[
            { key: 'person', label: <Space size={6}><UserOutlined />人物中心</Space> },
            { key: 'branch', label: <Space size={6}><BranchesOutlined />支派全局</Space> }
          ]}
        />

        <div className="lineage-double-card-form">
          <div className="lineage-double-card-grid">
            <Field label="宗族">
              <Select
                aria-label="宗族"
                showSearch
                allowClear
                optionFilterProp="label"
                disabled={loadState.clan.loading}
                value={workspace.clanId || undefined}
                placeholder="请选择宗族"
                options={clans.map(clan => ({ value: text(clan.id), label: clan.clanName || clan.surname || '未命名宗族' }))}
                onChange={value => void handleClanChange(value || '')}
              />
            </Field>
            <Field label="搜索支派">
              <Select
                aria-label="搜索支派"
                showSearch
                allowClear
                optionFilterProp="label"
                value={selectedBranchId || undefined}
                placeholder="请选择或搜索支派"
                options={branches.map(branch => ({ value: text(branch.id), label: branch.branchName || '未命名支派' }))}
                onChange={value => handleBranchChange(value || '')}
              />
            </Field>
            <Field label="中心人物" hint={mode === 'branch' ? '支派全局模式无需选择中心人物' : '支持姓名、谱名或字号检索'}>
              <Select
                aria-label="中心人物"
                showSearch
                allowClear
                value={workspace.personId || undefined}
                searchValue={searchInput}
                placeholder={mode === 'branch' ? '支派全局模式无需选择' : '输入姓名、谱名或字号'}
                filterOption={false}
                loading={loadState.search.loading}
                disabled={mode === 'branch' || !workspace.clanId}
                options={personOptions}
                onSearch={value => void handlePersonSearch(value)}
                onClear={() => {
                  setSearchInput('');
                  workspace.patch({ personId: '', relationshipId: '' });
                  setPersonGraph(null);
                }}
                onChange={value => {
                  const item = searchPage.records.find(record => record.id === value);
                  if (item) void handlePersonSelection(item);
                }}
                notFoundContent={loadState.search.error || (searchInput ? '未找到匹配人物' : '请输入姓名、谱名或字号')}
              />
            </Field>
            <Field label="关系范围" hint={!relationScopes.length ? '请至少选择一种关系范围' : undefined}>
              <RelationScopeSelect value={relationScopes} onChange={setRelationScopes} />
            </Field>
          </div>

          {showMoreFilters ? (
            <div className="lineage-double-card-more">
              <div className="lineage-double-card-grid lineage-double-card-grid--more">
                <Field label="查看方向">
                  {mode === 'person' ? (
                    <Select
                      aria-label="查看方向"
                      value={direction}
                      options={DIRECTION_OPTIONS}
                      onChange={value => setDirection(value as TreeDirection)}
                    />
                  ) : (
                    <Select aria-label="查看方向" value="branch" disabled options={[{ value: 'branch', label: '按支派世代展开' }]} />
                  )}
                </Field>
                <Field label="展开深度">
                  <Select
                    aria-label="展开深度"
                    value={mode === 'person' ? personDepth : branchDepth}
                    options={mode === 'person' ? PERSON_DEPTH_OPTIONS : BRANCH_DEPTH_OPTIONS}
                    onChange={value => mode === 'person' ? setPersonDepth(value) : setBranchDepth(value)}
                  />
                </Field>
              </div>
            </div>
          ) : null}

          <div className="lineage-double-card-actions">
            <Button
              type="text"
              icon={showMoreFilters ? <UpOutlined /> : <DownOutlined />}
              onClick={() => setShowMoreFilters(value => !value)}
            >
              更多筛选
            </Button>
            <Button onClick={resetQuery}>重置</Button>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              loading={activeLoadState.loading}
              disabled={queryDisabled}
              onClick={() => void applyGraphQuery()}
            >
              查询
            </Button>
          </div>
          {queryDirty ? <Typography.Text className="lineage-query-dirty" type="secondary">查询条件已调整，点击“查询”后生效。</Typography.Text> : null}
        </div>
      </Card>

      <Card className="lineage-double-card-result" title="查询结果" size="small">
        <Tabs
          className="lineage-result-tabs"
          activeKey={canvasView}
          onChange={value => setCanvasView(value as CanvasView)}
          items={[
            { key: 'graph', label: <Space size={6}><ApartmentOutlined />图谱</Space>, children: graphResult },
            { key: 'list', label: <Space size={6}><UnorderedListOutlined />列表</Space>, children: listResult }
          ]}
        />
      </Card>

      <Drawer
        title={drawerTitle}
        width={drawerWidth}
        open={Boolean(selectedNode || selectedEdge)}
        onClose={clearSelection}
        destroyOnClose
        className="lineage-inspector-drawer"
      >
        {selectedNode ? (
          <div className="lineage-drawer-content">
            <div className="lineage-pop-head">
              <span className="lineage-avatar">{firstChar(selectedNode.displayName)}</span>
              <div>
                <h3>{selectedNode.displayName}</h3>
                <p>{selectedNode.visibility === 'masked' ? '隐私保护人物' : `${genderCn(selectedNode.gender || 'unknown')} · ${selectedNode.generationNo ? `${selectedNode.generationNo}世` : '世次未维护'} · ${selectedNode.generationWord || '-'}字辈`}</p>
              </div>
            </div>
            <Descriptions
              bordered
              size="small"
              column={1}
              items={[
                { key: 'branch', label: '所属支派', children: selectedNode.visibility === 'masked' ? '受保护' : selectedNode.branchName || '未标注' },
                { key: 'years', label: '生卒信息', children: selectedNode.visibility === 'masked' ? '受保护' : selectedNode.birthText || selectedNode.deathText ? `${selectedNode.birthText || '?'}-${selectedNode.deathText || ''}` : '-' },
                { key: 'status', label: '数据状态', children: dataStatusText(selectedNode.dataStatus || (selectedNode.visibility === 'masked' ? '受保护' : 'official')) },
                { key: 'privacy', label: '可见范围', children: selectedNode.visibility === 'masked' ? '安全占位' : privacyLevelText(selectedNode.privacyLevel) }
              ]}
            />
            {selectedNode.visibility !== 'masked'
              ? <DetailSummary target={selectedNode} indicators={nodeIndicators(selectedNode)} />
              : <IndicatorTags indicators={nodeIndicators(selectedNode)} />}
            <Divider>相关关系</Divider>
            <List
              size="small"
              locale={{ emptyText: '暂无可见关系记录' }}
              dataSource={selectedEdges}
              renderItem={edge => {
                const fromName = nodeMap.get(edge.fromNodeId)?.displayName || '受保护人物';
                const toName = nodeMap.get(edge.toNodeId)?.displayName || '受保护人物';
                return (
                  <List.Item onClick={() => selectEdge(edge)} className="lineage-related-edge">
                    <List.Item.Meta
                      title={relationshipDisplayLabel(edge)}
                      description={`${relationshipEndpointText(edge, fromName, toName)}${summaryText(edge.evidenceSummary, edge.reviewSummary, edge.anomalySummary) ? ` · ${summaryText(edge.evidenceSummary, edge.reviewSummary, edge.anomalySummary)}` : ''}`}
                    />
                  </List.Item>
                );
              }}
            />
            <Divider />
            <Space wrap className="lineage-inspector-actions">
              {selectedNode.personId ? <Button type="primary" onClick={() => void setAsCenter(selectedNode)}>设为中心人物</Button> : null}
              {selectedNode.personId && onNavigate ? <Button onClick={() => navigateFromNode('personArchive', selectedNode)}>查看人物档案</Button> : null}
              {selectedNode.evidenceSummary && onNavigate ? <Button onClick={() => navigateFromNode('sourceLibrary', selectedNode)}>查看来源证据</Button> : null}
              {(selectedNode.reviewSummary?.state && selectedNode.reviewSummary.state !== 'none') || selectedNode.anomalySummary?.count ? (
                <Dropdown
                  menu={{
                    items: [
                      selectedNode.reviewSummary?.state && selectedNode.reviewSummary.state !== 'none' && onNavigate
                        ? { key: 'review', label: '进入审核中心', onClick: () => navigateFromNode('reviewCenter', selectedNode) }
                        : null,
                      selectedNode.anomalySummary?.count && onNavigate
                        ? { key: 'workbench', label: '进入修谱工作台', onClick: () => navigateFromNode('editingWorkspace', selectedNode) }
                        : null
                    ].filter(Boolean) as MenuProps['items']
                  }}
                >
                  <Button icon={<MoreOutlined />}>更多</Button>
                </Dropdown>
              ) : null}
            </Space>
          </div>
        ) : null}

        {selectedEdge ? (
          <div className="lineage-drawer-content">
            <div className="lineage-edge-pop-head">
              <h3>{relationshipDisplayLabel(selectedEdge)}</h3>
              <p>{edgeVisual(selectedEdge).description}</p>
            </div>
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
            <Space wrap className="lineage-inspector-actions">
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
