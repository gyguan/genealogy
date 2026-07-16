import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  List,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Typography
} from 'antd';
import { apiClient } from '../../shared/api/client';
import type { CultureOverviewResponse } from '../../shared/api/generated/culture-types';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { toRecordList } from '../../shared/ui/DataTable';

const { Paragraph, Text, Title } = Typography;

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
  peopleTotal: number;
  sourceTotal: number;
  pendingReviewTotal: number;
  operationTotal: number;
  culture: HomeCultureOverview | null;
};

const emptySnapshot: HomeSnapshot = {
  clans: [],
  branches: [],
  peopleTotal: 0,
  sourceTotal: 0,
  pendingReviewTotal: 0,
  operationTotal: 0,
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

function clanLabel(clan: any) {
  return display(clan?.clanName || clan?.name, '未命名宗族');
}

function statusText(status: string) {
  const labels: Record<string, string> = {
    official: '正式发布',
    pending_review: '待审核',
    legacy_read_only: '只读兼容',
    archived: '已归档'
  };
  return labels[status] || status || '状态未知';
}

function statusColor(status: string) {
  if (status === 'official') return 'success';
  if (status === 'pending_review') return 'processing';
  if (status === 'legacy_read_only') return 'warning';
  return 'default';
}

function categoryText(category: string) {
  const labels: Record<string, string> = {
    surname_origin: '姓氏源流',
    hall_name: '堂号',
    commandery: '郡望',
    family_instruction: '家训',
    ancestor_instruction: '祖训',
    clan_rule: '族规',
    genealogy_preface: '谱序',
    genealogy_rule: '凡例',
    person_story: '人物故事',
    custom_tradition: '民俗传统',
    ancestral_hall: '祠堂',
    ancestral_home: '祖居',
    cemetery: '墓园',
    memorial: '纪念设施',
    migration: '迁徙事件',
    other: '其他'
  };
  return labels[category] || category || '文化内容';
}

export function UnifiedStatisticsHomePage() {
  const workspace = useWorkspace();
  const [snapshot, setSnapshot] = useState<HomeSnapshot>(emptySnapshot);
  const [loading, setLoading] = useState(false);
  const [cultureError, setCultureError] = useState('');

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

      if (clanId && workspace.clanId !== clanId) workspace.setClanId(clanId);
      if (!clanId) {
        setSnapshot({ ...emptySnapshot, clans });
        return;
      }

      const [branchResult, peopleResult, sourceResult, reviewResult, logResult, cultureResult] = await Promise.allSettled([
        apiClient.get(`/clans/${clanId}/branches`),
        apiClient.get(`/persons/search?clanId=${clanId}&pageNo=1&pageSize=1`),
        apiClient.get(`/clans/${clanId}/sources`),
        apiClient.get(`/clans/${clanId}/review-tasks/pending`),
        apiClient.get(`/logs/operations/stats?clanId=${clanId}`),
        apiClient.get<HomeCultureOverview>(`/clans/${clanId}/culture-overview`)
      ]);

      const branches = branchResult.status === 'fulfilled' ? toRecordList(branchResult.value) : [];
      const people = peopleResult.status === 'fulfilled' ? peopleResult.value as any : { total: 0, records: [] };
      const sources = sourceResult.status === 'fulfilled' ? toRecordList(sourceResult.value) : [];
      const reviews = reviewResult.status === 'fulfilled' ? toRecordList(reviewResult.value) : [];
      const logStats = logResult.status === 'fulfilled' ? logResult.value as any : null;
      const culture = cultureResult.status === 'fulfilled' ? cultureResult.value : null;
      if (cultureResult.status === 'rejected') {
        setCultureError(cultureResult.reason instanceof Error ? cultureResult.reason.message : '宗族文化摘要加载失败');
      }

      setSnapshot({
        clans,
        branches,
        peopleTotal: Number(people?.total ?? toRecordList(people).length ?? 0),
        sourceTotal: sources.length,
        pendingReviewTotal: reviews.length,
        operationTotal: Number(logStats?.totalCount ?? logStats?.total ?? 0),
        culture
      });
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

  const entries = snapshot.culture?.entries || [];
  const compatibilityEntries = entries.filter(entry => entry.type === 'compatibility');
  const cultureEntries = entries.filter(entry => entry.type === 'culture_item');
  const migrationEntries = entries.filter(entry => entry.type === 'migration_event');
  const siteEntries = entries.filter(entry => entry.type === 'culture_site');
  const coverage = Math.round((snapshot.culture?.statistics.sourceCoverageRate || 0) * 100);

  async function switchClan(nextClanId: string) {
    if (!nextClanId || nextClanId === workspace.clanId) return;
    workspace.patch({
      clanId: nextClanId,
      branchId: '',
      personId: '',
      relationshipId: '',
      sourceId: '',
      attachmentId: '',
      reviewTaskId: ''
    });
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
          <List.Item
            actions={[
              <Button key="open" type="link" onClick={() => openCulture(entry.targetTab, entry)}>查看</Button>
            ]}
          >
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

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card
        loading={loading}
        title="族谱概览"
        extra={(
          <Space wrap>
            <Text type="secondary">当前宗族</Text>
            <Select
              aria-label="当前宗族"
              style={{ minWidth: 220 }}
              value={String(currentClan?.id || workspace.clanId || '') || undefined}
              loading={loading}
              onChange={value => void switchClan(String(value))}
              options={snapshot.clans.map(clan => ({ value: String(clan.id), label: clanLabel(clan) }))}
            />
          </Space>
        )}
      >
        <Title level={3} style={{ marginTop: 0 }}>{clanLabel(currentClan)}</Title>
        <Paragraph type="secondary">
          {display(currentClan?.description, `${display(currentClan?.surname, '本')}氏族谱空间，统一沉淀成员、支派、来源、审核与正式宗族文化。`)}
        </Paragraph>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="族人总数" value={snapshot.peopleTotal} /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="支派数量" value={snapshot.branches.length} /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="来源资料" value={snapshot.sourceTotal} /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="待审核" value={snapshot.pendingReviewTotal} /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="正式文化资料" value={snapshot.culture?.statistics.officialItemCount || 0} /></Card></Col>
        <Col xs={24} sm={12} xl={4}><Card><Statistic title="操作记录" value={snapshot.operationTotal} /></Card></Col>
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
          <Col xs={24} xl={12}>
            <Card size="small" title="堂号、郡望与祖籍兼容摘要">
              {renderEntries(compatibilityEntries, '暂无兼容摘要，请在文化资料中维护并审核发布。')}
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card size="small" title="精选文化资料">
              {renderEntries(cultureEntries, '暂无正式精选文化资料。')}
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card size="small" title="迁徙脉络" extra={<Button type="link" onClick={() => openCulture('migrations')}>全部迁徙</Button>}>
              {renderEntries(migrationEntries, '暂无当前账号可见的正式迁徙事件。')}
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card size="small" title="祠堂与文化场所" extra={<Button type="link" onClick={() => openCulture('sites')}>全部场所</Button>}>
              {renderEntries(siteEntries, '暂无当前账号可见的正式文化场所。')}
            </Card>
          </Col>
        </Row>

        {snapshot.culture?.missingHints?.length ? (
          <Alert
            style={{ marginTop: 16 }}
            type="warning"
            showIcon
            message="文化资料完整度提示"
            description={snapshot.culture.missingHints.join('；')}
          />
        ) : null}
      </Card>
    </Space>
  );
}
