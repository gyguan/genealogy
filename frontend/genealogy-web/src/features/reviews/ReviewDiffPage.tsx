import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { Actions, Field } from '../../shared/ui/Form';
import { DataTable } from '../../shared/ui/DataTable';
import { Panel } from '../../shared/ui/Panel';
import { DetailCard } from '../../shared/ui/DetailCard';

import { feedback } from '../../shared/ui/OperationFeedback';

type Props = {  };

type ReviewDiff = {
  reviewTaskId?: number;
  revisionId?: number;
  clanId?: number;
  targetType?: string;
  targetId?: number;
  changeType?: string;
  diffSummary?: string;
  beforeData?: string;
  afterData?: string;
  fields?: { fieldName?: string; beforeValue?: string; afterValue?: string; changeType?: string }[];
};

function changeText(value?: string) {
  const dict: Record<string, string> = { added: '新增', removed: '删除', modified: '修改' };
  return dict[value || ''] || value || '-';
}

export function ReviewDiffPage({}: Props) {
  const [reviewTaskId, setReviewTaskId] = useState('');
  const [revisionId, setRevisionId] = useState('');
  const [diff, setDiff] = useState<ReviewDiff | null>(null);
  const [loading, setLoading] = useState(false);

  async function queryByTask() {
    if (!reviewTaskId) { feedback.from({ message: '请输入审核任务ID' }, true); return; }
    await query(`/review-tasks/${reviewTaskId}/diff`);
  }

  async function queryByRevision() {
    if (!revisionId) { feedback.from({ message: '请输入修订ID' }, true); return; }
    await query(`/revisions/${revisionId}/diff`);
  }

  async function query(path: string) {
    if (loading) return;
    setLoading(true);
    try {
      const data = await apiClient.get<ReviewDiff>(path);
      setDiff(data);
      feedback.from({ message: '审核 Diff 查询完成' });
    } catch (error) {
      feedback.from({ message: (error as Error).message || '审核 Diff 查询失败' }, true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="review-diff-page">
      <Panel title="审核字段级 Diff" description="根据审核任务或修订记录查看 before/after 字段差异。">
        <div className="wizard-form-grid">
          <Field label="审核任务ID"><input value={reviewTaskId} onChange={e => setReviewTaskId(e.target.value)} placeholder="例如：10001" /></Field>
          <Field label="修订ID"><input value={revisionId} onChange={e => setRevisionId(e.target.value)} placeholder="例如：20001" /></Field>
        </div>
        <Actions>
          <button disabled={loading} onClick={queryByTask}>{loading ? '查询中...' : '按任务查询'}</button>
          <button className="secondary" disabled={loading} onClick={queryByRevision}>按修订查询</button>
        </Actions>
      </Panel>

      {diff ? (
        <Panel title="变更摘要" description={diff.diffSummary || '暂无摘要'}>
          <DetailCard
            title="审核对象"
            data={diff}
            fields={[
              { label: '审核任务ID', value: row => row.reviewTaskId || '-' },
              { label: '修订ID', value: row => row.revisionId || '-' },
              { label: '宗族ID', value: row => row.clanId || '-' },
              { label: '对象类型', value: row => row.targetType || '-' },
              { label: '对象ID', value: row => row.targetId || '-' },
              { label: '变更类型', value: row => row.changeType || '-' }
            ]}
          />
          <DataTable
            data={diff.fields || []}
            columns={[
              { key: 'fieldName', title: '字段' },
              { key: 'beforeValue', title: '变更前' },
              { key: 'afterValue', title: '变更后' },
              { key: 'changeType', title: '类型', render: row => changeText(row.changeType) }
            ]}
            empty="暂无字段差异"
          />
        </Panel>
      ) : null}
    </div>
  );
}
