import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { DataTable, toRecordList } from '../../shared/ui/DataTable';

type DrillKey = 'clans' | 'branches' | 'people' | 'sources' | 'pendingReviews' | 'logs' | `gender:${string}` | `status:${string}` | `generation:${string}` | `sourceType:${string}` | `living:${string}`;

type HomeSnapshot = {
  clans: any[];
  branches: any[];
  people: any[];
  sources: any[];
  pendingReviews: any[];
  logStats: any;
  peopleTotal: number;
};

type ChartItem = {
  key: DrillKey;
  label: string;
  value: number;
};

const emptySnapshot: HomeSnapshot = {
  clans: [],
  branches: [],
  people: [],
  sources: [],
  pendingReviews: [],
  logStats: null,
  peopleTotal: 0
};

function countBy(rows: any[], getter: (row: any) => string | number | undefined | null): ChartItem[] {
  const map = new Map<string, number>();
  rows.forEach(row => {
    const raw = getter(row);
    const key = String(raw ?? '').trim() || '未维护';
    map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries()).map(([label, value]) => ({ key: label as DrillKey, label, value })).sort((a, b) => b.value - a.value);
}

function genderText(value: string) {
  const dict: Record<string, string> = { male: '男', female: '女', unknown: '未知' };
  return dict[value] || value || '未维护';
}

function statusText(value: string) {
  const dict: Record<string, string> = { draft: '草稿', pending_review: '待审核', official: '正式', rejected: '已驳回', archived: '已归档' };
  return dict[value] || value || '未维护';
}

function livingText(value: unknown) {
  if (value === true) return '在世';
  if (value === false) return '已故';
  return '未维护';
}

function sourceTypeText(value: string) {
  const dict: Record<string, string> = { genealogy_book: '族谱原文', oral_record: '口述记录', tombstone: '墓碑墓志', photo: '照片', local_chronicle: '地方志', other: '其他' };
  return dict[value] || value || '未维护';
}

function display(value: unknown, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function maxValue(items: ChartItem[]) {
  return Math.max(1, ...items.map(item => item.value));
}

function MiniBarChart({ title, items, activeKey, onSelect }: { title: string; items: ChartItem[]; activeKey: DrillKey; onSelect: (key: DrillKey) => void }) {
  const max = maxValue(items);
  return (
    <section className="home-chart-card">
      <h3>{title}</h3>
      <div className="home-bar-list">
        {items.length ? items.map(item => (
          <button key={item.key} className={activeKey === item.key ? 'active' : ''} onClick={() => onSelect(item.key)}>
            <span>{item.label}</span>
            <i><em style={{ width: `${Math.max(6, Math.round(item.value / max * 100))}%` }} /></i>
            <strong>{item.value}</strong>
          </button>
        )) : <div className="home-empty-chart">暂无数据</div>}
      </div>
    </section>
  );
}

export function StatisticsHomePage() {
  const workspace = useWorkspace();
  const [snapshot, setSnapshot] = useState<HomeSnapshot>(emptySnapshot);
  const [loading, setLoading] = useState(false);
  const [activeDrill, setActiveDrill] = useState<DrillKey>('people');

  async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn();
    } catch {
      return fallback;
    }
  }

  async function loadStats() {
    setLoading(true);
    try {
      const clans = toRecordList(await safe(() => apiClient.get('/clans'), []));
      const clanId = workspace.clanId || String((clans[0] as any)?.id || '');
      if (clanId && !workspace.clanId) workspace.setClanId(clanId);

      if (!clanId) {
        setSnapshot({ ...emptySnapshot, clans });
        return;
      }

      const [branchRes, personRes, sourceRes, reviewRes, logStats] = await Promise.all([
        safe(() => apiClient.get(`/clans/${clanId}/branches`), []),
        safe(() => apiClient.get(`/persons/search?clanId=${clanId}&pageNo=1&pageSize=200`), { total: 0, records: [] }),
        safe(() => apiClient.get(`/clans/${clanId}/sources`), []),
        safe(() => apiClient.get(`/clans/${clanId}/review-tasks/pending`), []),
        safe(() => apiClient.get(`/logs/operations/stats?clanId=${clanId}`), null)
      ]);

      const people = toRecordList(personRes);
      setSnapshot({
        clans,
        branches: toRecordList(branchRes),
        people,
        sources: toRecordList(sourceRes),
        pendingReviews: toRecordList(reviewRes),
        logStats,
        peopleTotal: (personRes as any)?.total ?? people.length
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStats();
  }, []);

  const genderItems = useMemo(() => countBy(snapshot.people, row => genderText(row.gender || row.sex)).map(item => ({ ...item, key: `gender:${item.label}` as DrillKey })), [snapshot.people]);
  const statusItems = useMemo(() => countBy(snapshot.people, row => statusText(row.dataStatus || row.status || row.reviewStatus)).map(item => ({ ...item, key: `status:${item.label}` as DrillKey })), [snapshot.people]);
  const generationItems = useMemo(() => countBy(snapshot.people, row => row.generationNo ? `${row.generationNo}世` : '未维护').slice(0, 8).map(item => ({ ...item, key: `generation:${item.label}` as DrillKey })), [snapshot.people]);
  const sourceTypeItems = useMemo(() => countBy(snapshot.sources, row => sourceTypeText(row.sourceType || row.category)).map(item => ({ ...item, key: `sourceType:${item.label}` as DrillKey })), [snapshot.sources]);

  const coreItems: ChartItem[] = [
    { key: 'people', label: '族人', value: snapshot.peopleTotal },
    { key: 'branches', label: '支派', value: snapshot.branches.length },
    { key: 'sources', label: '资料', value: snapshot.sources.length },
    { key: 'pendingReviews', label: '待审核', value: snapshot.pendingReviews.length },
    { key: 'clans', label: '宗族', value: snapshot.clans.length }
  ];

  const officialCount = snapshot.people.filter(row => statusText(row.dataStatus || row.status || row.reviewStatus) === '正式').length;
  const livingCount = snapshot.people.filter(row => livingText(row.isLiving) === '在世').length;
  const deceasedCount = snapshot.people.filter(row => livingText(row.isLiving) === '已故').length;
  const logCount = snapshot.logStats?.totalCount ?? snapshot.logStats?.total ?? '-';

  const cards: { key: DrillKey; label: string; value: number | string; hint: string }[] = [
    { key: 'people', label: '族人总数', value: snapshot.peopleTotal, hint: '点击查看人物明细' },
    { key: 'branches', label: '支派数量', value: snapshot.branches.length, hint: '点击查看支派' },
    { key: 'sources', label: '资料来源', value: snapshot.sources.length, hint: '点击查看资料' },
    { key: 'pendingReviews', label: '待审核', value: snapshot.pendingReviews.length, hint: '点击查看任务' },
    { key: 'clans', label: '宗族空间', value: snapshot.clans.length, hint: '点击查看宗族' },
    { key: 'status:正式', label: '正式入谱', value: officialCount, hint: '点击查看正式人物' },
    { key: 'gender:男', label: '男性族人', value: snapshot.people.filter(row => genderText(row.gender || row.sex) === '男').length, hint: '点击按性别下钻' },
    { key: 'gender:女', label: '女性族人', value: snapshot.people.filter(row => genderText(row.gender || row.sex) === '女').length, hint: '点击按性别下钻' },
    { key: 'living:在世', label: '在世人员', value: livingCount, hint: '点击查看在世人员' },
    { key: 'living:已故', label: '已故人员', value: deceasedCount, hint: '点击查看已故人员' },
    { key: 'logs', label: '操作日志', value: logCount, hint: '点击查看日志统计' }
  ];

  function detailRows() {
    if (activeDrill === 'clans') return snapshot.clans;
    if (activeDrill === 'branches') return snapshot.branches;
    if (activeDrill === 'people') return snapshot.people;
    if (activeDrill === 'sources') return snapshot.sources;
    if (activeDrill === 'pendingReviews') return snapshot.pendingReviews;
    if (activeDrill === 'logs') return snapshot.logStats ? [snapshot.logStats] : [];
    if (activeDrill.startsWith('gender:')) {
      const target = activeDrill.replace('gender:', '');
      return snapshot.people.filter(row => genderText(row.gender || row.sex) === target);
    }
    if (activeDrill.startsWith('status:')) {
      const target = activeDrill.replace('status:', '');
      return snapshot.people.filter(row => statusText(row.dataStatus || row.status || row.reviewStatus) === target);
    }
    if (activeDrill.startsWith('generation:')) {
      const target = activeDrill.replace('generation:', '');
      return snapshot.people.filter(row => (row.generationNo ? `${row.generationNo}世` : '未维护') === target);
    }
    if (activeDrill.startsWith('sourceType:')) {
      const target = activeDrill.replace('sourceType:', '');
      return snapshot.sources.filter(row => sourceTypeText(row.sourceType || row.category) === target);
    }
    if (activeDrill.startsWith('living:')) {
      const target = activeDrill.replace('living:', '');
      return snapshot.people.filter(row => livingText(row.isLiving) === target);
    }
    return [];
  }

  function detailTitle() {
    if (activeDrill === 'clans') return '宗族明细';
    if (activeDrill === 'branches') return '支派明细';
    if (activeDrill === 'people') return '人物明细';
    if (activeDrill === 'sources') return '资料明细';
    if (activeDrill === 'pendingReviews') return '待审核明细';
    if (activeDrill === 'logs') return '日志统计';
    return activeDrill.replace('gender:', '性别：').replace('status:', '状态：').replace('generation:', '代次：').replace('sourceType:', '资料类型：').replace('living:', '在世状态：');
  }

  function detailColumns() {
    if (activeDrill === 'clans') return [{ key: 'id', title: 'ID' }, { key: 'clanName', title: '宗族名称' }, { key: 'surname', title: '姓氏' }, { key: 'hallName', title: '堂号' }];
    if (activeDrill === 'branches') return [{ key: 'id', title: 'ID' }, { key: 'branchName', title: '支派名称' }, { key: 'parentId', title: '父支派' }, { key: 'status', title: '状态' }];
    if (activeDrill === 'sources' || activeDrill.startsWith('sourceType:')) return [{ key: 'id', title: 'ID' }, { key: 'sourceName', title: '资料名称' }, { key: 'sourceType', title: '类型', render: (row: any) => sourceTypeText(row.sourceType || row.category) }, { key: 'verificationStatus', title: '状态' }];
    if (activeDrill === 'pendingReviews') return [{ key: 'id', title: '任务ID' }, { key: 'targetType', title: '对象类型' }, { key: 'targetId', title: '对象ID' }, { key: 'status', title: '状态' }];
    if (activeDrill === 'logs') return [{ key: 'totalCount', title: '总数', render: (row: any) => display(row.totalCount ?? row.total) }, { key: 'todayCount', title: '今日', render: (row: any) => display(row.todayCount) }, { key: 'successCount', title: '成功', render: (row: any) => display(row.successCount) }, { key: 'failureCount', title: '失败', render: (row: any) => display(row.failureCount) }];
    return [{ key: 'id', title: 'ID' }, { key: 'name', title: '姓名', render: (row: any) => display(row.name || row.personName) }, { key: 'gender', title: '性别', render: (row: any) => genderText(row.gender || row.sex) }, { key: 'generationNo', title: '代次', render: (row: any) => row.generationNo ? `${row.generationNo}世` : '-' }, { key: 'generationWord', title: '字辈' }, { key: 'isLiving', title: '在世状态', render: (row: any) => livingText(row.isLiving) }, { key: 'dataStatus', title: '状态', render: (row: any) => statusText(row.dataStatus || row.status || row.reviewStatus) }];
  }

  return (
    <div className="stats-only-home stats-dashboard-home">
      <section className="home-stat-grid">
        {cards.map(card => (
          <button key={`${card.label}-${card.key}`} className={activeDrill === card.key ? 'home-stat-card active' : 'home-stat-card'} onClick={() => setActiveDrill(card.key)}>
            <span>{card.label}</span>
            <strong>{loading ? '...' : card.value}</strong>
            <em>{card.hint}</em>
          </button>
        ))}
        <button className="home-stat-card home-stat-card--refresh" onClick={() => void loadStats()}>
          <span>刷新</span>
          <strong>{loading ? '...' : '↻'}</strong>
          <em>重新加载统计</em>
        </button>
      </section>

      <section className="home-chart-grid">
        <MiniBarChart title="核心数据分布" items={coreItems} activeKey={activeDrill} onSelect={setActiveDrill} />
        <MiniBarChart title="人物状态分布" items={statusItems} activeKey={activeDrill} onSelect={setActiveDrill} />
        <MiniBarChart title="代次分布 TOP 8" items={generationItems} activeKey={activeDrill} onSelect={setActiveDrill} />
        <MiniBarChart title="资料类型分布" items={sourceTypeItems} activeKey={activeDrill} onSelect={setActiveDrill} />
      </section>

      <section className="home-drill-panel">
        <div className="home-drill-title">
          <h3>{detailTitle()}</h3>
          <span>{detailRows().length} 条</span>
        </div>
        <DataTable data={detailRows()} columns={detailColumns()} empty="暂无下钻数据" />
      </section>
    </div>
  );
}
