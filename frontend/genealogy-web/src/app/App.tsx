import { useEffect, useRef, useState } from 'react';
import { ConfigProvider, Layout, Menu, Space, Spin, Typography, theme } from 'antd';
import { apiClient } from '../shared/api/client';
import { WorkspaceProvider } from '../shared/context/WorkspaceContext';
import {
  EMPTY_ENTITY_NAVIGATION_GUARD,
  entityNavigationDecision,
  entityNavigationPrompt
} from '../shared/navigation/entityNavigationGuard';
import type { EntityNavigationGuardState } from '../shared/navigation/entityNavigationGuard';
import { navigateToView } from '../shared/navigation/urlState';
import type { AppViewKey } from '../shared/navigation/urlState';
import { feedback } from '../shared/ui/OperationFeedback';
import { AuthPage } from '../features/auth/AuthPage';
import { CurrentUserMenu } from '../features/auth/CurrentUserMenu';
import { BookletActions } from '../features/booklets/BookletActions';
import { CultureProductPage } from '../features/culture/CultureProductPage';
import { ImportPage } from '../features/imports/ImportPage';
import { StatisticsHomePage } from '../features/home/StatisticsHomePage';
import { LogPage } from '../features/logs/LogPage';
import { MemberInvitationAction } from '../features/members/MemberInvitationAction';
import { MemberPage } from '../features/members/MemberPage';
import { Mvp1WizardPage } from '../features/mvp1/Mvp1WizardPage';
import { PersonArchiveSearchPage } from '../features/persons/PersonArchiveSearchPage';
import { PersonDetailPage } from '../features/persons/PersonDetailPage';
import { navigateBackFromPersonDetail, readPersonDetailRoute } from '../features/persons/personDetailNavigation';
import type { PersonDetailRoute } from '../features/persons/personDetailNavigation';
import { PersonEditPage } from '../features/persons/PersonEditPage';
import { navigateBackFromPersonEdit, readPersonEditRoute } from '../features/persons/personEditNavigation';
import type { PersonEditRoute } from '../features/persons/personEditNavigation';
import { ReviewCenterPage } from '../features/reviews/ReviewCenterPage';
import { SourceDraftDeleteAction } from '../features/sources/SourceDraftDeleteAction';
import { SourceLibraryFocusBridge } from '../features/sources/SourceLibraryFocusBridge';
import { SourceLibraryQueryPage } from '../features/sources/SourceLibraryQueryPage';
import { LineageTreeProductPage } from '../features/tree/LineageTreeProductPagePortal';
import { EditingWorkspacePage } from '../features/workbench/EditingWorkspacePage';

import { InlineFeedback } from '../shared/ui/Feedback';

const { Sider, Content, Header } = Layout;

const navItems = [
  ['home', '族谱首页', '统计概览'],
  ['mvp1Wizard', '建谱向导', '创建宗族、支派、字辈、人物、关系、来源和审核'],
  ['personArchive', '人物档案', '按姓名、字辈、性别、支派检索人物并查看档案'],
  ['treeProduct', '世系图谱', '按上溯祖先、中心人物、下延后代查看世系'],
  ['sourceLibrary', '来源资料库', '族谱原文、地方志、照片和口述记录'],
  ['culture', '宗族文化', '姓氏源流、堂号、家训、迁徙和祠堂'],
  ['imports', '数据导入', '族谱数据批量导入、结果和异常处理'],
  ['editingWorkspace', '修谱工作台', '修谱问题任务池、风险检查和审核前处理'],
  ['reviewCenter', '审核中心', '入谱变更、资料复核和批量审核'],
  ['memberManage', '成员与权限', '宗族成员、角色和权限配置'],
  ['auditTrace', '审计追踪', '操作日志、审核流和字段Diff完整追踪']
] as const;

type ViewKey = typeof navItems[number][0];
type AuthStatus = 'checking' | 'authenticated' | 'anonymous';

function readViewFromUrl(): ViewKey {
  if (readPersonEditRoute() || readPersonDetailRoute()) return 'personArchive';
  const requested = new URLSearchParams(window.location.search).get('view');
  return navItems.some(([key]) => key === requested) ? requested as ViewKey : 'home';
}

function writeViewToUrl(key: ViewKey, mode: 'push' | 'replace' = 'push') {
  navigateToView(key as AppViewKey, window.location.href, { mode });
}


export function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff', colorInfo: '#1677ff', colorSuccess: '#52c41a', colorWarning: '#faad14', colorError: '#ff4d4f',
          colorBgLayout: '#f5f5f5', colorBgContainer: '#ffffff', colorBorder: '#d9d9d9', colorText: 'rgba(0, 0, 0, 0.88)',
          colorTextSecondary: 'rgba(0, 0, 0, 0.65)', borderRadius: 8, borderRadiusLG: 12, controlHeight: 32, controlHeightLG: 40,
          fontSize: 14, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif',
          boxShadowTertiary: '0 1px 2px rgba(0, 0, 0, 0.03)'
        },
        components: {
          Layout: { bodyBg: '#f5f5f5', siderBg: '#ffffff', headerBg: '#ffffff' },
          Menu: { itemBorderRadius: 8, itemHeight: 40, itemMarginBlock: 4, itemMarginInline: 8 },
          Card: { borderRadiusLG: 12, headerHeight: 48, paddingLG: 16 },
          Table: { headerBg: '#fafafa', rowHoverBg: '#f5faff', cellPaddingBlockSM: 8, cellPaddingInlineSM: 12 },
          Form: { itemMarginBottom: 12, labelColor: 'rgba(0,0,0,.65)' }
        }
      }}
    >
      <WorkspaceProvider><AppShell /></WorkspaceProvider>
    </ConfigProvider>
  );
}

function AppShell() {
  const [active, setActive] = useState<ViewKey>(readViewFromUrl);
  const [personDetailRoute, setPersonDetailRoute] = useState<PersonDetailRoute | null>(readPersonDetailRoute);
  const [personEditRoute, setPersonEditRoute] = useState<PersonEditRoute | null>(readPersonEditRoute);
  const [pageEntryVersion, setPageEntryVersion] = useState(0);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking');
  const navigationGuardRef = useRef<EntityNavigationGuardState>(EMPTY_ENTITY_NAVIGATION_GUARD);
  const guardedUrlRef = useRef('');

  function syncRouteFromUrl() {
    setPersonDetailRoute(readPersonDetailRoute()); setPersonEditRoute(readPersonEditRoute()); setActive(readViewFromUrl()); setPageEntryVersion(prev => prev + 1);
  }
  function onLoginChanged() { setAuthStatus('authenticated'); }
  function logout() {
    apiClient.post('/auth/logout').catch(() => undefined).finally(() => { apiClient.clearToken(); setAuthStatus('anonymous'); feedback.from({ message: '已退出登录' }); });
  }
  function setNavigationGuard(state: EntityNavigationGuardState) {
    navigationGuardRef.current = state;
    if (state.dirty || state.busy) guardedUrlRef.current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  }
  function allowNavigation() {
    const decision = entityNavigationDecision(navigationGuardRef.current);
    if (decision === 'block_busy') {
      feedback.from({ message: '人物档案正在提交，请稍后再离开。' }, true);
      return false;
    }
    if (decision === 'confirm_dirty' && !window.confirm(entityNavigationPrompt())) return false;
    navigationGuardRef.current = EMPTY_ENTITY_NAVIGATION_GUARD;
    return true;
  }

  useEffect(() => {
    let activeRequest = true;
    apiClient.get('/auth/me').then(() => { if (activeRequest) setAuthStatus('authenticated'); }).catch(() => { if (activeRequest) setAuthStatus('anonymous'); });
    const onUnauthorized = () => { apiClient.clearToken(); setAuthStatus('anonymous'); };
    window.addEventListener('genealogy:unauthorized', onUnauthorized);
    return () => { activeRequest = false; window.removeEventListener('genealogy:unauthorized', onUnauthorized); };
  }, []);

  useEffect(() => {
    const onUnhandled = (event: PromiseRejectionEvent) => { event.preventDefault(); feedback.from({ message: event.reason?.message || '操作失败，请检查输入后重试' }, true); };
    window.addEventListener('unhandledrejection', onUnhandled);
    return () => window.removeEventListener('unhandledrejection', onUnhandled);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      if (!allowNavigation()) {
        window.history.pushState(window.history.state, '', guardedUrlRef.current);
        return;
      }
      syncRouteFromUrl();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function enterPage(key: ViewKey) {
    if (!allowNavigation()) return;
    setPersonDetailRoute(null); setPersonEditRoute(null); setActive(key); setPageEntryVersion(prev => prev + 1); writeViewToUrl(key);
  }

  function renderPage() {
    if (personEditRoute) return <PersonEditPage personId={personEditRoute.personId} onCancel={navigateBackFromPersonEdit} onNavigationGuardChange={setNavigationGuard} />;
    if (personDetailRoute) return <PersonDetailPage personId={personDetailRoute.personId} onBack={navigateBackFromPersonDetail} />;
    switch (active) {
      case 'home': return <StatisticsHomePage />;
      case 'mvp1Wizard': return <Mvp1WizardPage />;
      case 'treeProduct': return <LineageTreeProductPage onNavigate={enterPage} />;
      case 'personArchive': return <PersonArchiveSearchPage />;
      case 'sourceLibrary': return <><SourceLibraryFocusBridge /><SourceDraftDeleteAction /><SourceLibraryQueryPage /></>;
      case 'editingWorkspace': return <EditingWorkspacePage onNavigate={enterPage} />;
      case 'imports': return <ImportPage />;
      case 'reviewCenter': return <ReviewCenterPage />;
      case 'memberManage': return <MemberPage />;
      case 'auditTrace': return <LogPage />;
      case 'culture': return <CultureProductPage />;
      default: return null;
    }
  }

  function renderModuleActions() {
    if (personDetailRoute || personEditRoute) return null;
    if (active === 'treeProduct') return <BookletActions />;
    if (active === 'memberManage') return <MemberInvitationAction />;
    return null;
  }

  if (authStatus === 'checking') return <div className="commercial-auth-shell" aria-label="正在检查登录状态"><Space direction="vertical" align="center" size={16}><Spin size="large" /><InlineFeedback tone="info" title="正在安全验证登录状态…" /></Space></div>;
  if (authStatus === 'anonymous') return <AuthPage onChanged={onLoginChanged} standalone />;

  const routeKey = personEditRoute?.personId ? `edit-${personEditRoute.personId}` : personDetailRoute?.personId ? `detail-${personDetailRoute.personId}` : 'list';
  return (
    <Layout className="admin-layout antd-admin-layout">
      <Sider className="sidebar antd-sidebar" width={248} breakpoint="lg" collapsedWidth={0}>
        <div className="brand antd-brand"><Typography.Title level={4}>Genealogy</Typography.Title><Typography.Text type="secondary">族谱管理平台</Typography.Text></div>
        <Menu mode="inline" theme="light" selectedKeys={[active]} onClick={info => enterPage(info.key as ViewKey)} items={navItems.map(([key, label]) => ({ key, label }))} />
      </Sider>
      <Layout className="antd-main-layout">
        <Header className="github-like-header">
          <div className="github-like-header-title"><Typography.Text type="secondary">当前模块</Typography.Text><Typography.Text strong>{navItems.find(([key]) => key === active)?.[1] || '族谱管理'}</Typography.Text></div>
          <Space>{renderModuleActions()}<CurrentUserMenu onLogout={logout} /></Space>
        </Header>
        <Content className="content content--compact antd-content"><div className={`business-page business-page--${active}`} key={`${active}-${routeKey}-${pageEntryVersion}`}>{renderPage()}</div></Content>
      </Layout>
    </Layout>
  );
}
