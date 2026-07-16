import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Drawer,
  Empty,
  List,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography
} from 'antd';
import { apiClient } from '../../shared/api/client';
import type { CultureOverviewResponse } from '../../shared/api/generated/culture-types';
import type { HomeDashboardResponse } from '../../shared/api/generated/home-types';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { toRecordList } from '../../shared/ui/DataTable';
import './UnifiedStatisticsHomePage.css';

const { Paragraph, Text, Title } = Typography;

type DrillKey = 'clans' | 'branches' | 'people' | 'sources' | 'pendingReviews' | 'logs' | 'generationReady' | 'vitalReady' | 'biographyReady' | 'branchCovered' | `gender:${string}` | `status:${string}` | `generation:${string}` | `sourceType:${string}` | `living:${string}`;

type ChartItem = {
  key: DrillKey;
  label: string;
  value: number;
};

type HomeCultureEntry = {
  type: 'compatibility' | 'culture_item' | 'migration_event' | 'culture_site' | string;
  category: string;
  title: string;
  subtitle: string;
  status: string;
  sourceCount: number;
  sourceCoverageRate: number;
  targetTab: 'items' | 'migrations' | 'sites';
  targetQueryKey?: string;
  targetQueryValue?: string;
};

type HomeCultureOverview = CultureOverviewResponse & {
  entries?: HomeCultureEntry[];
};

type HomeSnapshot = {
  clans: any[];
  branches: any[];
  people: any[];
  sources: any[];
  pendingReviews: any[];
  logStats: any;
  dashboard: HomeDashboardResponse | null;
  culture: HomeCultureOverview | null;
};

const emptySnapshot: HomeSnapshot = {
  clans: [],
  branches: [],
  people: [],
  sources: [],
  pendingReviews: [],
  logStats: null,
  dashboard: null,
  culture: null
};

const cultureQueryKeys = [
  'cultureKeyword', 'cultureCategory', 'cultureBranch', 'cultureStatus', 'culturePrivacy',
  'cultureHasSource', 'cultureFeatured', 'cultureSort', 'culturePage', 'culturePageSize', 'cultureItem',
  'migrationKeyword', 'migrationBranch', 'migrationFrom', 'migrationTo', 'migrationTime',
  'migrationStatus', 'migrationSort', 'migrationPage', 'migrationPageSize', 'migrationItem',
  'siteKeyword', 'siteType', 'siteBranch', 'siteAddress', 'siteCurrentStatus',
  'siteStatus', 'siteSort', 'sitePage', 'sitePageSize', 'siteItem'
];

function display(value: unknown, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function formatLoadedAt(value: Date | null) {
  if (!value) return '数据加载中…';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `数据更新于 ${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function clanLabel(clan: any) {
  return display(clan?.clanName || clan?.name, '未命名宗族');
}

function branchName(row: any) {
  return display(row?.branchName || row?.name, '未命名支派');
}

function personName(row: any) {
  return display(row?.name || row?.personName, '未命名人物');
}

function sourceName(row: any) {
  return display(row?.sourceName || row?.title || row?.name, '未命名资料');
}

function genderText(value: string) {
  const labels: Record<string, string> = { male: '男', female: '女', unknown: '未知' };
  return labels[value] || value || '未维护';
}

function livingText(value: unknown) {
  if (value === true) return '在世';
  if (value === false) return '已故';
  return '未维护';
}

function statusText(status: string) {
  const labels: Record<string, string> = {
    draft: '草稿',
    pending: '待审核',
    pending_review: '待审核',
    official: '正式发布',
    active: '正式',
    approved: '已通过',
    rejected: '已驳回',
    archived: '已归档',
    legacy_read_only: '只读兼容'
  };
  return labels[status] || status || '状态未知';
}

function statusColor(status: string) {
  const normalized = String(status || '').trim().toLowerCase();
  if (['official', 'active', 'approved'].includes(normalized)) return 'success';
  if (['pending', 'pending_review'].includes(normalized)) return 'processing';
  if (normalized === 'rejected') return 'error';
  if (normalized === 'legacy_read_only') return 'warning';
  return 'default';
}

function sourceTypeText(value: string) {
  const labels: Record<string, string> = {
    genealogy_book: '族谱原文',
    oral_record: '口述记录',
    tombstone: '墓碑墓志',
    photo: '照片',
    local_chronicle: '地方志',
    other: '其他'
  };
  return labels[value] || value || '未维护';
}

function reviewTargetTypeText(value: string) {
  const labels: Record<string, string> = {
    person: '人物', relationship: '关系', source: '来源', branch: '支派',
    generation_scheme: '字辈方案', clan: '宗族', culture_item: '文化资料',
    migration_event: '迁徙事件', culture_site: '文化场所'
  };
  return labels[value] || value || '对象待维护';
}

function categoryText(category: string) {
  const labels: Record<string, string> = {
    surname_origin: '姓氏源流', hall_name: '堂号', commandery: '郡望', family_instruction: '家训',
    ancestor_instruction: '祖训', clan_rule: '族规', genealogy_preface: '谱序', genealogy_rule: '凡例',
    person_story: '人物故事', custom_tradition: '民俗传统', ancestral_hall: '祠堂',
    ancestral_home: '祖居', cemetery: '墓园', memorial: '纪念设施', migration: '迁徙事件', other: '其他'
  };
  return labels[category] || category || '文化内容';
}

function hasText(value: unknown) {
  return Boolean(String(value ?? '').trim());
}

function parentBranchName(row: any, branches: any[]) {
  const parent = branches.find(branch => String(branch.id) === String(row.parentId || ''));
  return parent ? branchName(parent) : '父支派待维护';
}

function bucketValue(dashboard: HomeDashboardResponse | null, dimension: 'genderDistribution' | 'livingDistribution', key: string) {
  return dashboard?.[dimension]?.find(item => item.key === key)?.count || 0;
}

function MiniBarChart({ title, items, activeKey, onSelect }: { title: string; items: ChartItem[]; activeKey: DrillKey; onSelect: (key: DrillKey) => void }) {
  const max = Math.max(1, ...items.map(item => item.value));
  return (
    <Card title={title} size="small">
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

export function UnifiedStatisticsHomePage() {
  const workspace = useWorkspace();
  const [snapshot, setSnapshot] = useState<HomeSnapshot>(emptySnapshot);
  const [loading, setLoading] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);
  const [cultureError, setCultureError] = useState('');
  const [activeDrill, setActiveDrill] = useState<DrillKey>('people');
  const [drillOpen, setDrillOpen] = useState(false);

  function resetWorkspaceForClan(clanId: string) {
    workspace.patch({
      clanId,
      branchId: '',
      personId: '',
      relationshipId: '',
      sourceId: '',
      sourceFocusReason: '',
      attachmentId: '',
      reviewTaskId: ''
    });
  }

  async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn();
    } catch {
      return fallback;
    }
  }

  async function load(clanIdOverride?: string) {
    setLoading(true);
    setCultureError('');
    try {
      const clans = toRecordList(await safe(() => apiClient.get('/clans'), []));
      const requestedClanId = String(clanIdOverride || workspace.clanId || '').trim();
      const fallbackClanId = String((clans[0] as any)?.id || '');
      const clanId = requestedClanId && clans.some(clan => String(clan.id) === requestedClanId)
        ? requestedClanId
        : fallbackClanId;

      if (clanId && workspace.clanId !== clanId) resetWorkspaceForClan(clanId);
      if (!clanId) {
        setSnapshot({ ...emptySnapshot, clans });
        setLastLoadedAt(new Date());
        return;
      }

      const [dashboardResult, branchResult, peopleResult, sourceResult, reviewResult, logResult, cultureResult] = await Promise.allSettled([
        apiClient.get<HomeDashboardResponse>(`/clans/${clanId}/dashboard`),
        apiClient.get(`/clans/${clanId}/branches`),
        apiClient.get(`/persons/search?clanId=${clanId}&pageNo=1&pageSize=200`),
        apiClient.get(`/clans/${clanId}/sources`),
        apiClient.get(`/clans/${clanId}/review-tasks/pending`),
        apiClient.get(`/logs/operations/stats?clanId=${clanId}`),
        apiClient.get<HomeCultureOverview>(`/clans/${clanId}/culture-overview`)
      ]);

      const peopleResponse = peopleResult.status === 'fulfilled' ? peopleResult.value as any : { total: 0, records: [] };
      const people = toRecordList(peopleResponse);
      const dashboard = dashboardResult.status === 'fulfilled' ? dashboardResult.value : null;
      const culture = cultureResult.status === 'fulfilled' ? cultureResult.value : null;
      if (cultureResult.status === 'rejected') {
        setCultureError(cultureResult.reason instanceof Error ? cultureResult.reason.message : '宗族文化摘要加载失败');
      }

      setSnapshot({
        clans,
        branches: branchResult.status === 'fulfilled' ? toRecordList(branchResult.value) : [],
        people,
        sources: sourceResult.status === 'fulfilled' ? toRecordList(sourceResult.value) : [],
        pendingReviews: reviewResult.status === 'fulfilled' ? toRecordList(reviewResult.value) : [],
        logStats: logResult.status === 'fulfilled' ? logResult.value : null,
        dashboard,
        culture
      });
      setLastLoadedAt(dashboard?.asOf ? new Date(dashboard.asOf) : new Date());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const currentClan = useMemo(() => {
    const clanId = String(workspace.clanId || '');
    return snapshot.clans.find(clan => String(clan.id) === clanId) || snapshot.clans[0] || null;
  }, [snapshot.clans, workspace.clanId]);

  const branchPersonCounts = useMemo(() => {
    const counts = new Map<string, number>();
    snapshot.people.forEach(person => {
      const branchId = String(person.branchId || '');
      if (branchId) counts.set(branchId, (counts.get(branchId) || 0) + 1);
    });
    return counts;
  }, [snapshot.people]);

  const generationItems = useMemo(
    () => (snapshot.dashboard?.generationDistribution || [])
      .slice(0, 8)
      .map(item => ({
        key: `generation:${item.label}` as DrillKey,
        label: item.label,
        value: item.count
      })),
    [snapshot.dashboard]
  );

  const dashboard = snapshot.dashboard;
  const branchCoverage = dashboard?.branchCoverage;
  const completeness = dashboard?.completeness;
  const livingCount = bucketValue(dashboard, 'livingDistribution', 'living');
  const deceasedCount = bucketValue(dashboard, 'livingDistribution', 'deceased');
  const generationReadyCount = completeness?.generationMaintainedCount || 0;
  const vitalReadyCount = completeness?.vitalDatesMaintainedCount || 0;
  const biographyReadyCount = completeness?.biographyMaintainedCount || 0;
  const branchCoveredText = branchCoverage ? `${branchCoverage.coveredBranchCount}/${branchCoverage.totalBranchCount}` : '0/0';

  const cards: { key: DrillKey; label: string; value: number | string; hint: string }[] = [
    { key: 'people', label: '族人总数', value: dashboard?.peopleTotal || 0, hint: '查看人物明细' },
    { key: 'branches', label: '支派数量', value: dashboard?.branchCount || 0, hint: '查看支派' },
    { key: 'sources', label: '来源资料', value: dashboard?.sourceCount || 0, hint: '查看来源' },
    { key: 'pendingReviews', label: '待审核', value: dashboard?.pendingReviewCount || 0, hint: '查看审核事项' },
    { key: 'gender:男', label: '男性族人', value: bucketValue(dashboard, 'genderDistribution', 'male'), hint: '查看男性族人' },
    { key: 'gender:女', label: '女性族人', value: bucketValue(dashboard, 'genderDistribution', 'female'), hint: '查看女性族人' },
    { key: 'living:在世', label: '在世人员', value: livingCount, hint: '查看在世人员' },
    { key: 'living:已故', label: '已故人员', value: deceasedCount, hint: '查看已故人员' },
    { key: 'generationReady', label: '已维护字辈', value: generationReadyCount, hint: '查看已维护字辈人物' },
    { key: 'vitalReady', label: '已维护生卒', value: vitalReadyCount, hint: '查看有生卒信息人物' },
    { key: 'biographyReady', label: '有传记人物', value: biographyReadyCount, hint: '查看已维护传记人物' },
    { key: 'branchCovered', label: '已覆盖支派', value: branchCoveredText, hint: '查看已有族人的支派' }
  ];

  const entries = snapshot.culture?.entries || [];
  const compatibilityEntries = entries.filter(entry => entry.type === 'compatibility');
  const cultureEntries = entries.filter(entry => entry.type === 'culture_item');
  const migrationEntries = entries.filter(entry => entry.type === 'migration_event');
  const siteEntries = entries.filter(entry => entry.type === 'culture_site');
  const coverage = Math.round((snapshot.culture?.statistics.sourceCoverageRate || 0) * 100);

  async function switchClan(nextClanId: string) {
    if (!nextClanId || nextClanId === workspace.clanId) return;
    resetWorkspaceForClan(nextClanId);
    setActiveDrill('people');
    setDrillOpen(false);
    await load(nextClanId);
  }

  function openCulture(tab: 'items' | 'migrations' | 'sites', entry?: HomeCultureEntry) {
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'culture');
    url.searchParams.set('tab', tab);
    cultureQueryKeys.forEach(key => url.searchParams.delete(key));
    if (entry?.targetQueryKey && entry.targetQueryValue) {
      url.searchParams.append(entry.targetQueryKey, entry.targetQueryValue);
    }
    window.history.pushState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  function renderEntries(items: HomeCultureEntry[], emptyText: string) {
    if (!items.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />;
    return (
      <List
        size="small"
        dataSource={items}
        renderItem={entry => (
          <List.Item actions={[<Button key="open" type="link" onClick={() => openCulture(entry.targetTab, entry)}>查看</Button>]}> 
            <List.Item.Meta
              title={(
                <Space wrap size={6}>
                  <Text strong>{entry.title}</Text>
                  <Tag>{categoryText(entry.category)}</Tag>
                  <Tag color={statusColor(entry.status)}>{statusText(entry.status)}</Tag>
                </Space>
              )}
              description={(
                <Space direction="vertical" size={2}>
                  <Text type="secondary">{entry.subtitle || '暂无摘要'}</Text>
                  <Text type="secondary">来源：{entry.sourceCount} 条</Text>
                </Space>
              )}
            />
          </List.Item>
        )}
      />
    );
  }

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
    if (activeDrill === 'branchCovered') return '已有族人的支派';
    return activeDrill.replace('gender:', '性别：').replace('status:', '状态：').replace('generation:', '代次：').replace('sourceType:', '资料类型：').replace('living:', '在世状态：');
  }

  function detailColumns() {
    if (activeDrill === 'clans') return [
      { key: 'clanName', title: '宗族名称', render: (_value: unknown, row: any) => clanLabel(row) },
      { key: 'surname', title: '姓氏', render: (_value: unknown, row: any) => display(row.surname) }
    ];
    if (activeDrill === 'branches' || activeDrill === 'branchCovered') return [
      { key: 'branchName', title: '支派名称', render: (_value: unknown, row: any) => branchName(row) },
      { key: 'parentBranch', title: '父支派', render: (_value: unknown, row: any) => parentBranchName(row, snapshot.branches) },
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
      { key: 'status', title: '审核状态', render: (_value: unknown, row: any) => <Tag color={statusColor(row.status || row.reviewStatus)}>{statusText(row.status || row.reviewStatus)}</Tag> }
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
  const loadedAtText = `${formatLoadedAt(lastLoadedAt)}${loading && lastLoadedAt ? ' · 正在更新…' : ''}`;

  return (
    <Space className="statistics-home-page" direction="vertical" size="middle" style={{ width: '100%' }}>
      <header className="statistics-home-page__header">
        <div className="statistics-home-page__heading">
          <Title level={3}>族谱首页</Title>
          <Text type="secondary">查看当前宗族的成员、支派、来源与审核概览</Text>
        </div>
        <div className="statistics-home-page__context">
          <div className="statistics-home-page__scope">
            <Text id="statistics-home-current-clan-label" type="secondary">当前宗族</Text>
            <Select
              aria-labelledby="statistics-home-current-clan-label"
              className="statistics-home-page__clan-select"
              size="large"
              value={String(currentClan?.id || workspace.clanId || '') || undefined}
              loading={loading}
              onChange={value => void switchClan(String(value))}
              options={snapshot.clans.map(clan => ({ value: String(clan.id), label: clanLabel(clan) }))}
            />
          </div>
          <Text className="statistics-home-page__updated-at" type="secondary" aria-live="polite">{loadedAtText}</Text>
        </div>
      </header>

      <Card className="statistics-home-page__clan-summary" loading={loading}>
        <Title level={4}>{clanLabel(currentClan)}</Title>
        <Paragraph type="secondary">
          {display(currentClan?.description, '暂未维护宗族简介')}
        </Paragraph>
      </Card>

      <Row gutter={[16, 16]}>
        {cards.map(card => (
          <Col key={`${card.label}-${card.key}`} xs={24} sm={12} lg={8} xl={6}>
            <Card hoverable onClick={() => openDrill(card.key)}>
              <Statistic title={card.label} value={loading ? '-' : card.value} />
              <Text type="secondary">{card.hint}</Text>
            </Card>
          </Col>
        ))}
      </Row>

      {cultureError ? (
        <Alert
          type="error"
          showIcon
          message="宗族文化摘要加载失败"
          description={cultureError}
          action={<Button size="small" onClick={() => void load()}>重试</Button>}
        />
      ) : null}

      <Card
        title="宗族文化摘要"
        loading={loading}
        extra={<Button type="primary" onClick={() => openCulture('items')}>进入宗族文化</Button>}
      >
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} md={8}><Statistic title="正式资料" value={snapshot.culture?.statistics.officialItemCount || 0} /></Col>
          <Col xs={24} md={8}><Statistic title="待审核资料" value={snapshot.culture?.statistics.pendingReviewCount || 0} /></Col>
          <Col xs={24} md={8}>
            <Text type="secondary">来源覆盖率</Text>
            <Progress percent={coverage} status={coverage < 60 ? 'exception' : 'normal'} />
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={12}><Card size="small" title="堂号、郡望与祖籍兼容摘要">{renderEntries(compatibilityEntries, '暂无兼容摘要，请在文化资料中维护并审核发布。')}</Card></Col>
          <Col xs={24} xl={12}><Card size="small" title="精选文化资料">{renderEntries(cultureEntries, '暂无正式精选文化资料。')}</Card></Col>
          <Col xs={24} xl={12}><Card size="small" title="迁徙脉络" extra={<Button type="link" onClick={() => openCulture('migrations')}>全部迁徙</Button>}>{renderEntries(migrationEntries, '暂无当前账号可见的正式迁徙事件。')}</Card></Col>
          <Col xs={24} xl={12}><Card size="small" title="祠堂与文化场所" extra={<Button type="link" onClick={() => openCulture('sites')}>全部场所</Button>}>{renderEntries(siteEntries, '暂无当前账号可见的正式文化场所。')}</Card></Col>
        </Row>

        {snapshot.culture?.missingHints?.length ? (
          <Alert style={{ marginTop: 16 }} type="warning" showIcon message="文化资料完整度提示" description={snapshot.culture.missingHints.join('；')} />
        ) : null}
      </Card>

      <MiniBarChart title="代次分布 TOP 8" items={generationItems} activeKey={activeDrill} onSelect={openDrill} />

      <Drawer title={detailTitle()} open={drillOpen} onClose={() => setDrillOpen(false)} width={980}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Tag>共 {rows.length} 条记录</Tag>
          <Table
            size="small"
            bordered
            rowKey={(_row: any, index) => `${detailTitle()}-${index}`}
            dataSource={rows}
            columns={detailColumns()}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无下钻数据" /> }}
            scroll={{ x: 'max-content' }}
          />
        </Space>
      </Drawer>
    </Space>
  );
}
