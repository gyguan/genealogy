import { useEffect, useMemo, useState } from 'react';
import { Button, ConfigProvider, Layout, Menu, Space, Tag, Tooltip, Typography, theme } from 'antd';
import { apiClient } from '../shared/api/client';
import { useWorkspace, WorkspaceProvider } from '../shared/context/WorkspaceContext';
import { homeService } from '../shared/services/homeService';
import { ToastStack } from '../shared/ui/ToastStack';
import type { ToastItem } from '../shared/ui/ToastStack';
import { AuthPage } from '../features/auth/AuthPage';
import { CurrentUserMenu } from '../features/auth/CurrentUserMenu';
import { ImportPage } from '../features/imports/ImportPage';
import { StatisticsHomePage } from '../features/home/StatisticsHomePage';
import { LogPage } from '../features/logs/LogPage';
import { MemberPage } from '../features/members/MemberPage';
import { Mvp1WizardPage } from '../features/mvp1/Mvp1WizardPage';
import { PersonArchiveSearchPage } from '../features/persons/PersonArchiveSearchPage';
import { CultureProductPage, EditingWorkspaceProductPage, SourceLibraryProductPage } from '../features/experience/GenealogyExperiencePages';
import { ReviewCenterPage } from '../features/reviews/ReviewCenterPage';
import { SourceAttachmentPage } from '../features/sources/SourceAttachmentPage';
import { LineageTreeProductPage } from '../features/tree/LineageTreeProductPage';

const { Sider, Content, Header } = Layout;

type ClanSummary = { id?: number | string; clanName?: string; name?: string; surname?: string; hallName?: string };
const navItems = [['home', '族谱首页', '统计概览'], ['mvp1Wizard', '建谱向导', '创建宗族、支派、字辈、人物、关系、来源和审核'], ['treeProduct', '世系图谱', '按上溯祖先、中心人物、下延后代查看世系'], ['personArchive', '人物档案', '按姓名、字辈、性别、支派检索人物并查看档案'], ['sourceLibrary', '来源资料库', '族谱原文、地方志、照片和口述记录'], ['sourceAttachments', '来源附件', '管理来源资料附件上传、查看和维护'], ['editingWorkspace', '修谱工作台', '导入、合并、补全和关系校验'], ['imports', '导入管理', '族谱数据导入任务、结果和异常处理'], ['reviewCenter', '审核中心', '入谱变更、资料复核和批量审核'], ['memberManage', '成员权限', '宗族成员、角色和权限配置'], ['auditTrace', '追踪中心', '操作日志、审核流和字段Diff完整追踪'], ['culture', '宗族文化', '姓氏源流、堂号、家训、迁徙和祠堂']] as const;
type ViewKey = typeof navItems[number][0];

function getMessage(data: unknown, fallback: string) { if (typeof data === 'string') return data; if (data && typeof data === 'object') { const record = data as Record<string, any>; return record.message || record.errorMessage || record.status || fallback; } return fallback; }
function clanDisplayName(clan?: ClanSummary | null) { const name = clan?.clanName || clan?.name || clan?.surname || ''; return `${name || '未选择宗族'}${clan?.hallName ? ` · ${clan.hallName}` : ''}`; }
function recordList<T>(data: unknown): T[] { if (Array.isArray(data)) return data as T[]; const record = data as { records?: T[]; items?: T[]; content?: T[] }; return record?.records || record?.items || record?.content || []; }

export function App() {
  return <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: '#1677ff', colorInfo: '#1677ff', colorSuccess: '#52c41a', colorWarning: '#faad14', colorError: '#ff4d4f', colorBgLayout: '#f5f5f5', colorBgContainer: '#ffffff', colorBorder: '#d9d9d9', colorText: 'rgba(0, 0, 0, 0.88)', colorTextSecondary: 'rgba(0, 0, 0, 0.65)', borderRadius: 8, borderRadiusLG: 12, controlHeight: 32, controlHeightLG: 40, fontSize: 14, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif', boxShadowTertiary: '0 1px 2px rgba(0, 0, 0, 0.03)' }, components: { Layout: { bodyBg: '#f5f5f5', siderBg: '#ffffff', headerBg: '#ffffff' }, Menu: { itemBorderRadius: 8, itemHeight: 40, itemMarginBlock: 4, itemMarginInline: 8 }, Card: { borderRadiusLG: 12, headerHeight: 48, paddingLG: 16 }, Table: { headerBg: '#fafafa', rowHoverBg: '#f5faff', cellPaddingBlockSM: 8, cellPaddingInlineSM: 12 }, Form: { itemMarginBottom: 12, labelColor: 'rgba(0, 0, 0, 0.65)' } } }}><WorkspaceProvider><AppShell /></WorkspaceProvider></ConfigProvider>;
}

function AppShell() {
  const workspace = useWorkspace();
  const [active, setActive] = useState<ViewKey>('home');
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(apiClient.getToken()));
  const [clans, setClans] = useState<ClanSummary[]>([]);
  const currentClan = useMemo(() => clans.find(clan => String(clan.id) === String(workspace.clanId || '')) || null, [clans, workspace.clanId]);
  const currentModule = navItems.find(([key]) => key === active)?.[1] || '族谱管理';

  function closeToast(id: number) { setToasts(prev => prev.filter(item => item.id !== id)); }
  function notify(data?: unknown, error = false) { const id = Date.now() + Math.floor(Math.random() * 1000); const item: ToastItem = { id, message: getMessage(data, error ? '操作失败，请稍后重试' : '操作成功'), type: error ? 'error' : 'success' }; setToasts(prev => [...prev.slice(-3), item]); window.setTimeout(() => closeToast(id), 3200); }
  function onLoginChanged() { setIsAuthenticated(Boolean(apiClient.getToken())); }
  function logout() { apiClient.post('/auth/logout').catch(() => undefined).finally(() => { apiClient.clearToken(); setIsAuthenticated(false); notify({ message: '已退出登录' }); }); }

  useEffect(() => { const onUnhandled = (event: PromiseRejectionEvent) => { event.preventDefault(); notify({ message: event.reason?.message || '操作失败，请检查输入后重试' }, true); }; window.addEventListener('unhandledrejection', onUnhandled); return () => window.removeEventListener('unhandledrejection', onUnhandled); }, []);
  useEffect(() => { if (!isAuthenticated) { setClans([]); return; } let alive = true; homeService.listClans().then(data => { if (!alive) return; const nextClans = recordList<ClanSummary>(data); setClans(nextClans); if (!workspace.clanId && nextClans[0]?.id) workspace.setClanId(String(nextClans[0].id)); }).catch(() => { if (alive) setClans([]); }); return () => { alive = false; }; }, [isAuthenticated, workspace.clanId]);

  function renderPage() { switch (active) { case 'home': return <StatisticsHomePage />; case 'mvp1Wizard': return <Mvp1WizardPage notify={notify} />; case 'treeProduct': return <LineageTreeProductPage notify={notify} />; case 'personArchive': return <PersonArchiveSearchPage notify={notify} />; case 'sourceLibrary': return <SourceLibraryProductPage />; case 'sourceAttachments': return <SourceAttachmentPage notify={notify} />; case 'editingWorkspace': return <EditingWorkspaceProductPage />; case 'imports': return <ImportPage notify={notify} />; case 'reviewCenter': return <ReviewCenterPage notify={notify} />; case 'memberManage': return <MemberPage notify={notify} />; case 'auditTrace': return <LogPage notify={notify} />; case 'culture': return <CultureProductPage />; default: return null; } }

  if (!isAuthenticated) return <><AuthPage notify={notify} onChanged={onLoginChanged} standalone /><ToastStack items={toasts} onClose={closeToast} /></>;
  return <Layout className="admin-layout antd-admin-layout"><Sider className="sidebar antd-sidebar" width={248} breakpoint="lg" collapsedWidth={0}><div className="brand antd-brand"><Typography.Title level={4}>Genealogy</Typography.Title><Typography.Text type="secondary">族谱管理平台</Typography.Text></div><Menu mode="inline" theme="light" selectedKeys={[active]} onClick={info => setActive(info.key as ViewKey)} items={navItems.map(([key, label]) => ({ key, label }))} /></Sider><Layout className="antd-main-layout"><Header className="github-like-header"><div className="github-like-header-title"><Typography.Text type="secondary">当前模块</Typography.Text><Typography.Text strong>{currentModule}</Typography.Text></div><Space className="github-like-header-actions" size="small" wrap><Tooltip title="当前宗族作为支派、人物、来源和审核的业务范围"><Tag color={currentClan ? 'processing' : 'default'}>当前宗族：{clanDisplayName(currentClan)}</Tag></Tooltip><Button size="small" type={active === 'mvp1Wizard' ? 'primary' : 'default'} onClick={() => setActive('mvp1Wizard')}>建谱向导</Button><Button size="small" onClick={() => setActive('treeProduct')}>世系图谱</Button><Button size="small" onClick={() => setActive('reviewCenter')}>审核中心</Button><CurrentUserMenu onLogout={logout} /></Space></Header><Content className="content content--compact antd-content">{renderPage()}</Content></Layout><ToastStack items={toasts} onClose={closeToast} /></Layout>;
}
