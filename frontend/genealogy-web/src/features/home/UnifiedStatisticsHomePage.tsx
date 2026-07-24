import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Button, Card, Col, List, Progress, Row, Select, Skeleton, Space, Statistic, Tag, Typography } from 'antd';
import { ApiRequestError, apiClient } from '../../shared/api/client';
import type { CultureOverviewResponse } from '../../shared/api/generated/culture-types';
import type { HomeDashboardBucketResponse, HomeDashboardResponse } from '../../shared/api/generated/home-types';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { toRecordList } from '../../shared/ui/DataTable';
import './UnifiedStatisticsHomePage.css';

import { PageFeedback } from '../../shared/ui/Feedback';

import { EmptyState } from '../../shared/ui/Feedback';

const { Paragraph, Text, Title } = Typography;

type LoadStatus = 'idle' | 'loading' | 'success' | 'error' | 'forbidden';
type ResourceState<T> = {
  status: LoadStatus;
  data: T;
  error: string;
  loaded: boolean;
};

type HomeCultureEntry = {
  type: 'compatibility' | 'culture_item' | 'migration_event' | 'culture_site' | string;
  category: string;
  title: string;
  subtitle: string;
  status: string;
  sourceCount: number;
  targetTab: 'items' | 'migrations' | 'sites';
  targetQueryKey?: string;
  targetQueryValue?: string;
};

type HomeCultureOverview = CultureOverviewResponse & { entries?: HomeCultureEntry[] };

type PublicFeature = {
  key: string;
  mark: string;
  title: string;
  description: string;
  action: string;
  onOpen: () => void;
};

const cultureQueryKeys = [
  'cultureKeyword', 'cultureCategory', 'cultureBranch', 'cultureStatus', 'culturePrivacy',
  'cultureHasSource', 'cultureFeatured', 'cultureSort', 'culturePage', 'culturePageSize',
  'cultureItem', 'migrationKeyword', 'migrationBranch', 'migrationFrom', 'migrationTo',
  'migrationTime', 'migrationStatus', 'migrationSort', 'migrationPage', 'migrationPageSize',
  'migrationItem', 'siteKeyword', 'siteType', 'siteBranch', 'siteAddress', 'siteCurrentStatus',
  'siteStatus', 'siteSort', 'sitePage', 'sitePageSize', 'siteItem'
];

function emptyResource<T>(data: T): ResourceState<T> {
  return { status: 'idle', data, error: '', loaded: false };
}

function loadingResource<T>(previous: ResourceState<T>): ResourceState<T> {
  return { ...previous, status: 'loading', error: '' };
}

function successResource<T>(data: T): ResourceState<T> {
  return { status: 'success', data, error: '', loaded: true };
}

function failureResource<T>(previous: ResourceState<T>, error: unknown): ResourceState<T> {
  const forbidden = error instanceof ApiRequestError && error.status === 403;
  const fallback = forbidden ? '当前账号暂无权限查看该区域数据' : '数据加载失败';
  const message = error instanceof Error && error.message ? error.message : fallback;
  return { ...previous, status: forbidden ? 'forbidden' : 'error', error: message };
}

function display(value: unknown, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function clanLabel(clan: any) {
  return display(clan?.clanName || clan?.name || clan?.surname, '未命名宗族');
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
  return labels[category] || category || '宗族文化';
}

function isPublicEntry(entry: HomeCultureEntry) {
  const status = String(entry.status || '').trim().toLowerCase();
  return ['official', 'active', 'approved'].includes(status) || entry.type === 'compatibility';
}

function percent(value: number, denominator: number) {
  if (!denominator || denominator <= 0) return 0;
  return Math.min(100, Math.round(value * 10000 / denominator) / 100);
}

function navigateToView(view: 'treeProduct' | 'personArchive' | 'sourceLibrary' | 'culture') {
  const url = new URL(window.location.href);
  url.searchParams.set('view', view);
  window.history.pushState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function updateHomeUrl(clanId: string) {
  const url = new URL(window.location.href);
  if (clanId) url.searchParams.set('clanId', clanId);
  else url.searchParams.delete('clanId');
  url.searchParams.delete('metric');
  url.searchParams.delete('category');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

function readClanIdFromUrl() {
  return new URLSearchParams(window.location.search).get('clanId') || '';
}

export function UnifiedStatisticsHomePage() {
  const workspace = useWorkspace();
  const [clansState, setClansState] = useState<ResourceState<any[]>>(emptyResource([]));
  const [dashboardState, setDashboardState] = useState<ResourceState<HomeDashboardResponse | null>>(emptyResource(null));
  const [cultureState, setCultureState] = useState<ResourceState<HomeCultureOverview | null>>(emptyResource(null));

  const currentClan = useMemo(() => {
    const clanId = String(workspace.clanId || '');
    return clansState.data.find(clan => String(clan.id) === clanId) || clansState.data[0] || null;
  }, [clansState.data, workspace.clanId]);

  const currentClanId = String(currentClan?.id || workspace.clanId || '').trim();
  const dashboard = dashboardState.data;
  const cultureEntries = (cultureState.data?.entries || []).filter(isPublicEntry);

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

  async function loadPublicAreas(clanId: string) {
    setDashboardState(previous => loadingResource(previous));
    setCultureState(previous => loadingResource(previous));

    await Promise.all([
      apiClient.get<HomeDashboardResponse>(`/clans/${clanId}/dashboard`)
        .then(data => setDashboardState(successResource(data)))
        .catch(error => setDashboardState(previous => failureResource(previous, error))),
      apiClient.get<HomeCultureOverview>(`/clans/${clanId}/culture-overview`)
        .then(data => setCultureState(successResource(data)))
        .catch(error => setCultureState(previous => failureResource(previous, error)))
    ]);
  }

  async function load(clanIdOverride?: string) {
    setClansState(previous => loadingResource(previous));
    try {
      const clans = toRecordList(await apiClient.get('/clans'));
      setClansState(successResource(clans));
      const requestedClanId = String(clanIdOverride || workspace.clanId || '').trim();
      const fallbackClanId = String((clans[0] as any)?.id || '');
      const clanId = requestedClanId && clans.some(clan => String(clan.id) === requestedClanId)
        ? requestedClanId
        : fallbackClanId;
      if (!clanId) {
        setDashboardState(emptyResource(null));
        setCultureState(emptyResource(null));
        updateHomeUrl('');
        return;
      }
      if (workspace.clanId !== clanId) resetWorkspaceForClan(clanId);
      updateHomeUrl(clanId);
      await loadPublicAreas(clanId);
    } catch (error) {
      setClansState(previous => failureResource(previous, error));
    }
  }

  async function switchClan(nextClanId: string) {
    if (!nextClanId || nextClanId === currentClanId) return;
    resetWorkspaceForClan(nextClanId);
    updateHomeUrl(nextClanId);
    await loadPublicAreas(nextClanId);
  }

  function openCulture(tab: 'items' | 'migrations' | 'sites', entry?: HomeCultureEntry) {
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'culture');
    url.searchParams.set('tab', tab);
    cultureQueryKeys.forEach(key => url.searchParams.delete(key));
    if (entry?.targetQueryKey && entry.targetQueryValue) {
      url.searchParams.set(entry.targetQueryKey, entry.targetQueryValue);
    }
    window.history.pushState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  useEffect(() => {
    void load(readClanIdFromUrl() || undefined);
  }, []);

  const generationCount = dashboard?.generationDistribution?.filter(item => item.count > 0).length || 0;
  const metrics = [
    { title: '族人总数', value: dashboard?.peopleTotal || 0, suffix: '人', hint: '当前宗族公开人物规模' },
    { title: '支派数量', value: dashboard?.branchCount || 0, suffix: '个', hint: '已维护的宗族支派' },
    { title: '来源资料', value: dashboard?.sourceCount || 0, suffix: '条', hint: '谱书、照片与口述记录' },
    { title: '已记录代次', value: generationCount, suffix: '代', hint: '当前已有公开人物的代次范围' }
  ];

  function findCultureEntry(categories: string[], types?: string[]) {
    return cultureEntries.find(entry => categories.includes(entry.category) && (!types || types.includes(entry.type)));
  }

  const originEntry = findCultureEntry(['surname_origin']);
  const hallEntry = findCultureEntry(['hall_name', 'commandery']);
  const migrationEntry = cultureEntries.find(entry => entry.type === 'migration_event' || entry.category === 'migration');
  const genealogyEntry = findCultureEntry(['genealogy_preface', 'genealogy_rule']);

  const publicFeatures: PublicFeature[] = [
    {
      key: 'origin',
      mark: '源',
      title: '姓氏源流',
      description: display(originEntry?.subtitle || originEntry?.title, '暂无公开姓氏源流资料'),
      action: '查看源流',
      onOpen: () => openCulture('items', originEntry)
    },
    {
      key: 'hall',
      mark: '堂',
      title: '堂号与郡望',
      description: display(hallEntry?.subtitle || hallEntry?.title || currentClan?.hallName || currentClan?.commandery, '暂无公开堂号与郡望资料'),
      action: '查看文化',
      onOpen: () => openCulture('items', hallEntry)
    },
    {
      key: 'migration',
      mark: '迁',
      title: '迁徙脉络',
      description: display(migrationEntry?.subtitle || migrationEntry?.title, '暂无公开迁徙资料'),
      action: '查看迁徙',
      onOpen: () => openCulture('migrations', migrationEntry)
    },
    {
      key: 'genealogy',
      mark: '谱',
      title: '族谱沿革',
      description: display(genealogyEntry?.subtitle || genealogyEntry?.title, '暂无公开谱序或族谱沿革资料'),
      action: '查看资料',
      onOpen: () => openCulture('items', genealogyEntry)
    }
  ];

  const publicCultureEntries = cultureEntries
    .filter(entry => entry.type !== 'compatibility')
    .slice(0, 6);

  function renderAreaAlert(label: string, state: ResourceState<unknown>, retry: () => void) {
    if (state.status !== 'error' && state.status !== 'forbidden') return null;
    const forbidden = state.status === 'forbidden';
    return (
      <PageFeedback
        tone="warning"
        title={forbidden ? `暂无权限查看${label}` : `${label}加载失败`}
        description={state.error}
        action={forbidden ? undefined : <Button size="small" onClick={retry}>重试</Button>}
      />
    );
  }

  if ((clansState.status === 'error' || clansState.status === 'forbidden') && !clansState.loaded) {
    return (
      <Space className="public-home-page" direction="vertical" size="middle" style={{ width: '100%' }}>
        {renderAreaAlert('宗族列表', clansState, () => void load(readClanIdFromUrl() || undefined))}
      </Space>
    );
  }

  if (clansState.status === 'loading' && !clansState.loaded) {
    return (
      <Space className="public-home-page" direction="vertical" size="middle" style={{ width: '100%' }}>
        <Card><Skeleton active paragraph={{ rows: 6 }} /></Card>
      </Space>
    );
  }

  if (clansState.loaded && clansState.data.length === 0) {
    return (
      <Space className="public-home-page" direction="vertical" size="middle" style={{ width: '100%' }}>
        <Card className="public-home-page__empty">
          <EmptyState
            image={EmptyState.PRESENTED_IMAGE_SIMPLE}
            description={(
              <Space direction="vertical" size={6}>
                <Text strong>当前没有可浏览的宗族</Text>
                <Text type="secondary">请联系宗族管理员确认成员身份与访问范围。</Text>
              </Space>
            )}
          />
        </Card>
      </Space>
    );
  }

  return (
    <Space className="public-home-page" direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card className="public-home-page__hero">
        <div className="public-home-page__hero-layout">
          <div className="public-home-page__hero-copy">
            <Title level={3}>{clanLabel(currentClan)}</Title>
            <Paragraph type="secondary">
              {display(currentClan?.description, '暂未维护宗族简介，可在宗族资料中补充公开的历史沿革与宗族概况。')}
            </Paragraph>
          </div>
          <div className="public-home-page__scope">
            <Text id="public-home-current-clan-label" type="secondary">当前宗族</Text>
            <Select
              aria-labelledby="public-home-current-clan-label"
              className="public-home-page__clan-select"
              size="large"
              value={currentClanId || undefined}
              loading={clansState.status === 'loading'}
              onChange={value => void switchClan(String(value))}
              options={clansState.data.map(clan => ({ value: String(clan.id), label: clanLabel(clan) }))}
            />
          </div>
        </div>
      </Card>

      {renderAreaAlert('宗族概况', dashboardState, () => void loadPublicAreas(currentClanId))}
      <section aria-labelledby="public-home-overview-title">
        <div className="public-home-page__section-heading">
          <div>
            <Title id="public-home-overview-title" level={4}>宗族概况</Title>
          </div>
        </div>
        {dashboardState.status === 'loading' && !dashboardState.loaded ? (
          <Row gutter={[16, 16]}>
            {Array.from({ length: 4 }).map((_item, index) => (
              <Col key={index} xs={24} sm={12} xl={6}><Card><Skeleton active paragraph={{ rows: 2 }} /></Card></Col>
            ))}
          </Row>
        ) : (
          <Row gutter={[16, 16]}>
            {metrics.map(metric => (
              <Col key={metric.title} xs={24} sm={12} xl={6}>
                <Card className="public-home-page__metric-card">
                  <Statistic title={metric.title} value={metric.value} suffix={metric.suffix} />
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </section>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card title="宗族历史与文化" className="public-home-page__feature-card">
            {renderAreaAlert('宗族文化', cultureState, () => void loadPublicAreas(currentClanId))}
            <div className="public-home-page__feature-list">
              {publicFeatures.map(feature => (
                <div key={feature.key} className="public-home-page__feature-item">
                  <div className="public-home-page__feature-mark" aria-hidden="true">{feature.mark}</div>
                  <div className="public-home-page__feature-copy">
                    <Text strong>{feature.title}</Text>
                    <Paragraph type="secondary" ellipsis={{ rows: 2 }}>{feature.description}</Paragraph>
                  </div>
                  <Button type="link" onClick={feature.onOpen}>{feature.action}</Button>
                </div>
              ))}
            </div>
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card title="公共浏览入口" className="public-home-page__entry-card">
            <div className="public-home-page__entry-grid">
              <button type="button" onClick={() => navigateToView('treeProduct')}>
                <Text strong>世系图谱</Text><Text type="secondary">浏览公开世系关系</Text>
              </button>
              <button type="button" onClick={() => navigateToView('personArchive')}>
                <Text strong>人物档案</Text><Text type="secondary">检索公开人物资料</Text>
              </button>
              <button type="button" onClick={() => navigateToView('culture')}>
                <Text strong>宗族文化</Text><Text type="secondary">了解源流、迁徙与场所</Text>
              </button>
              <button type="button" onClick={() => navigateToView('sourceLibrary')}>
                <Text strong>历史资料</Text><Text type="secondary">浏览谱书与影像来源</Text>
              </button>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={12}>
          <Card title="支派分布" extra={<Button type="link" onClick={() => navigateToView('treeProduct')}>进入世系图谱</Button>}>
            {dashboard?.branchDistribution?.length ? (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {dashboard.branchDistribution.slice(0, 6).map((item: HomeDashboardBucketResponse) => (
                  <div key={item.key} className="public-home-page__distribution-row">
                    <div className="public-home-page__distribution-label">
                      <Text strong>{display(item.label, '未命名支派')}</Text>
                      <Text type="secondary">{item.count} 人</Text>
                    </div>
                    <Progress percent={percent(item.count, dashboard.peopleTotal)} showInfo={false} size="small" />
                  </div>
                ))}
              </Space>
            ) : <EmptyState image={EmptyState.PRESENTED_IMAGE_SIMPLE} description="暂无公开支派分布数据" />}
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="宗族纪事" extra={<Button type="link" onClick={() => openCulture('items')}>查看全部文化资料</Button>}>
            {cultureState.status === 'loading' && !cultureState.loaded ? <Skeleton active paragraph={{ rows: 5 }} /> : null}
            {cultureState.loaded && publicCultureEntries.length ? (
              <List
                size="small"
                dataSource={publicCultureEntries}
                renderItem={entry => (
                  <List.Item actions={[<Button key="open" type="link" onClick={() => openCulture(entry.targetTab, entry)}>查看</Button>]}>
                    <List.Item.Meta
                      title={<Space wrap size={6}><Text strong>{entry.title}</Text><Tag>{categoryText(entry.category)}</Tag></Space>}
                      description={display(entry.subtitle, `已收录 ${entry.sourceCount || 0} 条相关来源`)}
                    />
                  </List.Item>
                )}
              />
            ) : null}
            {cultureState.loaded && !publicCultureEntries.length ? (
              <EmptyState image={EmptyState.PRESENTED_IMAGE_SIMPLE} description="暂无已公开的宗族纪事或文化资料" />
            ) : null}
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
