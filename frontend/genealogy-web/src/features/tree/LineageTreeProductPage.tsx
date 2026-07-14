import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../shared/api/client';
import type {
  TreeEdgeResponse,
  TreeGraphResponse,
  TreeNodeResponse
} from '../../shared/api/generated/tree-types';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { Panel } from '../../shared/ui/Panel';
import { LineageGraphCanvas } from './LineageGraphCanvas';
import { relationLabel } from './lineageGraphModel';

type Props = { notify: (data: unknown, error?: boolean) => void };

type GenericRow = Record<string, unknown>;
type BranchRow = GenericRow & { id?: string | number; branchName?: string; parentId?: string | number };
type ClanRow = GenericRow & { id?: string | number; clanName?: string; surname?: string };

type PersonCard = {
  id: string;
  nodeId?: string;
  name: string;
  avatar: string;
  gender: string;
  generationNo?: number;
  generation: string;
  word: string;
  branchId: string;
  branchName: string;
  years: string;
  status: string;
  raw?: GenericRow;
};

function asRecord(value: unknown): GenericRow {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as GenericRow : {};
}

function rows(data: unknown): GenericRow[] {
  if (Array.isArray(data)) return data.map(asRecord);
  const record = asRecord(data);
  for (const key of ['records', 'items', 'content']) {
    const value = record[key];
    if (Array.isArray(value)) return value.map(asRecord);
  }
  return [];
}

function text(value: unknown) {
  return value === null || value === undefined ? '' : String(value);
}

function numberValue(value: unknown): number | undefined {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
}

function firstChar(name?: string) {
  return (name || '谱').slice(0, 1);
}

function relationCn(value: string) {
  const labels: Record<string, string> = {
    father: '父亲', mother: '母亲', spouse: '婚配', parent_child: '亲子',
    child: '子女', son: '子', daughter: '女', adoptive: '收养',
    successor: '承嗣', out_adoption: '出嗣', in_adoption: '入继',
    dual_successor: '兼祧', heir_son: '嗣子', no_descendant: '无嗣'
  };
  return labels[value] || value || '亲属';
}

function genderCn(value: string) {
  return ({ male: '男', female: '女', unknown: '未知' } as Record<string, string>)[value] || value || '未知';
}

function toPerson(rowValue: GenericRow, branches: BranchRow[], fallbackId = ''): PersonCard {
  const id = text(rowValue.id || rowValue.personId || fallbackId);
  const name = text(rowValue.name || rowValue.personName || rowValue.displayName) || `人物#${id || '-'}`;
  const branchId = text(rowValue.branchId || asRecord(rowValue.branch).id);
  const generationNo = numberValue(rowValue.generationNo || rowValue.generation || rowValue.generationNumber);
  const branchName = branches.find(item => text(item.id) === branchId)?.branchName
    || text(rowValue.branchName || rowValue.branch)
    || '未归属支派';
  const birth = text(rowValue.birthDate || rowValue.birthYear || rowValue.birthDateText);
  const death = text(rowValue.deathDate || rowValue.deathYear || rowValue.deathDateText);
  return {
    id,
    name,
    avatar: firstChar(name),
    gender: text(rowValue.gender || rowValue.sex) || 'unknown',
    generationNo,
    generation: generationNo ? `${generationNo}世` : '世次未维护',
    word: text(rowValue.generationWord || rowValue.word) || '-',
    branchId,
    branchName,
    years: birth || death ? `${birth || '?'}-${death || ''}` : '-',
    status: text(rowValue.dataStatus || rowValue.status || rowValue.reviewStatus) || '已记录',
    raw: rowValue
  };
}

function toPersonFromNode(node: TreeNodeResponse, branches: BranchRow[]): PersonCard {
  const branchId = node.branchId ? String(node.branchId) : '';
  const branchName = node.branchName
    || branches.find(item => text(item.id) === branchId)?.branchName
    || '未归属支派';
  return {
    id: node.personId ? String(node.personId) : '',
    nodeId: node.nodeId,
    name: node.displayName,
    avatar: firstChar(node.displayName),
    gender: node.gender || 'unknown',
    generationNo: node.generationNo,
    generation: node.generationNo ? `${node.generationNo}世` : '世次未维护',
    word: node.generationWord || '-',
    branchId,
    branchName,
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
    chain.unshift(node.branchName || `支派#${text(node.id)}`);
    node = node.parentId ? map.get(text(node.parentId)) : undefined;
  }
  return chain.join(' / ');
}

function graphNodeByPersonId(graph: TreeGraphResponse | null, personId: string) {
  return graph?.nodes.find(node => node.personId !== null && node.personId !== undefined && String(node.personId) === personId);
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
  const [clans, setClans] = useState<ClanRow[]>([]);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [people, setPeople] = useState<PersonCard[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchNotice, setSearchNotice] = useState('');
  const [depth, setDepth] = useState('3');
  const [selectedBranchId, setSelectedBranchId] = useState(workspace.branchId || '');
  const [personGraph, setPersonGraph] = useState<TreeGraphResponse | null>(null);
  const [branchGraph, setBranchGraph] = useState<TreeGraphResponse | null>(null);
  const [selectedNode, setSelectedNode] = useState<TreeNodeResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function run(action: () => Promise<void>) {
    if (loading) return;
    setLoading(true);
    try {
      await action();
    } catch (error) {
      notify({ message: (error as Error).message || '操作失败' }, true);
    } finally {
      setLoading(false);
    }
  }

  function clearGraphs() {
    setPersonGraph(null);
    setBranchGraph(null);
    setSelectedNode(null);
  }

  function clearClanScopedData() {
    setBranches([]);
    setPeople([]);
    setSearchNotice('');
    setSelectedBranchId('');
    clearGraphs();
  }

  async function loadPersonGraph(personId: string) {
    if (!personId) {
      setPersonGraph(null);
      return;
    }
    const graph = await apiClient.get<TreeGraphResponse>(
      `/tree/person/${personId}?direction=both&maxDepth=${depth}&maxNodes=500&maxEdges=1000`
    );
    setPersonGraph(graph);
  }

  async function loadBranchGraph(branchId: string, clanId = workspace.clanId, showNotice = true) {
    if (!clanId) throw new Error('请先选择宗族');
    if (!branchId) throw new Error('请选择支派');
    const graph = await apiClient.get<TreeGraphResponse>(
      `/tree/clans/${clanId}/branches/${branchId}/lineage?maxDepth=${depth}&maxNodes=500&maxEdges=1000`
    );
    setBranchGraph(graph);
    workspace.setBranchId(branchId);
    if (showNotice) notify({ message: `支派世系已生成：${graph.meta.nodeCount} 位人物，${graph.meta.edgeCount} 条关系` });
  }

  async function loadClanContext(clanId: string, resetSelection = false) {
    if (!clanId) {
      clearClanScopedData();
      workspace.patch({ branchId: '', personId: '', relationshipId: '' });
      return;
    }
    const branchRows = rows(await apiClient.get(`/clans/${clanId}/branches`).catch(() => [])) as BranchRow[];
    setBranches(branchRows);
    const nextBranchId = resetSelection
      ? text(branchRows[0]?.id)
      : branchRows.some(item => text(item.id) === selectedBranchId)
        ? selectedBranchId
        : branchRows.some(item => text(item.id) === workspace.branchId)
          ? workspace.branchId
          : text(branchRows[0]?.id);
    setSelectedBranchId(nextBranchId);
    workspace.setBranchId(nextBranchId || '');

    // Compatibility preload retained in #196; server-side search/state isolation is handled by #197.
    const personData = await apiClient.get(`/persons/search?clanId=${clanId}&pageNo=1&pageSize=120`)
      .catch(() => apiClient.get(`/clans/${clanId}/persons`));
    const nextPeople = rows(personData).map(row => toPerson(row, branchRows));
    setPeople(nextPeople);
    setSearchNotice('');

    const nextPersonId = resetSelection
      ? nextPeople[0]?.id || ''
      : nextPeople.some(item => item.id === workspace.personId)
        ? workspace.personId
        : nextPeople[0]?.id || '';
    workspace.setPersonId(nextPersonId);
    workspace.setRelationshipId('');
    setSelectedNode(null);
    await Promise.all([
      nextPersonId ? loadPersonGraph(nextPersonId) : Promise.resolve(setPersonGraph(null)),
      nextBranchId ? loadBranchGraph(nextBranchId, clanId, false) : Promise.resolve(setBranchGraph(null))
    ]);
  }

  async function loadBase() {
    await run(async () => {
      const clanRows = rows(await apiClient.get('/clans').catch(() => [])) as ClanRow[];
      setClans(clanRows);
      const nextClanId = workspace.clanId || text(clanRows[0]?.id);
      if (nextClanId && !workspace.clanId) workspace.setClanId(nextClanId);
      await loadClanContext(nextClanId, !workspace.clanId);
    });
  }

  async function handleClanChange(nextClanId: string) {
    await run(async () => {
      workspace.patch({ clanId: nextClanId, branchId: '', personId: '', relationshipId: '', sourceId: '', reviewTaskId: '' });
      clearClanScopedData();
      await loadClanContext(nextClanId, true);
      notify({ message: nextClanId ? '宗族已切换，世系拓扑已刷新' : '已清空宗族选择' });
    });
  }

  async function handleBranchChange(nextBranchId: string) {
    setSelectedBranchId(nextBranchId);
    setBranchGraph(null);
    if (!nextBranchId) {
      workspace.setBranchId('');
      return;
    }
    await run(() => loadBranchGraph(nextBranchId));
  }

  async function searchPeople() {
    await run(async () => {
      if (!workspace.clanId) throw new Error('请先选择宗族');
      const keyword = searchKeyword.trim();
      const path = `/persons/search?clanId=${workspace.clanId}&pageNo=1&pageSize=50${keyword ? `&keyword=${encodeURIComponent(keyword)}` : ''}`;
      const result = rows(await apiClient.get(path).catch(() => []));
      const matches = result.map(row => toPerson(row, branches));
      if (!matches.length) {
        setSearchNotice('未找到匹配人物，请调整搜索条件。');
        return;
      }
      const merged = new Map([...people, ...matches].filter(item => item.id).map(item => [item.id, item]));
      setPeople([...merged.values()]);
      const first = matches[0];
      setSearchNotice(`已匹配 ${matches.length} 位人物，自动定位到：${first.name}`);
      workspace.setPersonId(first.id);
      setSelectedNode(null);
      await loadPersonGraph(first.id);
      if (first.branchId && first.branchId !== selectedBranchId) {
        setSelectedBranchId(first.branchId);
        await loadBranchGraph(first.branchId, workspace.clanId, false);
      }
    });
  }

  function resetSearch() {
    setSearchKeyword('');
    setSearchNotice('');
    workspace.patch({ personId: '', relationshipId: '' });
    setPersonGraph(null);
    setSelectedNode(null);
  }

  async function setAsCenter(node: TreeNodeResponse) {
    if (!node.personId) return;
    const personId = String(node.personId);
    workspace.setPersonId(personId);
    setSelectedNode(null);
    await loadPersonGraph(personId);
    if (node.branchId && String(node.branchId) !== selectedBranchId) {
      const branchId = String(node.branchId);
      setSelectedBranchId(branchId);
      await loadBranchGraph(branchId, workspace.clanId, false);
    }
  }

  useEffect(() => { void loadBase(); }, []);
  useEffect(() => {
    if (workspace.personId) void run(() => loadPersonGraph(workspace.personId));
  }, [workspace.personId, depth]);

  const centerNode = useMemo(() => {
    if (!personGraph) return null;
    return personGraph.nodes.find(node => node.nodeId === personGraph.rootNodeId)
      || graphNodeByPersonId(personGraph, workspace.personId)
      || personGraph.nodes[0]
      || null;
  }, [personGraph, workspace.personId]);
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

  return (
    <div className="lineage-page lineage-tree-page">
      <Panel title="世系图谱" description="使用真实人物关系边展示父子分叉、婚配组合、多父与承嗣路径。">
        <div className="lineage-search-grid">
          <Field label="宗族"><select value={workspace.clanId} onChange={event => void handleClanChange(event.target.value)}><option value="">请选择宗族</option>{clans.map(clan => <option key={text(clan.id)} value={text(clan.id)}>{clan.clanName || clan.surname || `宗族#${text(clan.id)}`}</option>)}</select></Field>
          <Field label="支派范围"><select value={selectedBranchId} onChange={event => void handleBranchChange(event.target.value)}><option value="">请选择支派</option>{branches.map(branch => <option key={text(branch.id)} value={text(branch.id)}>{branch.branchName}</option>)}</select></Field>
          <Field label="搜索人物"><input value={searchKeyword} onChange={event => setSearchKeyword(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void searchPeople(); }} placeholder="输入姓名、谱名、字号" /></Field>
          <Field label="展开深度"><select value={depth} onChange={event => setDepth(event.target.value)}><option value="2">2代</option><option value="3">3代</option><option value="5">5代</option><option value="8">8代</option></select></Field>
          <Actions><button disabled={loading} onClick={searchPeople}>{loading ? '处理中...' : '搜索'}</button><button className="secondary" onClick={resetSearch}>重置</button></Actions>
        </div>
        {searchNotice ? <div className="lineage-search-hint">{searchNotice}</div> : null}
      </Panel>

      <section className="lineage-workbench">
        <div className="lineage-workbench-head">
          <div><span>{currentClanName}</span><h3>关系边驱动的世系拓扑</h3><p>节点保持唯一，所有父子、婚配和宗法路径均来自后端安全投影的真实关系边。</p></div>
        </div>
        <div className="summary-card lineage-workbench-summary">
          <div><span>当前支派</span><strong>{branchName}</strong></div>
          <div><span>支派人物</span><strong>{branchGraph?.meta.nodeCount ?? '-'}</strong></div>
          <div><span>支派关系</span><strong>{branchGraph?.meta.edgeCount ?? '-'}</strong></div>
          <div><span>支派根人物</span><strong>{branchRoot?.displayName || '-'}</strong></div>
          <div><span>中心人物</span><strong>{center?.name || '-'}</strong></div>
        </div>

        <div className="lineage-workbench-grid">
          <section className="lineage-logic-card lineage-logic-card--branch">
            <div className="lineage-tree-title"><div><span>{branchPath(branches, selectedBranchId)}</span><h3>一、支派全局拓扑</h3></div><small>真实关系边 · 多根/孤立提示</small></div>
            <p className="lineage-section-desc">父子与承嗣关系决定上下层级，婚配关系保持同层，不再用世次列之间的统一箭头代替真实关系。</p>
            <LineageGraphCanvas graph={branchGraph} loading={loading} emptyText="暂无支派世系数据，请选择支派。" activeNodeId={centerNode?.nodeId} onSelectNode={setSelectedNode} onSetCenter={node => void setAsCenter(node)} />
          </section>

          <section className="lineage-logic-card lineage-logic-card--person">
            <div className="lineage-tree-title"><div><span>{center?.branchName || branchName}</span><h3>{center ? `二、${center.name} 的中心世系拓扑` : '二、中心人物世系拓扑'}</h3></div><small>祖先 · 婚配 · 后代 · 多路径</small></div>
            <p className="lineage-section-desc">双击人物可设为新的中心人物；折叠某个节点不会隐藏仍可由其他父系或承嗣路径到达的后代。</p>
            <LineageGraphCanvas graph={personGraph} loading={loading} emptyText="请选择中心人物后生成世系拓扑。" activeNodeId={centerNode?.nodeId} onSelectNode={setSelectedNode} onSetCenter={node => void setAsCenter(node)} />
          </section>
        </div>
      </section>

      {selectedNode ? (
        <div className="lineage-person-pop-mask" onClick={() => setSelectedNode(null)}>
          <aside className="lineage-person-pop" onClick={event => event.stopPropagation()}>
            <button className="lineage-pop-close" onClick={() => setSelectedNode(null)} aria-label="关闭">×</button>
            <div className="lineage-pop-head"><span className="lineage-avatar">{firstChar(selectedNode.displayName)}</span><div><h3>{selectedNode.displayName}</h3><p>{genderCn(selectedNode.gender || 'unknown')} · {selectedNode.generationNo ? `${selectedNode.generationNo}世` : '世次未维护'} · {selectedNode.generationWord || '-'}字辈</p></div></div>
            <div className="lineage-pop-grid">
              <div><span>支派</span><strong>{selectedNode.branchName || (selectedNode.branchId ? `支派 ${selectedNode.branchId}` : '未标注')}</strong></div>
              <div><span>生卒</span><strong>{selectedNode.birthText || selectedNode.deathText ? `${selectedNode.birthText || '?'}-${selectedNode.deathText || ''}` : '-'}</strong></div>
              <div><span>状态</span><strong>{selectedNode.dataStatus || selectedNode.visibility}</strong></div>
              <div><span>可见性</span><strong>{selectedNode.visibility === 'masked' ? '安全占位' : '可见'}</strong></div>
            </div>
            <div className="lineage-pop-relations"><h4>真实关系边</h4>{selectedEdges.length ? selectedEdges.map(edge => <p key={edge.edgeId}>{relationCn(relationLabel(edge))}：{nodeMap.get(edge.fromNodeId)?.displayName || '未知'} → {nodeMap.get(edge.toNodeId)?.displayName || '未知'}</p>) : <p>暂无可见关系记录。</p>}</div>
            <Actions>{selectedNode.personId ? <button onClick={() => void setAsCenter(selectedNode)}>设为中心人物</button> : null}<button className="secondary" onClick={() => setSelectedNode(null)}>关闭</button></Actions>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
