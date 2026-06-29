import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { DataTable } from '../../shared/ui/DataTable';
import { Panel } from '../../shared/ui/Panel';
import { ResultNotice } from '../../shared/ui/ResultNotice';

export function ReviewPage({ notify, mode = 'submit' }: { notify: (data: unknown, error?: boolean) => void; mode?: 'submit' | 'process' }) {
  const workspace = useWorkspace();
  const [targetType, setTargetType] = useState('persons');
  const [targetId, setTargetId] = useState(workspace.personId);
  const [comment, setComment] = useState('同意');
  const [tasks, setTasks] = useState<unknown>();
  const [detailData, setDetailData] = useState<any>();
  const [result, setResult] = useState<unknown>();

  async function submit() {
    const res: any = await apiClient.post(`/${targetType}/${targetId}/submit-review`, { diffSummary: '前端提交审核' });
    if (res?.id) workspace.setReviewTaskId(String(res.id));
    setResult(res);
    notify({ message: '审核提交成功', id: res?.id });
  }

  async function list() {
    const res: any = await apiClient.get(`/clans/${workspace.clanId}/review-tasks/pending`);
    if (Array.isArray(res) && res[0]?.id) workspace.setReviewTaskId(String(res[0].id));
    setTasks(res);
    notify({ message: '待审核任务查询完成' });
  }

  async function detail() {
    const res = await apiClient.get(`/review-tasks/${workspace.reviewTaskId}`);
    setDetailData(res);
    notify({ message: '审核详情查询完成' });
  }

  async function approve() {
    const res = await apiClient.post(`/review-tasks/${workspace.reviewTaskId}/approve`, { comment });
    setResult({ message: '审核已通过' });
    notify({ message: '审核已通过' });
    return res;
  }

  async function reject() {
    const res = await apiClient.post(`/review-tasks/${workspace.reviewTaskId}/reject`, { comment });
    setResult({ message: '审核已驳回' });
    notify({ message: '审核已驳回' });
    return res;
  }

  if (mode === 'process') {
    const record = detailData?.auditRecord || {};
    return (
      <div className="page-grid two">
        <Panel title="审核任务查询" description="查询待审核任务；点击任务行可选中审核任务。">
          <Field label="宗族ID"><input value={workspace.clanId} onChange={e => workspace.setClanId(e.target.value)} /></Field>
          <Field label="审核任务ID"><input value={workspace.reviewTaskId} onChange={e => workspace.setReviewTaskId(e.target.value)} /></Field>
          <Actions><button onClick={list}>查询待审核</button><button className="secondary" onClick={detail}>查看详情</button></Actions>
          <DataTable
            data={tasks}
            columns={[
              { key: 'id', title: '任务ID' },
              { key: 'targetType', title: '对象类型' },
              { key: 'targetId', title: '对象ID' },
              { key: 'status', title: '状态' },
              { key: 'createdAt', title: '创建时间' }
            ]}
            onSelect={row => workspace.setReviewTaskId(String(row.id))}
          />
        </Panel>
        <Panel title="审核处理" description="展示审核摘要并完成通过或驳回。">
          <div className="summary-card">
            <div><span>审核任务</span><strong>{workspace.reviewTaskId || '-'}</strong></div>
            <div><span>变更说明</span><strong>{record.diffSummary || detailData?.diffSummary || '-'}</strong></div>
            <div><span>状态</span><strong>{detailData?.status || '-'}</strong></div>
          </div>
          <Field label="审核意见"><input value={comment} onChange={e => setComment(e.target.value)} /></Field>
          <Actions><button onClick={approve}>通过</button><button className="danger" onClick={reject}>驳回</button></Actions>
          <ResultNotice result={result} />
        </Panel>
      </div>
    );
  }

  return (
    <Panel title="提交审核" description="选择业务对象并提交审核。">
      <Field label="对象类型"><select value={targetType} onChange={e => setTargetType(e.target.value)}><option value="persons">人物</option><option value="relationships">关系</option><option value="sources">来源</option><option value="branches">支派</option><option value="generation-schemes">字辈方案</option></select></Field>
      <Field label="对象ID"><input value={targetId} onChange={e => setTargetId(e.target.value)} /></Field>
      <Actions><button onClick={submit}>提交审核</button></Actions>
      <ResultNotice result={result} successText="审核提交成功" />
    </Panel>
  );
}
