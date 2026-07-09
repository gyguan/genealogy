import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Drawer, Empty, Select, Space, Statistic, Table, Tag, Typography } from 'antd';
import { genderText, reviewTargetTypeText, sourceTypeText, statusColor, statusText } from '../../shared/dictionaries';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { homeService } from '../../shared/services/homeService';
import { toRecordList } from '../../shared/ui/DataTable';

type DrillKey = 'clans' | 'branches' | 'people' | 'sources' | 'pendingReviews' | 'logs' | 'generationReady' | 'vitalReady' | 'biographyReady' | 'migrationBranches' | 'branchCovered' | `gender:${string}` | `status:${string}` | `generation:${string}` | `sourceType:${string}` | `living:${string}`;

type HomeSnapshot = { clans: any[]; branches: any[]; people: any[]; sources: any[]; pendingReviews: any[]; logStats: any; peopleTotal: number };
type ChartItem = { key: DrillKey; label: string; value: number };

const emptySnapshot: HomeSnapshot = { clans: [], branches: [], people: [], sources: [], pendingReviews: [], logStats: null, peopleTotal: 0 };

function countBy(rows: any[], getter: (row: any) => string | number | undefined | null, prefix?: string): ChartItem[] { const map = new Map<string, number>(); rows.forEach(row => { const raw = getter(row); const label = String(raw ?? '').trim() || '未维护'; map.set(label, (map.get(label) || 0) + 1); }); return Array.from(map.entries()).map(([label, value]) => ({ key: (prefix ? `${prefix}:${label}` : label) as DrillKey, label, value })).sort((a, b) => b.value - a.value); }
function display(value: unknown, fallback = '-') { const text = String(value ?? '').trim(); return text || fallback; }
function livingText(value: unknown) { if (value === true) return '在世'; if (value === false) return '已故'; return '未维护'; }
function clanName(row: any) { return display(row.clanName || row.name, '未命名宗族'); }
function branchName(row: any) { return display(row.branchName || row.name, '未命名支派'); }
function personName(row: any) { return display(row.name || row.personName, '未命名人物'); }
function sourceName(row: any) { return display(row.sourceName || row.title || row.name, '未命名资料'); }
function reviewTargetText(value: string) { return reviewTargetTypeText(value, '对象待维护'); }

function MiniBarChart({ title, items, activeKey, onSelect }: { title: string; items: ChartItem[]; activeKey: DrillKey; onSelect: (key: DrillKey) => void }) {
  const max = Math.max(1, ...items.map(item => item.value));
  return <Card title={title} className="home-chart-card" size="small"><Space direction="vertical" size="small" style={{ width: '100%' }}>{items.length ? items.map(item => <Button key={item.key} block type={activeKey === item.key ? 'primary' : 'default'} onClick={() => onSelect(item.key)}><span style={{ display: 'inline-flex', justifyContent: 'space-between', width: '100%' }}><span>{item.label}</span><span>{item.value} · {Math.round(item.value / max * 100)}%</span></span></Button>) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />}</Space></Card>;
}

export function StatisticsHomePage() {
  const workspace = useWorkspace();
  const [snapshot, setSnapshot] = useState<HomeSnapshot>(emptySnapshot);
  const [loading, setLoading] = useState(false);
  const [activeDrill, setActiveDrill] = useState<DrillKey>('people');
  const [drillOpen, setDrillOpen] = useState(false);

  async function loadStats(clanIdOverride?: string) {
    setLoading(true);
    try {
      const clans = toRecordList<any>(await homeService.listClans().catch(() => []));
      const requestedClanId = String(clanIdOverride || workspace.clanId || '').trim();
      const fallbackClanId = String(clans[0]?.id || '');
      const clanId = requestedClanId && clans.some(clan => String(clan.id) === requestedClanId) ? requestedClanId : fallbackClanId;
      if (clanId && workspace.clanId !== clanId) workspace.setClanId(clanId);
      if (!clanId) { setSnapshot({ ...emptySnapshot, clans }); return; }
      const snapshotRes = await homeService.loadSnapshot(clanId);
      const people = toRecordList<any>(snapshotRes.people);
      setSnapshot({ clans, branches: toRecordList<any>(snapshotRes.branches), people, sources: toRecordList<any>(snapshotRes.sources), pendingReviews: toRecordList<any>(snapshotRes.pendingReviews), logStats: snapshotRes.logStats, peopleTotal: (snapshotRes.people as any)?.total ?? people.length });
    } finally { setLoading(false); }
  }

  async function switchClan(nextClanId: string) {
    const clanId = String(nextClanId || '').trim();
    if (!clanId || clanId === workspace.clanId) return;
    workspace.patch({ clanId, branchId: '', personId: '', relationshipId: '', sourceId: '', attachmentId: '', reviewTaskId: '' });
    setActiveDrill('people');
    setDrillOpen(false);
    await loadStats(clanId);
  }

  useEffect(() => { void loadStats(); }, []);

  const currentClan = useMemo(() => snapshot.clans.find(row => String(row.id) === String(workspace.clanId || '')) || snapshot.clans[0] || null, [snapshot.clans, workspace.clanId]);
  const selectedClanId = String(currentClan?.id || workspace.clanId || '');
  const branchPersonCounts = useMemo(() => { const map = new Map<string, number>(); snapshot.people.forEach(person => { const branchId = String(person.branchId || ''); if (branchId) map.set(branchId, (map.get(branchId) || 0) + 1); }); return map; }, [snapshot.people]);
  const genderItems = useMemo(() => countBy(snapshot.people, row => genderText(String(row.gender || 'unknown')), 'gender'), [snapshot.people]);
  const statusItems = useMemo(() => countBy(snapshot.people, row => statusText(String(row.dataStatus || row.status || ''), '未维护'), 'status'), [snapshot.people]);
  const sourceTypeItems = useMemo(() => countBy(snapshot.sources, row => sourceTypeText(String(row.sourceType || row.category || '')), 'sourceType'), [snapshot.sources]);
  const livingItems = useMemo(() => countBy(snapshot.people, row => livingText(row.isLiving), 'living'), [snapshot.people]);
  const generationReady = snapshot.people.filter(person => person.generationNo || person.generationWord).length;
  const vitalReady = snapshot.people.filter(person => person.birthDate || person.deathDate || person.birthYear || person.deathYear).length;
  const biographyReady = snapshot.people.filter(person => person.biography || person.story || person.lifeSummary).length;
  const migrationBranches = snapshot.branches.filter(branch => branch.migrationFrom || branch.migrationTo).length;
  const branchCovered = snapshot.branches.filter(branch => branchPersonCounts.has(String(branch.id))).length;
  const logTotal = snapshot.logStats?.totalCount ?? snapshot.logStats?.total ?? 0;

  const drillRows = useMemo(() => {
    if (activeDrill === 'clans') return snapshot.clans;
    if (activeDrill === 'branches') return snapshot.branches;
    if (activeDrill === 'people') return snapshot.people;
    if (activeDrill === 'sources') return snapshot.sources;
    if (activeDrill === 'pendingReviews') return snapshot.pendingReviews;
    if (activeDrill === 'logs') return [{ label: '操作日志', value: logTotal }];
    if (activeDrill === 'generationReady') return snapshot.people.filter(person => person.generationNo || person.generationWord);
    if (activeDrill === 'vitalReady') return snapshot.people.filter(person => person.birthDate || person.deathDate || person.birthYear || person.deathYear);
    if (activeDrill === 'biographyReady') return snapshot.people.filter(person => person.biography || person.story || person.lifeSummary);
    if (activeDrill === 'migrationBranches') return snapshot.branches.filter(branch => branch.migrationFrom || branch.migrationTo);
    if (activeDrill === 'branchCovered') return snapshot.branches.filter(branch => branchPersonCounts.has(String(branch.id)));
    if (activeDrill.startsWith('gender:')) return snapshot.people.filter(person => genderText(String(person.gender || 'unknown')) === activeDrill.split(':')[1]);
    if (activeDrill.startsWith('status:')) return snapshot.people.filter(person => statusText(String(person.dataStatus || person.status || ''), '未维护') === activeDrill.split(':')[1]);
    if (activeDrill.startsWith('sourceType:')) return snapshot.sources.filter(source => sourceTypeText(String(source.sourceType || source.category || '')) === activeDrill.split(':')[1]);
    if (activeDrill.startsWith('living:')) return snapshot.people.filter(person => livingText(person.isLiving) === activeDrill.split(':')[1]);
    return [];
  }, [activeDrill, snapshot, branchPersonCounts, logTotal]);

  const statCards = [
    { key: 'clans' as DrillKey, title: '宗族', value: snapshot.clans.length },
    { key: 'branches' as DrillKey, title: '支派', value: snapshot.branches.length },
    { key: 'people' as DrillKey, title: '族人', value: snapshot.peopleTotal || snapshot.people.length },
    { key: 'sources' as DrillKey, title: '来源资料', value: snapshot.sources.length },
    { key: 'pendingReviews' as DrillKey, title: '待审核', value: snapshot.pendingReviews.length },
    { key: 'logs' as DrillKey, title: '操作日志', value: logTotal }
  ];
  function openDrill(key: DrillKey) { setActiveDrill(key); setDrillOpen(true); }

  return <div className="statistics-home-page"><Card loading={loading} title="族谱数据首页" extra={<Space wrap><Select style={{ width: 260 }} value={selectedClanId} onChange={value => void switchClan(value)} options={[{ value: '', label: '请选择宗族' }, ...snapshot.clans.map(clan => ({ value: String(clan.id), label: clanName(clan) }))]} /><Button onClick={() => void loadStats()}>刷新</Button></Space>}><Typography.Paragraph type="secondary">首页统计数据来自服务层聚合接口调用；页面只展示宗族名称、支派名称、人物姓名和来源标题等业务信息。</Typography.Paragraph><Space wrap size="middle">{statCards.map(item => <Card key={item.key} hoverable onClick={() => openDrill(item.key)}><Statistic title={item.title} value={item.value} /></Card>)}</Space></Card><div className="page-grid two" style={{ marginTop: 16 }}><MiniBarChart title="性别分布" items={genderItems} activeKey={activeDrill} onSelect={openDrill} /><MiniBarChart title="档案状态" items={statusItems} activeKey={activeDrill} onSelect={openDrill} /><MiniBarChart title="来源类型" items={sourceTypeItems} activeKey={activeDrill} onSelect={openDrill} /><MiniBarChart title="在世状态" items={livingItems} activeKey={activeDrill} onSelect={openDrill} /></div><Card title="资料完整度" style={{ marginTop: 16 }}><Space wrap><Button onClick={() => openDrill('generationReady')}>字辈/代次已维护：{generationReady}</Button><Button onClick={() => openDrill('vitalReady')}>生卒信息已维护：{vitalReady}</Button><Button onClick={() => openDrill('biographyReady')}>传记已维护：{biographyReady}</Button><Button onClick={() => openDrill('migrationBranches')}>迁徙支派：{migrationBranches}</Button><Button onClick={() => openDrill('branchCovered')}>已有族人的支派：{branchCovered}</Button></Space></Card><Drawer title="明细下钻" width={720} open={drillOpen} onClose={() => setDrillOpen(false)}><Table size="small" bordered rowKey={(row: any, index) => String(row.id || row.name || row.title || index)} dataSource={drillRows} pagination={{ pageSize: 10 }} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无明细" /> }} columns={[{ key: 'name', title: '名称', render: (_value, row: any) => row.clanName ? clanName(row) : row.branchName ? branchName(row) : row.sourceName || row.title ? sourceName(row) : row.name || row.personName ? personName(row) : display(row.label, '业务对象') }, { key: 'category', title: '分类', render: (_value, row: any) => row.targetType ? reviewTargetText(row.targetType) : row.sourceType ? sourceTypeText(row.sourceType) : row.dataStatus || row.status ? <Tag color={statusColor(row.dataStatus || row.status)}>{statusText(row.dataStatus || row.status)}</Tag> : '-' }, { key: 'summary', title: '摘要', render: (_value, row: any) => row.branchName ? `族人 ${branchPersonCounts.get(String(row.id)) || 0} 位` : row.submitterName ? `提交人：${row.submitterName}` : row.value !== undefined ? row.value : display(row.description || row.summary || row.createdAt, '-') }]} /></Drawer></div>;
}
