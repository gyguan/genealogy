import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Empty, Space, Table, Tag, message } from 'antd';
import { apiClient } from '../../../../shared/api/client';
import { useWorkspace } from '../../../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../../../shared/ui/Form';
import { Panel } from '../../../../shared/ui/Panel';
import { nullableString, toRows } from '../../domain/normalize';
import { isOfficial, isReviewable, statusColor, statusText } from '../../domain/status';

type ReviewTargetType = 'persons' | 'relationships' | 'sources' | 'branches' | 'generation-schemes';

type ReviewForm = {
  targetType: ReviewTargetType;
  targetId: string;
  comment: string;
};

type Option = {
  value: string;
  label: string;
};

type ClanLike = {
  id?: number | string;
  clanName?: string;
  surname?: string;
};

type BranchLike = {
  id?: number | string;
  branchName?: string;
  dataStatus?: string;
  status?: string;
  verificationStatus?: string;
};

type GenerationSchemeLike = {
  id?: number | string;
  schemeName?: string;
  dataStatus?: string;
  status?: string;
  verificationStatus?: string;
};

type PersonLike = {
  id?: number | string;
  name?: string;
  generationWord?: string;
  dataStatus?: string;
  status?: string;
  verificationStatus?: string;
};

type RelationshipLike = {
  id?: number | string;
  fromPersonId?: number | string;
  fromPersonName?: string;
  fromName?: string;
  toPersonId?: number | string;
  toPersonName?: string;
  toName?: string;
  relationType?: string;
  relationLabel?: string;
  dataStatus?: string;
  status?: string;
  verificationStatus?: string;
};

type SourceLike = {
  id?: number | string;
  sourceName?: string;
  dataStatus?: string;
  status?: string;
  verificationStatus?: string;
};

type ReviewTaskLike = {
  id?: number | string;
  title?: string;
  targetType?: string;
  targetId?: number | string;
  status?: string;
  reviewStatus?: string;
  taskStatus?: string;
  createdAt?: string;
};

type Props = {
  notify?: (data: unknown, error?: boolean) => void;
};

const defaultReviewForm: ReviewForm = {
  targetType: 'persons',
  targetId: '',
  comment: '同意入谱'
};

function clanLabel(clan: ClanLike) {
  return clan.clanName || clan.surname || `宗族#${clan.id || '-'}`;
}

function targetTypeText(value?: string) {
  const normalized = String(value || '').trim().toLowerCase().replace(/-/g, '_');
  const dict: Record<string, string> = {
    person: '人物',
    persons: '人物',
    relationship: '关系',
    relationships: '关系',
    source: '来源',
    sources: '来源',
    branch: '支派',
    branches: '支派',
    generation_scheme: '字辈方案',
    generation_schemes: '字辈方案'
  };
  return dict[normalized] || value || '-';
}

function toApiTargetType(type: ReviewTargetType) {
  const dict: Record<ReviewTargetType, string> = {
    persons: 'person',
    relationships: 'relationship',
    sources: 'source',
    branches: 'branch',
    'generation-schemes': 'generation_scheme'
  };
  return dict[type];
}

function relationshipLabel(row: RelationshipLike) {
  const fromName = row.fromPersonName || row.fromName || `人物#${row.fromPersonId || '-'}`;
  const toName = row.toPersonName || row.toName || `人物#${row.toPersonId || '-'}`;
  return `${fromName} → ${toName}`;
}

function taskTitle(row: ReviewTaskLike) {
  if (row.title) return row.title;
  return `${targetTypeText(row.targetType)} #${row.targetId || '-'}`;
}

function createdAtText(value?: string) {
  return value ? String(value).replace('T', ' ').slice(0, 19) : '-';
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

  const officialPersons = useMemo(() => persons.filter(isOfficial), [persons]);

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
      const data = await apiClient.get('/clans').catch(() => []);
      const rows = toRows<ClanLike>(data);
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
      const [branchData, personData, sourceData, schemeData, taskData] = await Promise.all([
        apiClient.get(`/clans/${sourceClanId}/branches`).catch(() => []),
        apiClient.get(`/clans/${sourceClanId}/persons`).catch(() => []),
        apiClient.get(`/clans/${sourceClanId}/sources`).catch(() => []),
        apiClient.get(`/clans/${sourceClanId}/generation-schemes`).catch(() => []),
        apiClient.get(`/clans/${sourceClanId}/review-tasks/pending`).catch(() => [])
      ]);
      const personRows = toRows<PersonLike>(personData);
      setBranches(toRows<BranchLike>(branchData));
      setPersons(personRows);
      setSources(toRows<SourceLike>(sourceData));
      setSchemes(toRows<GenerationSchemeLike>(schemeData));
      const taskRows = toRows<ReviewTaskLike>(taskData);
      setTasks(taskRows);
      if (!workspace.reviewTaskId && taskRows[0]?.id) workspace.setReviewTaskId(String(taskRows[0].id));

      const relationPersonId = workspace.personId || personRows.filter(isOfficial)[0]?.id;
      if (relationPersonId) {
        const relationData = await apiClient.get(`/persons/${relationPersonId}/relationships`).catch(() => []);
        setRelationships(toRows<RelationshipLike>(relationData));
      } else {
        setRelationships([]);
      }
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

  function reviewTargetOptions(type = reviewForm.targetType): Option[] {
    if (type === 'persons') return persons.filter(isReviewable).map(item => ({ value: String(item.id), label: `${item.name || `人物#${item.id}`} · ${statusText(item)}` }));
    if (type === 'relationships') return relationships.filter(isReviewable).map(item => ({ value: String(item.id), label: `${relationshipLabel(item)} · ${statusText(item)}` }));
    if (type === 'sources') return sources.filter(isReviewable).map(item => ({ value: String(item.id), label: `${item.sourceName || `来源#${item.id}`} · ${statusText(item)}` }));
    if (type === 'branches') return branches.filter(isReviewable).map(item => ({ value: String(item.id), label: `${item.branchName || `支派#${item.id}`} · ${statusText(item)}` }));
    if (type === 'generation-schemes') return schemes.filter(isReviewable).map(item => ({ value: String(item.id), label: `${item.schemeName || `字辈方案#${item.id}`} · ${statusText(item)}` }));
    return [];
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
      const task: any = await apiClient.post(`/clans/${workspace.clanId}/review-tasks`, {
        targetType: toApiTargetType(reviewForm.targetType),
        targetId: Number(targetId),
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

  async function approveReview(taskId?: string) {
    const effectiveTaskId = taskId || workspace.reviewTaskId;
    if (!effectiveTaskId) {
      toast({ message: '请选择待审任务' }, true);
      return;
    }
    setApproving(true);
    try {
      await apiClient.post(`/review-tasks/${effectiveTaskId}/approve`, { comment: nullableString(reviewForm.comment) });
      toast({ message: '审核已通过，相关对象现在可用于下一步关联。', id: effectiveTaskId });
      await loadReviewData();
    } catch (error) {
      toast({ message: (error as Error).message || '审核通过失败' }, true);
    } finally {
      setApproving(false);
    }
  }

  return (
    <Panel title="审核进度" description="查看待审任务；创建页内已支持保存并提交审核，这里作为进度查看和补充提交入口。">
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
            {tasks.map(task => <option key={task.id} value={String(task.id)}>{taskTitle(task)} · {statusText(task)}</option>)}
          </select>
        </Field>
      </div>
      <Field label="审核说明">
        <textarea value={reviewForm.comment} onChange={event => patchReview('comment', event.target.value)} rows={3} />
      </Field>
      <Actions>
        <button disabled={submitting || !reviewTargetOptions().length} onClick={() => void submitReview()}>补充提交审核</button>
        <button className="secondary" disabled={approving || !workspace.reviewTaskId} onClick={() => void approveReview()}>通过选中任务</button>
        <button className="secondary" disabled={loadingData || !workspace.clanId} onClick={() => void loadReviewData()}>刷新审核进度</button>
      </Actions>
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
            { key: 'title', title: '标题', render: (_value, row) => taskTitle(row) },
            { key: 'targetType', title: '对象类型', width: 130, render: (_value, row) => targetTypeText(row.targetType) },
            { key: 'targetId', title: '对象ID', width: 100, render: (_value, row) => row.targetId || '-' },
            { key: 'status', title: '状态', width: 110, render: (_value, row) => <Tag color={statusColor(row)}>{statusText(row)}</Tag> },
            { key: 'createdAt', title: '创建时间', width: 170, render: (_value, row) => createdAtText(row.createdAt) },
            {
              key: 'actions',
              title: '操作',
              width: 120,
              render: (_value, row) => <Button size="small" type="primary" loading={approving} onClick={event => { event.stopPropagation(); void approveReview(String(row.id || '')); }}>通过</Button>
            }
          ]}
        />
      </section>
    </Panel>
  );
}
