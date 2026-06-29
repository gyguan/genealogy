import { useEffect, useState } from 'react';
import { WorkspaceProvider } from '../shared/context/WorkspaceContext';
import { ToastStack } from '../shared/ui/ToastStack';
import type { ToastItem } from '../shared/ui/ToastStack';
import { AuthPage } from '../features/auth/AuthPage';
import { BranchPage } from '../features/branches/BranchPage';
import { ClanPage } from '../features/clans/ClanPage';
import { GenerationPage } from '../features/generations/GenerationPage';
import { StatisticsHomePage } from '../features/home/StatisticsHomePage';
import { LogPage } from '../features/logs/LogPage';
import { MemberPage } from '../features/members/MemberPage';
import { Mvp1WizardPage } from '../features/mvp1/Mvp1WizardPage';
import { PersonArchiveSearchPage } from '../features/persons/PersonArchiveSearchPage';
import {
  CultureProductPage,
  EditingWorkspaceProductPage,
  ReviewCenterProductPage,
  SourceLibraryProductPage
} from '../features/experience/GenealogyExperiencePages';
import { RelationshipPage } from '../features/relationships/RelationshipPage';
import { LineageTreeProductPage } from '../features/tree/LineageTreeProductPage';

const navItems = [
  ['home', '族谱首页', '统计概览'],
  ['mvp1Wizard', 'MVP1建谱向导', '创建宗族、支派、字辈、人物、关系、来源、审核和世系'],
  ['treeProduct', '世系图谱', '按上溯祖先、中心人物、下延后代查看世系'],
  ['personArchive', '人物档案', '按姓名、字辈、性别、支派检索人物并查看档案'],
  ['sourceLibrary', '来源资料库', '族谱原文、地方志、照片和口述记录'],
  ['editingWorkspace', '修谱工作台', '导入、合并、补全和关系校验'],
  ['reviewCenter', '审核中心', '入谱变更、资料复核和批量审核'],
  ['culture', '宗族文化', '姓氏源流、堂号、家训、迁徙和祠堂'],
  ['system', '基础数据管理', '认证、宗族、权限、字辈、关系和日志']
] as const;

type ViewKey = typeof navItems[number][0];
type LegacyKey = 'auth' | 'clans' | 'memberManage' | 'branches' | 'generations' | 'relationships' | 'logs';

const legacyTabs: [LegacyKey, string][] = [
  ['auth', '登录认证'],
  ['clans', '宗族'],
  ['memberManage', '成员权限'],
  ['branches', '支派'],
  ['generations', '字辈'],
  ['relationships', '关系'],
  ['logs', '日志']
];

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
    <WorkspaceProvider>
      <AppShell />
    </WorkspaceProvider>
  );
}

function AppShell() {
  const [active, setActive] = useState<ViewKey>('home');
  const [legacyActive, setLegacyActive] = useState<LegacyKey>('auth');
  const [toasts, setToasts] = useState<ToastItem[]>([]);

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

  useEffect(() => {
    const onUnhandled = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      notify({ message: event.reason?.message || '操作失败，请检查输入后重试' }, true);
    };
    window.addEventListener('unhandledrejection', onUnhandled);
    return () => window.removeEventListener('unhandledrejection', onUnhandled);
  }, []);

  function onChanged() {}

  function renderLegacyPage() {
    const props = { notify };
    switch (legacyActive) {
      case 'auth': return <AuthPage notify={notify} onChanged={onChanged} />;
      case 'clans': return <ClanPage {...props} />;
      case 'memberManage': return <MemberPage {...props} />;
      case 'branches': return <BranchPage {...props} />;
      case 'generations': return <GenerationPage {...props} />;
      case 'relationships': return <RelationshipPage {...props} />;
      case 'logs': return <LogPage {...props} />;
      default: return null;
    }
  }

  function renderPage() {
    switch (active) {
      case 'home': return <StatisticsHomePage />;
      case 'mvp1Wizard': return <Mvp1WizardPage notify={notify} />;
      case 'treeProduct': return <LineageTreeProductPage notify={notify} />;
      case 'personArchive': return <PersonArchiveSearchPage notify={notify} />;
      case 'sourceLibrary': return <SourceLibraryProductPage />;
      case 'editingWorkspace': return <EditingWorkspaceProductPage />;
      case 'reviewCenter': return <ReviewCenterProductPage />;
      case 'culture': return <CultureProductPage />;
      case 'system': return (
        <div className="system-management">
          <div className="system-tabs">
            {legacyTabs.map(tab => <button key={tab[0]} className={legacyActive === tab[0] ? 'active' : ''} onClick={() => setLegacyActive(tab[0])}>{tab[1]}</button>)}
          </div>
          {renderLegacyPage()}
        </div>
      );
      default: return null;
    }
  }

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="brand"><strong>Genealogy</strong><span>族谱管理平台</span></div>
        <nav>
          {navItems.map(item => (
            <button key={item[0]} className={active === item[0] ? 'active' : ''} onClick={() => setActive(item[0])}>
              <span>{item[1]}</span><small>{item[2]}</small>
            </button>
          ))}
        </nav>
      </aside>
      <main className="content content--compact">
        {renderPage()}
      </main>
      <ToastStack items={toasts} onClose={closeToast} />
    </div>
  );
}
