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
    daughter: '女'
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
    id: String(row.id || `${fromPersonId}-${toPersonId}-${row.relationLabel || row.relationType}`),
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
  const [searchResults, setSearchResults] = useState<PersonCard[]>([]);
  const [center, setCenter] = useState<PersonCard | null>(null);
  const [relationships, setRelationships] = useState<RelationshipCard[]>([]);
  const [familyNodes, setFamilyNodes] = useState<PersonCard[]>([]);
  const [ancestors, setAncestors] = useState<PersonCard[]>([]);
  const [descendants, setDescendants] = useState<PersonCard[]>([]);
  const [selectedNode, setSelectedNode] = useState<PersonCard | null>(null);
  const [depth, setDepth] = useState('3');
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

  async function loadBase() {
    await run(async () => {
      const clanRows = rows(await apiClient.get('/clans').catch(() => []));
      setClans(clanRows);
      const nextClanId = workspace.clanId || String(clanRows[0]?.id || '');
      if (nextClanId && !workspace.clanId) workspace.setClanId(nextClanId);
      if (!nextClanId) {
        setPeople([]);
        setSearchResults([]);
        return;
      }
      const branchRows = rows(await apiClient.get(`/clans/${nextClanId}/branches`).catch(() => []));
      setBranches(branchRows);
      const personRes = await apiClient.get(`/persons/search?clanId=${nextClanId}&pageNo=1&pageSize=120`).catch(() => apiClient.get(`/clans/${nextClanId}/persons`));
      const personRows = rows(personRes);
      const nextPeople = personRows.map(row => toPerson(row, branchRows));
      setPeople(nextPeople);
      setSearchResults(nextPeople.slice(0, 12));
      const nextPersonId = workspace.personId || nextPeople[0]?.id || '';
      if (nextPersonId && !workspace.personId) workspace.setPersonId(nextPersonId);
      if (nextPersonId) await loadLineage(nextPersonId, branchRows, nextPeople);
    });
  }

  async function searchPeople() {
    await run(async () => {
      if (!workspace.clanId) throw new Error('请先选择宗族');
      const keyword = searchKeyword.trim();
      const path = `/persons/search?clanId=${workspace.clanId}&pageNo=1&pageSize=50${keyword ? `&keyword=${encodeURIComponent(keyword)}` : ''}`;
      const data = await apiClient.get(path).catch(() => []);
      const next = rows(data).map(row => toPerson(row, branches));
      setSearchResults(next);
      if (next.length) {
        setPeople(uniquePeople([...next, ...people]));
      }
    });
  }

  async function loadLineage(personId = workspace.personId, branchRows = branches, peopleRows = people) {
    if (!personId) {
      setCenter(null);
      setRelationships([]);
      setFamilyNodes([]);
      setAncestors([]);
      setDescendants([]);
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
    const nextRelationships = rows(relationRes).map(toRelationship);
    const nextFamily = rows(familyRes).map(row => toPerson(row, branchRows));
    const nextAncestors = rows(ancestorRes).map(row => toPerson(row, branchRows)).filter(item => item.id !== personId);
    const nextDescendants = rows(descendantRes).map(row => toPerson(row, branchRows)).filter(item => item.id !== personId);
    setCenter(nextCenter);
    setRelationships(nextRelationships);
    setFamilyNodes(nextFamily);
    setAncestors(nextAncestors);
    setDescendants(nextDescendants);
  }

  useEffect(() => { void loadBase(); }, []);
  useEffect(() => { if (workspace.personId) void run(() => loadLineage(workspace.personId)); }, [workspace.personId, depth]);

  const personMap = useMemo(() => {
    const map = new Map<string, PersonCard>();
    [...people, ...familyNodes, ...ancestors, ...descendants, ...(center ? [center] : [])].forEach(item => item.id && map.set(item.id, item));
    return map;
  }, [people, familyNodes, ancestors, descendants, center]);

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
      if (rel.relationType === 'parent_child') {
        if (rel.toPersonId === center.id) parents.push({ ...findPerson(rel.fromPersonId), relation: relationCn(rel.relationLabel) });
        else if (rel.fromPersonId === center.id) children.push({ ...findPerson(rel.toPersonId), relation: '子女' });
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

  function setAsCenter(personId: string) {
    workspace.setPersonId(personId);
    setSelectedNode(null);
  }

  return (
    <div className="lineage-page lineage-tree-page">
      <Panel title="世系图谱">
        <div className="lineage-search-grid">
          <Field label="宗族ID"><input value={workspace.clanId} onChange={e => workspace.setClanId(e.target.value)} placeholder="宗族ID" /></Field>
          <Field label="搜索人物"><input value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void searchPeople(); }} placeholder="输入姓名、谱名、字号" /></Field>
          <Field label="展开深度"><select value={depth} onChange={e => setDepth(e.target.value)}><option value="2">2代</option><option value="3">3代</option><option value="5">5代</option><option value="8">8代</option></select></Field>
          <Actions><button disabled={loading} onClick={searchPeople}>{loading ? '搜索中...' : '搜索'}</button></Actions>
        </div>
        <div className="lineage-search-results">
          {searchResults.slice(0, 10).map(person => <button key={person.id} className={workspace.personId === person.id ? 'active' : ''} onClick={() => setAsCenter(person.id)}>{person.name}<span>{person.generation} · {person.branchName}</span></button>)}
        </div>
      </Panel>

      <section className="lineage-tree-card">
        <div className="lineage-tree-title">
          <div><span>{clans.find(item => String(item.id) === workspace.clanId)?.clanName || '族谱'}</span><h3>{center ? `${center.name} 的世系树` : '世系树'}</h3></div>
        </div>

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

      {selectedNode ? (
        <div className="lineage-person-pop-mask" onClick={() => setSelectedNode(null)}>
          <aside className="lineage-person-pop" onClick={event => event.stopPropagation()}>
            <button className="lineage-pop-close" onClick={() => setSelectedNode(null)} aria-label="关闭">×</button>
            <div className="lineage-pop-head">
              <span className="lineage-avatar">{selectedNode.avatar}</span>
              <div><h3>{selectedNode.name}</h3><p>{genderCn(selectedNode.gender)} · {selectedNode.generation} · {selectedNode.word}字辈</p></div>
            </div>
            <div className="lineage-pop-grid">
              <div><span>人物ID</span><strong>{selectedNode.id}</strong></div>
              <div><span>支派</span><strong>{selectedNode.branchName}</strong></div>
              <div><span>生卒</span><strong>{selectedNode.years}</strong></div>
              <div><span>状态</span><strong>{selectedNode.status}</strong></div>
              <div><span>关系</span><strong>{relationCn(selectedNode.relation || '')}</strong></div>
              <div><span>支派ID</span><strong>{selectedNode.branchId || '-'}</strong></div>
            </div>
            <div className="lineage-pop-relations">
              <h4>相关关系</h4>
              {relationships.filter(rel => rel.fromPersonId === selectedNode.id || rel.toPersonId === selectedNode.id).length ? relationships.filter(rel => rel.fromPersonId === selectedNode.id || rel.toPersonId === selectedNode.id).map(rel => <p key={rel.id}>{relationCn(rel.relationLabel || rel.relationType)}：{findPerson(rel.fromPersonId).name} → {findPerson(rel.toPersonId).name}</p>) : <p>暂无关系记录。</p>}
            </div>
            <Actions><button onClick={() => setAsCenter(selectedNode.id)}>设为中心人物</button><button className="secondary" onClick={() => setSelectedNode(null)}>关闭</button></Actions>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
