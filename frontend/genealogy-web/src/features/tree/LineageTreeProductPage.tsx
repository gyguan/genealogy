import {
  useEffect,
  useMemo,
  useRef,
  useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Divider,
  Drawer,
  Dropdown,
  Grid,
  List,
  Select,
  Space,
  Tabs,
  Tag,
  Typography
} from 'antd';
import type { MenuProps } from 'antd';
import {
  AimOutlined,
  BranchesOutlined,
  MoreOutlined,
  SearchOutlined,
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
import { QueryMultiSelect } from '../../shared/ui/QueryMultiSelect';
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
import {
  LineageRequestGate,
  type LineageRequestScope,
  type PersonSearchItem,
  type SearchPage
} from './lineageRequestState';
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
import { QueryResultCard } from '../../shared/ui/QueryResultCards';

import { feedback } from '../../shared/ui/OperationFeedback';

import { PageFeedback } from '../../shared/ui/Feedback';

type NavigateTarget = 'personArchive' | 'sourceLibrary' | 'reviewCenter' | 'editingWorkspace';
type Props = {

  onNavigate?: (view: NavigateTarget) => void;
};
type LoadState = { loading: boolean; error: string };
type SummaryTarget = Pick<TreeNodeResponse, 'evidenceSummary' | 'reviewSummary' | 'anomalySummary'>;
type PersonCard = {
  id: string;
  name: string;
  generation: string;
  branchId: string;
  branchName: string;
};

const IDLE: LoadState = { loading: false, error: '' };
const EMPTY_SEARCH: SearchPage<PersonSearchItem> = {
  records: [],
  total: 0,
  pageNo: 1,
  pageSize: 20,
  totalPages: 1
};
const COMMON_DEPTH_OPTIONS = [
  { value: '3', label: '3 代（含本代）' },
  { value: '5', label: '5 代（含本代）' },
  { value: '8', label: '8 代（含本代）' }
];
const COMMON_DEPTH_VALUES = new Set(COMMON_DEPTH_OPTIONS.map(item => item.value));
const RELATION_OPTIONS: Array<{ value: TreeRelationScope; label: string }> = [
  { value: 'blood', label: '血缘' },
  { value: 'ritual', label: '宗法承嗣' },
  { value: 'marriage', label: '婚配' },
  { value: 'status', label: '状态' }
];

function text(value: unknown) {
  return value === null || value === undefined ? '' : String(value);
}

function normalizeDepth(value: string) {
  return COMMON_DEPTH_VALUES.has(value) ? value : '3';
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
    name: node.displayName,
    generation: node.generationNo ? `${node.generationNo}世` : '世次未维护',
    branchId,
    branchName: node.branchName || branches.find(item => text(item.id) === branchId)?.branchName || '未归属支派'
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
        <span key={indicator.code} className={`lineage-detail-tag tone-${indicator.tone}`}>
          {indicator.glyph} · {indicator.label}
        </span>
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
            <strong>
              {target.evidenceSummary.officialBindingCount}/{target.evidenceSummary.bindingCount} 条正式 · {confidenceCn(target.evidenceSummary.confidenceLevel)}
            </strong>
          </div>
        ) : null}
        {target.reviewSummary ? (
          <div className="lineage-detail-summary-card">
            <span>审核状态</span>
            <strong>
              {reviewCn(target.reviewSummary.state)} · 待审 {target.reviewSummary.pendingTaskCount} · 驳回 {target.reviewSummary.rejectedTaskCount}
            </strong>
          </div>
        ) : null}
        {target.anomalySummary ? (
          <div className="lineage-detail-summary-card">
            <span>修谱提示</span>
            <strong>
              {target.anomalySummary.count
                ? `${target.anomalySummary.count} 项 · ${riskLevelText(target.anomalySummary.highestRisk)}`
                : '暂无异常'}
            </strong>
          </div>
        ) : null}
      </div>
      <IndicatorTags indicators={indicators} />
    </div>
  );
}

function RelationScopeSelect({ value, onChange }: {
  value: TreeRelationScope[];
  onChange: (value: TreeRelationScope[]) => void;
}) {
  return (
    <QueryMultiSelect<TreeRelationScope>
      aria-label="关系范围"
      value={value}
      options={RELATION_OPTIONS}
      placeholder="请选择关系范围"
      onChange={onChange}
    />
  );
}

export function LineageTreeProductPage({ onNavigate }: Props) {
  const workspace = useWorkspace();
  const screens = Grid.useBreakpoint();
  const requestGate = useRef(new LineageRequestGate());
  const initialized = useRef(false);
  const initialUrlState = useRef(readLineageUrlState(window.location.href)).current;
  const initialDepth = normalizeDepth(
    initialUrlState.mode === 'branch' ? initialUrlState.branchDepth : initialUrlState.personDepth
  );
  const personDirection = initialUrlState.direction;
  const includeSubBranches = initialUrlState.includeSubBranches;

  const [clans, setClans] = useState<ClanRow[]>([]);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchPage, setSearchPage] = useState<SearchPage<PersonSearchItem>>(EMPTY_SEARCH);
  const [mode, setMode] = useState<LineageMode>(initialUrlState.mode);
  const [depth, setDepth] = useState(initialDepth);
  const [appliedDepth, setAppliedDepth] = useState(initialDepth);
  const [relationScopes, setRelationScopes] = useState<TreeRelationScope[]>([...initialUrlState.relationScopes]);
  const [appliedRelationScopes, setAppliedRelationScopes] = useState<TreeRelationScope[]>([...initialUrlState.relationScopes]);
  const initialBranchId = initialUrlState.branchId || workspace.branchId || '';
  const [selectedBranchId, setSelectedBranchId] = useState(initialBranchId);
  const [appliedBranchId, setAppliedBranchId] = useState(initialBranchId);
  const [personGraph, setPersonGraph] = useState<TreeGraphResponse | null>(null);
  const [branchGraph, setBranchGraph] = useState<TreeGraphResponse | null>(null);
  const [selectedNode, setSelectedNode] = useState<TreeNodeResponse | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<TreeEdgeResponse | null>(null);
  const [locatedNodeId, setLocatedNodeId] = useState('');
  const [personGraphVersion, setPersonGraphVersion] = useState(0);
  const [loadState, setLoadState] = useState<Record<LineageRequestScope, LoadState>>({
    clan: IDLE,
    search: IDLE,
    personGraph: IDLE,
    branchGraph: IDLE
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
    setSelectedBranchId('');
    setAppliedBranchId('');
    setLocatedNodeId('');
    setPersonGraph(null);
    setBranchGraph(null);
    clearSelection();
    setLoadState({ clan: IDLE, search: IDLE, personGraph: IDLE, branchGraph: IDLE });
    workspace.patch({
      clanId,
      branchId: '',
      personId: '',
      relationshipId: '',
      sourceId: '',
      sourceFocusReason: '',
      reviewTaskId: ''
    });
  }

  async function requestPersonPage(
    clanId: string,
    pageNo: number,
    keyword: string,
    nextBranches = branches,
    branchId = appliedBranchId || selectedBranchId
  ) {
    const token = requestGate.current.begin('search');
    setScope('search', { loading: true, error: '' });
    try {
      const page = await searchPersons({
        clanId,
        branchId: branchId || undefined,
        keyword,
        pageNo,
        branches: nextBranches
      });
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

  async function loadPersonGraph(personId: string, options: Partial<{
    depth: string;
    direction: TreeDirection;
    relationScopes: TreeRelationScope[];
    branchId: string;
  }> = {}) {
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
        branchId: options.branchId || appliedBranchId || selectedBranchId || undefined,
        direction: options.direction || personDirection,
        relationScopes: options.relationScopes || appliedRelationScopes,
        dataView: 'official',
        depth: options.depth || appliedDepth
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

  async function loadBranchGraph(branchId: string, clanId: string, options: Partial<{
    depth: string;
    relationScopes: TreeRelationScope[];
  }> = {}) {
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
        relationScopes: options.relationScopes || appliedRelationScopes,
        dataView: 'official',
        includeSubBranches,
        depth: options.depth || appliedDepth
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
      const nextBranchId = branchRows.some(item => text(item.id) === preferredBranchId)
        ? preferredBranchId
        : text(branchRows[0]?.id);
      setSelectedBranchId(nextBranchId);
      setAppliedBranchId(nextBranchId);
      const page = await requestPersonPage(clanId, 1, '', branchRows, nextBranchId);
      if (!requestGate.current.isCurrent(token)) return;
      const preferredPerson = page?.records.find(item => item.id === preferredPersonId);
      const nextPerson = preferredPerson || page?.records[0];
      const nextPersonId = nextPerson?.id || '';
      setSearchInput(nextPerson?.name || '');
      workspace.patch({
        clanId,
        branchId: nextBranchId,
        personId: nextPersonId,
        relationshipId: '',
        sourceId: '',
        sourceFocusReason: '',
        reviewTaskId: ''
      });
      setAppliedDepth(depth);
      setAppliedRelationScopes([...relationScopes]);
      await Promise.all([
        loadPersonGraph(nextPersonId, {
          branchId: nextBranchId,
          depth,
          relationScopes
        }),
        loadBranchGraph(nextBranchId, clanId, {
          depth,
          relationScopes
        })
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
    feedback.from({ message: clanId ? '宗族已切换，图谱查询范围已重新初始化' : '已清空宗族选择' });
  }

  function handleBranchChange(branchId: string) {
    setSelectedBranchId(branchId || '');
    setSearchInput('');
    clearSelection();
    setLocatedNodeId('');
    if (workspace.clanId && branchId) {
      void requestPersonPage(workspace.clanId, 1, '', branches, branchId);
    }
  }

  async function resolveCenterPerson(branchId: string) {
    const page = await requestPersonPage(workspace.clanId, 1, '', branches, branchId);
    const currentPerson = page?.records.find(item => item.id === workspace.personId);
    const nextPerson = currentPerson || page?.records[0];
    const nextPersonId = nextPerson?.id || '';
    setSearchInput(nextPerson?.name || '');
    workspace.patch({
      branchId,
      personId: nextPersonId,
      relationshipId: ''
    });
    return nextPersonId;
  }

  async function applyGraphQuery() {
    clearSelection();
    setLocatedNodeId('');
    const centerPersonId = await resolveCenterPerson(selectedBranchId);
    await Promise.all([
      loadPersonGraph(centerPersonId, {
        branchId: selectedBranchId,
        depth,
        relationScopes
      }),
      loadBranchGraph(selectedBranchId, workspace.clanId, {
        depth,
        relationScopes
      })
    ]);
    setAppliedBranchId(selectedBranchId);
    setAppliedDepth(depth);
    setAppliedRelationScopes([...relationScopes]);
  }

  function resetQuery() {
    setSelectedBranchId(appliedBranchId || selectedBranchId);
    setDepth(appliedDepth);
    setRelationScopes([...appliedRelationScopes]);
    setLocatedNodeId('');
    clearSelection();
  }

  async function handlePersonSearch(keyword: string) {
    setSearchInput(keyword);
    if (!workspace.clanId || !appliedBranchId) return;
    await requestPersonPage(workspace.clanId, 1, keyword, branches, appliedBranchId);
  }

  async function handlePersonSelection(item: PersonSearchItem) {
    setSearchInput(item.name);
    setMode('person');
    setLocatedNodeId('');
    clearSelection();
    workspace.patch({
      personId: item.id,
      branchId: appliedBranchId,
      relationshipId: ''
    });
    await loadPersonGraph(item.id, {
      branchId: appliedBranchId,
      depth: appliedDepth,
      relationScopes: appliedRelationScopes
    });
  }

  async function setAsCenter(node: TreeNodeResponse) {
    if (!node.personId) return;
    const personId = String(node.personId);
    setMode('person');
    setLocatedNodeId('');
    clearSelection();
    workspace.patch({
      personId,
      branchId: appliedBranchId,
      relationshipId: ''
    });
    await loadPersonGraph(personId, {
      branchId: appliedBranchId,
      depth: appliedDepth,
      relationScopes: appliedRelationScopes
    });
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
    const branchId = node.branchId ? String(node.branchId) : appliedBranchId;
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
      personDepth: appliedDepth,
      branchDepth: appliedDepth,
      direction: personDirection,
      relationScopes: appliedRelationScopes,
      includeSubBranches
    });
    window.history.replaceState(window.history.state, '', nextUrl);
  }, [workspace.clanId, workspace.personId, appliedBranchId, appliedDepth, appliedRelationScopes, mode]);

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
  const graphCenterNodeId = mode === 'person'
    ? centerNode?.nodeId || activeGraph?.rootNodeId
    : activeGraph?.rootNodeId;
  const selectedEdges = selectedNode ? relatedEdges(selectedNode, activeGraph) : [];
  const nodeMap = useMemo(
    () => new Map(activeGraph?.nodes.map(node => [node.nodeId, node]) || []),
    [activeGraph]
  );
  const locatedNode = activeGraph?.nodes.find(node => node.nodeId === locatedNodeId) || null;
  const highlightedPath = useMemo(
    () => activeGraph && locatedNode && graphCenterNodeId
      ? findLineagePath(activeGraph, graphCenterNodeId, locatedNode.nodeId)
      : { nodeIds: [], edgeIds: [] },
    [activeGraph, locatedNode, graphCenterNodeId]
  );
  const graphOptions = activeGraph?.nodes
    .filter(node => node.visibility === 'visible')
    .map(node => ({
      value: node.nodeId,
      label: `${node.displayName}${node.generationNo ? ` · ${node.generationNo}世` : ''}${node.branchName ? ` · ${node.branchName}` : ''}`
    })) || [];
  const appliedDepthText = COMMON_DEPTH_OPTIONS.find(item => item.value === appliedDepth)?.label;
  const queryDirty = selectedBranchId !== appliedBranchId
    || depth !== appliedDepth
    || !sameRelationScopes(relationScopes, appliedRelationScopes);
  const queryLoading = loadState.personGraph.loading || loadState.branchGraph.loading;
  const queryDisabled = !workspace.clanId || !selectedBranchId || !relationScopes.length || !depth;

  useEffect(() => {
    if (locatedNodeId && !activeGraph?.nodes.some(node => node.nodeId === locatedNodeId)) {
      setLocatedNodeId('');
    }
  }, [activeGraph, locatedNodeId]);

  function locateNode(nodeId: string) {
    setLocatedNodeId(activeGraph?.nodes.some(item => item.nodeId === nodeId) ? nodeId : '');
  }

  async function handleModeChange(nextMode: LineageMode) {
    setMode(nextMode);
    clearSelection();
    setLocatedNodeId('');
    if (nextMode === 'person' && !personGraph && workspace.personId) {
      await loadPersonGraph(workspace.personId, {
        branchId: appliedBranchId,
        depth: appliedDepth,
        relationScopes: appliedRelationScopes
      });
    }
    if (nextMode === 'branch' && !branchGraph) {
      await loadBranchGraph(appliedBranchId, workspace.clanId, {
        depth: appliedDepth,
        relationScopes: appliedRelationScopes
      });
    }
  }

  const resultMeta = (
    <div className="lineage-result-meta">
      <Space size={[4, 6]} wrap>
        <Tag color="blue">{mode === 'person' ? '人物中心' : '支派全局'}</Tag>
        <Tag>{currentClanName}</Tag>
        <Tag>{branchPath(branches, appliedBranchId)}</Tag>
        {mode === 'person' ? <Tag>{center?.name || '未选择中心人物'}</Tag> : null}
        {appliedDepthText ? <Tag>{appliedDepthText}</Tag> : null}
        {appliedRelationScopes.map(value => (
          <Tag key={value}>{RELATION_OPTIONS.find(item => item.value === value)?.label}</Tag>
        ))}
      </Space>
      <div className="lineage-result-legend" aria-label="图谱图例">
        <span><i className="tone-center" />中心人物</span>
        <span><i className="tone-official" />正式数据</span>
        <span><i className="tone-review" />待核验</span>
        <span><i className="tone-marriage" />婚配关系</span>
      </div>
    </div>
  );

  const resultContent = (
    <div className="lineage-result-pane">
      {resultMeta}
      <div className={`lineage-result-toolbar lineage-result-toolbar--double-card${mode === 'person' ? ' is-person' : ''}`}>
        {mode === 'person' ? (
          <Field label="中心人物" hint="中心人物仅影响人物中心视图，不改变图谱查询范围">
            <Select
              aria-label="切换中心人物"
              showSearch
              value={workspace.personId || undefined}
              searchValue={searchInput}
              placeholder="输入姓名、谱名或字号"
              filterOption={false}
              loading={loadState.search.loading}
              options={personOptions}
              onSearch={value => void handlePersonSearch(value)}
              onChange={value => {
                const item = searchPage.records.find(record => record.id === value);
                if (item) void handlePersonSelection(item);
              }}
              notFoundContent={loadState.search.error || (searchInput ? '未找到匹配人物' : '请输入姓名、谱名或字号')}
            />
          </Field>
        ) : null}
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
        <PageFeedback
          tone="error"
          title={`${mode === 'person' ? '人物中心图' : '支派全局图'}加载失败：${activeLoadState.error}`}
          action={(
            <Button
              type="link"
              onClick={() => mode === 'person'
                ? void loadPersonGraph(workspace.personId, {
                  branchId: appliedBranchId,
                  depth: appliedDepth,
                  relationScopes: appliedRelationScopes
                })
                : void loadBranchGraph(appliedBranchId, workspace.clanId, {
                  depth: appliedDepth,
                  relationScopes: appliedRelationScopes
                })}
            >
              重试
            </Button>
          )}
        />
      ) : null}
      <section className={`lineage-logic-card lineage-logic-card--${mode}`}>
        <LineageGraphCanvas
          key={`graph-${mode}-${personGraphVersion}`}
          graph={activeGraph}
          loading={activeLoadState.loading}
          emptyText={mode === 'person' ? '当前支派暂无可作为中心的人物。' : '当前支派暂无世系数据。'}
          activeNodeId={graphCenterNodeId}
          selectedNodeId={selectedNode?.nodeId}
          selectedEdgeId={selectedEdge?.edgeId}
          highlightedNodeIds={highlightedPath.nodeIds}
          highlightedEdgeIds={highlightedPath.edgeIds}
          focusNodeId={locatedNodeId}
          autoFocus={mode === 'person' ? 'active' : 'fit'}
          relationScopes={appliedRelationScopes}
          onSelectNode={selectNode}
          onSelectEdge={selectEdge}
          onSetCenter={node => void setAsCenter(node)}
        />
      </section>
    </div>
  );

  const drawerTitle = selectedNode
    ? `人物 · ${selectedNode.displayName || '隐私保护'}`
    : selectedEdge ? `关系 · ${relationshipDisplayLabel(selectedEdge)}` : '';
  const endpointLabels = selectedEdge
    ? relationshipEndpointLabels(selectedEdge)
    : ['起点人物', '终点人物'] as const;
  const drawerWidth = screens.md ? 560 : '100%';

  return (
    <div className="lineage-page lineage-tree-page lineage-tree-page--standardized lineage-double-card-page">
      <Card className="lineage-double-card-query" title="图谱查询" size="small">
        {loadState.clan.error ? (
          <PageFeedback tone="error" title={`宗族范围加载失败：${loadState.clan.error}`} />
        ) : null}
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
                options={clans.map(clan => ({
                  value: text(clan.id),
                  label: clan.clanName || clan.surname || '未命名宗族'
                }))}
                onChange={value => void handleClanChange(value || '')}
              />
            </Field>
            <Field label="支派">
              <Select
                aria-label="支派"
                showSearch
                allowClear
                optionFilterProp="label"
                disabled={!workspace.clanId || loadState.clan.loading}
                value={selectedBranchId || undefined}
                placeholder="请选择支派"
                options={branches.map(branch => ({
                  value: text(branch.id),
                  label: branch.branchName || '未命名支派'
                }))}
                onChange={value => handleBranchChange(value || '')}
              />
            </Field>
            <Field label="关系范围" hint={!relationScopes.length ? '请至少选择一种关系范围' : undefined}>
              <RelationScopeSelect value={relationScopes} onChange={setRelationScopes} />
            </Field>
            <Field label="展开深度">
              <Select
                aria-label="展开深度"
                value={depth}
                options={COMMON_DEPTH_OPTIONS}
                placeholder="请选择展开深度"
                onChange={setDepth}
              />
            </Field>
          </div>
          <div className="lineage-double-card-actions">
            <Button onClick={resetQuery}>重置</Button>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              loading={queryLoading}
              disabled={queryDisabled}
              onClick={() => void applyGraphQuery()}
            >
              查询
            </Button>
          </div>
          {queryDirty ? (
            <Typography.Text className="lineage-query-dirty" type="secondary">
              查询条件已调整，点击“查询”后同时刷新人物中心和支派全局结果。
            </Typography.Text>
          ) : null}
        </div>
      </Card>

      <QueryResultCard className="lineage-double-card-result" size="small" total={activeGraph?.nodes.length || 0} totalSuffix="个人物">
        
          <Tabs
          className="lineage-result-tabs"
          activeKey={mode}
          onChange={value => void handleModeChange(value as LineageMode)}
          items={[
            {
              key: 'person',
              label: <Space size={6}><UserOutlined />人物中心</Space>,
              children: mode === 'person' ? resultContent : null
            },
            {
              key: 'branch',
              label: <Space size={6}><BranchesOutlined />支派全局</Space>,
              children: mode === 'branch' ? resultContent : null
            }
          ]}
          />
        
      </QueryResultCard>

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
                <p>
                  {selectedNode.visibility === 'masked'
                    ? '隐私保护人物'
                    : `${genderCn(selectedNode.gender || 'unknown')} · ${selectedNode.generationNo ? `${selectedNode.generationNo}世` : '世次未维护'} · ${selectedNode.generationWord || '-'}字辈`}
                </p>
              </div>
            </div>
            <Descriptions
              bordered
              size="small"
              column={1}
              items={[
                {
                  key: 'branch',
                  label: '所属支派',
                  children: selectedNode.visibility === 'masked' ? '受保护' : selectedNode.branchName || '未标注'
                },
                {
                  key: 'years',
                  label: '生卒信息',
                  children: selectedNode.visibility === 'masked'
                    ? '受保护'
                    : selectedNode.birthText || selectedNode.deathText
                      ? `${selectedNode.birthText || '?'}-${selectedNode.deathText || ''}`
                      : '-'
                },
                {
                  key: 'status',
                  label: '数据状态',
                  children: dataStatusText(selectedNode.dataStatus || (selectedNode.visibility === 'masked' ? '受保护' : 'official'))
                },
                {
                  key: 'privacy',
                  label: '可见范围',
                  children: selectedNode.visibility === 'masked' ? '安全占位' : privacyLevelText(selectedNode.privacyLevel)
                }
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
              {selectedNode.personId ? (
                <Button type="primary" onClick={() => void setAsCenter(selectedNode)}>设为中心人物</Button>
              ) : null}
              {selectedNode.personId && onNavigate ? (
                <Button onClick={() => navigateFromNode('personArchive', selectedNode)}>查看人物档案</Button>
              ) : null}
              {selectedNode.evidenceSummary && onNavigate ? (
                <Button onClick={() => navigateFromNode('sourceLibrary', selectedNode)}>查看来源证据</Button>
              ) : null}
              {(selectedNode.reviewSummary?.state && selectedNode.reviewSummary.state !== 'none') || selectedNode.anomalySummary?.count ? (
                <Dropdown
                  menu={{
                    items: [
                      selectedNode.reviewSummary?.state && selectedNode.reviewSummary.state !== 'none' && onNavigate
                        ? {
                          key: 'review',
                          label: '进入审核中心',
                          onClick: () => navigateFromNode('reviewCenter', selectedNode)
                        }
                        : null,
                      selectedNode.anomalySummary?.count && onNavigate
                        ? {
                          key: 'workbench',
                          label: '进入修谱工作台',
                          onClick: () => navigateFromNode('editingWorkspace', selectedNode)
                        }
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
                {
                  key: 'from',
                  label: endpointLabels[0],
                  children: nodeMap.get(selectedEdge.fromNodeId)?.displayName || '受保护人物'
                },
                {
                  key: 'to',
                  label: endpointLabels[1],
                  children: nodeMap.get(selectedEdge.toNodeId)?.displayName || '受保护人物'
                },
                {
                  key: 'category',
                  label: '关系类别',
                  children: relationCategoryText(selectedEdge.relationCategory)
                },
                {
                  key: 'status',
                  label: '数据状态',
                  children: dataStatusText(selectedEdge.dataStatus)
                }
              ]}
            />
            <DetailSummary target={selectedEdge} indicators={edgeIndicators(selectedEdge)} />
            <Divider />
            <Space wrap className="lineage-inspector-actions">
              {selectedEdge.evidenceSummary && onNavigate ? (
                <Button type="primary" onClick={() => navigateFromEdge('sourceLibrary', selectedEdge)}>查看来源证据</Button>
              ) : null}
              {selectedEdge.reviewSummary && selectedEdge.reviewSummary.state !== 'none' && onNavigate ? (
                <Button onClick={() => navigateFromEdge('reviewCenter', selectedEdge)}>进入审核中心</Button>
              ) : null}
              {selectedEdge.anomalySummary?.count && onNavigate ? (
                <Button onClick={() => navigateFromEdge('editingWorkspace', selectedEdge)}>进入修谱工作台</Button>
              ) : null}
            </Space>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
