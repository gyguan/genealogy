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
import { PersonPage } from '../features/persons/PersonPage';
import { GenealogyProductPrototype } from '../features/prototype/GenealogyProductPrototype';
import { RelationshipPage } from '../features/relationships/RelationshipPage';
import { ReviewPage } from '../features/reviews/ReviewPage';
import { SourcePage } from '../features/sources/SourcePage';
import { TreePage } from '../features/tree/TreePage';

const navItems = [
  ['prototype', '新版原型', '树谱优先的人物档案、证据和审核体验'],
  ['dashboard', '工作台', '宗族概览、待办审核和运营数据'],
  ['auth', '登录认证', '账号登录和会话管理'],
  ['clans', '宗族管理', '查询宗族、创建和维护宗族档案'],
  ['memberManage', '成员权限', '成员角色和支派范围权限'],
  ['branches', '支派管理', '查询支派树、创建和维护支派'],
  ['generations', '字辈管理', '字辈方案和代次字辈'],
  ['persons', '人物管理', '查询人物、创建和维护人物档案'],
  ['relationships', '关系管理', '查询关系、预检和维护亲缘关系'],
  ['sources', '来源管理', '查询来源、创建来源和维护绑定'],
  ['attachmentManage', '附件管理', '上传和下载附件'],
  ['reviewSubmit', '提交审核', '提交变更进入审核流'],
  ['reviewProcess', '审核处理', '待审核任务查询和审批'],
  ['tree', '世系图谱', '家庭图、上溯、下延'],
  ['importExport', '导入导出', '人物/关系 CSV'],
  ['logs', '日志审计', '查询、统计和导出']
] as const;

type ViewKey = typeof navItems[number][0];

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
  const [active, setActive] = useState<ViewKey>('prototype');
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

  function renderPage() {
    const props = { notify };
    switch (active) {
      case 'prototype': return <GenealogyProductPrototype />;
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
