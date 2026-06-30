import { useEffect, useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { DataTable, toRecordList } from '../../shared/ui/DataTable';
import { DetailCard } from '../../shared/ui/DetailCard';
import { Modal } from '../../shared/ui/Modal';
import { Panel } from '../../shared/ui/Panel';

type Props = { notify: (data: unknown, error?: boolean) => void };

type ReviewTask = {
  id?: number | string;
  title?: string;
  targetType?: string;
  targetId?: number | string;
  status?: string;
  createdAt?: string;
  submitterId?: number | string;
};

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

function taskTitle(row: ReviewTask) {
  return row.title || `${row.targetType || '对象'} #${row.targetId || row.id || '-'}`;
}

function changeText(value?: string) {
  const dict: Record<string, string> = { added: '新增', removed: '删除', modified: '修改' };
  return dict[value || ''] || value || '-';
}

export function ReviewCenterPage({ notify }: Props) {
  const workspace = useWorkspace();
  const [tasks, setTasks] = useState<ReviewTask[]>([]);
  const [selected, setSelected] = useState<ReviewTask | null>(null);
  const [diff, setDiff] = useState<ReviewDiff | null>(null);
  const [diffOpen, setDiffOpen] = useState(false);
  const [comment, setComment] = useState('同意入谱');
  const [loading, setLoading] = useState(false);

  async function loadTasks() {
    if (!workspace.clanId) return;
    const data = await apiClient.get(`/clans/${workspace.clanId}/review-tasks/pending`);
    setTasks(toRecordList<ReviewTask>(data));
  }

  useEffect(() => { void loadTasks(); }, [workspace.clanId]);

  async function openDiff(row: ReviewTask) {
    if (!row.id) return;
    setLoading(true);
    try {
      const data = await apiClient.get<ReviewDiff>(`/review-tasks/${row.id}/diff`);
      setSelected(row);
      setDiff(data);
      setDiffOpen(true);
    } catch (error) {
      notify({ message: (error as Error).message || '查询审核 Diff 失败' }, true);
    } finally {
      setLoading(false);
    }
  }

  async function approve(row = selected) {
    if (!row?.id) return;
    setLoading(true);
    try {
      await apiClient.post(`/review-tasks/${row.id}/approve`, { comment });
      notify({ message: '审核已通过' });
      setDiffOpen(false);
      await loadTasks();
    } catch (error) {
      notify({ message: (error as Error).message || '审核通过失败' }, true);
    } finally {
      setLoading(false);
    }
  }

  async function reject(row = selected) {
    if (!row?.id) return;
    setLoading(true);
    try {
      await apiClient.post(`/review-tasks/${row.id}/reject`, { comment: comment || '请补充资料后重新提交' });
      notify({ message: '审核已驳回' });
      setDiffOpen(false);
      await loadTasks();
    } catch (error) {
      notify({ message: (error as Error).message || '审核驳回失败' }, true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="review-center-page">
      <Panel title="审核中心" description="待审核任务内嵌字段级 Diff，可直接查看差异后通过或驳回。">
        <div className="wizard-form-grid">
          <Field label="当前宗族ID"><input value={workspace.clanId} onChange={e => workspace.setClanId(e.target.value)} placeholder="请输入宗族ID" /></Field>
          <Field label="审核意见"><input value={comment} onChange={e => setComment(e.target.value)} /></Field>
        </div>
        <Actions><button disabled={loading} onClick={() => void loadTasks()}>{loading ? '处理中...' : '刷新审核任务'}</button></Actions>
        <DataTable
          data={tasks}
          columns={[
            { key: 'id', title: '任务ID' },
            { key: 'title', title: '标题', render: row => taskTitle(row) },
            { key: 'targetType', title: '对象类型' },
            { key: 'targetId', title: '对象ID' },
            { key: 'status', title: '状态' },
            { key: 'createdAt', title: '创建时间' },
            { key: 'actions', title: '操作', render: row => <span className="row-action-buttons"><button onClick={() => void openDiff(row)}>查看Diff</button><button onClick={() => void approve(row)}>通过</button><button className="danger" onClick={() => void reject(row)}>驳回</button></span> }
          ]}
          empty="当前没有待审核任务"
        />
      </Panel>

      <Modal open={diffOpen} title={`审核 Diff：${taskTitle(selected || {})}`} onClose={() => setDiffOpen(false)} width={980}>
        {diff ? (
          <>
            <DetailCard
              title="变更摘要"
              data={diff}
              fields={[
                { label: '审核任务ID', value: row => row.reviewTaskId || selected?.id || '-' },
                { label: '修订ID', value: row => row.revisionId || '-' },
                { label: '对象类型', value: row => row.targetType || '-' },
                { label: '对象ID', value: row => row.targetId || '-' },
                { label: '变更类型', value: row => row.changeType || '-' },
                { label: '摘要', value: row => row.diffSummary || '-' }
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
            <Actions>
              <button disabled={loading} onClick={() => void approve()}>{loading ? '处理中...' : '通过'}</button>
              <button className="danger" disabled={loading} onClick={() => void reject()}>驳回</button>
              <button className="secondary" onClick={() => setDiffOpen(false)}>关闭</button>
            </Actions>
          </>
        ) : null}
      </Modal>
    </div>
  );
}
