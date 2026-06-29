import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { Actions } from '../../shared/ui/Form';
import { Panel } from '../../shared/ui/Panel';
import { ResultNotice } from '../../shared/ui/ResultNotice';
import { useWorkspace } from '../../shared/context/WorkspaceContext';

type DashboardSummary = {
  clanCount: string | number;
  pendingReviewCount: string | number;
  logCount: string | number;
  treeNodeCount: string | number;
};

export function DashboardPage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const workspace = useWorkspace();
  const [result, setResult] = useState<unknown>();
  const [summary, setSummary] = useState<DashboardSummary>({ clanCount: '-', pendingReviewCount: '-', logCount: '-', treeNodeCount: '-' });

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
    const next: DashboardSummary = {
      clanCount: clans?.total ?? clans?.records?.length ?? 0,
      pendingReviewCount,
      logCount,
      treeNodeCount
    };
    setSummary(next);
    const notice = { message: '工作台数据已更新' };
    setResult(notice);
    notify(notice);
  }

  return (
    <div className="page-grid">
      <Panel title="运营概览" description="展示宗族、审核、日志和世系的关键运营数据。">
        <div className="metric-grid">
          <div className="metric"><span>宗族数</span><strong>{summary.clanCount}</strong></div>
          <div className="metric"><span>待审核</span><strong>{summary.pendingReviewCount}</strong></div>
          <div className="metric"><span>日志总数</span><strong>{summary.logCount}</strong></div>
          <div className="metric"><span>世系节点</span><strong>{summary.treeNodeCount}</strong></div>
        </div>
        <Actions><button onClick={loadSummary}>刷新数据</button></Actions>
        <ResultNotice result={result} />
      </Panel>
    </div>
  );
}
