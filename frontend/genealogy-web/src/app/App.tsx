import { useMemo, useState } from 'react';
import { WorkspaceProvider } from '../shared/context/WorkspaceContext';
import { AuthPage } from '../features/auth/AuthPage';
import { BranchPage } from '../features/branches/BranchPage';
import { ClanPage } from '../features/clans/ClanPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { GenerationPage } from '../features/generations/GenerationPage';
import { ImportExportPage } from '../features/importExport/ImportExportPage';
import { LogPage } from '../features/logs/LogPage';
import { MemberPage } from '../features/members/MemberPage';
import { PersonPage } from '../features/persons/PersonPage';
import { RelationshipPage } from '../features/relationships/RelationshipPage';
import { ReviewPage } from '../features/reviews/ReviewPage';
import { SourcePage } from '../features/sources/SourcePage';
import { TreePage } from '../features/tree/TreePage';

const navItems = [
  ['dashboard', '工作台', '宗族概览、待办审核和运营数据'],
  ['auth', '登录认证', '账号登录和会话管理'],
  ['clanCreate', '宗族创建', '创建宗族档案'],
  ['clanQuery', '宗族查询', '查看宗族列表'],
  ['memberManage', '成员权限', '成员角色和支派范围权限'],
  ['branchCreate', '支派创建', '新增支派'],
  ['branchQuery', '支派查询', '查询支派树'],
  ['generations', '字辈管理', '字辈方案和代次字辈'],
  ['personCreate', '人物创建', '录入人物档案'],
  ['personQuery', '人物查询', '查询人物列表和详情'],
  ['relationshipCreate', '关系创建', '关系预检和创建'],
  ['relationshipQuery', '关系查询', '查询人物关系'],
  ['sourceCreate', '来源创建', '创建资料来源'],
  ['sourceBind', '来源绑定', '绑定证据到业务对象'],
  ['attachmentManage', '附件管理', '上传和下载附件'],
  ['reviewSubmit', '提交审核', '提交变更进入审核流'],
  ['reviewProcess', '审核处理', '待审核任务查询和审批'],
  ['tree', '世系图谱', '家庭图、上溯、下延'],
  ['importExport', '导入导出', '人物/关系 CSV'],
  ['logs', '日志审计', '查询、统计和导出']
] as const;

type ViewKey = typeof navItems[number][0];

export function App() {
  return (
    <WorkspaceProvider>
      <AppShell />
    </WorkspaceProvider>
  );
}

function AppShell() {
  const [active, setActive] = useState<ViewKey>('dashboard');
  const activeMeta = useMemo(() => navItems.find(item => item[0] === active)!, [active]);

  function notify() {
    // Page-level result components handle user-facing feedback.
  }

  function onChanged() {
    // Login state is persisted by the API client; no developer token panel is shown in the UI.
  }

  function renderPage() {
    const props = { notify };
    switch (active) {
      case 'dashboard': return <DashboardPage {...props} />;
      case 'auth': return <AuthPage notify={notify} onChanged={onChanged} />;
      case 'clanCreate': return <ClanPage {...props} mode="create" />;
      case 'clanQuery': return <ClanPage {...props} mode="query" />;
      case 'memberManage': return <MemberPage {...props} />;
      case 'branchCreate': return <BranchPage {...props} mode="create" />;
      case 'branchQuery': return <BranchPage {...props} mode="query" />;
      case 'generations': return <GenerationPage {...props} />;
      case 'personCreate': return <PersonPage {...props} mode="create" />;
      case 'personQuery': return <PersonPage {...props} mode="query" />;
      case 'relationshipCreate': return <RelationshipPage {...props} mode="create" />;
      case 'relationshipQuery': return <RelationshipPage {...props} mode="query" />;
      case 'sourceCreate': return <SourcePage {...props} mode="sourceCreate" />;
      case 'sourceBind': return <SourcePage {...props} mode="bind" />;
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
    </div>
  );
}
