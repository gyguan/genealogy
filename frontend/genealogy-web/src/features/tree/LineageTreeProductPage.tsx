import { useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../../shared/api/client';
import type { TreeEdgeResponse, TreeGraphResponse, TreeNodeResponse } from '../../shared/api/generated/tree-types';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { Panel } from '../../shared/ui/Panel';
import { LineageGraphCanvas } from './LineageGraphCanvas';
import { relationLabel } from './lineageGraphModel';
import {
  LineageRequestGate,
  readSearchPage,
  toPersonSearchItem,
  type LineageRequestScope,
  type PersonSearchItem,
  type SearchPage
} from './lineageRequestState';

type Props = { notify: (data: unknown, error?: boolean) => void };
type GenericRow = Record<string, unknown>;
type BranchRow = GenericRow & { id?: string | number; branchName?: string; parentId?: string | number };
type ClanRow = GenericRow & { id?: string | number; clanName?: string; surname?: string };
type LoadState = { loading: boolean; error: string };

type PersonCard = {
  id: string;
  nodeId?: string;
  name: string;
  avatar: string;
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

function asRecord(value: unknown): GenericRow {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as GenericRow : {};
}

function rows(data: unknown): GenericRow[] {
  if (Array.isArray(data)) return data.map(asRecord);
  const record = asRecord(data);
  for (const key of ['records', 'items', 'content']) {
    if (Array.isArray(record[key])) return (record[key] as unknown[]).map(asRecord);
  }
  return [];
}

function text(value: unknown) {
  return value === null || value === undefined ? '' : String(value);
}

function firstChar(name?: string) {
  return (name || '谱').slice(0, 1);
}

function errorMessage(error: unknown) {
  return (error as Error)?.message || '请求失败，请重试';
}

function relationCn(value: string) {
  const labels: Record<string, string> = {
    father: '父亲', mother: '母亲', spouse: '婚配', parent_child: '亲子',
    child: '子女', son: '子', daughter: '女', adoptive: '收养', successor: '承嗣',
    out_adoption: '出嗣', in_adoption: '入继', dual_successor: '兼祧', heir_son: '嗣子', no_descendant: '无嗣'
  };
  return labels[value] || value || '亲属';
}

function genderCn(value: string) {
  return ({ male: '男', female: '女', unknown: '未知' } as Record<string, string>)[value] || value || '未知';
}

function toPersonFromNode(node: TreeNodeResponse, branches: BranchRow[]): PersonCard {
  const branchId = node.branchId ? String(node.branchId) : '';
  return {
    id: node.personId ? String(node.personId) : '',
    nodeId: node.nodeId,
    name: node.displayName,
    avatar: firstChar(node.displayName),
    gender: node.gender || 'unknown',
    generation: node.generationNo ? `${node.generationNo}世` : '世次未维护',
    word: node.generationWord || '-',
    branchId,
    branchName: node.branchName || branches.find(item => text(item.id) === branchId)?.branchName || '未归属支派',
    years: node.birthText || node.deathText ? `${node.birthText || '?'}-${node.deathText || ''}` : '-',
    status: node.dataStatus || (node.visibility === 'masked' ? '受保护' : '已记录')
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

function relatedEdges(node: TreeNodeResponse, graphs: Array<TreeGraphResponse | null>) {
  const map = new Map<string, TreeEdgeResponse>();
  graphs.forEach(graph => graph?.edges.forEach(edge => {
    if (edge.fromNodeId === node.nodeId || edge.toNodeId === node.nodeId) map.set(edge.edgeId, edge);
  }));
  return [...map.values()];
}

export function LineageTreeProductPage({ notify }: Props) {
  const workspace = useWorkspace();
  const requestGate = useRef(new LineageRequestGate());
  const initialized = useRef(false);

  const [clans, setClans] = useState<ClanRow[]>([]);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchPage, setSearchPage] = useState<SearchPage<PersonSearchItem>>(EMPTY_SEARCH);
  const [searchNotice, setSearchNotice] = useState('');
  const [depth, setDepth] = useState('3');
  const [selectedBranchId, setSelectedBranchId] = useState(workspace.branchId || '');
  const [personGraph, setPersonGraph] = useState<TreeGraphResponse | null>(null);
  const [branchGraph, setBranchGraph] = useState<TreeGraphResponse | null>(null);
  const [selectedNode, setSelectedNode] = useState<TreeNodeResponse | null>(null);
  const [loadState, setLoadState] = useState<Record<LineageRequestScope, LoadState>>({
    clan: IDLE, search: IDLE, personGraph: IDLE, branchGraph: IDLE
  });

  function setScope(scope: LineageRequestScope, patch: Partial<LoadState>) {
    setLoadState(previous => ({ ...previous, [scope]: { ...previous[scope], ...patch } }));
  }

  function branchNames(nextBranches = branches) {
    return new Map(nextBranches.map(item => [text(item.id), item.branchName || '未命名支派']));
  }

  function clearClanState(clanId: string) {
    requestGate.current.resetClan(clanId);
    setBranches([]);
    setSearchPage(EMPTY_SEARCH);
    setSearchKeyword('');
    setSearchNotice('');
    setSelectedBranchId('');
    setPersonGraph(null);
    setBranchGraph(null);
    setSelectedNode(null);
    setLoadState({ clan: IDLE, search: IDLE, personGraph: IDLE, branchGraph: IDLE });
    workspace.patch({ clanId, branchId: '', personId: '', relationshipId: '', sourceId: '', reviewTaskId: '' });
  }

  async function requestPersonPage(clanId: string, pageNo: number, keyword: string, nextBranches = branches) {
    const token = requestGate.current.begin('search');
    setScope('search', { loading: true, error: '' });
    try {
      const path = `/persons/search?clanId=${clanId}&pageNo=${pageNo}&pageSize=20${keyword.trim() ? `&keyword=${encodeURIComponent(keyword.trim())}` : ''}`;
      const payload = await apiClient.get(path);
      const page = readSearchPage(payload, value => toPersonSearchItem(value, branchNames(nextBranches)));
      if (!requestGate.current.isCurrent(token)) return null;
      setSearchPage(page);
      setSearchNotice(page.records.length ? `共匹配 ${page.total} 位人物` : '未找到匹配人物，请调整姓名、谱名或字号。');
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

  async function loadPersonGraph(personId: string, requestedDepth = depth) {
    requestGate.current.invalidate('personGraph');
    if (!personId) {
      setPersonGraph(null);
      setScope('personGraph', IDLE);
      return;
    }
    const token = requestGate.current.begin('personGraph');
    setScope('personGraph', { loading: true, error: '' });
    try {
      const graph = await apiClient.get<TreeGraphResponse>(`/tree/person/${personId}?direction=both&maxDepth=${requestedDepth}&maxNodes=500&maxEdges=1000`);
      if (requestGate.current.isCurrent(token)) setPersonGraph(graph);
    } catch (error) {
      if (requestGate.current.isCurrent(token)) setScope('personGraph', { error: errorMessage(error) });
    } finally {
      if (requestGate.current.isCurrent(token)) setScope('personGraph', { loading: false });
    }
  }

  async function loadBranchGraph(branchId: string, clanId: string, requestedDepth = depth, showNotice = false) {
    requestGate.current.invalidate('branchGraph');
    if (!branchId || !clanId) {
      setBranchGraph(null);
      setScope('branchGraph', IDLE);
      return;
    }
    const token = requestGate.current.begin('branchGraph');
    setScope('branchGraph', { loading: true, error: '' });
    try {
      const graph = await apiClient.get<TreeGraphResponse>(`/tree/clans/${clanId}/branches/${branchId}/lineage?maxDepth=${requestedDepth}&maxNodes=500&maxEdges=1000`);
      if (!requestGate.current.isCurrent(token)) return;
      setBranchGraph(graph);
      if (showNotice) notify({ message: `支派世系已生成：${graph.meta.nodeCount} 位人物，${graph.meta.edgeCount} 条关系` });
    } catch (error) {
      if (requestGate.current.isCurrent(token)) setScope('branchGraph', { error: errorMessage(error) });
    } finally {
      if (requestGate.current.isCurrent(token)) setScope('branchGraph', { loading: false });
    }
  }

  async function initializeClan(clanId: string, resetSelection: boolean) {
    clearClanState(clanId);
    if (!clanId) return;
    const token = requestGate.current.begin('clan');
    setScope('clan', { loading: true, error: '' });
    try {
      const branchRows = rows(await apiClient.get(`/clans/${clanId}/branches`)) as BranchRow[];
      if (!requestGate.current.isCurrent(token)) return;
      setBranches(branchRows);
      const page = await requestPersonPage(clanId, 1, '', branchRows);
      if (!requestGate.current.isCurrent(token)) return;

      const priorBranchId = resetSelection ? '' : workspace.branchId;
      const nextBranchId = branchRows.some(item => text(item.id) === priorBranchId) ? priorBranchId : text(branchRows[0]?.id);
      const priorPersonId = resetSelection ? '' : workspace.personId;
      const nextPersonId = priorPersonId || page?.records[0]?.id || '';
      setSelectedBranchId(nextBranchId);
      workspace.patch({ clanId, branchId: nextBranchId, personId: nextPersonId, relationshipId: '', sourceId: '', reviewTaskId: '' });
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
      const clanRows = rows(await apiClient.get('/clans')) as ClanRow[];
      if (initialized.current) return;
      setClans(clanRows);
      const nextClanId = workspace.clanId || text(clanRows[0]?.id);
      initialized.current = true;
      await initializeClan(nextClanId, !workspace.clanId);
    } catch (error) {
      setScope('clan', { loading: false, error: errorMessage(error) });
    }
  }

  async function handleClanChange(clanId: string) {
    await initializeClan(clanId, true);
    notify({ message: clanId ? '宗族已切换，旧图谱和人物状态已清空' : '已清空宗族选择' });
  }

  async function handleBranchChange(branchId: string) {
    setSelectedBranchId(branchId);
    workspace.patch({ branchId, relationshipId: '' });
    setSelectedNode(null);
    await loadBranchGraph(branchId, workspace.clanId, depth, true);
  }

  async function handlePersonSelection(item: PersonSearchItem) {
    const nextBranchId = item.branchId || selectedBranchId;
    setSelectedBranchId(nextBranchId);
    setSelectedNode(null);
    workspace.patch({ personId: item.id, branchId: nextBranchId, relationshipId: '' });
    await Promise.all([
      loadPersonGraph(item.id),
      nextBranchId !== selectedBranchId ? loadBranchGraph(nextBranchId, workspace.clanId) : Promise.resolve()
    ]);
  }

  async function handleDepthChange(nextDepth: string) {
    setDepth(nextDepth);
    await Promise.all([
      loadPersonGraph(workspace.personId, nextDepth),
      loadBranchGraph(selectedBranchId, workspace.clanId, nextDepth)
    ]);
  }

  async function setAsCenter(node: TreeNodeResponse) {
    if (!node.personId) return;
    const personId = String(node.personId);
    const branchId = node.branchId ? String(node.branchId) : selectedBranchId;
    setSelectedBranchId(branchId);
    setSelectedNode(null);
    workspace.patch({ personId, branchId, relationshipId: '' });
    await Promise.all([
      loadPersonGraph(personId),
      branchId !== selectedBranchId ? loadBranchGraph(branchId, workspace.clanId) : Promise.resolve()
    ]);
  }

  useEffect(() => { void loadBase(); }, []);

  const centerNode = personGraph?.nodes.find(node => node.nodeId === personGraph.rootNodeId)
    || personGraph?.nodes.find(node => node.personId && String(node.personId) === workspace.personId)
    || personGraph?.nodes[0]
    || null;
  const center = centerNode ? toPersonFromNode(centerNode, branches) : null;
  const branchRoot = branchGraph?.nodes.find(node => node.nodeId === branchGraph.rootNodeId) || branchGraph?.nodes[0] || null;
  const selectedEdges = selectedNode ? relatedEdges(selectedNode, [personGraph, branchGraph]) : [];
  const nodeMap = useMemo(() => {
    const map = new Map<string, TreeNodeResponse>();
    [personGraph, branchGraph].forEach(graph => graph?.nodes.forEach(node => map.set(node.nodeId, node)));
    return map;
  }, [personGraph, branchGraph]);
  const branchName = branches.find(item => text(item.id) === selectedBranchId)?.branchName || '支派';
  const currentClanName = clans.find(item => text(item.id) === workspace.clanId)?.clanName || '族谱';
  const selectedSearchId = searchPage.records.some(item => item.id === workspace.personId) ? workspace.personId : '';

  return (
    <div className="lineage-page lineage-tree-page">
      <Panel title="世系图谱" description="通过服务端搜索选择中心人物；宗族、搜索和两张图谱可独立加载与重试。">
        <div className="lineage-search-grid">
          <Field label="宗族"><select disabled={loadState.clan.loading} value={workspace.clanId} onChange={event => void handleClanChange(event.target.value)}><option value="">请选择宗族</option>{clans.map(clan => <option key={text(clan.id)} value={text(clan.id)}>{clan.clanName || clan.surname || '未命名宗族'}</option>)}</select></Field>
          <Field label="支派范围"><select value={selectedBranchId} onChange={event => void handleBranchChange(event.target.value)}><option value="">请选择支派</option>{branches.map(branch => <option key={text(branch.id)} value={text(branch.id)}>{branch.branchName || '未命名支派'}</option>)}</select></Field>
          <Field label="搜索人物"><input value={searchKeyword} onChange={event => setSearchKeyword(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void requestPersonPage(workspace.clanId, 1, searchKeyword); }} placeholder="姓名、谱名、字号" /></Field>
          <Field label="搜索结果"><select value={selectedSearchId} onChange={event => { const item = searchPage.records.find(value => value.id === event.target.value); if (item) void handlePersonSelection(item); }}><option value="">请选择中心人物</option>{searchPage.records.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></Field>
          <Field label="展开深度"><select value={depth} onChange={event => void handleDepthChange(event.target.value)}><option value="2">2代</option><option value="3">3代</option><option value="5">5代</option><option value="8">8代</option></select></Field>
          <Actions><button disabled={loadState.search.loading || !workspace.clanId} onClick={() => void requestPersonPage(workspace.clanId, 1, searchKeyword)}>{loadState.search.loading ? '搜索中...' : '搜索'}</button><button className="secondary" disabled={searchPage.pageNo <= 1 || loadState.search.loading} onClick={() => void requestPersonPage(workspace.clanId, searchPage.pageNo - 1, searchKeyword)}>上一页</button><button className="secondary" disabled={searchPage.pageNo >= searchPage.totalPages || loadState.search.loading} onClick={() => void requestPersonPage(workspace.clanId, searchPage.pageNo + 1, searchKeyword)}>下一页</button></Actions>
        </div>
        <div className="lineage-search-hint">{loadState.search.error ? `搜索失败：${loadState.search.error}` : searchNotice || `第 ${searchPage.pageNo}/${searchPage.totalPages} 页`}</div>
      </Panel>

      <section className="lineage-workbench">
        <div className="lineage-workbench-head"><div><span>{currentClanName}</span><h3>关系边驱动的世系拓扑</h3><p>搜索和图谱请求彼此独立；快速切换时仅最新请求可以写入页面。</p></div></div>
        <div className="summary-card lineage-workbench-summary"><div><span>当前支派</span><strong>{branchName}</strong></div><div><span>支派人物</span><strong>{branchGraph?.meta.nodeCount ?? '-'}</strong></div><div><span>支派关系</span><strong>{branchGraph?.meta.edgeCount ?? '-'}</strong></div><div><span>支派根人物</span><strong>{branchRoot?.displayName || '-'}</strong></div><div><span>中心人物</span><strong>{center?.name || '-'}</strong></div></div>

        <div className="lineage-workbench-grid">
          <section className="lineage-logic-card lineage-logic-card--branch">
            <div className="lineage-tree-title"><div><span>{branchPath(branches, selectedBranchId)}</span><h3>一、支派全局拓扑</h3></div><small>独立请求 · 可重试</small></div>
            {loadState.branchGraph.error ? <div className="lineage-search-hint">支派图加载失败：{loadState.branchGraph.error} <button onClick={() => void loadBranchGraph(selectedBranchId, workspace.clanId)}>重试</button></div> : null}
            <LineageGraphCanvas graph={branchGraph} loading={loadState.branchGraph.loading} emptyText="暂无支派世系数据。" activeNodeId={centerNode?.nodeId} onSelectNode={setSelectedNode} onSetCenter={node => void setAsCenter(node)} />
          </section>

          <section className="lineage-logic-card lineage-logic-card--person">
            <div className="lineage-tree-title"><div><span>{center?.branchName || branchName}</span><h3>{center ? `二、${center.name} 的中心世系拓扑` : '二、中心人物世系拓扑'}</h3></div><small>中心人物独立请求</small></div>
            {loadState.personGraph.error ? <div className="lineage-search-hint">人物图加载失败：{loadState.personGraph.error} <button onClick={() => void loadPersonGraph(workspace.personId)}>重试</button></div> : null}
            <LineageGraphCanvas graph={personGraph} loading={loadState.personGraph.loading} emptyText="请通过服务端搜索选择中心人物。" activeNodeId={centerNode?.nodeId} onSelectNode={setSelectedNode} onSetCenter={node => void setAsCenter(node)} />
          </section>
        </div>
      </section>

      {selectedNode ? (
        <div className="lineage-person-pop-mask" onClick={() => setSelectedNode(null)}>
          <aside className="lineage-person-pop" onClick={event => event.stopPropagation()}>
            <button className="lineage-pop-close" onClick={() => setSelectedNode(null)} aria-label="关闭">×</button>
            <div className="lineage-pop-head"><span className="lineage-avatar">{firstChar(selectedNode.displayName)}</span><div><h3>{selectedNode.displayName}</h3><p>{genderCn(selectedNode.gender || 'unknown')} · {selectedNode.generationNo ? `${selectedNode.generationNo}世` : '世次未维护'} · {selectedNode.generationWord || '-'}字辈</p></div></div>
            <div className="lineage-pop-grid"><div><span>支派</span><strong>{selectedNode.branchName || '未标注'}</strong></div><div><span>生卒</span><strong>{selectedNode.birthText || selectedNode.deathText ? `${selectedNode.birthText || '?'}-${selectedNode.deathText || ''}` : '-'}</strong></div><div><span>状态</span><strong>{selectedNode.dataStatus || selectedNode.visibility}</strong></div><div><span>可见性</span><strong>{selectedNode.visibility === 'masked' ? '安全占位' : '可见'}</strong></div></div>
            <div className="lineage-pop-relations"><h4>真实关系边</h4>{selectedEdges.length ? selectedEdges.map(edge => <p key={edge.edgeId}>{relationCn(relationLabel(edge))}：{nodeMap.get(edge.fromNodeId)?.displayName || '未知'} → {nodeMap.get(edge.toNodeId)?.displayName || '未知'}</p>) : <p>暂无可见关系记录。</p>}</div>
            <Actions>{selectedNode.personId ? <button onClick={() => void setAsCenter(selectedNode)}>设为中心人物</button> : null}<button className="secondary" onClick={() => setSelectedNode(null)}>关闭</button></Actions>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
