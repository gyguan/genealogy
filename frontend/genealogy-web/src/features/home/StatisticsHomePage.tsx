import { useEffect, useMemo, useState } from 'react';
import { Modal } from 'antd';
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

type CultureCard = {
  title: string;
  value: string;
  desc: string;
  tag: string;
};

type MigrationItem = {
  branchName: string;
  from: string;
  to: string;
  desc: string;
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

function firstNonEmpty(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
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
  const [drillOpen, setDrillOpen] = useState(false);

  async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn();
    } catch {
      return fallback;
    }
  }

  async function loadStats(clanIdOverride?: string) {
    setLoading(true);
    try {
      const clans = toRecordList(await safe(() => apiClient.get('/clans'), []));
      const requestedClanId = String(clanIdOverride || workspace.clanId || '').trim();
      const fallbackClanId = String((clans[0] as any)?.id || '');
      const clanId = requestedClanId && clans.some(clan => String(clan.id) === requestedClanId)
        ? requestedClanId
        : fallbackClanId;

      if (clanId && workspace.clanId !== clanId) workspace.setClanId(clanId);

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

  async function switchClan(nextClanId: string) {
    const clanId = String(nextClanId || '').trim();
    if (!clanId || clanId === workspace.clanId) return;
    workspace.patch({
      clanId,
      branchId: '',
      personId: '',
      relationshipId: '',
      sourceId: '',
      attachmentId: '',
      reviewTaskId: ''
    });
    setActiveDrill('people');
    setDrillOpen(false);
    await loadStats(clanId);
  }

  useEffect(() => {
    void loadStats();
  }, []);

  const currentClan = useMemo(() => {
    const targetId = String(workspace.clanId || '');
    return snapshot.clans.find(row => String(row.id) === targetId) || snapshot.clans[0] || null;
  }, [snapshot.clans, workspace.clanId]);

  const selectedClanId = String(currentClan?.id || workspace.clanId || '');

  const ancestorName = useMemo(() => {
    const ancestorId = currentClan?.ancestorPersonId;
    if (!ancestorId) return '';
    return display(snapshot.people.find(person => String(person.id) === String(ancestorId))?.name, `人物#${ancestorId}`);
  }, [currentClan, snapshot.people]);

  const branchPersonCounts = useMemo(() => {
    const map = new Map<string, number>();
    snapshot.people.forEach(person => {
      const branchId = String(person.branchId || '');
      if (!branchId) return;
      map.set(branchId, (map.get(branchId) || 0) + 1);
    });
    return map;
  }, [snapshot.people]);

  const migrationItems = useMemo<MigrationItem[]>(() => {
    const fromBranches = snapshot.branches
      .filter(branch => branch.migrationFrom || branch.migrationTo)
      .slice(0, 5)
      .map(branch => ({
        branchName: display(branch.branchName, `支派#${branch.id}`),
        from: display(branch.migrationFrom || currentClan?.originPlace, '发源地待维护'),
        to: display(branch.migrationTo, '迁徙地待维护'),
        desc: display(branch.description, '暂无迁徙说明，可在支派详情中补充。')
      }));
    if (fromBranches.length) return fromBranches;
    if (currentClan?.originPlace) {
      return [{ branchName: '宗族发源', from: display(currentClan.originPlace), to: '各支派', desc: '当前尚未维护支派迁徙路线，先以宗族祖籍/发源地作为迁徙线索。' }];
    }
    return [{ branchName: '迁徙线索', from: '待维护', to: '待维护', desc: '可在支派管理中维护迁徙来源地、迁徙目的地和支派简介。' }];
  }, [snapshot.branches, currentClan]);

  const familyInstruction = firstNonEmpty(
    currentClan?.familyInstruction,
    currentClan?.familyInstructions,
    currentClan?.familyMotto,
    currentClan?.clanMotto,
    currentClan?.motto,
    currentClan?.instruction,
    currentClan?.familyRules
  );

  const cultureCards = useMemo<CultureCard[]>(() => [
    {
      title: '堂号',
      value: display(currentClan?.hallName, '待维护'),
      desc: currentClan?.hallName ? '堂号用于承载宗族认同、祠堂记忆和谱牒封面识别。' : '建议在宗族基础信息中补充堂号，提升族谱封面与成册质感。',
      tag: '宗族标识'
    },
    {
      title: '郡望',
      value: display(currentClan?.commandery, '待维护'),
      desc: currentClan?.commandery ? '郡望可帮助说明姓氏源流、望族地域和历史文化脉络。' : '建议补充郡望信息，用于首页文化卡片和成册卷首。',
      tag: '姓氏源流'
    },
    {
      title: '家训家风',
      value: familyInstruction || '待维护',
      desc: familyInstruction ? '家训已进入首页展示，可作为宗族文化、成册导出和后续分享页核心内容。' : '当前后端暂无专用家训字段时，可先在宗族简介或文化资料中维护。',
      tag: '文化传承'
    },
    {
      title: '祖籍/发源地',
      value: display(currentClan?.originPlace, '待维护'),
      desc: currentClan?.originPlace ? '祖籍信息将与支派迁徙路线联动，形成迁徙脉络展示。' : '建议维护祖籍或发源地，作为迁徙地图和支派故事的起点。',
      tag: '迁徙起点'
    }
  ], [currentClan, familyInstruction]);

  const branchStoryItems = useMemo(() => snapshot.branches
    .slice()
    .sort((a, b) => (branchPersonCounts.get(String(b.id)) || 0) - (branchPersonCounts.get(String(a.id)) || 0))
    .slice(0, 6)
    .map(branch => ({
      id: branch.id,
      name: display(branch.branchName, `支派#${branch.id}`),
      count: branchPersonCounts.get(String(branch.id)) || 0,
      path: display(branch.branchPath, '-'),
      migration: branch.migrationFrom || branch.migrationTo ? `${display(branch.migrationFrom, '未知')} → ${display(branch.migrationTo, '未知')}` : '迁徙待维护',
      desc: display(branch.description, '暂无支派简介')
    })), [snapshot.branches, branchPersonCounts]);

  const sourceHighlights = useMemo(() => snapshot.sources.slice(0, 5).map(source => ({
    id: source.id,
    title: display(source.sourceName || source.title || source.name, `资料#${source.id || '-'}`),
    type: sourceTypeText(source.sourceType || source.category),
    status: display(source.verificationStatus || source.status, '待复核')
  })), [snapshot.sources]);

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
    if (activeDrill === 'clans') return [{ key: 'id', title: 'ID' }, { key: 'clanName', title: '宗族名称' }, { key: 'surname', title: '姓氏' }, { key: 'hallName', title: '堂号' }, { key: 'commandery', title: '郡望' }, { key: 'originPlace', title: '祖籍/发源地' }];
    if (activeDrill === 'branches') return [{ key: 'id', title: 'ID' }, { key: 'branchName', title: '支派名称' }, { key: 'parentId', title: '父支派' }, { key: 'migrationFrom', title: '迁徙来源' }, { key: 'migrationTo', title: '迁徙去向' }, { key: 'status', title: '状态' }];
    if (activeDrill === 'sources' || activeDrill.startsWith('sourceType:')) return [{ key: 'id', title: 'ID' }, { key: 'sourceName', title: '资料名称' }, { key: 'sourceType', title: '类型', render: (row: any) => sourceTypeText(row.sourceType || row.category) }, { key: 'verificationStatus', title: '状态' }];
    if (activeDrill === 'pendingReviews') return [{ key: 'id', title: '任务ID' }, { key: 'targetType', title: '对象类型' }, { key: 'targetId', title: '对象ID' }, { key: 'status', title: '状态' }];
    if (activeDrill === 'logs') return [{ key: 'totalCount', title: '总数', render: (row: any) => display(row.totalCount ?? row.total) }, { key: 'todayCount', title: '今日', render: (row: any) => display(row.todayCount) }, { key: 'successCount', title: '成功', render: (row: any) => display(row.successCount) }, { key: 'failureCount', title: '失败', render: (row: any) => display(row.failureCount) }];
    return [{ key: 'id', title: 'ID' }, { key: 'name', title: '姓名', render: (row: any) => display(row.name || row.personName) }, { key: 'gender', title: '性别', render: (row: any) => genderText(row.gender || row.sex) }, { key: 'generationNo', title: '代次', render: (row: any) => row.generationNo ? `${row.generationNo}世` : '-' }, { key: 'generationWord', title: '字辈' }, { key: 'isLiving', title: '在世状态', render: (row: any) => livingText(row.isLiving) }, { key: 'dataStatus', title: '状态', render: (row: any) => statusText(row.dataStatus || row.status || row.reviewStatus) }];
  }

  function openDrill(key: DrillKey) {
    setActiveDrill(key);
    setDrillOpen(true);
  }

  const rows = detailRows();

  return (
    <div className="stats-only-home stats-dashboard-home">
      <section className="home-clan-overview home-clan-overview--culture">
        <div className="home-clan-main">
          <span>族谱概览</span>
          <div className="home-clan-switcher">
            <label htmlFor="home-clan-switch">当前宗族</label>
            <select id="home-clan-switch" value={selectedClanId} disabled={loading || !snapshot.clans.length} onChange={event => void switchClan(event.target.value)}>
              <option value="">请选择宗族</option>
              {snapshot.clans.map(clan => (
                <option key={clan.id} value={String(clan.id)}>
                  {display(clan.clanName, `宗族#${clan.id}`)}
                </option>
              ))}
            </select>
            <small>{snapshot.clans.length > 1 ? `当前账号可切换 ${snapshot.clans.length} 个宗族空间` : '当前账号仅有一个宗族空间'}</small>
          </div>
          <h2>{display(currentClan?.clanName, '请选择或创建宗族')}</h2>
          <p>{display(currentClan?.description, `${display(currentClan?.surname, '本')}氏族谱空间，用于统一沉淀宗族成员、支派世系、字辈规则、来源证据与审核记录。`)}</p>
          <div className="home-clan-storyline">
            <strong>{display(currentClan?.hallName, '堂号待维护')}</strong>
            <i />
            <strong>{display(currentClan?.commandery, '郡望待维护')}</strong>
            <i />
            <strong>{display(currentClan?.originPlace, '祖籍待维护')}</strong>
          </div>
        </div>
        <div className="home-clan-facts">
          <div><span>姓氏</span><strong>{display(currentClan?.surname)}</strong></div>
          <div><span>堂号</span><strong>{display(currentClan?.hallName)}</strong></div>
          <div><span>郡望</span><strong>{display(currentClan?.commandery)}</strong></div>
          <div><span>祖籍/发源地</span><strong>{display(currentClan?.originPlace)}</strong></div>
          <div><span>始祖/中心祖</span><strong>{ancestorName || display(currentClan?.ancestorPersonId)}</strong></div>
          <div><span>宗族编码</span><strong>{display(currentClan?.clanCode)}</strong></div>
        </div>
      </section>

      <section className="home-culture-grid">
        <div className="home-culture-card home-culture-card--wide">
          <div className="home-card-title"><span>Clan Culture</span><h3>宗族文化名片</h3></div>
          <div className="home-culture-card-list">
            {cultureCards.map(card => (
              <article key={card.title}>
                <em>{card.tag}</em>
                <strong>{card.title}</strong>
                <b>{card.value}</b>
                <p>{card.desc}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="home-culture-card home-motto-card">
          <div className="home-card-title"><span>Family Motto</span><h3>家训家风</h3></div>
          <blockquote>{familyInstruction || '忠厚传家，诗书继世。'}</blockquote>
          <p>{familyInstruction ? '已识别到家训内容，可继续用于文化页、成册导出和族谱分享。' : '暂无专用家训字段时，首页先展示占位家风文案；建议后续在宗族文化资料中维护正式家训。'}</p>
        </div>

        <div className="home-culture-card home-migration-card">
          <div className="home-card-title"><span>Migration</span><h3>迁徙脉络</h3></div>
          <div className="home-migration-timeline">
            {migrationItems.map((item, index) => (
              <div key={`${item.branchName}-${index}`}>
                <span>{index + 1}</span>
                <strong>{item.branchName}</strong>
                <b>{item.from} → {item.to}</b>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="home-culture-card home-branch-story-card">
          <div className="home-card-title"><span>Branches</span><h3>支派故事</h3></div>
          <div className="home-branch-story-list">
            {branchStoryItems.length ? branchStoryItems.map(branch => (
              <article key={branch.id}>
                <div><strong>{branch.name}</strong><span>{branch.count} 人</span></div>
                <em>{branch.migration}</em>
                <p>{branch.desc}</p>
              </article>
            )) : <div className="home-empty-chart">暂无支派故事，请先创建支派。</div>}
          </div>
        </div>

        <div className="home-culture-card home-source-story-card">
          <div className="home-card-title"><span>Sources</span><h3>文化资料</h3></div>
          <div className="home-source-story-list">
            {sourceHighlights.length ? sourceHighlights.map(source => (
              <article key={`${source.id}-${source.title}`}>
                <strong>{source.title}</strong>
                <span>{source.type}</span>
                <em>{source.status}</em>
              </article>
            )) : <div className="home-empty-chart">暂无文化资料，可在来源资料库中补充族谱原文、地方志、照片和口述记录。</div>}
          </div>
        </div>
      </section>

      <section className="home-stat-grid">
        {cards.map(card => (
          <button key={`${card.label}-${card.key}`} className={activeDrill === card.key ? 'home-stat-card active' : 'home-stat-card'} onClick={() => openDrill(card.key)}>
            <span>{card.label}</span>
            <strong>{loading ? '...' : card.value}</strong>
            <em>{card.hint}</em>
          </button>
        ))}
      </section>

      <section className="home-chart-grid">
        <MiniBarChart title="核心数据分布" items={coreItems} activeKey={activeDrill} onSelect={openDrill} />
        <MiniBarChart title="人物状态分布" items={statusItems} activeKey={activeDrill} onSelect={openDrill} />
        <MiniBarChart title="代次分布 TOP 8" items={generationItems} activeKey={activeDrill} onSelect={openDrill} />
        <MiniBarChart title="资料类型分布" items={sourceTypeItems} activeKey={activeDrill} onSelect={openDrill} />
      </section>

      <Modal
        title={detailTitle()}
        open={drillOpen}
        onCancel={() => setDrillOpen(false)}
        footer={null}
        width={980}
      >
        <div className="home-drill-modal-body">
          <div className="home-drill-summary"><span>共 {rows.length} 条记录</span></div>
          <DataTable data={rows} columns={detailColumns()} empty="暂无下钻数据" />
        </div>
      </Modal>
    </div>
  );
}
