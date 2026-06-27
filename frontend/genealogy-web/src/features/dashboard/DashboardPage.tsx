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
      if (workspace.personId) result.familyTree = await apiClient.get(`/tree/person/${workspace.personId}/family`);
    }
    setSummary(result);
    notify(result);
  }

  return (
    <div className="page-grid two">
      <Panel title="业务上下文" description="这些 ID 会在各功能页面自动带入，减少重复输入。顶部工作区也可以统一修改。">
        <Field label="当前宗族ID"><input value={workspace.clanId} onChange={e => workspace.setClanId(e.target.value)} placeholder="例如：1" /></Field>
        <Field label="当前支派ID"><input value={workspace.branchId} onChange={e => workspace.setBranchId(e.target.value)} placeholder="例如：1" /></Field>
        <Field label="当前人物ID"><input value={workspace.personId} onChange={e => workspace.setPersonId(e.target.value)} placeholder="例如：1" /></Field>
        <Field label="当前来源ID"><input value={workspace.sourceId} onChange={e => workspace.setSourceId(e.target.value)} placeholder="例如：1" /></Field>
        <Actions><button onClick={checkHealth}>检查后端</button><button className="secondary" onClick={loadSummary}>刷新工作台</button></Actions>
        <DataBlock data={health} />
      </Panel>
      <Panel title="MVP1 工作台" description="汇总健康状态、待审核任务、日志统计和关键对象上下文。">
        <div className="metric-grid">
          <div className="metric"><span>宗族ID</span><strong>{workspace.clanId || '-'}</strong></div>
          <div className="metric"><span>支派ID</span><strong>{workspace.branchId || '-'}</strong></div>
          <div className="metric"><span>人物ID</span><strong>{workspace.personId || '-'}</strong></div>
          <div className="metric"><span>关系ID</span><strong>{workspace.relationshipId || '-'}</strong></div>
          <div className="metric"><span>来源ID</span><strong>{workspace.sourceId || '-'}</strong></div>
          <div className="metric"><span>审核任务ID</span><strong>{workspace.reviewTaskId || '-'}</strong></div>
        </div>
        <DataBlock data={summary} />
      </Panel>
    </div>
  );
}
