import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { Actions, Field } from '../../shared/ui/Form';
import { Panel } from '../../shared/ui/Panel';
import { ResultNotice } from '../../shared/ui/ResultNotice';
import { useWorkspace } from '../../shared/context/WorkspaceContext';

export function DashboardPage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const workspace = useWorkspace();
  const [health, setHealth] = useState<unknown>();
  const [summary, setSummary] = useState({ clanCount: '-', pendingReviewCount: '-', logCount: '-', treeNodeCount: '-' });

  async function checkHealth() {
    await apiClient.get('/health');
    const result = { message: '后端连接正常' };
    setHealth(result);
    notify(result);
  }

  async function loadSummary() {
    const clanId = workspace.clanId;
    const clans: any = await apiClient.get('/clans');
    let pendingReviewCount: string | number = '-';
    let logCount: string | number = '-';
    let treeNodeCount: string | number = '-';
    if (clanId) {
      const pending: any = await apiClient.get(`/clans/${clanId}/review-tasks/pending`);
      const logs: any = await apiClient.get(`/logs/operations/stats?clanId=${clanId}`);
      pendingReviewCount = Array.isArray(pending) ? pending.length : pending?.records?.length || 0;
      logCount = logs?.totalCount ?? '-';
      if (workspace.personId) {
        const tree: any = await apiClient.get(`/tree/person/${workspace.personId}/family`);
        treeNodeCount = tree?.nodes?.length ?? '-';
      }
    }
    const next = {
      clanCount: clans?.total ?? clans?.records?.length ?? 0,
      pendingReviewCount,
      logCount,
      treeNodeCount
    };
    setSummary(next);
    notify({ message: '工作台已刷新' });
  }

  return (
    <div className="page-grid two">
      <Panel title="业务上下文" description="这些 ID 会在各功能页面自动带入，减少重复输入。顶部工作区也可以统一修改。">
        <Field label="当前宗族ID"><input value={workspace.clanId} onChange={e => workspace.setClanId(e.target.value)} placeholder="例如：1" /></Field>
        <Field label="当前支派ID"><input value={workspace.branchId} onChange={e => workspace.setBranchId(e.target.value)} placeholder="例如：1" /></Field>
        <Field label="当前人物ID"><input value={workspace.personId} onChange={e => workspace.setPersonId(e.target.value)} placeholder="例如：1" /></Field>
        <Field label="当前来源ID"><input value={workspace.sourceId} onChange={e => workspace.setSourceId(e.target.value)} placeholder="例如：1" /></Field>
        <Actions><button onClick={checkHealth}>检查后端</button><button className="secondary" onClick={loadSummary}>刷新工作台</button></Actions>
        <ResultNotice result={health} />
      </Panel>
      <Panel title="MVP1 工作台" description="汇总健康状态、待审核任务、日志统计和关键对象上下文。">
        <div className="metric-grid">
          <div className="metric"><span>宗族数</span><strong>{summary.clanCount}</strong></div>
          <div className="metric"><span>待审核</span><strong>{summary.pendingReviewCount}</strong></div>
          <div className="metric"><span>日志总数</span><strong>{summary.logCount}</strong></div>
          <div className="metric"><span>世系节点</span><strong>{summary.treeNodeCount}</strong></div>
          <div className="metric"><span>当前人物</span><strong>{workspace.personId || '-'}</strong></div>
          <div className="metric"><span>当前审核任务</span><strong>{workspace.reviewTaskId || '-'}</strong></div>
        </div>
      </Panel>
    </div>
  );
}
