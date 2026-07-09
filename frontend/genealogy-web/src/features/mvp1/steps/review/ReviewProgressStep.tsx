import { useEffect, useState } from 'react';
import { Alert, Button, Empty, Form, Input, Select, Space, Table, Tag, message } from 'antd';
import { useWorkspace } from '../../../../shared/context/WorkspaceContext';
import { Panel } from '../../../../shared/ui/Panel';
import { nullableString } from '../../domain/normalize';
import { buildReviewTargetOptions, createdAtText, reviewTargetTypeText, reviewTaskTitle, toApiReviewTargetType, type ReviewTargetType } from '../../domain/review';
import { statusColor, statusText } from '../../domain/status';
import { loadClans as queryClans, type ClanLike } from '../../services/clanService';
import {
  loadReviewData as queryReviewData,
  type ReviewProgressBranchLike as BranchLike,
  type ReviewProgressGenerationSchemeLike as GenerationSchemeLike,
  type ReviewProgressPersonLike as PersonLike,
  type ReviewProgressRelationshipLike as RelationshipLike,
  type ReviewProgressSourceLike as SourceLike,
  type ReviewProgressTaskLike as ReviewTaskLike
} from '../../services/reviewProgressService';
import { approveReview as approveReviewTask, submitReviewTask } from '../../services/reviewTaskService';

type ReviewForm = {
  targetType: ReviewTargetType;
  targetId: string;
  comment: string;
};

type Props = {
  notify?: (data: unknown, error?: boolean) => void;
};

const defaultReviewForm: ReviewForm = {
  targetType: 'persons',
  targetId: '',
  comment: '同意入谱'
};

const reviewTargetTypeOptions = [
  { value: 'persons', label: '人物' },
  { value: 'relationships', label: '关系' },
  { value: 'sources', label: '来源' },
  { value: 'branches', label: '支派' },
  { value: 'generation-schemes', label: '字辈方案' }
];

function clanLabel(clan: ClanLike) {
  return clan.clanName || clan.surname || '未命名宗族';
}

export function ReviewProgressStep({ notify }: Props) {
  const workspace = useWorkspace();
  const [reviewForm, setReviewForm] = useState<ReviewForm>({ ...defaultReviewForm });
  const [clans, setClans] = useState<ClanLike[]>([]);
  const [branches, setBranches] = useState<BranchLike[]>([]);
  const [schemes, setSchemes] = useState<GenerationSchemeLike[]>([]);
  const [persons, setPersons] = useState<PersonLike[]>([]);
  const [relationships, setRelationships] = useState<RelationshipLike[]>([]);
  const [sources, setSources] = useState<SourceLike[]>([]);
  const [tasks, setTasks] = useState<ReviewTaskLike[]>([]);
  const [loadingClans, setLoadingClans] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);

  function toast(data: unknown, error = false) {
    notify?.(data, error);
    const text = typeof data === 'string' ? data : (data as any)?.message;
    if (text) {
      if (error) message.error(text);
      else message.success(text);
    }
  }

  function patchReview(key: keyof ReviewForm, value: string) {
    setReviewForm(prev => ({ ...prev, [key]: value }));
  }

  async function loadClans() {
    setLoadingClans(true);
    try {
      const rows = await queryClans();
      setClans(rows);
      if (!workspace.clanId && rows[0]?.id) workspace.setClanId(String(rows[0].id));
    } finally {
      setLoadingClans(false);
    }
  }

  async function loadReviewData(sourceClanId = workspace.clanId) {
    if (!sourceClanId) {
      setBranches([]);
      setSchemes([]);
      setPersons([]);
      setRelationships([]);
      setSources([]);
      setTasks([]);
      return;
    }
    setLoadingData(true);
    try {
      const data = await queryReviewData(sourceClanId, workspace.personId);
      setBranches(data.branches);
      setPersons(data.persons);
      setSources(data.sources);
      setSchemes(data.schemes);
      setTasks(data.tasks);
      setRelationships(data.relationships);
      if (!workspace.reviewTaskId && data.tasks[0]?.id) workspace.setReviewTaskId(String(data.tasks[0].id));
    } catch (error) {
      toast({ message: (error as Error).message || '查询审核进度失败' }, true);
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => { void loadClans(); }, []);
  useEffect(() => {
    setReviewForm({ ...defaultReviewForm });
    void loadReviewData();
  }, [workspace.clanId]);

  function changeClan(nextClanId: string) {
    workspace.patch({ clanId: nextClanId, reviewTaskId: '' });
    setReviewForm({ ...defaultReviewForm });
    setBranches([]);
    setSchemes([]);
    setPersons([]);
    setRelationships([]);
    setSources([]);
    setTasks([]);
  }

  function reviewTargetOptions(type = reviewForm.targetType) {
    return buildReviewTargetOptions(type, { persons, relationships, sources, branches, schemes });
  }

  function effectiveReviewTargetId() {
    return reviewForm.targetId || reviewTargetOptions()[0]?.value || '';
  }

  async function submitReview() {
    const targetId = effectiveReviewTargetId();
    if (!workspace.clanId) {
      toast({ message: '请选择宗族' }, true);
      return;
    }
    if (!targetId) {
      toast({ message: '请选择草稿或已驳回的审核对象' }, true);
      return;
    }
    setSubmitting(true);
    try {
      const task: any = await submitReviewTask({
        clanId: workspace.clanId,
        targetType: toApiReviewTargetType(reviewForm.targetType),
        targetId,
        comment: nullableString(reviewForm.comment)
      });
      if (task?.id) workspace.setReviewTaskId(String(task.id));
      toast({ message: '审核任务已提交' });
      await loadReviewData();
    } catch (error) {
      toast({ message: (error as Error).message || '提交审核任务失败' }, true);
    } finally {
      setSubmitting(false);
    }
  }

  async function approveReview(taskId?: string) {
    const effectiveTaskId = taskId || workspace.reviewTaskId;
    if (!effectiveTaskId) {
      toast({ message: '请选择待审任务' }, true);
      return;
    }
    setApproving(true);
    try {
      await approveReviewTask(effectiveTaskId, nullableString(reviewForm.comment));
      toast({ message: '审核已通过，相关对象现在可用于下一步关联。' });
      await loadReviewData();
    } catch (error) {
      toast({ message: (error as Error).message || '审核通过失败' }, true);
    } finally {
      setApproving(false);
    }
  }

  return (
    <Panel title="审核进度" description="查看待审任务；创建页内已支持保存并提交审核，这里作为进度查看和补充提交入口。">
      <Form layout="vertical" className="review-progress-form">
        <div className="wizard-form-grid">
          <Form.Item label="适用宗族" required>
            <Select
              showSearch
              optionFilterProp="label"
              value={workspace.clanId}
              onChange={changeClan}
              disabled={loadingClans}
              options={[{ value: '', label: '请选择宗族' }, ...clans.map(clan => ({ value: String(clan.id), label: clanLabel(clan) }))]}
            />
          </Form.Item>
          <Form.Item label="补充提交对象类型">
            <Select
              value={reviewForm.targetType}
              onChange={value => setReviewForm(prev => ({ ...prev, targetType: value as ReviewTargetType, targetId: '' }))}
              options={reviewTargetTypeOptions}
            />
          </Form.Item>
          <Form.Item label="草稿/驳回对象">
            <Select
              showSearch
              optionFilterProp="label"
              value={reviewForm.targetId || effectiveReviewTargetId()}
              onChange={value => patchReview('targetId', value)}
              options={[{ value: '', label: '暂无可提交对象' }, ...reviewTargetOptions().map(option => ({ value: option.value, label: option.label }))]}
            />
          </Form.Item>
          <Form.Item label="待审任务">
            <Select
              showSearch
              optionFilterProp="label"
              value={workspace.reviewTaskId}
              disabled={!tasks.length}
              onChange={value => workspace.setReviewTaskId(value)}
              options={[{ value: '', label: tasks.length ? '请选择待审任务' : '暂无待审任务' }, ...tasks.map(task => ({ value: String(task.id), label: `${reviewTaskTitle(task)} · ${statusText(task)}` }))]}
            />
          </Form.Item>
        </div>
        <Form.Item label="审核说明">
          <Input.TextArea value={reviewForm.comment} onChange={event => patchReview('comment', event.target.value)} rows={3} />
        </Form.Item>
        <Space className="actions antd-actions" wrap>
          <Button type="primary" disabled={submitting || !reviewTargetOptions().length} loading={submitting} onClick={() => void submitReview()}>补充提交审核</Button>
          <Button disabled={approving || !workspace.reviewTaskId} loading={approving} onClick={() => void approveReview()}>通过选中任务</Button>
          <Button disabled={loadingData || !workspace.clanId} loading={loadingData} onClick={() => void loadReviewData()}>刷新审核进度</Button>
        </Space>
      </Form>
      {reviewForm.targetType === 'relationships' && !workspace.personId ? (
        <Alert type="info" showIcon message="关系候选对象按当前中心人物加载；如需提交关系审核，请先在录入人物/建立关系步骤选中中心人物。" style={{ marginBottom: 12 }} />
      ) : null}
      <section className="review-progress-task-list step-object-result-panel">
        <div className="step-draft-review-header">
          <div>
            <h4>待审任务列表</h4>
            <p>点击任务行可选中，再执行“通过选中任务”。</p>
          </div>
          <Space wrap>
            <Button loading={loadingData} disabled={!workspace.clanId} onClick={() => void loadReviewData()}>刷新</Button>
          </Space>
        </div>
        <Table<ReviewTaskLike>
          size="small"
          bordered
          loading={loadingData}
          rowKey={row => String(row.id || '')}
          dataSource={tasks}
          pagination={false}
          onRow={row => ({ onClick: () => workspace.setReviewTaskId(String(row.id || '')) })}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={workspace.clanId ? '暂无待审任务' : '请选择宗族后查看待审任务'} /> }}
          columns={[
            { key: 'title', title: '标题', render: (_value, row) => reviewTaskTitle(row) },
            { key: 'targetType', title: '审核对象', width: 130, render: (_value, row) => reviewTargetTypeText(row.targetType) },
            { key: 'status', title: '状态', width: 110, render: (_value, row) => <Tag color={statusColor(row)}>{statusText(row)}</Tag> },
            { key: 'createdAt', title: '创建时间', width: 170, render: (_value, row) => createdAtText(row.createdAt) },
            {
              key: 'actions',
              title: '操作',
              width: 120,
              render: (_value, row) => <Button size="small" loading={approving} onClick={event => { event.stopPropagation(); void approveReview(String(row.id || '')); }}>通过</Button>
            }
          ]}
        />
      </section>
    </Panel>
  );
}
