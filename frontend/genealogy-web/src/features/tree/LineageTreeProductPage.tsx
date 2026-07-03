import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { Panel } from '../../shared/ui/Panel';

type Props = { notify: (data: unknown, error?: boolean) => void };

type PersonCard = {
  id: string;
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
  relation?: string;
  raw?: any;
};

type RelationshipCard = {
  id: string;
  fromPersonId: string;
  toPersonId: string;
  relationType: string;
  relationLabel: string;
  status: string;
  raw?: any;
};

function rows(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.nodes)) return data.nodes;
  return [];
}

function edgeRows(data: any): any[] {
  return Array.isArray(data?.edges) ? data.edges : [];
}

function firstChar(name?: string) {
  return (name || '谱').slice(0, 1);
}

function dateText(row: any) {
  const birth = row.birthDate || row.birthYear || row.birthDateText || '';
  const death = row.deathDate || row.deathYear || row.deathDateText || '';
  return birth || death ? `${birth || '?'}-${death || ''}` : '-';
}

function idOf(row: any) {
  return String(row?.id || row?.personId || row?.targetId || '');
}

function generationNoOf(row: any): number | undefined {
  const value = row?.generationNo ?? row?.generation ?? row?.generationNumber;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
}

function relationCn(label: string) {
  const dict: Record<string, string> = {
    father: '父亲',
    mother: '母亲',
    spouse: '配偶',
    parent_child: '亲子',
    child: '子女',
    son: '子',
    daughter: '女',
    adoptive: '收养',
    adoptive_father: '养父',
    adoptive_mother: '养母',
    heir_successor: '继嗣',
    successor: '继嗣',
    out_adoption: '出嗣',
    out_adopted: '出嗣'
  };
  return dict[label] || label || '亲属';
}

function genderCn(value: string) {
  const dict: Record<string, string> = { male: '男', female: '女', unknown: '未知' };
  return dict[value] || value || '未知';
}

function toPerson(row: any, branches: any[], fallbackId = ''): PersonCard {
  const id = idOf(row) || fallbackId;
  const name = row?.name || row?.personName || row?.displayName || `人物#${id || '-'}`;
  const branchId = String(row?.branchId || row?.branch?.id || '');
  const branchName = branches.find(item => String(item.id) === branchId)?.branchName || row?.branchName || row?.branch || '未归属支派';
  const generationNo = generationNoOf(row);
  return {
    id,
    name,
    avatar: firstChar(name),
    gender: row?.gender || row?.sex || 'unknown',
    generationNo,
    generation: generationNo ? `${generationNo}世` : row?.generationName || '世次未维护',
    word: row?.generationWord || row?.word || '-',
    branchId,
    branchName,
    years: dateText(row || {}),
    status: row?.status || row?.dataStatus || row?.verificationStatus || row?.reviewStatus || '已记录',
    relation: row?.relationLabel || row?.relationType,
    raw: row
  };
}

function toRelationship(row: any): RelationshipCard {
  const fromPersonId = String(row.fromPersonId || row.sourcePersonId || row.from?.id || '');
  const toPersonId = String(row.toPersonId || row.targetPersonId || row.to?.id || '');
  return {
    id: String(row.id || row.relationshipId || `${fromPersonId}-${toPersonId}-${row.relationLabel || row.relationType}`),
    fromPersonId,
    toPersonId,
    relationType: row.relationType || '',
    relationLabel: row.relationLabel || row.relationType || '',
    status: row.status || row.dataStatus || row.confidenceLevel || '已记录',
    raw: row
  };
}

function uniquePeople(list: PersonCard[]) {
  const map = new Map<string, PersonCard>();
  list.filter(item => item.id).forEach(item => map.set(item.id, item));
  return Array.from(map.values());
}

function sortByGeneration(list: PersonCard[], direction: 'asc' | 'desc' = 'asc') {
  return [...list].sort((a, b) => {
    const av = a.generationNo ?? 9999;
    const bv = b.generationNo ?? 9999;
    return direction === 'asc' ? av - bv : bv - av;
  });
}

function groupDescendants(list: PersonCard[]) {
  const groups = new Map<string, PersonCard[]>();
  list.forEach(item => {
    const key = item.generationNo ? `${item.generationNo}世` : '后代';
    groups.set(key, [...(groups.get(key) || []), item]);
  });
  return Array.from(groups.entries()).sort((a, b) => Number(a[0].replace(/\D/g, '') || 9999) - Number(b[0].replace(/\D/g, '') || 9999));
}

function branchPath(branches: any[], branchId: string) {
  const current = branches.find(item => String(item.id) === branchId);
  if (!current) return '未选择支派';
  const idToBranch = new Map(branches.map(item => [String(item.id), item]));
  const chain: string[] = [];
  let node: any = current;
  const guard = new Set<string>();
  while (node && !guard.has(String(node.id))) {
    guard.add(String(node.id));
    chain.unshift(node.branchName || `支派#${node.id}`);
    node = node.parentId ? idToBranch.get(String(node.parentId)) : null;
  }
  return chain.join(' / ');
}

function TreeNode({ person, active, hint, onClick }: { person: PersonCard; active?: boolean; hint?: string; onClick?: () => void }) {
  return (
    <button className={`lineage-tree-node ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="lineage-avatar">{person.avatar}</span>
      <strong>{person.name}</strong>
      <em>{hint || person.relation || person.generation}</em>
      <small>{person.generation} · {person.word}字辈</small>
    </button>
  );
}

function EmptyLane({ text }: { text: string }) {
  return <div className="lineage-empty">{text}</div>;
}

export function LineageTreeProductPage({ notify }: Props) {
  const workspace = useWorkspace();
  const [clans, setClans] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [people, setPeople] = useState<PersonCard[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchNotice, setSearchNotice] = useState('');
  const [center, setCenter] = useState<PersonCard | null>(null);
  const [relationships, setRelationships] = useState<RelationshipCard[]>([]);
  const [familyNodes, setFamilyNodes] = useState<PersonCard[]>([]);
  const [ancestors, setAncestors] = useState<PersonCard[]>([]);
  const [descendants, setDescendants] = useState<PersonCard[]>([]);
  const [selectedNode, setSelectedNode] = useState<PersonCard | null>(null);
  const [depth, setDepth] = useState('3');
  const [selectedBranchId, setSelectedBranchId] = useState(workspace.branchId || '');
  const [branchNodes, setBranchNodes] = useState<PersonCard[]>([]);
  const [branchEdges, setBranchEdges] = useState<RelationshipCard[]>([]);
  const [branchRootPersonId, setBranchRootPersonId] = useState('');
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

  function resetLineage() {
    setCenter(null);
    setRelationships([]);
    setFamilyNodes([]);
    setAncestors([]);
    setDescendants([]);
    setSelectedNode(null);
  }

  function resetBranchLineage() {
    setBranchNodes([]);
    setBranchEdges([]);
    setBranchRootPersonId('');
  }

  function clearClanScopedData() {
    setBranches([]);
    setPeople([]);
    setSearchNotice('');
    setSelectedBranchId('');
    resetLineage();
    resetBranchLineage();
  }

  function validIdInRows(id: string, list: any[]) {
    return Boolean(id) && list.some(item => String(item.id) === String(id));
  }

  async function loadClanContext(clanId: string, resetSelection = false) {
    if (!clanId) {
      clearClanScopedData();
      workspace.patch({ branchId: '', personId: '', relationshipId: '' });
      return;
    }

    const branchRows = rows(await apiClient.get(`/clans/${clanId}/branches`).catch(() => []));
    setBranches(branchRows);

    const nextBranchId = resetSelection
      ? String(branchRows[0]?.id || '')
      : validIdInRows(selectedBranchId, branchRows)
        ? selectedBranchId
        : validIdInRows(workspace.branchId, branchRows)
          ? workspace.branchId
          : String(branchRows[0]?.id || '');

    setSelectedBranchId(nextBranchId);
    workspace.setBranchId(nextBranchId || '');
    resetBranchLineage();

    const personRes = await apiClient.get(`/persons/search?clanId=${clanId}&pageNo=1&pageSize=120`).catch(() => apiClient.get(`/clans/${clanId}/persons`));
    const personRows = rows(personRes);
    const nextPeople = personRows.map(row => toPerson(row, branchRows));
    setPeople(nextPeople);
    setSearchNotice('');

    const nextPersonId = resetSelection
      ? nextPeople[0]?.id || ''
      : nextPeople.some(item => item.id === workspace.personId)
        ? workspace.personId
        : nextPeople[0]?.id || '';

    workspace.setPersonId(nextPersonId || '');
    workspace.setRelationshipId('');
    setSelectedNode(null);

    if (nextPersonId) await loadLineage(nextPersonId, branchRows, nextPeople);
    else resetLineage();

    if (nextBranchId) await loadBranchLineage(nextBranchId, branchRows, clanId, false);
  }

  async function loadBase() {
    await run(async () => {
      const clanRows = rows(await apiClient.get('/clans').catch(() => []));
      setClans(clanRows);
      const nextClanId = workspace.clanId || String(clanRows[0]?.id || '');
      if (nextClanId && !workspace.clanId) workspace.setClanId(nextClanId);
      await loadClanContext(nextClanId, !workspace.clanId);
    });
  }

  async function handleClanChange(nextClanId: string) {
    await run(async () => {
      workspace.patch({ clanId: nextClanId, branchId: '', personId: '', relationshipId: '', sourceId: '', reviewTaskId: '' });
      clearClanScopedData();
      await loadClanContext(nextClanId, true);
      notify({ message: nextClanId ? '宗族已切换，支派世系和中心人物世系已刷新' : '已清空宗族选择' });
    });
  }

  async function handleBranchChange(nextBranchId: string) {
    setSelectedBranchId(nextBranchId);
    resetBranchLineage();
    if (!nextBranchId) {
      workspace.setBranchId('');
      return;
    }
    await run(() => loadBranchLineage(nextBranchId, branches, workspace.clanId, true));
  }

  async function searchPeople() {
    await run(async () => {
      if (!workspace.clanId) throw new Error('请先选择宗族');
      const keyword = searchKeyword.trim();
      const path = `/persons/search?clanId=${workspace.clanId}&pageNo=1&pageSize=50${keyword ? `&keyword=${encodeURIComponent(keyword)}` : ''}`;
      const data = await apiClient.get(path).catch(() => []);
      const next = rows(data).map(row => toPerson(row, branches));
      if (!next.length) {
        setSearchNotice('未找到匹配人物，请调整搜索条件。');
        return;
      }
      const mergedPeople = uniquePeople([...next, ...people]);
      const first = next[0];
      setPeople(mergedPeople);
      setSearchNotice(`已匹配 ${next.length} 位人物，自动定位到：${first.name}`);
      workspace.setPersonId(first.id);
      setSelectedNode(null);
      await loadLineage(first.id, branches, mergedPeople);
      if (first.branchId && first.branchId !== selectedBranchId) {
        setSelectedBranchId(first.branchId);
        await loadBranchLineage(first.branchId, branches, workspace.clanId, false);
        setBranchRootPersonId(first.id);
      }
    });
  }

  async function loadLineage(personId = workspace.personId, branchRows = branches, peopleRows = people) {
    if (!personId) {
      resetLineage();
      return;
    }
    const [detailRes, relationRes, familyRes, ancestorRes, descendantRes] = await Promise.all([
      apiClient.get(`/persons/${personId}`).catch(() => peopleRows.find(item => item.id === personId)?.raw || { id: personId }),
      apiClient.get(`/persons/${personId}/relationships`).catch(() => []),
      apiClient.get(`/tree/person/${personId}/family`).catch(() => null),
      apiClient.get(`/tree/ancestors?personId=${personId}&maxDepth=${depth}`).catch(() => null),
      apiClient.get(`/tree/descendants?rootPersonId=${personId}&maxDepth=${depth}`).catch(() => null)
    ]);
    const nextCenter = toPerson(detailRes, branchRows, personId);
    setCenter(nextCenter);
    setRelationships(rows(relationRes).map(toRelationship));
    setFamilyNodes(rows(familyRes).map(row => toPerson(row, branchRows)));
    setAncestors(rows(ancestorRes).map(row => toPerson(row, branchRows)).filter(item => item.id !== personId));
    setDescendants(rows(descendantRes).map(row => toPerson(row, branchRows)).filter(item => item.id !== personId));
  }

  async function loadBranchLineage(branchId = selectedBranchId, branchRows = branches, clanId = workspace.clanId, showNotice = true) {
    if (!clanId) throw new Error('请先选择宗族');
    if (!branchId) throw new Error('请选择支派');
    const data: any = await apiClient.get(`/tree/clans/${clanId}/branches/${branchId}/lineage`);
    const nextNodes = rows(data).map(row => toPerson(row, branchRows));
    const nextEdges = edgeRows(data).map(toRelationship);
    setBranchNodes(nextNodes);
    setBranchEdges(nextEdges);
    setBranchRootPersonId(nextNodes.length ? String(data?.rootPersonId || nextNodes[0]?.id || '') : '');
    workspace.setBranchId(branchId);
    if (showNotice) notify({ message: `支派世系已生成：${nextNodes.length} 位人物，${nextEdges.length} 条关系` });
  }

  useEffect(() => { void loadBase(); }, []);
  useEffect(() => { if (workspace.personId) void run(() => loadLineage(workspace.personId)); }, [workspace.personId, depth]);

  const personMap = useMemo(() => {
    const map = new Map<string, PersonCard>();
    [...people, ...familyNodes, ...ancestors, ...descendants, ...branchNodes, ...(center ? [center] : [])].forEach(item => item.id && map.set(item.id, item));
    return map;
  }, [people, familyNodes, ancestors, descendants, branchNodes, center]);

  function findPerson(id: string, fallback?: any) {
    return personMap.get(id) || toPerson(fallback || { id }, branches, id);
  }

  const relationshipDerived = useMemo(() => {
    if (!center) return { parents: [] as PersonCard[], spouses: [] as PersonCard[], children: [] as PersonCard[], others: [] as RelationshipCard[] };
    const parents: PersonCard[] = [];
    const spouses: PersonCard[] = [];
    const children: PersonCard[] = [];
    const others: RelationshipCard[] = [];
    relationships.forEach(rel => {
      if (rel.relationType === 'spouse' || rel.relationLabel === 'spouse') {
        const otherId = rel.fromPersonId === center.id ? rel.toPersonId : rel.toPersonId === center.id ? rel.fromPersonId : '';
        if (otherId) spouses.push({ ...findPerson(otherId), relation: '配偶' });
        else others.push(rel);
        return;
      }
      if (rel.relationType === 'parent_child' || rel.relationType === 'adoptive' || rel.relationType === 'successor') {
        if (rel.toPersonId === center.id) parents.push({ ...findPerson(rel.fromPersonId), relation: relationCn(rel.relationLabel || rel.relationType) });
        else if (rel.fromPersonId === center.id) children.push({ ...findPerson(rel.toPersonId), relation: relationCn(rel.relationLabel || rel.relationType) });
        else others.push(rel);
        return;
      }
      others.push(rel);
    });
    return { parents: uniquePeople(parents), spouses: uniquePeople(spouses), children: uniquePeople(children), others };
  }, [relationships, center, personMap, branches]);

  const spousePersonIds = useMemo(() => new Set(relationshipDerived.spouses.map(person => person.id)), [relationshipDerived.spouses]);
  const ancestorLane = useMemo(() => {
    const source = ancestors.length ? ancestors.filter(person => !spousePersonIds.has(person.id)) : relationshipDerived.parents;
    return sortByGeneration(uniquePeople(source), 'asc').slice(-10);
  }, [ancestors, relationshipDerived.parents, spousePersonIds]);
  const descendantGroups = useMemo(() => {
    const source = descendants.length ? descendants.filter(person => !spousePersonIds.has(person.id)) : relationshipDerived.children;
    return groupDescendants(uniquePeople(source));
  }, [descendants, relationshipDerived.children, spousePersonIds]);

  const branchGroups = useMemo(() => groupDescendants(sortByGeneration(uniquePeople(branchNodes))), [branchNodes]);
  const branchRoot = useMemo(() => branchNodes.find(person => person.id === branchRootPersonId) || branchNodes[0], [branchNodes, branchRootPersonId]);
  const branchRootName = branchNodes.length ? branchRoot?.name || '-' : '-';
  const branchName = branches.find(item => String(item.id) === selectedBranchId)?.branchName || '支派';
  const currentClanName = clans.find(item => String(item.id) === workspace.clanId)?.clanName || '族谱';

  async function setAsCenter(personId: string) {
    const nextCenter = findPerson(personId, selectedNode?.raw);
    setCenter(nextCenter);
    setBranchRootPersonId(personId);
    workspace.setPersonId(personId);
    setSelectedNode(null);
    if (nextCenter.branchId && nextCenter.branchId !== selectedBranchId) {
      setSelectedBranchId(nextCenter.branchId);
      await run(async () => {
        await loadBranchLineage(nextCenter.branchId, branches, workspace.clanId, false);
        setBranchRootPersonId(personId);
      });
    }
  }

  return (
    <div className="lineage-page lineage-tree-page">
      <Panel title="世系图谱" description="统一在搜索区选择宗族、支派范围和中心人物；下方按支派全局到人物局部的顺序展示世系。">
        <div className="lineage-search-grid">
          <Field label="宗族"><select value={workspace.clanId} onChange={e => void handleClanChange(e.target.value)}><option value="">请选择宗族</option>{clans.map(clan => <option key={clan.id} value={clan.id}>{clan.clanName || clan.surname || `宗族#${clan.id}`}</option>)}</select></Field>
          <Field label="支派范围"><select value={selectedBranchId} onChange={e => void handleBranchChange(e.target.value)}><option value="">请选择支派</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.branchName}</option>)}</select></Field>
          <Field label="搜索人物"><input value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void searchPeople(); }} placeholder="输入姓名、谱名、字号" /></Field>
          <Field label="展开深度"><select value={depth} onChange={e => setDepth(e.target.value)}><option value="2">2代</option><option value="3">3代</option><option value="5">5代</option><option value="8">8代</option></select></Field>
          <Actions><button disabled={loading} onClick={searchPeople}>{loading ? '搜索中...' : '搜索人物'}</button><button className="secondary" disabled={loading || !selectedBranchId} onClick={() => void run(() => loadBranchLineage(selectedBranchId))}>{loading ? '生成中...' : '刷新支派'}</button></Actions>
        </div>
        {searchNotice ? <div className="lineage-search-hint">{searchNotice}</div> : null}
      </Panel>

      <section className="lineage-workbench">
        <div className="lineage-workbench-head">
          <div>
            <span>{currentClanName}</span>
            <h3>世系分析工作台</h3>
            <p>先查看支派全局世系，再围绕中心人物查看上下延展；两块内容上下承接，便于从房支脉络定位到个人关系。</p>
          </div>
        </div>

        <div className="summary-card lineage-workbench-summary">
          <div><span>当前支派</span><strong>{branchName}</strong></div>
          <div><span>支派人物</span><strong>{branchNodes.length || '-'}</strong></div>
          <div><span>支派关系</span><strong>{branchEdges.length || '-'}</strong></div>
          <div><span>支派根人物</span><strong>{branchRootName}</strong></div>
          <div><span>中心人物</span><strong>{center?.name || '-'}</strong></div>
        </div>

        <div className="lineage-workbench-grid">
          <section className="lineage-logic-card lineage-logic-card--branch">
            <div className="lineage-tree-title">
              <div><span>{branchPath(branches, selectedBranchId)}</span><h3>一、支派全局世系</h3></div>
              <small>{branchEdges.length} 条内部关系</small>
            </div>
            <p className="lineage-section-desc">先观察当前支派及下级支派的人物分布，确认“这一支有哪些人、处在第几世”。</p>
            <div className="branch-lineage-canvas">
              {branchGroups.length ? branchGroups.map(([label, group], index) => (
                <div className="branch-lineage-column" key={label}>
                  <b>{label}</b>
                  <div>{group.map(person => <TreeNode key={person.id} person={person} active={person.id === branchRootPersonId || person.id === center?.id} hint={person.id === branchRootPersonId ? '支派根人物' : label} onClick={() => setSelectedNode(person)} />)}</div>
                  {index < branchGroups.length - 1 ? <span className="branch-lineage-arrow">→</span> : null}
                </div>
              )) : <EmptyLane text="暂无支派世系数据，请选择支派后生成。" />}
            </div>
          </section>

          <section className="lineage-logic-card lineage-logic-card--person">
            <div className="lineage-tree-title">
              <div><span>{center?.branchName || branchName}</span><h3>{center ? `二、${center.name} 的中心世系树` : '二、中心人物世系树'}</h3></div>
              <small>上溯祖先 / 配偶 / 下延后代</small>
            </div>
            <p className="lineage-section-desc">再围绕一个人检查父母、配偶、子女和后代链路，适合做关系补录与异常定位。</p>
            <div className="lineage-tree-canvas">
              <div className="lineage-tree-layer lineage-tree-layer--ancestors">
                {ancestorLane.length ? ancestorLane.map(person => <TreeNode key={person.id} person={person} hint={person.relation || '祖先'} onClick={() => setSelectedNode(person)} />) : <EmptyLane text="暂无上溯祖先" />}
              </div>
              <div className="lineage-tree-line" />
              <div className="lineage-tree-layer lineage-tree-layer--center">
                {center ? <TreeNode person={center} active hint="中心人物" onClick={() => setSelectedNode(center)} /> : <EmptyLane text="请选择中心人物" />}
                {relationshipDerived.spouses.length ? <div className="lineage-spouse-tree"><b>配偶</b>{relationshipDerived.spouses.map(person => <TreeNode key={person.id} person={person} hint="配偶" onClick={() => setSelectedNode(person)} />)}</div> : null}
              </div>
              <div className="lineage-tree-line" />
              <div className="lineage-tree-children">
                {descendantGroups.length ? descendantGroups.map(([label, group]) => (
                  <div className="lineage-tree-generation" key={label}>
                    <b>{label}</b>
                    <div>{group.map(person => <TreeNode key={person.id} person={person} hint={person.relation || label} onClick={() => setSelectedNode(person)} />)}</div>
                  </div>
                )) : <EmptyLane text="暂无下延后代" />}
              </div>
            </div>
          </section>
        </div>
      </section>

      {selectedNode ? (
        <div className="lineage-person-pop-mask" onClick={() => setSelectedNode(null)}>
          <aside className="lineage-person-pop" onClick={event => event.stopPropagation()}>
            <button className="lineage-pop-close" onClick={() => setSelectedNode(null)} aria-label="关闭">×</button>
            <div className="lineage-pop-head">
              <span className="lineage-avatar">{selectedNode.avatar}</span>
              <div><h3>{selectedNode.name}</h3><p>{genderCn(selectedNode.gender)} · {selectedNode.generation} · {selectedNode.word}字辈</p></div>
            </div>
            <div className="lineage-pop-grid">
              <div><span>支派</span><strong>{selectedNode.branchName}</strong></div>
              <div><span>生卒</span><strong>{selectedNode.years}</strong></div>
              <div><span>状态</span><strong>{selectedNode.status}</strong></div>
              <div><span>关系</span><strong>{relationCn(selectedNode.relation || '')}</strong></div>
            </div>
            <div className="lineage-pop-relations">
              <h4>相关关系</h4>
              {[...relationships, ...branchEdges].filter(rel => rel.fromPersonId === selectedNode.id || rel.toPersonId === selectedNode.id).length ? [...relationships, ...branchEdges].filter(rel => rel.fromPersonId === selectedNode.id || rel.toPersonId === selectedNode.id).map(rel => <p key={rel.id}>{relationCn(rel.relationLabel || rel.relationType)}：{findPerson(rel.fromPersonId).name} → {findPerson(rel.toPersonId).name}</p>) : <p>暂无关系记录。</p>}
            </div>
            <Actions><button onClick={() => void setAsCenter(selectedNode.id)}>设为中心人物</button><button className="secondary" onClick={() => setSelectedNode(null)}>关闭</button></Actions>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
