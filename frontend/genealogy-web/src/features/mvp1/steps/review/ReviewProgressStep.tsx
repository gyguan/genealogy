import { useEffect, useState } from 'react';
import { Alert, Button, Empty, Space, Table, Tag, message } from 'antd';
import { useWorkspace } from '../../../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../../../shared/ui/Form';
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
import { submitReviewTask } from '../../services/reviewTaskService';

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
  comment: '提交审核'
};

function clanLabel(clan: ClanLike) {
  return clan.clanName || clan.surname || `宗族#${clan.id || '-'}`;
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
      toast({ message: '审核任务已提交', id: task?.id });
      await loadReviewData();
    } catch (error) {
      toast({ message: (error as Error).message || '提交审核任务失败' }, true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Panel title="审核进度" description="查看待审任务；创建页内已支持保存并提交审核，这里只提供进度查询和补充提交入口。">
      <div className="wizard-form-grid">
        <Field label="适用宗族 *">
          <select value={workspace.clanId} onChange={event => changeClan(event.target.value)} disabled={loadingClans} required>
            <option value="">请选择宗族</option>
            {clans.map(clan => <option key={clan.id} value={String(clan.id)}>{clanLabel(clan)}</option>)}
          </select>
        </Field>
        <Field label="补充提交对象类型">
          <select value={reviewForm.targetType} onChange={event => setReviewForm(prev => ({ ...prev, targetType: event.target.value as ReviewTargetType, targetId: '' }))}>
            <option value="persons">人物</option>
            <option value="relationships">关系</option>
            <option value="sources">来源</option>
            <option value="branches">支派</option>
            <option value="generation-schemes">字辈方案</option>
          </select>
        </Field>
        <Field label="草稿/驳回对象">
          <select value={reviewForm.targetId || effectiveReviewTargetId()} onChange={event => patchReview('targetId', event.target.value)}>
            <option value="">暂无可提交对象</option>
            {reviewTargetOptions().map(option => <option key={`${reviewForm.targetType}-${option.value}`} value={option.value}>{option.label}</option>)}
          </select>
        </Field>
        <Field label="待审任务">
          <select value={workspace.reviewTaskId} disabled={!tasks.length} onChange={event => workspace.setReviewTaskId(event.target.value)}>
            <option value="">{tasks.length ? '请选择待审任务' : '暂无待审任务'}</option>
            {tasks.map(task => <option key={task.id} value={String(task.id)}>{reviewTaskTitle(task)} · {statusText(task)}</option>)}
          </select>
        </Field>
      </div>
      <Field label="审核说明">
        <textarea value={reviewForm.comment} onChange={event => patchReview('comment', event.target.value)} rows={3} />
      </Field>
      <Actions>
        <button disabled={submitting || !reviewTargetOptions().length} onClick={() => void submitReview()}>补充提交审核</button>
        <button className="secondary" disabled={loadingData || !workspace.clanId} onClick={() => void loadReviewData()}>刷新审核进度</button>
      </Actions>
      {reviewForm.targetType === 'relationships' && !workspace.personId ? (
        <Alert type="info" showIcon message="关系候选对象按当前中心人物加载；如需提交关系审核，请先在录入人物/建立关系步骤选中中心人物。" style={{ marginBottom: 12 }} />
      ) : null}
      <section className="review-progress-task-list step-object-result-panel">
        <div className="step-draft-review-header">
          <div>
            <h4>待审任务列表</h4>
            <p>点击任务行可选中并查看当前任务状态；审批请进入审核中心处理。</p>
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
            { key: 'targetType', title: '对象类型', width: 130, render: (_value, row) => reviewTargetTypeText(row.targetType) },
            { key: 'status', title: '状态', width: 110, render: (_value, row) => <Tag color={statusColor(row)}>{statusText(row)}</Tag> },
            { key: 'createdAt', title: '创建时间', width: 170, render: (_value, row) => createdAtText(row.createdAt) }
          ]}
        />
      </section>
    </Panel>
  );
}
