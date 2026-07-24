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
  Switch,
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
import { QueryResultCard } from '../../shared/ui/QueryResultCards';
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
import './lineage-tabbed-page.css';

import { feedback } from '../../shared/ui/OperationFeedback';

import { InlineFeedback, PageFeedback } from '../../shared/ui/Feedback';

type NavigateTarget = 'personArchive' | 'sourceLibrary' | 'reviewCenter' | 'editingWorkspace';
type Props = {

  onNavigate?: (view: NavigateTarget) => void;
};
type LoadState = { loading: boolean; error: string };
type SummaryTarget = Pick<TreeNodeResponse, 'evidenceSummary' | 'reviewSummary' | 'anomalySummary'>;
type PersonQuery = {
  branchId: string;
  personId: string;
  depth: string;
  relationScopes: TreeRelationScope[];
};
type BranchQuery = {
  branchId: string;
  depth: string;
  relationScopes: TreeRelationScope[];
  includeSubBranches: boolean;
};

type PersonCard = {
  id: string;
  name: string;
  generation: string;
  branchName: string;
};

const IDLE: LoadState = { loading: false, error: '' };
const DEFAULT_RELATIONS: TreeRelationScope[] = ['blood', 'ritual', 'marriage'];
const EMPTY_SEARCH: SearchPage<PersonSearchItem> = {
  records: [],
  total: 0,
  pageNo: 1,
  pageSize: 20,
  totalPages: 1
};
const PERSON_DEPTH_OPTIONS = [
  { value: '1', label: '1 代（直接关系）' },
  { value: '2', label: '2 代' },
  { value: '3', label: '3 代' }
];
const BRANCH_DEPTH_OPTIONS = [
  { value: '3', label: '3 代（含本代）' },
  { value: '5', label: '5 代（含本代）' },
  { value: '8', label: '8 代（含本代）' },
  { value: '12', label: '12 代（含本代）' }
];
const RELATION_OPTIONS: Array<{ value: TreeRelationScope; label: string }> = [
  { value: 'blood', label: '血缘' },
  { value: 'ritual', label: '宗法承嗣' },
  { value: 'marriage', label: '婚配' },
  { value: 'status', label: '状态' }
];

function text(value: unknown) {
  return value === null || value === undefined ? '' : String(value);
}

function sameRelations(left: TreeRelationScope[], right: TreeRelationScope[]) {
  if (left.length !== right.length) return false;
  const normalizedLeft = [...left].sort();
  const normalizedRight = [...right].sort();
  return normalizedLeft.every((value, index) => value === normalizedRight[index]);
}

function errorMessage(error: unknown) {
  return (error as Error)?.message || '请求失败，请重试';
}

function firstChar(name?: string) {
  return (name || '谱').slice(0, 1);
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

function toPersonFromNode(node: TreeNodeResponse, branches: BranchRow[]): PersonCard {
  const branchId = node.branchId ? String(node.branchId) : '';
  return {
    id: node.personId ? String(node.personId) : '',
    name: node.displayName,
    generation: node.generationNo ? `${node.generationNo}世` : '世次未维护',
    branchName: node.branchName || branches.find(item => text(item.id) === branchId)?.branchName || '未归属支派'
  };
}

function relatedEdges(node: TreeNodeResponse, graph: TreeGraphResponse | null) {
  return graph?.edges.filter(edge => edge.fromNodeId === node.nodeId || edge.toNodeId === node.nodeId) || [];
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

export function LineageTreeTabbedPage({ onNavigate }: Props) {
  const workspace = useWorkspace();
  const screens = Grid.useBreakpoint();
  const requestGate = useRef(new LineageRequestGate());
  const initialized = useRef(false);
  const initial = useRef(readLineageUrlState(window.location.href)).current;
  const personDirection: TreeDirection = initial.direction;

  const initialPerson: PersonQuery = {
    branchId: initial.personBranchId || initial.branchId || workspace.branchId || '',
    personId: initial.personId || workspace.personId || '',
    depth: initial.personDepth,
    relationScopes: [...(initial.personRelationScopes || initial.relationScopes || DEFAULT_RELATIONS)]
  };
  const initialBranch: BranchQuery = {
    branchId: initial.branchId || workspace.branchId || '',
    depth: initial.branchDepth,
    relationScopes: [...(initial.branchRelationScopes || initial.relationScopes || DEFAULT_RELATIONS)],
    includeSubBranches: initial.includeSubBranches
  };

  const [mode, setMode] = useState<LineageMode>(initial.mode);
  const [clans, setClans] = useState<ClanRow[]>([]);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [personDraft, setPersonDraft] = useState<PersonQuery>(initialPerson);
  const [personApplied, setPersonApplied] = useState<PersonQuery>(initialPerson);
  const [branchDraft, setBranchDraft] = useState<BranchQuery>(initialBranch);
  const [branchApplied, setBranchApplied] = useState<BranchQuery>(initialBranch);
  const [personSearchInput, setPersonSearchInput] = useState('');
  const [searchPage, setSearchPage] = useState<SearchPage<PersonSearchItem>>(EMPTY_SEARCH);
  const [personGraph, setPersonGraph] = useState<TreeGraphResponse | null>(null);
  const [branchGraph, setBranchGraph] = useState<TreeGraphResponse | null>(null);
  const [selectedNode, setSelectedNode] = useState<TreeNodeResponse | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<TreeEdgeResponse | null>(null);
  const [locatedNodeIds, setLocatedNodeIds] = useState<Record<LineageMode, string>>({ person: '', branch: '' });
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
    setPersonSearchInput('');
    setPersonGraph(null);
    setBranchGraph(null);
    setLocatedNodeIds({ person: '', branch: '' });
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
    branchId: string,
    keyword: string,
    branchRows = branches
  ) {
    const token = requestGate.current.begin('search');
    setScope('search', { loading: true, error: '' });
    try {
      const page = await searchPersons({
        clanId,
        branchId: branchId || undefined,
        keyword,
        pageNo: 1,
        branches: branchRows
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

  async function loadPersonGraph(query: PersonQuery) {
    requestGate.current.invalidate('personGraph');
    if (!query.personId) {
      setPersonGraph(null);
      setScope('personGraph', IDLE);
      return null;
    }
    const token = requestGate.current.begin('personGraph');
    setScope('personGraph', { loading: true, error: '' });
    try {
      const graph = await loadPersonLineage({
        personId: query.personId,
        branchId: query.branchId || undefined,
        direction: personDirection,
        relationScopes: query.relationScopes,
        dataView: 'official',
        depth: query.depth
      });
      if (!requestGate.current.isCurrent(token)) return null;
      setPersonGraph(graph);
      return graph;
    } catch (error) {
      if (requestGate.current.isCurrent(token)) setScope('personGraph', { error: errorMessage(error) });
      return null;
    } finally {
      if (requestGate.current.isCurrent(token)) setScope('personGraph', { loading: false });
    }
  }

  async function loadBranchGraph(query: BranchQuery, clanId = workspace.clanId) {
    requestGate.current.invalidate('branchGraph');
    if (!clanId || !query.branchId) {
      setBranchGraph(null);
      setScope('branchGraph', IDLE);
      return null;
    }
    const token = requestGate.current.begin('branchGraph');
    setScope('branchGraph', { loading: true, error: '' });
    try {
      const graph = await loadBranchLineage({
        clanId,
        branchId: query.branchId,
        relationScopes: query.relationScopes,
        dataView: 'official',
        includeSubBranches: query.includeSubBranches,
        depth: query.depth
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

  async function initializeClan(clanId: string, useInitialState = false) {
    clearClanState(clanId);
    if (!clanId) return;
    const token = requestGate.current.begin('clan');
    setScope('clan', { loading: true, error: '' });
    try {
      const branchRows = await loadBranches(clanId);
      if (!requestGate.current.isCurrent(token)) return;
      setBranches(branchRows);
      const firstBranchId = text(branchRows[0]?.id);
      const preferredPersonBranchId = useInitialState ? initialPerson.branchId : '';
      const preferredBranchId = useInitialState ? initialBranch.branchId : '';
      const personBranchId = branchRows.some(item => text(item.id) === preferredPersonBranchId) ? preferredPersonBranchId : firstBranchId;
      const branchId = branchRows.some(item => text(item.id) === preferredBranchId) ? preferredBranchId : firstBranchId;
      const page = await requestPersonPage(clanId, personBranchId, '', branchRows);
      if (!requestGate.current.isCurrent(token)) return;
      const preferredPersonId = useInitialState ? initialPerson.personId : '';
      const preferredPerson = page?.records.find(item => item.id === preferredPersonId);
      const nextPerson = preferredPerson || page?.records[0];
      const personId = preferredPersonId || nextPerson?.id || '';
      setPersonSearchInput(nextPerson?.name || '');
      const nextPersonQuery = {
        ...personApplied,
        branchId: personBranchId,
        personId,
        depth: useInitialState ? initialPerson.depth : '1',
        relationScopes: useInitialState ? [...initialPerson.relationScopes] : [...DEFAULT_RELATIONS]
      };
      const nextBranchQuery = {
        ...branchApplied,
        branchId,
        depth: useInitialState ? initialBranch.depth : '8',
        relationScopes: useInitialState ? [...initialBranch.relationScopes] : [...DEFAULT_RELATIONS],
        includeSubBranches: useInitialState ? initialBranch.includeSubBranches : true
      };
      setPersonDraft(nextPersonQuery);
      setPersonApplied(nextPersonQuery);
      setBranchDraft(nextBranchQuery);
      setBranchApplied(nextBranchQuery);
      workspace.patch({
        clanId,
        branchId: mode === 'person' ? personBranchId : branchId,
        personId,
        relationshipId: ''
      });
      if (mode === 'person') await loadPersonGraph(nextPersonQuery);
      else await loadBranchGraph(nextBranchQuery, clanId);
    } catch (error) {
      if (requestGate.current.isCurrent(token)) setScope('clan', { error: errorMessage(error) });
    } finally {
      if (requestGate.current.isCurrent(token)) setScope('clan', { loading: false });
    }
  }

  useEffect(() => {
    setScope('clan', { loading: true, error: '' });
    loadClans()
      .then(async clanRows => {
        if (initialized.current) return;
        setClans(clanRows);
        initialized.current = true;
        const clanId = initial.clanId || workspace.clanId || text(clanRows[0]?.id);
        await initializeClan(clanId, true);
      })
      .catch(error => setScope('clan', { loading: false, error: errorMessage(error) }));
  }, []);

  useEffect(() => {
    if (!initialized.current) return;
    const nextUrl = withLineageUrlState(window.location.href, {
      clanId: workspace.clanId,
      branchId: branchApplied.branchId,
      personBranchId: personApplied.branchId,
      personId: personApplied.personId,
      mode,
      personDepth: personApplied.depth,
      branchDepth: branchApplied.depth,
      direction: personDirection,
      relationScopes: mode === 'person' ? personApplied.relationScopes : branchApplied.relationScopes,
      personRelationScopes: personApplied.relationScopes,
      branchRelationScopes: branchApplied.relationScopes,
      includeSubBranches: branchApplied.includeSubBranches
    });
    window.history.replaceState(window.history.state, '', nextUrl);
  }, [
    workspace.clanId,
    mode,
    personApplied.branchId,
    personApplied.personId,
    personApplied.depth,
    personApplied.relationScopes,
    branchApplied.branchId,
    branchApplied.depth,
    branchApplied.relationScopes,
    branchApplied.includeSubBranches
  ]);

  async function handleClanChange(clanId: string) {
    await initializeClan(clanId);
    feedback.from({ message: clanId ? '宗族已切换，两类图谱查询范围已重新初始化' : '已清空宗族选择' });
  }

  async function handlePersonBranchChange(branchId: string) {
    setPersonDraft(previous => ({ ...previous, branchId, personId: '' }));
    setPersonSearchInput('');
    if (!workspace.clanId || !branchId) {
      setSearchPage(EMPTY_SEARCH);
      return;
    }
    const page = await requestPersonPage(workspace.clanId, branchId, '');
    const nextPerson = page?.records[0];
    setPersonDraft(previous => ({ ...previous, branchId, personId: nextPerson?.id || '' }));
    setPersonSearchInput(nextPerson?.name || '');
  }

  async function handlePersonSearch(keyword: string) {
    setPersonSearchInput(keyword);
    if (!workspace.clanId || !personDraft.branchId) return;
    await requestPersonPage(workspace.clanId, personDraft.branchId, keyword);
  }

  async function applyPersonQuery() {
    clearSelection();
    setLocatedNodeIds(previous => ({ ...previous, person: '' }));
    setPersonApplied({ ...personDraft, relationScopes: [...personDraft.relationScopes] });
    workspace.patch({ branchId: personDraft.branchId, personId: personDraft.personId, relationshipId: '' });
    await loadPersonGraph(personDraft);
  }

  async function applyBranchQuery() {
    clearSelection();
    setLocatedNodeIds(previous => ({ ...previous, branch: '' }));
    setBranchApplied({ ...branchDraft, relationScopes: [...branchDraft.relationScopes] });
    workspace.patch({ branchId: branchDraft.branchId, relationshipId: '' });
    await loadBranchGraph(branchDraft);
  }

  function resetCurrentQuery() {
    clearSelection();
    if (mode === 'person') {
      setPersonDraft({ ...personApplied, relationScopes: [...personApplied.relationScopes] });
      const centerNode = personGraph?.nodes.find(node => node.nodeId === personGraph.rootNodeId);
      setPersonSearchInput(centerNode?.displayName || '');
      setLocatedNodeIds(previous => ({ ...previous, person: '' }));
    } else {
      setBranchDraft({ ...branchApplied, relationScopes: [...branchApplied.relationScopes] });
      setLocatedNodeIds(previous => ({ ...previous, branch: '' }));
    }
  }

  async function handleModeChange(value: string) {
    const nextMode = value as LineageMode;
    setMode(nextMode);
    clearSelection();
    workspace.patch({
      branchId: nextMode === 'person' ? personApplied.branchId : branchApplied.branchId,
      personId: personApplied.personId,
      relationshipId: ''
    });
    if (nextMode === 'person' && !personGraph) await loadPersonGraph(personApplied);
    if (nextMode === 'branch' && !branchGraph) await loadBranchGraph(branchApplied);
  }

  async function setAsCenter(node: TreeNodeResponse) {
    if (!node.personId) return;
    const personId = String(node.personId);
    const branchId = node.branchId ? String(node.branchId) : personApplied.branchId || branchApplied.branchId;
    const next = { ...personApplied, branchId, personId };
    setMode('person');
    setPersonDraft(next);
    setPersonApplied(next);
    setPersonSearchInput(node.displayName);
    setLocatedNodeIds(previous => ({ ...previous, person: '' }));
    clearSelection();
    workspace.patch({ branchId, personId, relationshipId: '' });
    await loadPersonGraph(next);
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

  const activeGraph = mode === 'person' ? personGraph : branchGraph;
  const activeLoadState = mode === 'person' ? loadState.personGraph : loadState.branchGraph;
  const activeApplied = mode === 'person' ? personApplied : branchApplied;
  const activeLocatedNodeId = locatedNodeIds[mode];
  const graphCenterNodeId = mode === 'person'
    ? personGraph?.rootNodeId
    : branchGraph?.rootNodeId;
  const centerNode = personGraph?.nodes.find(node => node.nodeId === personGraph.rootNodeId)
    || personGraph?.nodes.find(node => node.personId && String(node.personId) === personApplied.personId)
    || personGraph?.nodes[0]
    || null;
  const center = centerNode ? toPersonFromNode(centerNode, branches) : null;
  const personOptions = [
    ...(center && !searchPage.records.some(item => item.id === center.id)
      ? [{ value: center.id, label: `${center.name} · ${center.generation} · ${center.branchName}` }]
      : []),
    ...searchPage.records.map(item => ({ value: item.id, label: item.label }))
  ];
  const nodeMap = useMemo(
    () => new Map(activeGraph?.nodes.map(node => [node.nodeId, node]) || []),
    [activeGraph]
  );
  const selectedEdges = selectedNode ? relatedEdges(selectedNode, activeGraph) : [];
  const locatedNode = activeGraph?.nodes.find(node => node.nodeId === activeLocatedNodeId) || null;
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
  const currentClanName = clans.find(item => text(item.id) === workspace.clanId)?.clanName || '族谱';
  const personDirty = personDraft.branchId !== personApplied.branchId
    || personDraft.personId !== personApplied.personId
    || personDraft.depth !== personApplied.depth
    || !sameRelations(personDraft.relationScopes, personApplied.relationScopes);
  const branchDirty = branchDraft.branchId !== branchApplied.branchId
    || branchDraft.depth !== branchApplied.depth
    || branchDraft.includeSubBranches !== branchApplied.includeSubBranches
    || !sameRelations(branchDraft.relationScopes, branchApplied.relationScopes);
  const activeDirty = mode === 'person' ? personDirty : branchDirty;
  const activeLoading = mode === 'person' ? loadState.personGraph.loading : loadState.branchGraph.loading;
  const activeDisabled = mode === 'person'
    ? !workspace.clanId || !personDraft.branchId || !personDraft.personId || !personDraft.depth || !personDraft.relationScopes.length
    : !workspace.clanId || !branchDraft.branchId || !branchDraft.depth || !branchDraft.relationScopes.length;

  function locateNode(nodeId: string) {
    setLocatedNodeIds(previous => ({
      ...previous,
      [mode]: activeGraph?.nodes.some(item => item.nodeId === nodeId) ? nodeId : ''
    }));
  }

  function navigateFromNode(target: NavigateTarget, node: TreeNodeResponse) {
    if (!onNavigate || node.visibility === 'masked') return;
    const personId = node.personId ? String(node.personId) : '';
    const branchId = node.branchId ? String(node.branchId) : activeApplied.branchId;
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

  const clanSelect = (
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
  );
  const branchOptions = branches.map(branch => ({ value: text(branch.id), label: branch.branchName || '未命名支派' }));

  const personQueryForm = (
    <div className="lineage-tab-query-form lineage-tab-query-form--person">
      <div className="lineage-tab-query-grid">
        <Field label="宗族">{clanSelect}</Field>
        <Field label="支派">
          <Select
            aria-label="人物中心支派"
            showSearch
            allowClear
            optionFilterProp="label"
            disabled={!workspace.clanId || loadState.clan.loading}
            value={personDraft.branchId || undefined}
            placeholder="请选择支派"
            options={branchOptions}
            onChange={value => void handlePersonBranchChange(value || '')}
          />
        </Field>
        <Field label="中心人物" hint="仅影响人物中心图谱">
          <Select
            aria-label="切换中心人物"
            showSearch
            value={personDraft.personId || undefined}
            searchValue={personSearchInput}
            placeholder="输入姓名、谱名或字号"
            filterOption={false}
            loading={loadState.search.loading}
            options={personOptions}
            onSearch={value => void handlePersonSearch(value)}
            onChange={value => {
              const item = searchPage.records.find(record => record.id === value);
              setPersonDraft(previous => ({ ...previous, personId: value }));
              setPersonSearchInput(item?.name || (center?.id === value ? center.name : ''));
            }}
            notFoundContent={loadState.search.error || (personSearchInput ? '未找到匹配人物' : '请输入姓名、谱名或字号')}
          />
        </Field>
        <Field label="关系范围" hint={!personDraft.relationScopes.length ? '请至少选择一种关系范围' : undefined}>
          <RelationScopeSelect value={personDraft.relationScopes} onChange={value => setPersonDraft(previous => ({ ...previous, relationScopes: value }))} />
        </Field>
        <Field label="展开深度" hint="默认 1 代，最多 3 代">
          <Select
            aria-label="人物中心展开深度"
            value={personDraft.depth}
            options={PERSON_DEPTH_OPTIONS}
            onChange={value => setPersonDraft(previous => ({ ...previous, depth: value }))}
          />
        </Field>
      </div>
      <div className="lineage-tab-query-actions">
        <Space>
          <Button onClick={resetCurrentQuery}>重置</Button>
          <Button type="primary" icon={<SearchOutlined />} loading={activeLoading} disabled={activeDisabled} onClick={() => void applyPersonQuery()}>查询</Button>
        </Space>
      </div>
    </div>
  );

  const branchQueryForm = (
    <div className="lineage-tab-query-form lineage-tab-query-form--branch">
      <div className="lineage-tab-query-grid">
        <Field label="宗族">{clanSelect}</Field>
        <Field label="支派">
          <Select
            aria-label="支派全局支派"
            showSearch
            allowClear
            optionFilterProp="label"
            disabled={!workspace.clanId || loadState.clan.loading}
            value={branchDraft.branchId || undefined}
            placeholder="请选择支派"
            options={branchOptions}
            onChange={value => setBranchDraft(previous => ({ ...previous, branchId: value || '' }))}
          />
        </Field>
        <Field label="关系范围" hint={!branchDraft.relationScopes.length ? '请至少选择一种关系范围' : undefined}>
          <RelationScopeSelect value={branchDraft.relationScopes} onChange={value => setBranchDraft(previous => ({ ...previous, relationScopes: value }))} />
        </Field>
        <Field label="展开深度">
          <Select
            aria-label="支派全局展开深度"
            value={branchDraft.depth}
            options={BRANCH_DEPTH_OPTIONS}
            onChange={value => setBranchDraft(previous => ({ ...previous, depth: value }))}
          />
        </Field>
        <Field label="包含下级支派">
          <div className="lineage-tab-switch-field">
            <Switch
              aria-label="包含下级支派"
              checked={branchDraft.includeSubBranches}
              onChange={value => setBranchDraft(previous => ({ ...previous, includeSubBranches: value }))}
            />
            <Typography.Text type="secondary">{branchDraft.includeSubBranches ? '包含' : '仅当前支派'}</Typography.Text>
          </div>
        </Field>
      </div>
      <div className="lineage-tab-query-actions">
        <Space>
          <Button onClick={resetCurrentQuery}>重置</Button>
          <Button type="primary" icon={<SearchOutlined />} loading={activeLoading} disabled={activeDisabled} onClick={() => void applyBranchQuery()}>查询</Button>
        </Space>
      </div>
    </div>
  );

  const resultMeta = (
    <div className="lineage-result-meta">
      <Space size={[4, 6]} wrap>
        <Tag color="blue">{mode === 'person' ? '人物中心图谱' : '支派全局图谱'}</Tag>
        <Tag>{currentClanName}</Tag>
        <Tag>{branchPath(branches, activeApplied.branchId)}</Tag>
        {mode === 'person' ? <Tag>{center?.name || '未选择中心人物'}</Tag> : null}
        <Tag>{mode === 'person'
          ? PERSON_DEPTH_OPTIONS.find(item => item.value === personApplied.depth)?.label
          : BRANCH_DEPTH_OPTIONS.find(item => item.value === branchApplied.depth)?.label}</Tag>
        {activeApplied.relationScopes.map(value => <Tag key={value}>{RELATION_OPTIONS.find(item => item.value === value)?.label}</Tag>)}
        {mode === 'branch' ? <Tag>{branchApplied.includeSubBranches ? '包含下级支派' : '仅当前支派'}</Tag> : null}
      </Space>
      <div className="lineage-result-legend" aria-label="图谱图例">
        <span><i className="tone-center" />中心人物</span>
        <span><i className="tone-official" />正式数据</span>
        <span><i className="tone-review" />待核验</span>
        <span><i className="tone-marriage" />婚配关系</span>
      </div>
    </div>
  );

  const drawerTitle = selectedNode
    ? `人物 · ${selectedNode.displayName || '隐私保护'}`
    : selectedEdge ? `关系 · ${relationshipDisplayLabel(selectedEdge)}` : '';
  const endpointLabels = selectedEdge ? relationshipEndpointLabels(selectedEdge) : ['起点人物', '终点人物'] as const;

  return (
    <div className="lineage-page lineage-tree-page lineage-tabbed-page">
      <Card className="lineage-tabbed-query-card" title="世系图谱" size="small">
        {loadState.clan.error ? <PageFeedback tone="error" title={`宗族范围加载失败：${loadState.clan.error}`} /> : null}
        <Tabs
          className="lineage-query-tabs"
          activeKey={mode}
          onChange={value => void handleModeChange(value)}
          items={[
            { key: 'person', label: <Space size={6}><UserOutlined />人物中心图谱</Space>, children: personQueryForm },
            { key: 'branch', label: <Space size={6}><BranchesOutlined />支派全局图谱</Space>, children: branchQueryForm }
          ]}
        />
        <div className="lineage-tab-query-note">
          <Typography.Text type="secondary">
            {mode === 'person'
              ? '以中心人物为核心，按 1～3 代深度展示相关亲属；查询只刷新人物中心图谱。'
              : '按支派范围和展开深度浏览整体世系结构；不受中心人物影响。'}
          </Typography.Text>
          {activeDirty ? <InlineFeedback tone="warning" title={<>查询条件已调整，点击“查询”后刷新当前 TAB 结果。</>} /> : null}
        </div>
      </Card>

      <QueryResultCard
        className="lineage-tabbed-result-card"
        size="small"
        total={activeGraph?.nodes.length || 0}
        totalSuffix="个人物"
        extra={<Tag color="processing">{mode === 'person' ? '人物中心图谱' : '支派全局图谱'}</Tag>}
      >
        <div className="lineage-result-pane">
          {resultMeta}
          <div className="lineage-result-toolbar lineage-result-toolbar--double-card">
            <Field label="图内定位">
              <Select
                aria-label="图内定位人物"
                showSearch
                allowClear
                value={activeLocatedNodeId || undefined}
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
              title={`${mode === 'person' ? '人物中心图谱' : '支派全局图谱'}加载失败：${activeLoadState.error}`}
              action={<Button type="link" onClick={() => mode === 'person' ? void loadPersonGraph(personApplied) : void loadBranchGraph(branchApplied)}>重试</Button>}
            />
          ) : null}
          <section className={`lineage-logic-card lineage-logic-card--${mode}`}>
            <LineageGraphCanvas
              key={`lineage-${mode}-${activeGraph?.meta.generatedAt || 'empty'}`}
              graph={activeGraph}
              loading={activeLoadState.loading}
              emptyText={mode === 'person' ? '请选择中心人物并查询。' : '请选择支派并查询。'}
              activeNodeId={graphCenterNodeId}
              selectedNodeId={selectedNode?.nodeId}
              selectedEdgeId={selectedEdge?.edgeId}
              highlightedNodeIds={highlightedPath.nodeIds}
              highlightedEdgeIds={highlightedPath.edgeIds}
              focusNodeId={activeLocatedNodeId}
              autoFocus={mode === 'person' ? 'active' : 'fit'}
              relationScopes={activeApplied.relationScopes}
              onSelectNode={selectNode}
              onSelectEdge={selectEdge}
              onSetCenter={node => void setAsCenter(node)}
            />
          </section>
        </div>
      </QueryResultCard>

      <Drawer
        title={drawerTitle}
        width={screens.md ? 560 : '100%'}
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
            {selectedNode.visibility !== 'masked' ? <DetailSummary target={selectedNode} indicators={nodeIndicators(selectedNode)} /> : <IndicatorTags indicators={nodeIndicators(selectedNode)} />}
            <Divider>相关关系</Divider>
            <List
              size="small"
              locale={{ emptyText: '暂无可见关系记录' }}
              dataSource={selectedEdges}
              renderItem={edge => {
                const fromName = nodeMap.get(edge.fromNodeId)?.displayName || '受保护人物';
                const toName = nodeMap.get(edge.toNodeId)?.displayName || '受保护人物';
                const summary = summaryText(edge.evidenceSummary, edge.reviewSummary, edge.anomalySummary);
                return (
                  <List.Item onClick={() => selectEdge(edge)} className="lineage-related-edge">
                    <List.Item.Meta title={relationshipDisplayLabel(edge)} description={`${relationshipEndpointText(edge, fromName, toName)}${summary ? ` · ${summary}` : ''}`} />
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
                      selectedNode.reviewSummary?.state && selectedNode.reviewSummary.state !== 'none' && onNavigate ? { key: 'review', label: '进入审核中心', onClick: () => navigateFromNode('reviewCenter', selectedNode) } : null,
                      selectedNode.anomalySummary?.count && onNavigate ? { key: 'workbench', label: '进入修谱工作台', onClick: () => navigateFromNode('editingWorkspace', selectedNode) } : null
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
