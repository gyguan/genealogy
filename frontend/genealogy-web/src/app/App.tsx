import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../shared/api/client';
import { DataBlock } from '../shared/ui/DataBlock';
import { AuthPage } from '../features/auth/AuthPage';
import { BranchPage } from '../features/branches/BranchPage';
import { ClanPage } from '../features/clans/ClanPage';
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
  ['auth', '登录认证', '用户注册、登录和会话管理'],
  ['clans', '宗族管理', '宗族创建、列表和管理员自举'],
  ['members', '成员权限', '成员角色和支派范围权限'],
  ['branches', '支派管理', '支派树和支派归属'],
  ['generations', '字辈管理', '字辈方案和代次字辈'],
  ['persons', '人物档案', '人物录入、查询、隐私脱敏'],
  ['relationships', '关系管理', '关系预检、创建和查询'],
  ['sources', '来源附件', '来源证据链和附件上传下载'],
  ['reviews', '审核中心', '提交审核、diff、通过和驳回'],
  ['tree', '世系图谱', '家庭图、上溯、下延'],
  ['importExport', '导入导出', '人物/关系 CSV'],
  ['logs', '日志审计', '查询、统计和导出']
] as const;

type ViewKey = typeof navItems[number][0];

export function App() {
  const [active, setActive] = useState<ViewKey>('auth');
  const [apiBase, setApiBase] = useState(apiClient.getBaseUrl());
  const [token, setToken] = useState(apiClient.getToken());
  const [status, setStatus] = useState<unknown>('等待操作');
  const activeMeta = useMemo(() => navItems.find(item => item[0] === active)!, [active]);

  useEffect(() => {
    void healthCheck('应用加载');
    const onUnhandled = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      setStatus({ error: true, message: event.reason?.message || String(event.reason) });
    };
    window.addEventListener('unhandledrejection', onUnhandled);
    return () => window.removeEventListener('unhandledrejection', onUnhandled);
  }, []);

  async function healthCheck(context: string) {
    try {
      const data = await apiClient.get('/health');
      setStatus({ status: '后端连接正常', context, data });
    } catch (error) {
      setStatus({ status: '后端连接失败', context, message: String((error as Error).message || error) });
    }
  }

  function notify(data: unknown, error = false) {
    setStatus(error ? { error: true, data } : data);
  }

  function saveApiBase(value: string) {
    apiClient.setBaseUrl(value);
    setApiBase(apiClient.getBaseUrl());
    void healthCheck('切换 API 地址');
  }

  function saveToken(value: string) {
    apiClient.setToken(value);
    setToken(apiClient.getToken());
  }

  function onChanged() {
    setToken(apiClient.getToken());
  }

  function renderPage() {
    const props = { notify };
    switch (active) {
      case 'auth': return <AuthPage notify={notify} onChanged={onChanged} />;
      case 'clans': return <ClanPage {...props} />;
      case 'members': return <MemberPage {...props} />;
      case 'branches': return <BranchPage {...props} />;
      case 'generations': return <GenerationPage {...props} />;
      case 'persons': return <PersonPage {...props} />;
      case 'relationships': return <RelationshipPage {...props} />;
      case 'sources': return <SourcePage {...props} />;
      case 'reviews': return <ReviewPage {...props} />;
      case 'tree': return <TreePage {...props} />;
      case 'importExport': return <ImportExportPage {...props} />;
      case 'logs': return <LogPage {...props} />;
      default: return null;
    }
  }

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="brand"><strong>Genealogy</strong><span>MVP1 Console</span></div>
        <nav>
          {navItems.map(item => (
            <button key={item[0]} className={active === item[0] ? 'active' : ''} onClick={() => { setActive(item[0]); void healthCheck(`进入${item[1]}`); }}>
              <span>{item[1]}</span><small>{item[2]}</small>
            </button>
          ))}
        </nav>
      </aside>
      <main className="content">
        <header className="topbar">
          <div>
            <h1>{activeMeta[1]}</h1>
            <p>{activeMeta[2]}</p>
          </div>
          <div className="env-card">
            <label>API Base</label>
            <input value={apiBase} onChange={e => saveApiBase(e.target.value)} />
            <label>Token</label>
            <input value={token} onChange={e => saveToken(e.target.value)} placeholder="登录后自动填充" />
          </div>
        </header>
        <section className="status-card"><DataBlock data={status} /></section>
        {renderPage()}
      </main>
    </div>
  );
}
