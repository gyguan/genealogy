import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Drawer, Empty, Select, Space, Statistic, Table, Tag, Typography } from 'antd';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { toRecordList } from '../../shared/ui/DataTable';

type DrillKey = 'clans' | 'branches' | 'people' | 'sources' | 'pendingReviews' | 'logs' | 'generationReady' | 'vitalReady' | 'biographyReady' | 'migrationBranches' | 'branchCovered' | `gender:${string}` | `status:${string}` | `generation:${string}` | `sourceType:${string}` | `living:${string}`;

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
  const dict: Record<string, string> = {
    draft: '草稿',
    pending: '待审核',
    pending_review: '待审核',
    official: '正式',
    active: '正式',
    approved: '已通过',
    rejected: '已驳回',
    archived: '已归档'
  };
  return dict[value] || value || '未维护';
}

function statusColor(value: string) {
  const status = String(value || '').trim().toLowerCase();
  if (['official', 'active', 'approved'].includes(status)) return 'success';
  if (['pending', 'pending_review'].includes(status)) return 'processing';
  if (status === 'rejected') return 'error';
  return 'default';
}

function livingText(value: unknown) {
  if (value === true) return '在世';
  if (value === false) return '已故';
  return '未维护';
}

function sourceTypeText(value: string) {
  const dict: Record<string, string> = {
    genealogy_book: '族谱原文',
    oral_record: '口述记录',
    tombstone: '墓碑墓志',
    photo: '照片',
    local_chronicle: '地方志',
    other: '其他'
  };
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

function hasText(value: unknown) {
  return Boolean(String(value ?? '').trim());
}

function maxValue(items: ChartItem[]) {
  return Math.max(1, ...items.map(item => item.value));
}

function branchName(row: any) {
  return display(row.branchName || row.name, '未命名支派');
}

function clanName(row: any) {
  return display(row.clanName || row.name, '未命名宗族');
}

function personName(row: any) {
  return display(row.name || row.personName, '未命名人物');
}

function sourceName(row: any) {
  return display(row.sourceName || row.title || row.name, '未命名资料');
}

function reviewTargetTypeText(value: string) {
  const dict: Record<string, string> = {
    person: '人物',
    relationship: '关系',
    source: '来源',
    branch: '支派',
    generation_scheme: '字辈方案',
    clan: '宗族'
  };
  return dict[value] || value || '对象待维护';
}

function parentBranchName(row: any, branches: any[]) {
  const parent = branches.find(branch => String(branch.id) === String(row.parentId || ''));
  return parent ? branchName(parent) : '父支派待维护';
}

function MiniBarChart({ title, items, activeKey, onSelect }: { title: string; items: ChartItem[]; activeKey: DrillKey; onSelect: (key: DrillKey) => void }) {
  const max = maxValue(items);
  return (
    <Card title={title} className="home-chart-card" size="small">
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        {items.length ? items.map(item => (
          <Button key={item.key} block type={activeKey === item.key ? 'primary' : 'default'} onClick={() => onSelect(item.key)}>
            <span style={{ display: 'inline-flex', justifyContent: 'space-between', width: '100%' }}>
              <span>{item.label}</span>
              <span>{item.value} · {Math.round(item.value / max * 100)}%</span>
            </span>
          </Button>
        )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />}
      </Space>
    </Card>
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
    return display(snapshot.people.find(person => String(person.id) === String(ancestorId))?.name, '始祖待维护');
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

  const migrationItems = useMemo<MigrationItem[]>(() => snapshot.branches
    .filter(branch => branch.migrationFrom || branch.migrationTo)
    .slice(0, 5)
    .map(branch => ({
      branchName: branchName(branch),
      from: display(branch.migrationFrom || currentClan?.originPlace, '发源地待维护'),
      to: display(branch.migrationTo, '迁徙地待维护'),
      desc: display(branch.description, '暂无迁徙说明，可在支派详情中补充。')
    })), [snapshot.branches, currentClan]);

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
      desc: familyInstruction ? '家训已进入首页展示，可作为宗族文化、成册导出和后续分享页核心内容。' : '后端暂未返回家训内容时，首页仅展示待维护，不前端补造家训。',
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
      name: branchName(branch),
      count: branchPersonCounts.get(String(branch.id)) || 0,
      migration: branch.migrationFrom || branch.migrationTo ? `${display(branch.migrationFrom, '未知')} → ${display(branch.migrationTo, '未知')}` : '迁徙待维护',
      desc: display(branch.description, '暂无支派简介')
    })), [snapshot.branches, branchPersonCounts]);

  const sourceHighlights = useMemo(() => snapshot.sources.slice(0, 5).map(source => ({
    id: source.id,
    title: sourceName(source),
    type: sourceTypeText(source.sourceType || source.category),
    status: statusText(source.verificationStatus || source.status || '')
  })), [snapshot.sources]);

  const generationItems = useMemo(() => countBy(snapshot.people, row => row.generationNo ? `${row.generationNo}世` : '未维护').slice(0, 8).map(item => ({ ...item, key: `generation:${item.label}` as DrillKey })), [snapshot.people]);

  const livingCount = snapshot.people.filter(row => livingText(row.isLiving) === '在世').length;
  const deceasedCount = snapshot.people.filter(row => livingText(row.isLiving) === '已故').length;
  const generationReadyCount = snapshot.people.filter(row => row.generationNo || row.generationWord).length;
  const vitalReadyCount = snapshot.people.filter(row => row.birthDate || row.deathDate).length;
  const biographyReadyCount = snapshot.people.filter(row => hasText(row.biography) || hasText(row.epitaph) || hasText(row.titleOrHonor)).length;
  const migrationBranchCount = snapshot.branches.filter(row => row.migrationFrom || row.migrationTo).length;
  const coveredBranchCount = snapshot.branches.filter(row => branchPersonCounts.get(String(row.id))).length;

  const cards: { key: DrillKey; label: string; value: number | string; hint: string }[] = [
    { key: 'people', label: '族人总数', value: snapshot.peopleTotal, hint: '查看人物明细' },
    { key: 'branches', label: '支派数量', value: snapshot.branches.length, hint: '查看支派' },
    { key: 'clans', label: '宗族空间', value: snapshot.clans.length, hint: '查看宗族' },
    { key: 'gender:男', label: '男性族人', value: snapshot.people.filter(row => genderText(row.gender || row.sex) === '男').length, hint: '查看男性族人' },
    { key: 'gender:女', label: '女性族人', value: snapshot.people.filter(row => genderText(row.gender || row.sex) === '女').length, hint: '查看女性族人' },
    { key: 'living:在世', label: '在世人员', value: livingCount, hint: '查看在世人员' },
    { key: 'living:已故', label: '已故人员', value: deceasedCount, hint: '查看已故人员' },
    { key: 'generationReady', label: '已维护字辈', value: generationReadyCount, hint: '查看已维护字辈人物' },
    { key: 'vitalReady', label: '已维护生卒', value: vitalReadyCount, hint: '查看有生卒信息人物' },
    { key: 'biographyReady', label: '有传记人物', value: biographyReadyCount, hint: '查看已维护传记人物' },
    { key: 'migrationBranches', label: '有迁徙支派', value: migrationBranchCount, hint: '查看迁徙支派' },
    { key: 'branchCovered', label: '已覆盖支派', value: `${coveredBranchCount}/${snapshot.branches.length}`, hint: '查看已有族人的支派' }
  ];

  function detailRows() {
    if (activeDrill === 'clans') return snapshot.clans;
    if (activeDrill === 'branches') return snapshot.branches;
    if (activeDrill === 'people') return snapshot.people;
    if (activeDrill === 'sources') return snapshot.sources;
    if (activeDrill === 'pendingReviews') return snapshot.pendingReviews;
    if (activeDrill === 'logs') return snapshot.logStats ? [snapshot.logStats] : [];
    if (activeDrill === 'generationReady') return snapshot.people.filter(row => row.generationNo || row.generationWord);
    if (activeDrill === 'vitalReady') return snapshot.people.filter(row => row.birthDate || row.deathDate);
    if (activeDrill === 'biographyReady') return snapshot.people.filter(row => hasText(row.biography) || hasText(row.epitaph) || hasText(row.titleOrHonor));
    if (activeDrill === 'migrationBranches') return snapshot.branches.filter(row => row.migrationFrom || row.migrationTo);
    if (activeDrill === 'branchCovered') return snapshot.branches.filter(row => branchPersonCounts.get(String(row.id)));
    if (activeDrill.startsWith('gender:')) return snapshot.people.filter(row => genderText(row.gender || row.sex) === activeDrill.replace('gender:', ''));
    if (activeDrill.startsWith('status:')) return snapshot.people.filter(row => statusText(row.dataStatus || row.status || row.reviewStatus) === activeDrill.replace('status:', ''));
    if (activeDrill.startsWith('generation:')) return snapshot.people.filter(row => (row.generationNo ? `${row.generationNo}世` : '未维护') === activeDrill.replace('generation:', ''));
    if (activeDrill.startsWith('sourceType:')) return snapshot.sources.filter(row => sourceTypeText(row.sourceType || row.category) === activeDrill.replace('sourceType:', ''));
    if (activeDrill.startsWith('living:')) return snapshot.people.filter(row => livingText(row.isLiving) === activeDrill.replace('living:', ''));
    return [];
  }

  function detailTitle() {
    if (activeDrill === 'clans') return '宗族明细';
    if (activeDrill === 'branches') return '支派明细';
    if (activeDrill === 'people') return '人物明细';
    if (activeDrill === 'sources') return '资料明细';
    if (activeDrill === 'pendingReviews') return '待审核明细';
    if (activeDrill === 'logs') return '日志统计';
    if (activeDrill === 'generationReady') return '已维护字辈人物';
    if (activeDrill === 'vitalReady') return '已维护生卒人物';
    if (activeDrill === 'biographyReady') return '有传记人物';
    if (activeDrill === 'migrationBranches') return '有迁徙信息支派';
    if (activeDrill === 'branchCovered') return '已有族人的支派';
    return activeDrill.replace('gender:', '性别：').replace('status:', '状态：').replace('generation:', '代次：').replace('sourceType:', '资料类型：').replace('living:', '在世状态：');
  }

  function detailColumns() {
    if (activeDrill === 'clans') return [
      { key: 'clanName', title: '宗族名称', render: (_value: unknown, row: any) => clanName(row) },
      { key: 'surname', title: '姓氏', render: (_value: unknown, row: any) => display(row.surname) },
      { key: 'hallName', title: '堂号', render: (_value: unknown, row: any) => display(row.hallName, '待维护') },
      { key: 'commandery', title: '郡望', render: (_value: unknown, row: any) => display(row.commandery, '待维护') },
      { key: 'originPlace', title: '祖籍/发源地', render: (_value: unknown, row: any) => display(row.originPlace, '待维护') }
    ];
    if (activeDrill === 'branches' || activeDrill === 'migrationBranches' || activeDrill === 'branchCovered') return [
      { key: 'branchName', title: '支派名称', render: (_value: unknown, row: any) => branchName(row) },
      { key: 'parentBranch', title: '父支派', render: (_value: unknown, row: any) => parentBranchName(row, snapshot.branches) },
      { key: 'migrationFrom', title: '迁徙来源', render: (_value: unknown, row: any) => display(row.migrationFrom, '待维护') },
      { key: 'migrationTo', title: '迁徙去向', render: (_value: unknown, row: any) => display(row.migrationTo, '待维护') },
      { key: 'status', title: '状态', render: (_value: unknown, row: any) => <Tag color={statusColor(row.status || row.dataStatus)}>{statusText(row.status || row.dataStatus)}</Tag> }
    ];
    if (activeDrill === 'sources' || activeDrill.startsWith('sourceType:')) return [
      { key: 'sourceName', title: '资料名称', render: (_value: unknown, row: any) => sourceName(row) },
      { key: 'sourceType', title: '类型', render: (_value: unknown, row: any) => <Tag>{sourceTypeText(row.sourceType || row.category)}</Tag> },
      { key: 'verificationStatus', title: '状态', render: (_value: unknown, row: any) => <Tag color={statusColor(row.verificationStatus || row.status)}>{statusText(row.verificationStatus || row.status)}</Tag> }
    ];
    if (activeDrill === 'pendingReviews') return [
      { key: 'title', title: '审核事项', render: (_value: unknown, row: any) => display(row.title || row.comment, '审核事项待维护') },
      { key: 'targetType', title: '审核对象', render: (_value: unknown, row: any) => reviewTargetTypeText(row.targetType) },
      { key: 'status', title: '审核状态', render: (_value: unknown, row: any) => <Tag color={statusColor(row.status || row.reviewStatus)}>{statusText(row.status || row.reviewStatus)}</Tag> },
      { key: 'createdAt', title: '提交时间', render: (_value: unknown, row: any) => display(row.createdAt, '待维护') }
    ];
    if (activeDrill === 'logs') return [
      { key: 'totalCount', title: '总数', render: (_value: unknown, row: any) => display(row.totalCount ?? row.total) },
      { key: 'todayCount', title: '今日', render: (_value: unknown, row: any) => display(row.todayCount) },
      { key: 'successCount', title: '成功', render: (_value: unknown, row: any) => display(row.successCount) },
      { key: 'failureCount', title: '失败', render: (_value: unknown, row: any) => display(row.failureCount) }
    ];
    return [
      { key: 'name', title: '姓名', render: (_value: unknown, row: any) => personName(row) },
      { key: 'gender', title: '性别', render: (_value: unknown, row: any) => genderText(row.gender || row.sex) },
      { key: 'generationNo', title: '代次', render: (_value: unknown, row: any) => row.generationNo ? `${row.generationNo}世` : '-' },
      { key: 'generationWord', title: '字辈', render: (_value: unknown, row: any) => display(row.generationWord, '-') },
      { key: 'isLiving', title: '在世状态', render: (_value: unknown, row: any) => livingText(row.isLiving) },
      { key: 'birthDate', title: '出生日期', render: (_value: unknown, row: any) => display(row.birthDate) },
      { key: 'deathDate', title: '逝世日期', render: (_value: unknown, row: any) => display(row.deathDate) }
    ];
  }

  function openDrill(key: DrillKey) {
    setActiveDrill(key);
    setDrillOpen(true);
  }

  const rows = detailRows();

  return (
    <div className="stats-only-home stats-dashboard-home">
      <Card
        title="族谱概览"
        loading={loading}
        extra={(
          <Space wrap>
            <Typography.Text type="secondary">当前宗族</Typography.Text>
            <Select
              style={{ minWidth: 220 }}
              value={selectedClanId}
              disabled={loading || !snapshot.clans.length}
              onChange={value => void switchClan(value)}
              options={[{ value: '', label: '请选择宗族' }, ...snapshot.clans.map(clan => ({ value: String(clan.id), label: clanName(clan) }))]}
            />
          </Space>
        )}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Typography.Title level={3} style={{ marginTop: 0 }}>{clanName(currentClan || {})}</Typography.Title>
            <Typography.Paragraph type="secondary">
              {display(currentClan?.description, `${display(currentClan?.surname, '本')}氏族谱空间，用于统一沉淀宗族成员、支派世系、字辈规则、来源证据与审核记录。`)}
            </Typography.Paragraph>
          </div>
          <Space wrap size="middle">
            <Tag>{display(currentClan?.surname, '姓氏待维护')}</Tag>
            <Tag>{display(currentClan?.hallName, '堂号待维护')}</Tag>
            <Tag>{display(currentClan?.commandery, '郡望待维护')}</Tag>
            <Tag>{display(currentClan?.originPlace, '祖籍待维护')}</Tag>
            <Tag>{ancestorName || '始祖待维护'}</Tag>
          </Space>
        </Space>
      </Card>

      <section className="home-stat-grid" style={{ marginTop: 16 }}>
        {cards.map(card => (
          <Card key={`${card.label}-${card.key}`} hoverable onClick={() => openDrill(card.key)} className={activeDrill === card.key ? 'home-stat-card active' : 'home-stat-card'}>
            <Statistic title={card.label} value={loading ? '-' : card.value} />
            <Typography.Text type="secondary">{card.hint}</Typography.Text>
          </Card>
        ))}
      </section>

      <section className="home-culture-grid" style={{ marginTop: 16 }}>
        <Card title="宗族文化名片" className="home-culture-card--wide">
          <div className="home-culture-card-list">
            {cultureCards.map(card => (
              <Card key={card.title} size="small">
                <Space direction="vertical" size={4}>
                  <Tag>{card.tag}</Tag>
                  <Typography.Text strong>{card.title}</Typography.Text>
                  <Typography.Title level={5} style={{ margin: 0 }}>{card.value}</Typography.Title>
                  <Typography.Text type="secondary">{card.desc}</Typography.Text>
                </Space>
              </Card>
            ))}
          </div>
        </Card>

        <Card title="家训家风">
          <Typography.Paragraph>{familyInstruction || '待维护'}</Typography.Paragraph>
          <Typography.Text type="secondary">{familyInstruction ? '已识别到家训内容，可继续用于文化页、成册导出和族谱分享。' : '后端暂未返回家训内容，首页不前端补造家训。'}</Typography.Text>
        </Card>

        <Card title="迁徙脉络">
          {migrationItems.length ? (
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {migrationItems.map((item, index) => (
                <Card key={`${item.branchName}-${index}`} size="small">
                  <Typography.Text strong>{item.branchName}</Typography.Text>
                  <br />
                  <Typography.Text>{item.from} → {item.to}</Typography.Text>
                  <br />
                  <Typography.Text type="secondary">{item.desc}</Typography.Text>
                </Card>
              ))}
            </Space>
          ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无迁徙脉络，请在支派管理中维护迁徙信息。" />}
        </Card>

        <Card title="支派故事">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            {branchStoryItems.length ? branchStoryItems.map(branch => (
              <Card key={branch.id} size="small">
                <Space direction="vertical" size={4}>
                  <Space><Typography.Text strong>{branch.name}</Typography.Text><Tag>{branch.count} 人</Tag></Space>
                  <Typography.Text>{branch.migration}</Typography.Text>
                  <Typography.Text type="secondary">{branch.desc}</Typography.Text>
                </Space>
              </Card>
            )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无支派故事，请先创建支派。" />}
          </Space>
        </Card>

        <Card title="文化资料">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            {sourceHighlights.length ? sourceHighlights.map(source => (
              <Card key={`${source.id}-${source.title}`} size="small">
                <Space direction="vertical" size={4}>
                  <Typography.Text strong>{source.title}</Typography.Text>
                  <Space><Tag>{source.type}</Tag><Tag>{source.status}</Tag></Space>
                </Space>
              </Card>
            )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无文化资料，可在来源资料库中补充族谱原文、地方志、照片和口述记录。" />}
          </Space>
        </Card>
      </section>

      <section className="home-chart-grid home-chart-grid--business" style={{ marginTop: 16 }}>
        <MiniBarChart title="代次分布 TOP 8" items={generationItems} activeKey={activeDrill} onSelect={openDrill} />
      </section>

      <Drawer
        title={detailTitle()}
        open={drillOpen}
        onClose={() => setDrillOpen(false)}
        width={980}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Tag>共 {rows.length} 条记录</Tag>
          <Table
            size="small"
            bordered
            rowKey={(row: any, index) => `${detailTitle()}-${index}`}
            dataSource={rows}
            columns={detailColumns()}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无下钻数据" /> }}
            scroll={{ x: 'max-content' }}
          />
        </Space>
      </Drawer>
    </div>
  );
}
