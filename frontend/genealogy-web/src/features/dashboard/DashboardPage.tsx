import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { Actions, Field } from '../../shared/ui/Form';
import { DataBlock } from '../../shared/ui/DataBlock';
import { Panel } from '../../shared/ui/Panel';
import { useWorkspace } from '../../shared/context/WorkspaceContext';

export function DashboardPage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const workspace = useWorkspace();
  const [health, setHealth] = useState<unknown>();
  const [summary, setSummary] = useState<unknown>();

  async function checkHealth() {
    const data = await apiClient.get('/health');
    setHealth(data);
    notify(data);
  }

  async function loadSummary() {
    const clanId = workspace.clanId;
    const result: Record<string, unknown> = {};
    result.health = await apiClient.get('/health');
    if (clanId) {
      result.clans = await apiClient.get('/clans');
      result.logs = await apiClient.get(`/logs/operations/stats?clanId=${clanId}`);
      result.pendingReviews = await apiClient.get(`/clans/${clanId}/review-tasks/pending`);
    }
    setSummary(result);
    notify(result);
  }

  return (
    <div className="page-grid two">
      <Panel title="业务上下文" description="商用版前端会复用这些 ID，减少在各页面反复输入。">
        <Field label="当前宗族ID"><input value={workspace.clanId} onChange={e => workspace.setClanId(e.target.value)} placeholder="例如：1" /></Field>
        <Field label="当前支派ID"><input value={workspace.branchId} onChange={e => workspace.setBranchId(e.target.value)} placeholder="例如：1" /></Field>
        <Field label="当前人物ID"><input value={workspace.personId} onChange={e => workspace.setPersonId(e.target.value)} placeholder="例如：1" /></Field>
        <Actions><button onClick={checkHealth}>检查后端</button><button className="secondary" onClick={loadSummary}>刷新工作台</button></Actions>
        <DataBlock data={health} />
      </Panel>
      <Panel title="MVP1 工作台" description="汇总健康状态、待审核任务和日志统计，作为商用管理台首页。">
        <div className="metric-grid">
          <div className="metric"><span>宗族ID</span><strong>{workspace.clanId || '-'}</strong></div>
          <div className="metric"><span>支派ID</span><strong>{workspace.branchId || '-'}</strong></div>
          <div className="metric"><span>人物ID</span><strong>{workspace.personId || '-'}</strong></div>
        </div>
        <DataBlock data={summary} />
      </Panel>
    </div>
  );
}
