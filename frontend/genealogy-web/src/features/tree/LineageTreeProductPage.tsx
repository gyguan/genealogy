import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { Panel } from '../../shared/ui/Panel';
import { ResultNotice } from '../../shared/ui/ResultNotice';

type Props = { notify: (data: unknown, error?: boolean) => void };
type Notice = { message: string; id?: string | number };

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
  return {
    id: String(row.id || `${row.fromPersonId}-${row.toPersonId}-${row.relationLabel || row.relationType}`),
    fromPersonId: String(row.fromPersonId || row.from?.id || ''),
    toPersonId: String(row.toPersonId || row.to?.id || ''),
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

function PersonMiniCard({ person, active, hint, onClick }: { person: PersonCard; active?: boolean; hint?: string; onClick?: () => void }) {
  return (
    <button className={`lineage-person-card ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="lineage-avatar">{person.avatar}</span>
      <strong>{person.name}</strong>
      <em>{hint || person.relation || person.generation}</em>
      <small>{person.generation} · {person.word}字辈</small>
      <i>{person.years}</i>
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
  const [center, setCenter] = useState<PersonCard | null>(null);
  const [relationships, setRelationships] = useState<RelationshipCard[]>([]);
  const [familyNodes, setFamilyNodes] = useState<PersonCard[]>([]);
  const [ancestors, setAncestors] = useState<PersonCard[]>([]);
  const [descendants, setDescendants] = useState<PersonCard[]>([]);
  const [depth, setDepth] = useState('3');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Notice | undefined>();

  async function run(action: () => Promise<void>) {
    if (loading) return;
    setLoading(true);
    try {
      await action();
    } catch (error) {
      const notice = { message: (error as Error).message || '操作失败' };
      setResult(notice);
      notify(notice, true);
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
        setResult({ message: '暂无宗族数据，请先创建宗族。' });
        return;
      }
      const branchRows = rows(await apiClient.get(`/clans/${nextClanId}/branches`).catch(() => []));
      setBranches(branchRows);
      const personRes = await apiClient.get(`/persons/search?clanId=${nextClanId}&pageNo=1&pageSize=80`).catch(() => apiClient.get(`/clans/${nextClanId}/persons`));
      const personRows = rows(personRes);
      const nextPeople = personRows.map(row => toPerson(row, branchRows));
      setPeople(nextPeople);
      const nextPersonId = workspace.personId || nextPeople[0]?.id || '';
      if (nextPersonId && !workspace.personId) workspace.setPersonId(nextPersonId);
      if (nextPersonId) await loadLineage(nextPersonId, branchRows, nextPeople);
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
    setResult({ message: `已切换到 ${nextCenter.name} 的世系视图`, id: nextCenter.id });
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

  const ancestorLane = useMemo(() => {
    const source = ancestors.length ? ancestors : relationshipDerived.parents;
    return sortByGeneration(uniquePeople(source), 'asc').slice(-8);
  }, [ancestors, relationshipDerived.parents]);

  const descendantGroups = useMemo(() => {
    const source = descendants.length ? descendants : relationshipDerived.children;
    return groupDescendants(uniquePeople(source));
  }, [descendants, relationshipDerived.children]);

  function selectPerson(id: string) {
    workspace.setPersonId(id);
  }

  return (
    <div className="lineage-page">
      <section className="lineage-hero">
        <div>
          <span>Lineage View</span>
          <h2>以中心人物为锚点，看清上溯、同代与下延关系</h2>
          <p>新的世系图不再随机摆放节点，而是按族谱阅读顺序呈现：上方是祖先链，中间是中心人物与配偶，下方是子女和后代，右侧保留读图说明和快速切换。</p>
        </div>
        <Actions>
          <button disabled={loading} onClick={loadBase}>{loading ? '刷新中...' : '刷新世系'}</button>
        </Actions>
      </section>

      <Panel title="选择中心人物" description="先确定宗族和中心人物，再查看该人物的三段式世系。">
        <div className="lineage-filter-grid">
          <Field label="宗族ID"><input value={workspace.clanId} onChange={e => workspace.setClanId(e.target.value)} placeholder="宗族ID" /></Field>
          <Field label="中心人物ID"><input value={workspace.personId} onChange={e => workspace.setPersonId(e.target.value)} placeholder="人物ID" /></Field>
          <Field label="中心人物"><select value={workspace.personId} onChange={e => workspace.setPersonId(e.target.value)}><option value="">请选择</option>{people.map(person => <option key={person.id} value={person.id}>{person.name} · {person.generation} · {person.branchName}</option>)}</select></Field>
          <Field label="展开深度"><select value={depth} onChange={e => setDepth(e.target.value)}><option value="2">2代</option><option value="3">3代</option><option value="5">5代</option><option value="8">8代</option></select></Field>
        </div>
        <ResultNotice result={result} />
      </Panel>

      <section className="lineage-layout">
        <main className="lineage-main-card">
          <div className="lineage-main-title">
            <div><span>{clans.find(item => String(item.id) === workspace.clanId)?.clanName || '族谱'}</span><h3>{center ? `${center.name} 的世系` : '世系图'}</h3></div>
            <div className="lineage-legend"><span>上溯祖先</span><span>中心人物</span><span>下延后代</span></div>
          </div>

          <div className="lineage-stage lineage-stage--ancestor">
            <div className="lineage-stage-label"><strong>上溯祖先</strong><span>父母 / 祖辈 / 高祖</span></div>
            <div className="lineage-rail">
              {ancestorLane.length ? ancestorLane.map(person => <PersonMiniCard key={person.id} person={person} hint={person.relation || person.generation} onClick={() => selectPerson(person.id)} />) : <EmptyLane text="暂无上溯祖先，请先维护父母关系或上溯世系。" />}
            </div>
          </div>

          <div className="lineage-connector"><i /></div>

          <div className="lineage-stage lineage-stage--center">
            <div className="lineage-stage-label"><strong>中心人物</strong><span>当前查看锚点</span></div>
            <div className="lineage-center-row">
              {center ? <PersonMiniCard person={center} active hint="中心人物" /> : <EmptyLane text="请选择中心人物。" />}
              <div className="lineage-spouse-block">
                <strong>配偶 / 同代</strong>
                <div>{relationshipDerived.spouses.length ? relationshipDerived.spouses.map(person => <PersonMiniCard key={person.id} person={person} hint="配偶" onClick={() => selectPerson(person.id)} />) : <EmptyLane text="暂无配偶关系。" />}</div>
              </div>
            </div>
          </div>

          <div className="lineage-connector"><i /></div>

          <div className="lineage-stage lineage-stage--descendant">
            <div className="lineage-stage-label"><strong>下延后代</strong><span>子女 / 孙辈 / 后裔</span></div>
            <div className="lineage-descendant-groups">
              {descendantGroups.length ? descendantGroups.map(([label, group]) => (
                <div className="lineage-generation-row" key={label}>
                  <b>{label}</b>
                  <div>{group.map(person => <PersonMiniCard key={person.id} person={person} hint={person.relation || label} onClick={() => selectPerson(person.id)} />)}</div>
                </div>
              )) : <EmptyLane text="暂无下延后代，请先维护子女关系。" />}
            </div>
          </div>
        </main>

        <aside className="lineage-side-card">
          <h3>读图说明</h3>
          <div className="lineage-guide-list">
            <div><strong>1. 上溯</strong><p>从中心人物向上看父母、祖父母、高祖等直系祖先。</p></div>
            <div><strong>2. 中心</strong><p>中心人物固定在中间，配偶和同代关系放在右侧，不打乱主线。</p></div>
            <div><strong>3. 下延</strong><p>子女、孙辈、后裔按代次分组，避免所有节点挤在一张图里。</p></div>
          </div>
          <h3>当前人物</h3>
          {center ? <div className="lineage-current-profile"><span className="lineage-avatar">{center.avatar}</span><strong>{center.name}</strong><p>{center.branchName} · {center.generation} · {center.word}字辈</p><p>生卒：{center.years}</p><p>状态：{center.status}</p></div> : <EmptyLane text="未选择人物。" />}
          <h3>关系清单</h3>
          <div className="lineage-relation-list">
            {relationships.length ? relationships.map(rel => <div key={rel.id}><span>{relationCn(rel.relationLabel || rel.relationType)}</span><strong>{findPerson(rel.fromPersonId).name} → {findPerson(rel.toPersonId).name}</strong><em>{rel.status}</em></div>) : <EmptyLane text="暂无关系记录。" />}
          </div>
          <h3>快速切换</h3>
          <div className="lineage-switch-list">{people.slice(0, 12).map(person => <button key={person.id} className={workspace.personId === person.id ? 'active' : ''} onClick={() => selectPerson(person.id)}>{person.name}<span>{person.generation}</span></button>)}</div>
        </aside>
      </section>
    </div>
  );
}
