import { useEffect, useMemo, useRef, useState } from 'react';
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
import type { MenuProps } from 'antd';
import {
  AimOutlined,
  ApartmentOutlined,
  BranchesOutlined,
  MoreOutlined,
  SearchOutlined,
  UnorderedListOutlined,
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

function LineageAccessibleList({ graph, selectedNodeId, selectedEdgeId, onSelectNode, onSelectEdge }: {
  graph: TreeGraphResponse | null;
  selectedNodeId?: string;
  selectedEdgeId?: string;
  onSelectNode: (node: TreeNodeResponse) => void;
  onSelectEdge: (edge: TreeEdgeResponse) => void;
}) {
  if (!graph?.nodes.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前图谱暂无可展示列表" />;
  const nodeMap = new Map(graph.nodes.map(node => [node.nodeId, node]));
  const sortedNodes = [...graph.nodes].sort((left, right) => (left.generationNo || 9999) - (right.generationNo || 9999) || left.displayName.localeCompare(right.displayName));
  return (
    <div className="lineage-accessible-list" aria-label="世系图谱列表替代视图">
      <section>
        <Typography.Title level={5}>人物列表（{graph.nodes.length}）</Typography.Title>
        <List size="small" dataSource={sortedNodes} renderItem={node => (
          <List.Item className={selectedNodeId === node.nodeId ? 'is-selected' : ''} actions={[<Button key="detail" type="link" onClick={() => onSelectNode(node)}>查看详情</Button>]}>
            <List.Item.Meta
              avatar={<span className="lineage-avatar lineage-avatar--search">{firstChar(node.displayName)}</span>}
              title={<Space wrap><Typography.Text strong>{node.displayName}</Typography.Text>{node.nodeId === graph.rootNodeId ? <Tag color="processing">当前中心</Tag> : null}{node.visibility === 'masked' ? <Tag>隐私保护</Tag> : null}</Space>}
              description={node.visibility === 'masked' ? '人物信息受保护' : `${node.generationNo ? `${node.generationNo}世` : '世次未维护'} · ${node.branchName || '支派未标注'} · ${dataStatusText(node.dataStatus || 'official')}`}
            />
          </List.Item>
        )} />
      </section>
      <section>
        <Typography.Title level={5}>关系列表（{graph.edges.length}）</Typography.Title>
        <List size="small" dataSource={graph.edges} locale={{ emptyText: '暂无可见关系' }} renderItem={edge => {
          const fromName = nodeMap.get(edge.fromNodeId)?.displayName || '受保护人物';
          const toName = nodeMap.get(edge.toNodeId)?.displayName || '受保护人物';
          return (
            <List.Item className={selectedEdgeId === edge.edgeId ? 'is-selected' : ''} actions={[<Button key="detail" type="link" onClick={() => onSelectEdge(edge)}>查看详情</Button>]}>
              <List.Item.Meta title={relationshipDisplayLabel(edge)} description={`${relationshipEndpointText(edge, fromName, toName)}${summaryText(edge.evidenceSummary, edge.reviewSummary, edge.anomalySummary) ? ` · ${summaryText(edge.evidenceSummary, edge.reviewSummary, edge.anomalySummary)}` : ''}`} />
            </List.Item>
          );
        }} />
      </section>
    </div>
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
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [searchPage, setSearchPage] = useState<SearchPage<PersonSearchItem>>(EMPTY_SEARCH);
  const [searchNotice, setSearchNotice] = useState('');
  const [searchCollapsed, setSearchCollapsed] = useState(true);
  const [previewPersonId, setPreviewPersonId] = useState('');
  const [mode, setMode] = useState<LineageMode>(initialUrlState.mode);
  const [canvasView, setCanvasView] = useState<CanvasView>('graph');
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
  const [loadState, setLoadState] = useState<Record<LineageRequestScope, LoadState>>({ clan: IDLE, search: IDLE, personGraph: IDLE, branchGraph: IDLE });

  function setScope(scope: LineageRequestScope, patch: Partial<LoadState>) {
    setLoadState(previous => ({ ...previous, [scope]: { ...previous[scope], ...patch } }));
  }
  function clearSelection() { setSelectedNode(null); setSelectedEdge(null); }
  function clearClanState(clanId: string) {
    requestGate.current.resetClan(clanId);
    setBranches([]); setSearchPage(EMPTY_SEARCH); setSearchInput(''); setAppliedKeyword(''); setSearchNotice(''); setSearchCollapsed(true); setPreviewPersonId('');
    setSelectedBranchId(''); setAppliedBranchId(''); setLocatedNodeId(''); setPersonGraph(null); setBranchGraph(null); clearSelection();
    setLoadState({ clan: IDLE, search: IDLE, personGraph: IDLE, branchGraph: IDLE });
    workspace.patch({ clanId, branchId: '', personId: '', relationshipId: '', sourceId: '', sourceFocusReason: '', reviewTaskId: '' });
  }
  async function requestPersonPage(clanId: string, pageNo: number, keyword: string, nextBranches = branches) {
    const token = requestGate.current.begin('search'); setScope('search', { loading: true, error: '' });
    try {
      const page = await searchPersons({ clanId, branchId: undefined, keyword, pageNo, branches: nextBranches });
      if (!requestGate.current.isCurrent(token)) return null;
      setAppliedKeyword(keyword.trim()); setSearchPage(page); setSearchNotice(page.records.length ? `共匹配 ${page.total} 位人物` : '未找到匹配人物，请调整姓名、谱名或字号。'); return page;
    } catch (error) {
      if (!requestGate.current.isCurrent(token)) return null;
      setScope('search', { error: errorMessage(error) }); setSearchNotice('人物搜索失败，可保留当前图谱并重试。'); return null;
    } finally { if (requestGate.current.isCurrent(token)) setScope('search', { loading: false }); }
  }
  async function loadPersonGraph(personId: string, options: Partial<{ depth: string; direction: TreeDirection; relationScopes: TreeRelationScope[] }> = {}) {
    requestGate.current.invalidate('personGraph');
    if (!personId) { setPersonGraph(null); setScope('personGraph', IDLE); return null; }
    const token = requestGate.current.begin('personGraph'); setScope('personGraph', { loading: true, error: '' });
    try {
      const graph = await loadPersonLineage({ personId, direction: options.direction || appliedDirection, relationScopes: options.relationScopes || appliedPersonRelationScopes, dataView: 'official', depth: options.depth || appliedPersonDepth });
      if (requestGate.current.isCurrent(token)) setPersonGraph(graph); return graph;
    } catch (error) { if (requestGate.current.isCurrent(token)) setScope('personGraph', { error: errorMessage(error) }); return null; }
    finally { if (requestGate.current.isCurrent(token)) setScope('personGraph', { loading: false }); }
  }
  async function loadBranchGraph(branchId: string, clanId: string, options: Partial<{ depth: string; relationScopes: TreeRelationScope[]; includeSubBranches: boolean }> = {}, showNotice = false) {
    requestGate.current.invalidate('branchGraph');
    if (!branchId || !clanId) { setBranchGraph(null); setScope('branchGraph', IDLE); return null; }
    const token = requestGate.current.begin('branchGraph'); setScope('branchGraph', { loading: true, error: '' });
    try {
      const graph = await loadBranchLineage({ clanId, branchId, relationScopes: options.relationScopes || appliedBranchRelationScopes, dataView: 'official', includeSubBranches: options.includeSubBranches ?? appliedIncludeSubBranches, depth: options.depth || appliedBranchDepth });
      if (!requestGate.current.isCurrent(token)) return null;
      setBranchGraph(graph); if (showNotice) notify({ message: `当前支派图已生成：展示 ${graph.meta.nodeCount} 位人物、${graph.meta.edgeCount} 条关系` }); return graph;
    } catch (error) { if (requestGate.current.isCurrent(token)) setScope('branchGraph', { error: errorMessage(error) }); return null; }
    finally { if (requestGate.current.isCurrent(token)) setScope('branchGraph', { loading: false }); }
  }
  async function initializeClan(clanId: string, preferredBranchId = '', preferredPersonId = '') {
    clearClanState(clanId); if (!clanId) return;
    const token = requestGate.current.begin('clan'); setScope('clan', { loading: true, error: '' });
    try {
      const branchRows = await loadBranches(clanId); if (!requestGate.current.isCurrent(token)) return;
      setBranches(branchRows); const nextBranchId = branchRows.some(item => text(item.id) === preferredBranchId) ? preferredBranchId : text(branchRows[0]?.id);
      setSelectedBranchId(nextBranchId); setAppliedBranchId(nextBranchId);
      const page = await requestPersonPage(clanId, 1, '', branchRows); if (!requestGate.current.isCurrent(token)) return;
      const nextPersonId = preferredPersonId || page?.records[0]?.id || '';
      workspace.patch({ clanId, branchId: nextBranchId, personId: nextPersonId, relationshipId: '', sourceId: '', sourceFocusReason: '', reviewTaskId: '' });
      await Promise.all([loadPersonGraph(nextPersonId), loadBranchGraph(nextBranchId, clanId)]);
    } catch (error) { if (requestGate.current.isCurrent(token)) setScope('clan', { error: errorMessage(error) }); }
    finally { if (requestGate.current.isCurrent(token)) setScope('clan', { loading: false }); }
  }
  async function loadBase() {
    setScope('clan', { loading: true, error: '' });
    try { const clanRows = await loadClans(); if (initialized.current) return; setClans(clanRows); const nextClanId = initialUrlState.clanId || workspace.clanId || text(clanRows[0]?.id); initialized.current = true; await initializeClan(nextClanId, initialUrlState.branchId, initialUrlState.personId); }
    catch (error) { setScope('clan', { loading: false, error: errorMessage(error) }); }
  }
  async function handleClanChange(clanId: string) { await initializeClan(clanId); notify({ message: clanId ? '宗族已切换，旧图谱和人物状态已清空' : '已清空宗族选择' }); }
  function handleBranchChange(branchId: string) { setSelectedBranchId(branchId); clearSelection(); setLocatedNodeId(''); }
  async function applyGraphQuery() {
    clearSelection(); setLocatedNodeId('');
    if (mode === 'person') { const graph = await loadPersonGraph(workspace.personId, { depth: personDepth, direction, relationScopes }); if (!graph) return; setAppliedPersonDepth(personDepth); setAppliedDirection(direction); setAppliedPersonRelationScopes([...relationScopes]); return; }
    const graph = await loadBranchGraph(selectedBranchId, workspace.clanId, { depth: branchDepth, relationScopes, includeSubBranches }, true); if (!graph) return;
    setAppliedBranchId(selectedBranchId); setAppliedBranchDepth(branchDepth); setAppliedBranchRelationScopes([...relationScopes]); setAppliedIncludeSubBranches(includeSubBranches);
  }
  async function handlePersonSelection(item: PersonSearchItem) {
    setSearchCollapsed(true); const nextBranchId = item.branchId || selectedBranchId; setSelectedBranchId(nextBranchId); setMode('person'); setRelationScopes([...appliedPersonRelationScopes]); setLocatedNodeId(''); clearSelection();
    workspace.patch({ personId: item.id, branchId: nextBranchId, relationshipId: '' }); await loadPersonGraph(item.id);
  }
  async function setAsCenter(node: TreeNodeResponse) {
    if (!node.personId) return; const personId = String(node.personId); const branchId = node.branchId ? String(node.branchId) : selectedBranchId;
    setSelectedBranchId(branchId); setMode('person'); setRelationScopes([...appliedPersonRelationScopes]); setLocatedNodeId(''); clearSelection(); workspace.patch({ personId, branchId, relationshipId: '' }); await loadPersonGraph(personId);
  }
  function selectNode(node: TreeNodeResponse) { setSelectedEdge(null); setSelectedNode(node); }
  function selectEdge(edge: TreeEdgeResponse) { setSelectedNode(null); setSelectedEdge(edge); workspace.setRelationshipId(edge.relationshipId ? String(edge.relationshipId) : ''); }
  function navigateFromNode(target: NavigateTarget, node: TreeNodeResponse) {
    if (!onNavigate || node.visibility === 'masked') return; const personId = node.personId ? String(node.personId) : ''; const branchId = node.branchId ? String(node.branchId) : selectedBranchId;
    const patch = { personId, branchId, relationshipId: '', sourceId: '', reviewTaskId: '' };
    if (target === 'sourceLibrary') workspace.patch({ ...patch, sourceFocusReason: 'tree_person_evidence' }); else workspace.patch({ ...patch, sourceFocusReason: '' }); clearSelection(); onNavigate(target);
  }
  function navigateFromEdge(target: NavigateTarget, edge: TreeEdgeResponse) {
    if (!onNavigate || edge.visibility === 'masked') return; const relationshipId = edge.relationshipId ? String(edge.relationshipId) : ''; const patch = { relationshipId, sourceId: '', reviewTaskId: '' };
    if (target === 'sourceLibrary') workspace.patch({ ...patch, sourceFocusReason: 'tree_relationship_evidence' }); else workspace.patch({ ...patch, sourceFocusReason: '' }); clearSelection(); onNavigate(target);
  }

  useEffect(() => { void loadBase(); }, []);
  useEffect(() => {
    if (!initialized.current) return;
    const nextUrl = withLineageUrlState(window.location.href, { clanId: workspace.clanId, branchId: appliedBranchId, personId: workspace.personId, mode, personDepth: appliedPersonDepth, branchDepth: appliedBranchDepth, direction: appliedDirection, relationScopes: mode === 'person' ? appliedPersonRelationScopes : appliedBranchRelationScopes, includeSubBranches: appliedIncludeSubBranches });
    window.history.replaceState(window.history.state, '', nextUrl);
  }, [workspace.clanId, appliedBranchId, workspace.personId, mode, appliedPersonDepth, appliedBranchDepth, appliedDirection, appliedPersonRelationScopes, appliedBranchRelationScopes, appliedIncludeSubBranches]);

  const centerNode = personGraph?.nodes.find(node => node.nodeId === personGraph.rootNodeId) || personGraph?.nodes.find(node => node.personId && String(node.personId) === workspace.personId) || personGraph?.nodes[0] || null;
  const center = centerNode ? toPersonFromNode(centerNode, branches) : null;
  const branchName = branches.find(item => text(item.id) === appliedBranchId)?.branchName || '支派';
  const currentClanName = clans.find(item => text(item.id) === workspace.clanId)?.clanName || '族谱';
  const activeGraph = mode === 'person' ? personGraph : branchGraph;
  const activeLoadState = mode === 'person' ? loadState.personGraph : loadState.branchGraph;
  const activeRelationScopes = mode === 'person' ? appliedPersonRelationScopes : appliedBranchRelationScopes;
  const graphCenterNodeId = mode === 'person' ? centerNode?.nodeId || activeGraph?.rootNodeId : activeGraph?.nodes.some(node => node.nodeId === centerNode?.nodeId) ? centerNode?.nodeId : activeGraph?.rootNodeId;
  const selectedEdges = selectedNode ? relatedEdges(selectedNode, activeGraph) : [];
  const nodeMap = useMemo(() => new Map(activeGraph?.nodes.map(node => [node.nodeId, node]) || []), [activeGraph]);
  const locatedNode = activeGraph?.nodes.find(node => node.nodeId === locatedNodeId) || null;
  const highlightedPath = useMemo(() => activeGraph && locatedNode && graphCenterNodeId ? findLineagePath(activeGraph, graphCenterNodeId, locatedNode.nodeId) : { nodeIds: [], edgeIds: [] }, [activeGraph, locatedNode, graphCenterNodeId]);
  const orderedSearchRecords = useMemo(() => [...searchPage.records].sort((left, right) => Number(right.id === workspace.personId) - Number(left.id === workspace.personId)), [searchPage.records, workspace.personId]);
  const currentScopeText = mode === 'person' ? `${center?.name || '中心人物'} · ${DIRECTION_OPTIONS.find(item => item.value === appliedDirection)?.label}` : branchPath(branches, appliedBranchId);
  const graphOptions = activeGraph?.nodes.filter(node => node.visibility === 'visible').map(node => ({ value: node.nodeId, label: `${node.displayName}${node.generationNo ? ` · ${node.generationNo}世` : ''}${node.branchName ? ` · ${node.branchName}` : ''}` })) || [];
  const queryDirty = mode === 'person' ? personDepth !== appliedPersonDepth || direction !== appliedDirection || !sameRelationScopes(relationScopes, appliedPersonRelationScopes) : selectedBranchId !== appliedBranchId || branchDepth !== appliedBranchDepth || includeSubBranches !== appliedIncludeSubBranches || !sameRelationScopes(relationScopes, appliedBranchRelationScopes);
  const canvasTitle = mode === 'person' ? `${center?.name || '中心人物'}的世系图` : `${branchName}世系图`;
  const appliedDepthText = mode === 'person' ? PERSON_DEPTH_OPTIONS.find(item => item.value === appliedPersonDepth)?.label : BRANCH_DEPTH_OPTIONS.find(item => item.value === appliedBranchDepth)?.label;
  const currentDepth = mode === 'person' ? personDepth : branchDepth;
  const canGenerateGraph = mode === 'person' ? Boolean(workspace.personId) : Boolean(selectedBranchId);
  const generateButtonText = queryDirty ? '生成图谱' : '刷新图谱';

  useEffect(() => { if (locatedNodeId && !activeGraph?.nodes.some(node => node.nodeId === locatedNodeId)) setLocatedNodeId(''); }, [activeGraph, locatedNodeId]);
  function locateNode(nodeId: string) { setLocatedNodeId(activeGraph?.nodes.some(item => item.nodeId === nodeId) ? nodeId : ''); }
  async function handleModeChange(nextMode: LineageMode) {
    setMode(nextMode); setRelationScopes([...(nextMode === 'person' ? appliedPersonRelationScopes : appliedBranchRelationScopes)]); clearSelection(); setLocatedNodeId('');
    if (nextMode === 'person') await loadPersonGraph(workspace.personId); else await loadBranchGraph(appliedBranchId || selectedBranchId, workspace.clanId);
  }

  const drawerTitle = selectedNode ? `人物 · ${selectedNode.displayName || '隐私保护'}` : selectedEdge ? `关系 · ${relationshipDisplayLabel(selectedEdge)}` : '';
  const endpointLabels = selectedEdge ? relationshipEndpointLabels(selectedEdge) : ['起点人物', '终点人物'] as const;
  const drawerWidth = screens.md ? 560 : '100%';

  return (
    <div className="lineage-page lineage-tree-page lineage-tree-page--standardized">
      <Panel title="世系图谱" description="以人物或支派为中心查看亲属关系、来源证据和修谱状态。">
        {loadState.clan.error ? <Alert type="error" showIcon message={`宗族范围加载失败：${loadState.clan.error}`} /> : null}
        <div className="lineage-query-console">
          <div className="lineage-query-console-head">
            <div>
              <Typography.Text strong>查询控制台</Typography.Text>
              <Typography.Paragraph type="secondary">先选择查看对象和基础范围，再生成图谱；图内定位只在当前结果中查找。</Typography.Paragraph>
            </div>
            <Segmented aria-label="查看方式" value={mode} options={[{ value: 'person', label: <Space size={6}><UserOutlined />人物中心</Space> }, { value: 'branch', label: <Space size={6}><BranchesOutlined />支派全局</Space> }]} onChange={value => void handleModeChange(value as LineageMode)} />
          </div>
          <Divider className="lineage-query-divider">基础范围</Divider>
          <div className="lineage-query-grid lineage-query-grid--base">
            <Field label="宗族"><Select aria-label="宗族" disabled={loadState.clan.loading} value={workspace.clanId || undefined} placeholder="请选择宗族" options={clans.map(clan => ({ value: text(clan.id), label: clan.clanName || clan.surname || '未命名宗族' }))} onChange={value => void handleClanChange(value)} /></Field>
            <Field label={mode === 'person' ? '人物搜索支派' : '支派范围'}><Select aria-label={mode === 'person' ? '人物搜索支派' : '支派图范围'} value={selectedBranchId || undefined} placeholder="请选择支派" options={branches.map(branch => ({ value: text(branch.id), label: branch.branchName || '未命名支派' }))} onChange={handleBranchChange} /></Field>
          </div>
          <Divider className="lineage-query-divider">{mode === 'person' ? '人物中心条件' : '支派全局条件'}</Divider>
          {mode === 'person' ? <>
            <div className="lineage-query-grid lineage-query-grid--person">
              <Field label="查找人物"><Space.Compact className="lineage-person-search"><Input allowClear value={searchInput} placeholder="输入姓名、谱名或字号" onChange={event => setSearchInput(event.target.value)} onPressEnter={() => { setSearchCollapsed(false); void requestPersonPage(workspace.clanId, 1, searchInput); }} disabled={!workspace.clanId} /><Button icon={<SearchOutlined />} loading={loadState.search.loading} disabled={!workspace.clanId} onClick={() => { setSearchCollapsed(false); void requestPersonPage(workspace.clanId, 1, searchInput); }}>查找</Button></Space.Compact></Field>
              <Field label="查看方向"><Select aria-label="人物图查看方向" value={direction} options={DIRECTION_OPTIONS} onChange={value => setDirection(value as TreeDirection)} /></Field>
              <Field label="展开深度"><Select aria-label="人物中心展开深度" value={personDepth} options={PERSON_DEPTH_OPTIONS} onChange={setPersonDepth} /></Field>
              <Field label="关系范围"><Select aria-label="关系范围" mode="multiple" value={relationScopes} maxTagCount="responsive" options={RELATION_OPTIONS} onChange={values => { if (values.length) setRelationScopes(values as TreeRelationScope[]); }} /></Field>
            </div>
            <div className={`lineage-search-results ${searchCollapsed ? 'is-collapsed' : ''}`}>
              <div className="lineage-search-results-head"><div><Typography.Text strong>人物查询结果</Typography.Text><Typography.Text type="secondary">{loadState.search.error ? `搜索失败：${loadState.search.error}` : searchNotice || `共 ${searchPage.total} 位人物`}</Typography.Text>{appliedKeyword ? <Tag>条件：{appliedKeyword}</Tag> : null}</div><Button type="link" onClick={() => setSearchCollapsed(value => !value)}>{searchCollapsed ? '展开结果' : '收起结果'}</Button></div>
              {!searchCollapsed ? <><div id="lineage-person-search-results" className="lineage-search-results-list"><List loading={loadState.search.loading} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无匹配人物" /> }} dataSource={orderedSearchRecords} renderItem={item => {
                const active = item.id === workspace.personId; const previewing = item.id === previewPersonId;
                return <List.Item className={`lineage-search-result-item ${active ? 'is-active' : ''} ${previewing ? 'is-previewing' : ''}`} onClick={() => setPreviewPersonId(item.id)} actions={[active ? <Tag key="center" color="processing">当前中心</Tag> : <Button key="center" type="link" onClick={event => { event.stopPropagation(); void handlePersonSelection(item); }}>设为中心</Button>]}><List.Item.Meta avatar={<span className="lineage-avatar lineage-avatar--search">{firstChar(item.name)}</span>} title={<Space size={8} wrap><Typography.Text strong><HighlightText value={item.name} keyword={appliedKeyword} /></Typography.Text>{item.alias ? <Typography.Text type="secondary"><HighlightText value={item.alias} keyword={appliedKeyword} /></Typography.Text> : null}</Space>} description={<Space size={[6, 4]} wrap><Tag>{item.generation}</Tag><Tag>{item.branchName}</Tag>{previewing && !active ? <Typography.Text type="secondary">已选中，点击右侧设为中心</Typography.Text> : null}</Space>} /></List.Item>;
              }} /></div>{searchPage.total > searchPage.pageSize ? <div className="lineage-search-results-pagination"><Pagination current={searchPage.pageNo} pageSize={searchPage.pageSize} total={searchPage.total} showSizeChanger={false} showTotal={total => `共 ${total} 条`} disabled={loadState.search.loading} onChange={page => void requestPersonPage(workspace.clanId, page, appliedKeyword)} /></div> : null}</> : null}
            </div>
          </> : <div className="lineage-query-grid lineage-query-grid--branch">
            <Field label="支派范围"><Select aria-label="支派图范围" value={selectedBranchId || undefined} placeholder="请选择支派" options={branches.map(branch => ({ value: text(branch.id), label: branch.branchName || '未命名支派' }))} onChange={handleBranchChange} /></Field>
            <Field label="包含下级支派"><div className="lineage-switch-field lineage-switch-field--toolbar"><Switch checked={includeSubBranches} onChange={setIncludeSubBranches} /><span>{includeSubBranches ? '包含' : '仅当前支派'}</span></div></Field>
            <Field label="展开深度"><Select aria-label="支派全局展开深度" value={branchDepth} options={BRANCH_DEPTH_OPTIONS} onChange={setBranchDepth} /></Field>
            <Field label="关系范围"><Select aria-label="关系范围" mode="multiple" value={relationScopes} maxTagCount="responsive" options={RELATION_OPTIONS} onChange={values => { if (values.length) setRelationScopes(values as TreeRelationScope[]); }} /></Field>
          </div>}
          <div className="lineage-query-console-actions">
            <Space size={[4, 4]} wrap><Typography.Text type="secondary">当前设置：</Typography.Text><Tag>{mode === 'person' ? center?.name || '未选择中心人物' : branchPath(branches, selectedBranchId)}</Tag><Tag>{mode === 'person' ? DIRECTION_OPTIONS.find(item => item.value === direction)?.label : includeSubBranches ? '包含下级支派' : '仅当前支派'}</Tag><Tag>{mode === 'person' ? PERSON_DEPTH_OPTIONS.find(item => item.value === currentDepth)?.label : BRANCH_DEPTH_OPTIONS.find(item => item.value === currentDepth)?.label}</Tag>{relationScopes.map(value => <Tag key={value}>{RELATION_OPTIONS.find(item => item.value === value)?.label}</Tag>)}{queryDirty ? <Tag color="processing">待生成</Tag> : <Tag color="success">已应用</Tag>}</Space>
            <Space wrap><Button onClick={() => { setRelationScopes([...(mode === 'person' ? appliedPersonRelationScopes : appliedBranchRelationScopes)]); setPersonDepth(appliedPersonDepth); setBranchDepth(appliedBranchDepth); setDirection(appliedDirection); setSelectedBranchId(appliedBranchId || selectedBranchId); setIncludeSubBranches(appliedIncludeSubBranches); }}>重置</Button><Button type="primary" icon={<SearchOutlined />} loading={activeLoadState.loading} disabled={!canGenerateGraph} onClick={() => void applyGraphQuery()}>{generateButtonText}</Button></Space>
          </div>
        </div>
      </Panel>

      <Card className="lineage-workbench-card" title={canvasTitle}>
        <div className="lineage-scope-summary"><Typography.Text type="secondary">{currentClanName} · {currentScopeText}</Typography.Text><Space size={[4, 4]} wrap>{appliedDepthText ? <Tag>{appliedDepthText}</Tag> : null}{activeRelationScopes.map(value => <Tag key={value}>{RELATION_OPTIONS.find(item => item.value === value)?.label}</Tag>)}{mode === 'branch' ? <Tag>{appliedIncludeSubBranches ? '包含下级支派' : '仅当前支派'}</Tag> : null}</Space></div>
        <div className="lineage-result-toolbar">
          <Field label="图内定位"><Select aria-label="图内定位人物" showSearch allowClear value={locatedNodeId || undefined} placeholder="搜索当前图人物" optionFilterProp="label" options={graphOptions} suffixIcon={<AimOutlined />} onChange={value => locateNode(value || '')} /></Field>
        </div>
        <div className="lineage-canvas-view-bar"><Segmented aria-label="图谱展示方式" value={canvasView} options={[{ value: 'graph', label: <Space size={6}><ApartmentOutlined />图谱</Space> }, { value: 'list', label: <Space size={6}><UnorderedListOutlined />列表</Space> }]} onChange={value => setCanvasView(value as CanvasView)} /><Typography.Text type="secondary">图谱用于浏览关系，列表用于键盘访问、故障降级和移动端阅读。</Typography.Text></div>
        {activeLoadState.error ? <Alert type="error" showIcon message={`${mode === 'person' ? '人物图' : '支派图'}加载失败：${activeLoadState.error}`} action={<Space><Button type="link" onClick={() => setCanvasView('list')}>查看列表</Button><Button type="link" onClick={() => mode === 'person' ? void loadPersonGraph(workspace.personId) : void loadBranchGraph(selectedBranchId, workspace.clanId)}>重试</Button></Space>} /> : null}
        <section className={`lineage-logic-card lineage-logic-card--${mode}`}>
          {canvasView === 'graph' ? <LineageGraphCanvas graph={activeGraph} loading={activeLoadState.loading} emptyText={mode === 'person' ? '请从查询结果中选择中心人物。' : '暂无支派世系数据。'} activeNodeId={graphCenterNodeId} selectedNodeId={selectedNode?.nodeId} selectedEdgeId={selectedEdge?.edgeId} highlightedNodeIds={highlightedPath.nodeIds} highlightedEdgeIds={highlightedPath.edgeIds} focusNodeId={locatedNodeId} autoFocus={mode === 'person' ? 'active' : 'fit'} relationScopes={activeRelationScopes} onSelectNode={selectNode} onSelectEdge={selectEdge} onSetCenter={node => void setAsCenter(node)} /> : <LineageAccessibleList graph={activeGraph} selectedNodeId={selectedNode?.nodeId} selectedEdgeId={selectedEdge?.edgeId} onSelectNode={selectNode} onSelectEdge={selectEdge} />}
        </section>
      </Card>

      <Drawer title={drawerTitle} width={drawerWidth} open={Boolean(selectedNode || selectedEdge)} onClose={clearSelection} destroyOnClose className="lineage-inspector-drawer">
        {selectedNode ? <div className="lineage-drawer-content">
          <div className="lineage-pop-head"><span className="lineage-avatar">{firstChar(selectedNode.displayName)}</span><div><h3>{selectedNode.displayName}</h3><p>{selectedNode.visibility === 'masked' ? '隐私保护人物' : `${genderCn(selectedNode.gender || 'unknown')} · ${selectedNode.generationNo ? `${selectedNode.generationNo}世` : '世次未维护'} · ${selectedNode.generationWord || '-'}字辈`}</p></div></div>
          <Descriptions bordered size="small" column={1} items={[{ key: 'branch', label: '所属支派', children: selectedNode.visibility === 'masked' ? '受保护' : selectedNode.branchName || '未标注' }, { key: 'years', label: '生卒信息', children: selectedNode.visibility === 'masked' ? '受保护' : selectedNode.birthText || selectedNode.deathText ? `${selectedNode.birthText || '?'}-${selectedNode.deathText || ''}` : '-' }, { key: 'status', label: '数据状态', children: dataStatusText(selectedNode.dataStatus || (selectedNode.visibility === 'masked' ? '受保护' : '已记录')) }, { key: 'privacy', label: '可见范围', children: selectedNode.visibility === 'masked' ? '安全占位' : privacyLevelText(selectedNode.privacyLevel) }]} />
          {selectedNode.visibility !== 'masked' ? <DetailSummary target={selectedNode} indicators={nodeIndicators(selectedNode)} /> : <IndicatorTags indicators={nodeIndicators(selectedNode)} />}
          <Divider>相关关系</Divider><List size="small" locale={{ emptyText: '暂无可见关系记录' }} dataSource={selectedEdges} renderItem={edge => { const fromName = nodeMap.get(edge.fromNodeId)?.displayName || '受保护人物'; const toName = nodeMap.get(edge.toNodeId)?.displayName || '受保护人物'; return <List.Item onClick={() => selectEdge(edge)} className="lineage-related-edge"><List.Item.Meta title={relationshipDisplayLabel(edge)} description={`${relationshipEndpointText(edge, fromName, toName)}${summaryText(edge.evidenceSummary, edge.reviewSummary, edge.anomalySummary) ? ` · ${summaryText(edge.evidenceSummary, edge.reviewSummary, edge.anomalySummary)}` : ''}`} /></List.Item>; }} />
          <Divider /><Space wrap className="lineage-inspector-actions">{selectedNode.personId ? <Button type="primary" onClick={() => void setAsCenter(selectedNode)}>设为中心人物</Button> : null}{selectedNode.personId && onNavigate ? <Button onClick={() => navigateFromNode('personArchive', selectedNode)}>查看人物档案</Button> : null}{selectedNode.evidenceSummary && onNavigate ? <Button onClick={() => navigateFromNode('sourceLibrary', selectedNode)}>查看来源证据</Button> : null}{(selectedNode.reviewSummary?.state && selectedNode.reviewSummary.state !== 'none') || selectedNode.anomalySummary?.count ? <Dropdown menu={{ items: [selectedNode.reviewSummary?.state && selectedNode.reviewSummary.state !== 'none' && onNavigate ? { key: 'review', label: '进入审核中心', onClick: () => navigateFromNode('reviewCenter', selectedNode) } : null, selectedNode.anomalySummary?.count && onNavigate ? { key: 'workbench', label: '进入修谱工作台', onClick: () => navigateFromNode('editingWorkspace', selectedNode) } : null].filter(Boolean) as MenuProps['items'] }}><Button icon={<MoreOutlined />}>更多</Button></Dropdown> : null}</Space>
        </div> : null}
        {selectedEdge ? <div className="lineage-drawer-content"><div className="lineage-edge-pop-head"><h3>{relationshipDisplayLabel(selectedEdge)}</h3><p>{edgeVisual(selectedEdge).description}</p></div><Descriptions bordered size="small" column={1} items={[{ key: 'from', label: endpointLabels[0], children: nodeMap.get(selectedEdge.fromNodeId)?.displayName || '受保护人物' }, { key: 'to', label: endpointLabels[1], children: nodeMap.get(selectedEdge.toNodeId)?.displayName || '受保护人物' }, { key: 'category', label: '关系类别', children: relationCategoryText(selectedEdge.relationCategory) }, { key: 'status', label: '数据状态', children: dataStatusText(selectedEdge.dataStatus) }]} /><DetailSummary target={selectedEdge} indicators={edgeIndicators(selectedEdge)} /><Divider /><Space wrap className="lineage-inspector-actions">{selectedEdge.evidenceSummary && onNavigate ? <Button type="primary" onClick={() => navigateFromEdge('sourceLibrary', selectedEdge)}>查看来源证据</Button> : null}{selectedEdge.reviewSummary && selectedEdge.reviewSummary.state !== 'none' && onNavigate ? <Button onClick={() => navigateFromEdge('reviewCenter', selectedEdge)}>进入审核中心</Button> : null}{selectedEdge.anomalySummary?.count && onNavigate ? <Button onClick={() => navigateFromEdge('editingWorkspace', selectedEdge)}>进入修谱工作台</Button> : null}</Space></div> : null}
      </Drawer>
    </div>
  );
}
