import { useEffect, useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { toRecordList } from '../../shared/ui/DataTable';

type StatValue = number | string;

type HomeStats = {
  clans: StatValue;
  branches: StatValue;
  people: StatValue;
  sources: StatValue;
  pendingReviews: StatValue;
  logs: StatValue;
};

const emptyStats: HomeStats = {
  clans: '-',
  branches: '-',
  people: '-',
  sources: '-',
  pendingReviews: '-',
  logs: '-'
};

export function StatisticsHomePage() {
  const workspace = useWorkspace();
  const [stats, setStats] = useState<HomeStats>(emptyStats);
  const [loading, setLoading] = useState(false);

  async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn();
    } catch {
      return fallback;
    }
  }

  async function loadStats() {
    setLoading(true);
    try {
      const clanRows = toRecordList(await safe(() => apiClient.get('/clans'), []));
      const clanId = workspace.clanId || String((clanRows[0] as any)?.id || '');
      if (clanId && !workspace.clanId) workspace.setClanId(clanId);

      if (!clanId) {
        setStats({ ...emptyStats, clans: clanRows.length });
        return;
      }

      const [branchRes, personRes, sourceRes, reviewRes, logRes] = await Promise.all([
        safe(() => apiClient.get(`/clans/${clanId}/branches`), []),
        safe(() => apiClient.get(`/persons/search?clanId=${clanId}&pageNo=1&pageSize=1`), { total: 0 }),
        safe(() => apiClient.get(`/clans/${clanId}/sources`), []),
        safe(() => apiClient.get(`/clans/${clanId}/review-tasks/pending`), []),
        safe(() => apiClient.get(`/logs/operations/stats?clanId=${clanId}`), null)
      ]);

      setStats({
        clans: clanRows.length,
        branches: toRecordList(branchRes).length,
        people: (personRes as any)?.total ?? toRecordList(personRes).length,
        sources: toRecordList(sourceRes).length,
        pendingReviews: toRecordList(reviewRes).length,
        logs: (logRes as any)?.totalCount ?? (logRes as any)?.total ?? '-'
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStats();
  }, []);

  const cards = [
    ['宗族', stats.clans],
    ['支派', stats.branches],
    ['族人', stats.people],
    ['资料', stats.sources],
    ['待审核', stats.pendingReviews],
    ['日志', stats.logs]
  ];

  return (
    <div className="stats-only-home">
      <section className="xp-dashboard-grid stats-only-grid">
        {cards.map(item => (
          <div className="xp-stat" key={item[0]}>
            <span>{item[0]}</span>
            <strong>{loading ? '...' : item[1]}</strong>
          </div>
        ))}
      </section>
    </div>
  );
}
