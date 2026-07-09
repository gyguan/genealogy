import { useEffect, useMemo, useState } from 'react';
import { Alert, Avatar, Button, Card, Descriptions, Drawer, Empty, Form, Input, Segmented, Select, Space, Tag, Tooltip, Typography, theme } from 'antd';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { treeService } from '../../shared/services';
import type { LineageBranchDto, LineageClanDto, LineagePersonDto, LineageRelationshipDto, LineageTreeDto } from '../../shared/services';
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
  raw?: LineagePersonDto;
};

type RelationshipCard = { id: string; fromPersonId: string; toPersonId: string; relationType: string; relationLabel: string; status: string; raw?: LineageRelationshipDto };
type WorkbenchView = 'all' | 'branch' | 'person';

type CollectionLike<T> = T[] | { records?: T[]; items?: T[]; content?: T[]; nodes?: T[] } | null | undefined;

function rows<T>(data: CollectionLike<T>): T[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.nodes)) return data.nodes;
  return [];
}

function edgeRows(data: LineageTreeDto | null | undefined): LineageRelationshipDto[] { return Array.isArray(data?.edges) ? data.edges : []; }
function firstChar(name?: string) { return (name || '谱').slice(0, 1); }
function dateText(row: LineagePersonDto) { const birth = row.birthDate || row.birthYear || row.birthDateText || ''; const death = row.deathDate || row.deathYear || row.deathDateText || ''; return birth || death ? `${birth || '?'}-${death || ''}` : '-'; }
function idOf(row?: LineagePersonDto) { return String(row?.id || row?.personId || row?.targetId || ''); }
function generationNoOf(row?: LineagePersonDto): number | undefined { const value = row?.generationNo ?? row?.generation ?? row?.generationNumber; const numeric = Number(value); return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined; }
function relationCn(label: string) { const dict: Record<string, string> = { father: '父亲', mother: '母亲', spouse: '配偶', parent_child: '亲子', child: '子女', son: '子', daughter: '女', adoptive: '收养', adoptive_father: '养父', adoptive_mother: '养母', heir_successor: '继嗣', successor: '继嗣', out_adoption: '出嗣', out_adopted: '出嗣' }; return dict[label] || label || '亲属'; }
function genderCn(value: string) { const dict: Record<string, string> = { male: '男', female: '女', unknown: '未知' }; return dict[value] || value || '未知'; }
function statusCn(value: string) { const status = String(value || '').toLowerCase(); const dict: Record<string, string> = { draft: '草稿', pending: '待审核', pending_review: '待审核', official: '正式', active: '正式', approved: '已通过', rejected: '已驳回', archived: '已归档' }; return dict[status] || value || '已记录'; }
function statusColor(value: string) { const status = String(value || '').toLowerCase(); if (['official', 'active', 'approved'].includes(status)) return 'success'; if (['pending', 'pending_review', 'pending'].includes(status)) return 'processing'; if (status === 'rejected') return 'error'; return 'default'; }

function toPerson(row: LineagePersonDto, branches: LineageBranchDto[], fallbackId = ''): PersonCard {
  const id = idOf(row) || fallbackId;
  const name = row.name || row.personName || row.displayName || '未命名人物';
  const branchId = String(row.branchId || row.branch?.id || '');
  const generationNo = generationNoOf(row);
  return { id, name, avatar: firstChar(name), gender: row.gender || row.sex || 'unknown', generationNo, generation: generationNo ? `${generationNo}世` : row.generationName || '世次未维护', word: row.generationWord || row.word || '-', branchId, branchName: branches.find(item => String(item.id) === branchId)?.branchName || row.branchName || row.branch?.branchName || '未归属支派', years: dateText(row), status: row.status || row.dataStatus || row.verificationStatus || row.reviewStatus || '已记录', relation: row.relationLabel || row.relationType, raw: row };
}

function toRelationship(row: LineageRelationshipDto): RelationshipCard {
  const fromPersonId = String(row.fromPersonId || row.sourcePersonId || row.from?.id || '');
  const toPersonId = String(row.toPersonId || row.targetPersonId || row.to?.id || '');
  return { id: String(row.id || row.relationshipId || `${fromPersonId}-${toPersonId}-${row.relationLabel || row.relationType}`), fromPersonId, toPersonId, relationType: row.relationType || '', relationLabel: row.relationLabel || row.relationType || '', status: row.status || row.dataStatus || row.confidenceLevel || '已记录', raw: row };
}

function uniquePeople(list: PersonCard[]) { const map = new Map<string, PersonCard>(); list.filter(item => item.id).forEach(item => map.set(item.id, item)); return Array.from(map.values()); }
function sortByGeneration(list: PersonCard[], direction: 'asc' | 'desc' = 'asc') { return [...list].sort((a, b) => { const av = a.generationNo ?? 9999; const bv = b.generationNo ?? 9999; return direction === 'asc' ? av - bv : bv - av; }); }
function groupDescendants(list: PersonCard[]) { const groups = new Map<string, PersonCard[]>(); list.forEach(item => { const key = item.generationNo ? `${item.generationNo}世` : '后代'; groups.set(key, [...(groups.get(key) || []), item]); }); return Array.from(groups.entries()).sort((a, b) => Number(a[0].replace(/\D/g, '') || 9999) - Number(b[0].replace(/\D/g, '') || 9999)); }
function branchPath(branches: LineageBranchDto[], branchId: string) { const current = branches.find(item => String(item.id) === branchId); if (!current) return '未选择支派'; const idToBranch = new Map(branches.map(item => [String(item.id), item])); const chain: string[] = []; let node: LineageBranchDto | undefined = current; const guard = new Set<string>(); while (node && !guard.has(String(node.id))) { guard.add(String(node.id)); chain.unshift(node.branchName || '未命名支派'); node = node.parentId ? idToBranch.get(String(node.parentId)) : undefined; } return chain.join(' / '); }

function TreeNode({ person, active, hint, onClick }: { person: PersonCard; active?: boolean; hint?: string; onClick?: () => void }) {
  return <Button type="text" className={`lineage-tree-node ${active ? 'active' : ''}`} onClick={onClick}><span className="lineage-avatar">{person.avatar}</span><strong>{person.name}</strong><em>{hint || person.relation || person.generation}</em><small>{person.generation} · {person.word}字辈</small></Button>;
}
function EmptyLane({ text }: { text: string }) { return <div className="lineage-empty"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={text} /></div>; }

export function LineageTreeProductPage({ notify }: Props) {
  const { token } = theme.useToken();
  const workspace = useWorkspace();
  const [clans, setClans] = useState<LineageClanDto[]>([]);
  const [branches, setBranches] = useState<LineageBranchDto[]>([]);
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
  const [workbenchView, setWorkbenchView] = useState<WorkbenchView>('all');
  const [loading, setLoading] = useState(false);

  async function run(action: () => Promise<void>) { if (loading) return; setLoading(true); try { await action(); } catch (error) { notify({ message: (error as Error).message || '操作失败' }, true); } finally { setLoading(false); } }
  function resetLineage() { setCenter(null); setRelationships([]); setFamilyNodes([]); setAncestors([]); setDescendants([]); setSelectedNode(null); }
  function resetBranchLineage() { setBranchNodes([]); setBranchEdges([]); setBranchRootPersonId(''); }
  function clearClanScopedData() { setBranches([]); setPeople([]); setSearchNotice(''); setSelectedBranchId(''); resetLineage(); resetBranchLineage(); }
  function resetSearch() { setSearchKeyword(''); setSearchNotice(''); workspace.patch({ personId: '', relationshipId: '' }); resetLineage(); }
  function validIdInRows(id: string, list: LineageBranchDto[]) { return Boolean(id) && list.some(item => String(item.id) === String(id)); }

  async function loadClanContext(clanId: string, resetSelection = false) {
    if (!clanId) { clearClanScopedData(); workspace.patch({ branchId: '', personId: '', relationshipId: '' }); return; }
    const branchRows = rows<LineageBranchDto>(await treeService.listBranches(clanId).catch(() => []));
    setBranches(branchRows);
    const nextBranchId = resetSelection ? String(branchRows[0]?.id || '') : validIdInRows(selectedBranchId, branchRows) ? selectedBranchId : validIdInRows(workspace.branchId, branchRows) ? workspace.branchId : String(branchRows[0]?.id || '');
    setSelectedBranchId(nextBranchId);
    workspace.setBranchId(nextBranchId || '');
    resetBranchLineage();
    const personRes = await treeService.searchPeople(clanId, 1, 120).catch(() => treeService.listPeople(clanId));
    const nextPeople = rows<LineagePersonDto>(personRes).map(row => toPerson(row, branchRows));
    setPeople(nextPeople);
    setSearchNotice('');
    const nextPersonId = resetSelection ? nextPeople[0]?.id || '' : nextPeople.some(item => item.id === workspace.personId) ? workspace.personId : nextPeople[0]?.id || '';
    workspace.setPersonId(nextPersonId || '');
    workspace.setRelationshipId('');
    setSelectedNode(null);
    if (nextPersonId) await loadLineage(nextPersonId, branchRows, nextPeople);
    else resetLineage();
    if (nextBranchId) await loadBranchLineage(nextBranchId, branchRows, clanId, false);
  }

  async function loadBase() {
    await run(async () => {
      const clanRows = rows<LineageClanDto>(await treeService.listClans().catch(() => []));
      setClans(clanRows);
      const nextClanId = workspace.clanId || String(clanRows[0]?.id || '');
      if (nextClanId && !workspace.clanId) workspace.setClanId(nextClanId);
      await loadClanContext(nextClanId, !workspace.clanId);
    });
  }

  async function handleClanChange(nextClanId: string) { await run(async () => { workspace.patch({ clanId: nextClanId, branchId: '', personId: '', relationshipId: '', sourceId: '', reviewTaskId: '' }); clearClanScopedData(); await loadClanContext(nextClanId, true); notify({ message: nextClanId ? '宗族已切换，支派世系和中心人物世系已刷新' : '已清空宗族选择' }); }); }
  async function handleBranchChange(nextBranchId: string) { setSelectedBranchId(nextBranchId); resetBranchLineage(); if (!nextBranchId) { workspace.setBranchId(''); return; } await run(() => loadBranchLineage(nextBranchId, branches, workspace.clanId, true)); }

  async function searchPeople() {
    await run(async () => {
      if (!workspace.clanId) throw new Error('请先选择宗族');
      const data = await treeService.searchPeople(workspace.clanId, 1, 50, searchKeyword).catch(() => []);
      const next = rows<LineagePersonDto>(data).map(row => toPerson(row, branches));
      if (!next.length) { setSearchNotice('未找到匹配人物，请调整搜索条件。'); return; }
      const mergedPeople = uniquePeople([...next, ...people]);
      const first = next[0];
      setPeople(mergedPeople);
      setSearchNotice(`已匹配 ${next.length} 位人物，自动定位到：${first.name}`);
      workspace.setPersonId(first.id);
      setSelectedNode(null);
      await loadLineage(first.id, branches, mergedPeople);
      if (first.branchId && first.branchId !== selectedBranchId) { setSelectedBranchId(first.branchId); await loadBranchLineage(first.branchId, branches, workspace.clanId, false); }
    });
  }

  async function loadLineage(personId = workspace.personId, branchRows = branches, peopleRows = people) {
    if (!personId) { resetLineage(); return; }
    const [detailRes, relationRes, familyRes, ancestorRes, descendantRes] = await Promise.all([
      treeService.getPerson(personId).catch(() => peopleRows.find(item => item.id === personId)?.raw || { id: personId }),
      treeService.getPersonRelationships(personId).catch(() => []),
      treeService.getPersonFamilyTree(personId).catch(() => null),
      treeService.getAncestors(personId, depth).catch(() => null),
      treeService.getDescendants(personId, depth).catch(() => null)
    ]);
    const nextCenter = toPerson(detailRes as LineagePersonDto, branchRows, personId);
    setCenter(nextCenter);
    setRelationships(rows<LineageRelationshipDto>(relationRes).map(toRelationship));
    setFamilyNodes(rows<LineagePersonDto>(familyRes as CollectionLike<LineagePersonDto>).map(row => toPerson(row, branchRows)));
    setAncestors(rows<LineagePersonDto>(ancestorRes as CollectionLike<LineagePersonDto>).map(row => toPerson(row, branchRows)).filter(item => item.id !== personId));
    setDescendants(rows<LineagePersonDto>(descendantRes as CollectionLike<LineagePersonDto>).map(row => toPerson(row, branchRows)).filter(item => item.id !== personId));
  }

  async function loadBranchLineage(branchId = selectedBranchId, branchRows = branches, clanId = workspace.clanId, showNotice = true) {
    if (!clanId) throw new Error('请先选择宗族');
    if (!branchId) throw new Error('请选择支派');
    const data = await treeService.getBranchLineage(clanId, branchId) as LineageTreeDto;
    const nextNodes = rows<LineagePersonDto>(data).map(row => toPerson(row, branchRows));
    const nextEdges = edgeRows(data).map(toRelationship);
    setBranchNodes(nextNodes);
    setBranchEdges(nextEdges);
    setBranchRootPersonId(nextNodes.length ? String(data.rootPersonId || nextNodes[0]?.id || '') : '');
    workspace.setBranchId(branchId);
    if (showNotice) notify({ message: `支派世系已生成：${nextNodes.length} 位人物，${nextEdges.length} 条关系` });
  }

  useEffect(() => { void loadBase(); }, []);
  useEffect(() => { if (workspace.personId) void run(() => loadLineage(workspace.personId)); }, [workspace.personId, depth]);

  const personMap = useMemo(() => { const map = new Map<string, PersonCard>(); [...people, ...familyNodes, ...ancestors, ...descendants, ...branchNodes, ...(center ? [center] : [])].forEach(item => item.id && map.set(item.id, item)); return map; }, [people, familyNodes, ancestors, descendants, branchNodes, center]);
  function findPerson(id: string, fallback?: LineagePersonDto) { return personMap.get(id) || toPerson(fallback || { id }, branches, id); }
  const relationshipDerived = useMemo(() => { if (!center) return { parents: [] as PersonCard[], spouses: [] as PersonCard[], children: [] as PersonCard[], others: [] as RelationshipCard[] }; const parents: PersonCard[] = [], spouses: PersonCard[] = [], children: PersonCard[] = [], others: RelationshipCard[] = []; relationships.forEach(rel => { if (rel.relationType === 'spouse' || rel.relationLabel === 'spouse') { const otherId = rel.fromPersonId === center.id ? rel.toPersonId : rel.toPersonId === center.id ? rel.fromPersonId : ''; if (otherId) spouses.push({ ...findPerson(otherId), relation: '配偶' }); else others.push(rel); return; } if (rel.relationType === 'parent_child' || rel.relationType === 'adoptive' || rel.relationType === 'successor') { if (rel.toPersonId === center.id) parents.push({ ...findPerson(rel.fromPersonId), relation: relationCn(rel.relationLabel || rel.relationType) }); else if (rel.fromPersonId === center.id) children.push({ ...findPerson(rel.toPersonId), relation: relationCn(rel.relationLabel || rel.relationType) }); else others.push(rel); return; } others.push(rel); }); return { parents: uniquePeople(parents), spouses: uniquePeople(spouses), children: uniquePeople(children), others }; }, [relationships, center, personMap, branches]);
  const spousePersonIds = useMemo(() => new Set(relationshipDerived.spouses.map(person => person.id)), [relationshipDerived.spouses]);
  const ancestorLane = useMemo(() => sortByGeneration(uniquePeople((ancestors.length ? ancestors : relationshipDerived.parents).filter(person => !spousePersonIds.has(person.id))), 'asc').slice(-10), [ancestors, relationshipDerived.parents, spousePersonIds]);
  const descendantGroups = useMemo(() => groupDescendants(uniquePeople((descendants.length ? descendants : relationshipDerived.children).filter(person => !spousePersonIds.has(person.id)))), [descendants, relationshipDerived.children, spousePersonIds]);
  const branchGroups = useMemo(() => groupDescendants(sortByGeneration(uniquePeople(branchNodes))), [branchNodes]);
  const branchRoot = useMemo(() => branchNodes.find(person => person.id === branchRootPersonId) || branchNodes[0], [branchNodes, branchRootPersonId]);
  const branchName = branches.find(item => String(item.id) === selectedBranchId)?.branchName || '支派';
  const currentClanName = clans.find(item => String(item.id) === workspace.clanId)?.clanName || '族谱';
  const selectedNodeRelations = selectedNode ? [...relationships, ...branchEdges].filter(rel => rel.fromPersonId === selectedNode.id || rel.toPersonId === selectedNode.id) : [];
  async function setAsCenter(personId: string) { const nextCenter = findPerson(personId, selectedNode?.raw); setCenter(nextCenter); workspace.setPersonId(personId); setSelectedNode(null); if (nextCenter.branchId && nextCenter.branchId !== selectedBranchId) { setSelectedBranchId(nextCenter.branchId); await run(() => loadBranchLineage(nextCenter.branchId, branches, workspace.clanId, false)); } }

  return (
    <div className="lineage-page lineage-tree-page">
      <Panel title="世系图谱" description="统一在搜索区选择宗族、支派范围和中心人物；下方按支派全局到人物局部的顺序展示世系。">
        <Form layout="vertical" className="lineage-search-grid">
          <Form.Item label="宗族"><Select showSearch optionFilterProp="label" value={workspace.clanId} onChange={value => void handleClanChange(value)} options={[{ value: '', label: '请选择宗族' }, ...clans.map(clan => ({ value: String(clan.id), label: clan.clanName || clan.surname || '未命名宗族' }))]} /></Form.Item>
          <Form.Item label="支派范围"><Select showSearch optionFilterProp="label" value={selectedBranchId} onChange={value => void handleBranchChange(value)} options={[{ value: '', label: '请选择支派' }, ...branches.map(branch => ({ value: String(branch.id), label: branch.branchName || '未命名支派' }))]} /></Form.Item>
          <Form.Item label="搜索人物"><Input.Search value={searchKeyword} onChange={event => setSearchKeyword(event.target.value)} onSearch={() => void searchPeople()} placeholder="输入姓名、谱名、字号" loading={loading} /></Form.Item>
          <Form.Item label="展开深度"><Select value={depth} onChange={setDepth} options={[{ value: '2', label: '2代' }, { value: '3', label: '3代' }, { value: '5', label: '5代' }, { value: '8', label: '8代' }]} /></Form.Item>
          <Form.Item label="视图模式"><Segmented value={workbenchView} onChange={value => setWorkbenchView(value as WorkbenchView)} options={[{ label: '全部', value: 'all' }, { label: '支派', value: 'branch' }, { label: '人物', value: 'person' }]} /></Form.Item>
          <Form.Item label="操作"><Space wrap><Tooltip title="按当前筛选条件查询人物并刷新世系"><Button type="primary" loading={loading} onClick={() => void searchPeople()}>搜索</Button></Tooltip><Button disabled={loading && !searchKeyword && !center} onClick={resetSearch}>重置</Button></Space></Form.Item>
        </Form>
        {searchNotice ? <Alert type="success" showIcon message={searchNotice} style={{ marginTop: 12 }} /> : null}
      </Panel>
      <section className="lineage-workbench">
        {(workbenchView === 'all' || workbenchView === 'branch') ? <Card title={`${currentClanName} · ${branchName}支派世系`} style={{ borderRadius: token.borderRadiusLG, boxShadow: token.boxShadowTertiary }} extra={<Tag>{branchPath(branches, selectedBranchId)}</Tag>}><Space direction="vertical" size="middle" style={{ width: '100%' }}>{branchRoot ? <Card size="small"><Space><Avatar>{branchRoot.avatar}</Avatar><div><Typography.Text strong>{branchRoot.name}</Typography.Text><br /><Typography.Text type="secondary">支派根节点 · {branchRoot.generation}</Typography.Text></div></Space></Card> : <EmptyLane text="暂无支派世系数据，请选择支派后刷新。" />}{branchGroups.length ? branchGroups.map(([label, list]) => <div key={label}><Typography.Text strong>{label}</Typography.Text><div className="lineage-node-row">{list.map(person => <TreeNode key={person.id} person={person} active={selectedNode?.id === person.id} onClick={() => setSelectedNode(person)} />)}</div></div>) : null}{branchEdges.length ? <Tag color="processing">后端返回关系线 {branchEdges.length} 条</Tag> : <Tag>暂无后端关系线数据</Tag>}</Space></Card> : null}
        {(workbenchView === 'all' || workbenchView === 'person') ? <Card title="中心人物世系" style={{ borderRadius: token.borderRadiusLG, boxShadow: token.boxShadowTertiary }} extra={center ? <Tag color={statusColor(center.status)}>{statusCn(center.status)}</Tag> : null}><Space direction="vertical" size="middle" style={{ width: '100%' }}>{center ? <div className="lineage-center-card"><Avatar size={48}>{center.avatar}</Avatar><div><Typography.Title level={4} style={{ margin: 0 }}>{center.name}</Typography.Title><Typography.Text type="secondary">{center.branchName} · {center.generation} · {center.word}字辈 · {center.years}</Typography.Text></div><Button onClick={() => setSelectedNode(center)}>查看详情</Button></div> : <EmptyLane text="暂无中心人物，请先选择宗族或搜索人物。" />}{ancestorLane.length ? <div><Typography.Text strong>上溯世系</Typography.Text><div className="lineage-node-row">{ancestorLane.map(person => <TreeNode key={person.id} person={person} hint="上辈" onClick={() => setSelectedNode(person)} />)}</div></div> : <EmptyLane text="暂无上溯世系。" />}{relationshipDerived.spouses.length ? <div><Typography.Text strong>配偶</Typography.Text><div className="lineage-node-row">{relationshipDerived.spouses.map(person => <TreeNode key={person.id} person={person} hint="配偶" onClick={() => setSelectedNode(person)} />)}</div></div> : null}{descendantGroups.length ? descendantGroups.map(([label, list]) => <div key={label}><Typography.Text strong>{label}</Typography.Text><div className="lineage-node-row">{list.map(person => <TreeNode key={person.id} person={person} onClick={() => setSelectedNode(person)} />)}</div></div>) : <EmptyLane text="暂无下传世系。" />}</Space></Card> : null}
      </section>
      <Drawer title="人物节点详情" width={520} open={Boolean(selectedNode)} onClose={() => setSelectedNode(null)} extra={selectedNode ? <Button type="primary" onClick={() => void setAsCenter(selectedNode.id)}>设为中心人物</Button> : null}>
        {selectedNode ? <Space direction="vertical" size="large" style={{ width: '100%' }}><Card size="small"><Descriptions column={1} size="small" bordered><Descriptions.Item label="姓名">{selectedNode.name}</Descriptions.Item><Descriptions.Item label="性别">{genderCn(selectedNode.gender)}</Descriptions.Item><Descriptions.Item label="所属支派">{selectedNode.branchName}</Descriptions.Item><Descriptions.Item label="世次字辈">{selectedNode.generation} · {selectedNode.word}字辈</Descriptions.Item><Descriptions.Item label="生卒">{selectedNode.years}</Descriptions.Item><Descriptions.Item label="状态"><Tag color={statusColor(selectedNode.status)}>{statusCn(selectedNode.status)}</Tag></Descriptions.Item></Descriptions></Card><Card size="small" title="关联关系">{selectedNodeRelations.length ? <Space direction="vertical" style={{ width: '100%' }}>{selectedNodeRelations.map(rel => <Tag key={rel.id}>{findPerson(rel.fromPersonId, rel.raw?.from).name} → {findPerson(rel.toPersonId, rel.raw?.to).name}：{relationCn(rel.relationLabel || rel.relationType)}</Tag>)}</Space> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无后端关系数据" />}</Card></Space> : null}
      </Drawer>
    </div>
  );
}
