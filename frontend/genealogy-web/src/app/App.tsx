import { useEffect, useMemo, useState } from 'react';
import { WorkspaceProvider } from '../shared/context/WorkspaceContext';
import { ToastStack } from '../shared/ui/ToastStack';
import type { ToastItem } from '../shared/ui/ToastStack';
import { AuthPage } from '../features/auth/AuthPage';
import { BranchPage } from '../features/branches/BranchPage';
import { ClanPage } from '../features/clans/ClanPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { GenerationPage } from '../features/generations/GenerationPage';
import { ImportExportPage } from '../features/importExport/ImportExportPage';
import { LogPage } from '../features/logs/LogPage';
import { MemberPage } from '../features/members/MemberPage';
import { Mvp1WizardPage } from '../features/mvp1/Mvp1WizardPage';
import { PersonPage } from '../features/persons/PersonPage';
import {
  CultureProductPage,
  EditingWorkspaceProductPage,
  GenealogyHomePage,
  GenealogyTreeProductPage,
  PersonArchiveProductPage,
  ReviewCenterProductPage,
  SourceLibraryProductPage
} from '../features/experience/GenealogyExperiencePages';
import { RelationshipPage } from '../features/relationships/RelationshipPage';
import { ReviewPage } from '../features/reviews/ReviewPage';
import { SourcePage } from '../features/sources/SourcePage';
import { TreePage } from '../features/tree/TreePage';

const navItems = [
  ['home', '族谱首页', '家族概览、智能线索和最近维护'],
  ['mvp1Wizard', 'MVP1建谱向导', '创建宗族、支派、字辈、人物、关系、来源、审核和世系'],
  ['treeProduct', '世系图谱', '围绕族谱树查看、编辑和补充亲属'],
  ['personArchive', '人物档案', '人物资料、生命事件、亲属和来源'],
  ['sourceLibrary', '来源资料库', '族谱原文、地方志、照片和口述记录'],
  ['editingWorkspace', '修谱工作台', '导入、合并、补全和关系校验'],
  ['reviewCenter', '审核中心', '入谱变更、资料复核和批量审核'],
  ['culture', '宗族文化', '姓氏源流、堂号、家训、迁徙和祠堂'],
  ['system', '基础数据管理', '登录、宗族、人物、关系、导入导出等旧版能力']
] as const;

type ViewKey = typeof navItems[number][0];
type LegacyKey = 'dashboard' | 'auth' | 'clans' | 'memberManage' | 'branches' | 'generations' | 'persons' | 'relationships' | 'sources' | 'attachmentManage' | 'reviewSubmit' | 'reviewProcess' | 'tree' | 'importExport' | 'logs';

const legacyTabs: [LegacyKey, string][] = [
  ['dashboard', '旧版工作台'],
  ['auth', '登录认证'],
  ['clans', '宗族'],
  ['memberManage', '成员权限'],
  ['branches', '支派'],
  ['generations', '字辈'],
  ['persons', '人物'],
  ['relationships', '关系'],
  ['sources', '来源'],
  ['attachmentManage', '附件'],
  ['reviewSubmit', '提交审核'],
  ['reviewProcess', '审核处理'],
  ['tree', '旧版世系'],
  ['importExport', '导入导出'],
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
  const activeMeta = useMemo(() => navItems.find(item => item[0] === active)!, [active]);

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
      case 'dashboard': return <DashboardPage {...props} />;
      case 'auth': return <AuthPage notify={notify} onChanged={onChanged} />;
      case 'clans': return <ClanPage {...props} />;
      case 'memberManage': return <MemberPage {...props} />;
      case 'branches': return <BranchPage {...props} />;
      case 'generations': return <GenerationPage {...props} />;
      case 'persons': return <PersonPage {...props} />;
      case 'relationships': return <RelationshipPage {...props} />;
      case 'sources': return <SourcePage {...props} />;
      case 'attachmentManage': return <SourcePage {...props} mode="attachment" />;
      case 'reviewSubmit': return <ReviewPage {...props} mode="submit" />;
      case 'reviewProcess': return <ReviewPage {...props} mode="process" />;
      case 'tree': return <TreePage {...props} />;
      case 'importExport': return <ImportExportPage {...props} />;
      case 'logs': return <LogPage {...props} />;
      default: return null;
    }
  }

  function renderPage() {
    switch (active) {
      case 'home': return <GenealogyHomePage />;
      case 'mvp1Wizard': return <Mvp1WizardPage notify={notify} />;
      case 'treeProduct': return <GenealogyTreeProductPage />;
      case 'personArchive': return <PersonArchiveProductPage />;
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
      <main className="content">
        <header className="topbar topbar--simple">
          <div>
            <h1>{activeMeta[1]}</h1>
            <p>{activeMeta[2]}</p>
          </div>
        </header>
        {renderPage()}
      </main>
      <ToastStack items={toasts} onClose={closeToast} />
    </div>
  );
}
