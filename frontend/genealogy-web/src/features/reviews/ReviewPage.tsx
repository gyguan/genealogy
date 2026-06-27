import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { Actions, Field } from '../../shared/ui/Form';
import { DataBlock } from '../../shared/ui/DataBlock';
import { Panel } from '../../shared/ui/Panel';

export function ReviewPage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const [targetType, setTargetType] = useState('persons');
  const [targetId, setTargetId] = useState('');
  const [clanId, setClanId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [comment, setComment] = useState('同意');
  const [data, setData] = useState<unknown>();

  async function submit() {
    const res = await apiClient.post(`/${targetType}/${targetId}/submit-review`, { diffSummary: '前端提交审核' });
    setData(res);
    notify(res);
  }

  async function list() {
    const res = await apiClient.get(`/clans/${clanId}/review-tasks/pending`);
    setData(res);
    notify(res);
  }

  async function detail() {
    const res = await apiClient.get(`/review-tasks/${taskId}`);
    setData(res);
    notify(res);
  }

  async function approve() {
    const res = await apiClient.post(`/review-tasks/${taskId}/approve`, { comment });
    setData(res);
    notify(res);
  }

  async function reject() {
    const res = await apiClient.post(`/review-tasks/${taskId}/reject`, { comment });
    setData(res);
    notify(res);
  }

  return (
    <div className="page-grid two">
      <Panel title="提交审核" description="支持人物、关系、来源、支派、字辈方案。">
        <Field label="对象类型"><select value={targetType} onChange={e => setTargetType(e.target.value)}><option value="persons">人物</option><option value="relationships">关系</option><option value="sources">来源</option><option value="branches">支派</option><option value="generation-schemes">字辈方案</option></select></Field>
        <Field label="对象ID"><input value={targetId} onChange={e => setTargetId(e.target.value)} /></Field>
        <Actions><button onClick={submit}>提交审核</button></Actions>
      </Panel>
      <Panel title="审核处理" description="审核详情返回 task + auditRecord，可查看 before/after payload。">
        <Field label="宗族ID"><input value={clanId} onChange={e => setClanId(e.target.value)} /></Field>
        <Field label="任务ID"><input value={taskId} onChange={e => setTaskId(e.target.value)} /></Field>
        <Field label="审核意见"><input value={comment} onChange={e => setComment(e.target.value)} /></Field>
        <Actions><button onClick={list}>待审核</button><button className="secondary" onClick={detail}>详情</button><button onClick={approve}>通过</button><button className="danger" onClick={reject}>驳回</button></Actions>
        <DataBlock data={data} />
      </Panel>
    </div>
  );
}
