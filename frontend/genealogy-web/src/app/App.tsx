import { useEffect, useState } from 'react';
import { ConfigProvider, Layout, Menu, Space, Spin, Typography, theme } from 'antd';
import { apiClient } from '../shared/api/client';
import { WorkspaceProvider } from '../shared/context/WorkspaceContext';
import { ToastStack } from '../shared/ui/ToastStack';
import type { ToastItem } from '../shared/ui/ToastStack';
import { AuthPage } from '../features/auth/AuthPage';
import { CurrentUserMenu } from '../features/auth/CurrentUserMenu';
import { BookletActions } from '../features/booklets/BookletActions';
import { PersonDataExportActions } from '../features/exports/PersonDataExportActions';
import { ImportPage } from '../features/imports/ImportPage';
import { StatisticsHomePage } from '../features/home/StatisticsHomePage';
import { LogPage } from '../features/logs/LogPage';
import { MemberInvitationAction } from '../features/members/MemberInvitationAction';
import { MemberPage } from '../features/members/MemberPage';
import { Mvp1WizardPage } from '../features/mvp1/Mvp1WizardPage';
import { PersonArchiveSearchPage } from '../features/persons/PersonArchiveSearchPage';
import { CultureProductPage } from '../features/experience/GenealogyExperiencePages';
import { ReviewCenterPage } from '../features/reviews/ReviewCenterPage';
import { SourceLibraryFocusBridge } from '../features/sources/SourceLibraryFocusBridge';
import { SourceLibraryPage } from '../features/sources/SourceLibraryPage';
import { LineageTreeProductPage } from '../features/tree/LineageTreeProductPage';
import { EditingWorkspacePage } from '../features/workbench/EditingWorkspacePage';

const { Sider, Content, Header } = Layout;

const navItems = [
  ['home', '族谱首页', '统计概览'],
  ['mvp1Wizard', '建谱向导', '创建宗族、支派、字辈、人物、关系、来源和审核'],
  ['treeProduct', '世系图谱', '按上溯祖先、中心人物、下延后代查看世系'],
  ['personArchive', '人物档案', '按姓名、字辈、性别、支派检索人物并查看档案'],
  ['sourceLibrary', '来源资料库', '族谱原文、地方志、照片和口述记录'],
  ['editingWorkspace', '修谱工作台', '修谱问题任务池、风险检查和审核前处理'],
  ['imports', '导入管理', '族谱数据导入任务、结果和异常处理'],
  ['reviewCenter', '审核中心', '入谱变更、资料复核和批量审核'],
  ['memberManage', '成员权限', '宗族成员、角色和权限配置'],
  ['auditTrace', '追踪中心', '操作日志、审核流和字段Diff完整追踪'],
  ['culture', '宗族文化', '姓氏源流、堂号、家训、迁徙和祠堂']
] as const;

type ViewKey = typeof navItems[number][0];
type AuthStatus = 'checking' | 'authenticated' | 'anonymous';

function getMessage(data: unknown, fallback: string) {
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object') {
    const record = data as Record<string, any>;
    return record.message || record.errorMessage || record.status || fallback;
  }
  return fallback;
}

export function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          colorInfo: '#1677ff',
          colorSuccess: '#52c41a',
          colorWarning: '#faad14',
          colorError: '#ff4d4f',
          colorBgLayout: '#f5f5f5',
          colorBgContainer: '#ffffff',
          colorBorder: '#d9d9d9',
          colorText: 'rgba(0, 0, 0, 0.88)',
          colorTextSecondary: 'rgba(0, 0, 0, 0.65)',
          borderRadius: 8,
          borderRadiusLG: 12,
          controlHeight: 32,
          controlHeightLG: 40,
          fontSize: 14,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif',
          boxShadowTertiary: '0 1px 2px rgba(0, 0, 0, 0.03)'
        },
        components: {
          Layout: { bodyBg: '#f5f5f5', siderBg: '#ffffff', headerBg: '#ffffff' },
          Menu: { itemBorderRadius: 8, itemHeight: 40, itemMarginBlock: 4, itemMarginInline: 8 },
          Card: { borderRadiusLG: 12, headerHeight: 48, paddingLG: 16 },
          Table: { headerBg: '#fafafa', rowHoverBg: '#f5faff', cellPaddingBlockSM: 8, cellPaddingInlineSM: 12 },
          Form: { itemMarginBottom: 12, labelColor: 'rgba(0, 0, 0, 0.65)' }
        }
      }}
    >
      <WorkspaceProvider>
        <AppShell />
      </WorkspaceProvider>
    </ConfigProvider>
  );
}

function AppShell() {
  const [active, setActive] = useState<ViewKey>('home');
  const [pageEntryVersion, setPageEntryVersion] = useState(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking');

  function closeToast(id: number) {
    setToasts(prev => prev.filter(item => item.id !== id));
  }

  function notify(data?: unknown, error = false) {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const item: ToastItem = {
      id,
      message: getMessage(data, error ? '操作失败，请稍后重试' : '操作成功'),
      type: error ? 'error' : 'success'
    };
    setToasts(prev => [...prev.slice(-3), item]);
    window.setTimeout(() => closeToast(id), 3200);
  }

  function onLoginChanged() {
    setAuthStatus('authenticated');
  }

  function logout() {
    apiClient.post('/auth/logout').catch(() => undefined).finally(() => {
      apiClient.clearToken();
      setAuthStatus('anonymous');
      notify({ message: '已退出登录' });
    });
  }

  useEffect(() => {
    let activeRequest = true;
    apiClient.get('/auth/me')
      .then(() => {
        if (activeRequest) setAuthStatus('authenticated');
      })
      .catch(() => {
        if (activeRequest) setAuthStatus('anonymous');
      });

    const onUnauthorized = () => {
      apiClient.clearToken();
      setAuthStatus('anonymous');
    };
    window.addEventListener('genealogy:unauthorized', onUnauthorized);
    return () => {
      activeRequest = false;
      window.removeEventListener('genealogy:unauthorized', onUnauthorized);
    };
  }, []);

  useEffect(() => {
    const onUnhandled = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      notify({ message: event.reason?.message || '操作失败，请检查输入后重试' }, true);
    };
    window.addEventListener('unhandledrejection', onUnhandled);
    return () => window.removeEventListener('unhandledrejection', onUnhandled);
  }, []);

  function enterPage(key: ViewKey) {
    setActive(key);
    setPageEntryVersion(prev => prev + 1);
  }

  function renderPage() {
    switch (active) {
      case 'home': return <StatisticsHomePage />;
      case 'mvp1Wizard': return <Mvp1WizardPage notify={notify} />;
      case 'treeProduct': return <LineageTreeProductPage notify={notify} />;
      case 'personArchive': return <PersonArchiveSearchPage notify={notify} />;
      case 'sourceLibrary': return <><SourceLibraryFocusBridge /><SourceLibraryPage notify={notify} /></>;
      case 'editingWorkspace': return <EditingWorkspacePage onNavigate={enterPage} />;
      case 'imports': return <ImportPage notify={notify} />;
      case 'reviewCenter': return <ReviewCenterPage notify={notify} />;
      case 'memberManage': return <MemberPage notify={notify} />;
      case 'auditTrace': return <LogPage notify={notify} />;
      case 'culture': return <CultureProductPage />;
      default: return null;
    }
  }

  function renderModuleActions() {
    if (active === 'personArchive') return <PersonDataExportActions notify={notify} />;
    if (active === 'treeProduct') return <BookletActions notify={notify} />;
    if (active === 'memberManage') return <MemberInvitationAction notify={notify} />;
    return null;
  }

  if (authStatus === 'checking') {
    return (
      <div className="commercial-auth-shell" aria-label="正在检查登录状态">
        <Space direction="vertical" align="center" size={16}>
          <Spin size="large" />
          <Typography.Text type="secondary">正在安全验证登录状态…</Typography.Text>
        </Space>
      </div>
    );
  }

  if (authStatus === 'anonymous') {
    return (
      <>
        <AuthPage notify={notify} onChanged={onLoginChanged} standalone />
        <ToastStack items={toasts} onClose={closeToast} />
      </>
    );
  }

  return (
    <Layout className="admin-layout antd-admin-layout">
      <Sider className="sidebar antd-sidebar" width={248} breakpoint="lg" collapsedWidth={0}>
        <div className="brand antd-brand"><Typography.Title level={4}>Genealogy</Typography.Title><Typography.Text type="secondary">族谱管理平台</Typography.Text></div>
        <Menu
          mode="inline"
          theme="light"
          selectedKeys={[active]}
          onClick={info => enterPage(info.key as ViewKey)}
          items={navItems.map(([key, label]) => ({ key, label }))}
        />
      </Sider>
      <Layout className="antd-main-layout">
        <Header className="github-like-header">
          <div className="github-like-header-title">
            <Typography.Text type="secondary">当前模块</Typography.Text>
            <Typography.Text strong>{navItems.find(([key]) => key === active)?.[1] || '族谱管理'}</Typography.Text>
          </div>
          <Space>
            {renderModuleActions()}
            <CurrentUserMenu onLogout={logout} />
          </Space>
        </Header>
        <Content className="content content--compact antd-content">
          <div key={`${active}-${pageEntryVersion}`}>{renderPage()}</div>
        </Content>
      </Layout>
      <ToastStack items={toasts} onClose={closeToast} />
    </Layout>
  );
}
