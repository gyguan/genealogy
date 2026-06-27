import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { DataBlock } from '../../shared/ui/DataBlock';
import { Panel } from '../../shared/ui/Panel';

export function ReviewPage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const workspace = useWorkspace();
  const [targetType, setTargetType] = useState('persons');
  const [targetId, setTargetId] = useState(workspace.personId);
  const [comment, setComment] = useState('同意');
  const [data, setData] = useState<unknown>();

  async function submit() {
    const res: any = await apiClient.post(`/${targetType}/${targetId}/submit-review`, { diffSummary: '前端提交审核' });
    if (res?.id) workspace.setReviewTaskId(String(res.id));
    setData(res);
    notify(res);
  }

  async function list() {
    const res: any = await apiClient.get(`/clans/${workspace.clanId}/review-tasks/pending`);
    if (Array.isArray(res) && res[0]?.id) workspace.setReviewTaskId(String(res[0].id));
    setData(res);
    notify(res);
  }

  async function detail() {
    const res = await apiClient.get(`/review-tasks/${workspace.reviewTaskId}`);
    setData(res);
    notify(res);
  }

  async function approve() {
    const res = await apiClient.post(`/review-tasks/${workspace.reviewTaskId}/approve`, { comment });
    setData(res);
    notify(res);
  }

  async function reject() {
    const res = await apiClient.post(`/review-tasks/${workspace.reviewTaskId}/reject`, { comment });
    setData(res);
    notify(res);
  }

  return (
    <div className="page-grid two">
      <Panel title="提交审核" description="默认使用工作区人物ID，可切换为关系、来源、支派、字辈方案。">
        <Field label="对象类型"><select value={targetType} onChange={e => setTargetType(e.target.value)}><option value="persons">人物</option><option value="relationships">关系</option><option value="sources">来源</option><option value="branches">支派</option><option value="generation-schemes">字辈方案</option></select></Field>
        <Field label="对象ID"><input value={targetId} onChange={e => setTargetId(e.target.value)} /></Field>
        <Actions><button onClick={submit}>提交审核</button></Actions>
      </Panel>
      <Panel title="审核处理" description="审核详情返回 task + auditRecord，可查看 before/after payload。">
        <Field label="当前宗族ID"><input value={workspace.clanId} onChange={e => workspace.setClanId(e.target.value)} /></Field>
        <Field label="当前任务ID"><input value={workspace.reviewTaskId} onChange={e => workspace.setReviewTaskId(e.target.value)} /></Field>
        <Field label="审核意见"><input value={comment} onChange={e => setComment(e.target.value)} /></Field>
        <Actions><button onClick={list}>待审核</button><button className="secondary" onClick={detail}>详情</button><button onClick={approve}>通过</button><button className="danger" onClick={reject}>驳回</button></Actions>
        <DataBlock data={data} />
      </Panel>
    </div>
  );
}
