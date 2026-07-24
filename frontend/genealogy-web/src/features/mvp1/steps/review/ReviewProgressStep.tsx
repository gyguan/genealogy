import {
  useEffect,
  useMemo,
  useState } from 'react';
import { Alert,
  Button,
  Empty,
  Select,
  Table,
  Tag
} from 'antd';
import { useWorkspace } from '../../../../shared/context/WorkspaceContext';
import { Field } from '../../../../shared/ui/Form';
import { Panel } from '../../../../shared/ui/Panel';
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

import { feedback } from '../../../../shared/ui/OperationFeedback';

type ReviewForm = {
  targetTypes: ReviewTargetType[];
};

type ReviewCandidate = {
  key: string;
  targetType: ReviewTargetType;
  targetId: string;
  title: string;
};

type Props = {
  notify?: (data: unknown, error?: boolean) => void;
};

const targetTypeOptions: { value: ReviewTargetType; label: string }[] = [
  { value: 'persons', label: '人物' },
  { value: 'relationships', label: '关系' },
  { value: 'sources', label: '来源' },
  { value: 'branches', label: '支派' },
  { value: 'generation-schemes', label: '字辈方案' }
];

const defaultReviewForm: ReviewForm = {
  targetTypes: ['persons']
};

function clanLabel(clan: ClanLike) {
  return clan.clanName || clan.surname || `宗族#${clan.id || '-'}`;
}

function normalizeTargetType(value?: string) {
  return String(value || '').trim().toLowerCase().replace(/-/g, '_');
}

function relationshipObjectName(row?: RelationshipLike) {
  if (!row) return '关系对象待维护';
  const from = row.fromPersonName || row.fromName || '起点人物待维护';
  const to = row.toPersonName || row.toName || '终点人物待维护';
  const relation = row.relationLabel || row.relationType || '关系';
  return `${from} → ${to} · ${relation}`;
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
  const [submittingTargetKey, setSubmittingTargetKey] = useState('');

  const selectedTargetTypes = reviewForm.targetTypes.length ? reviewForm.targetTypes : targetTypeOptions.map(option => option.value);
  const reviewCandidates = useMemo<ReviewCandidate[]>(() => selectedTargetTypes.flatMap(targetType => buildReviewTargetOptions(targetType, { persons, relationships, sources, branches, schemes }).map(option => ({
    key: `${targetType}-${option.value}`,
    targetType,
    targetId: option.value,
    title: option.label
  }))), [selectedTargetTypes, persons, relationships, sources, branches, schemes]);

  function reviewTaskObjectName(row: ReviewTaskLike) {
    const targetId = String(row.targetId || '');
    if (!targetId) return '对象名称待维护';
    const targetType = normalizeTargetType(row.targetType);
    if (targetType === 'person' || targetType === 'persons') {
      return persons.find(item => String(item.id || '') === targetId)?.name || '人物名称待维护';
    }
    if (targetType === 'relationship' || targetType === 'relationships') {
      return relationshipObjectName(relationships.find(item => String(item.id || '') === targetId));
    }
    if (targetType === 'source' || targetType === 'sources') {
      return sources.find(item => String(item.id || '') === targetId)?.sourceName || '来源名称待维护';
    }
    if (targetType === 'branch' || targetType === 'branches') {
      return branches.find(item => String(item.id || '') === targetId)?.branchName || '支派名称待维护';
    }
    if (targetType === 'generation_scheme' || targetType === 'generation_schemes') {
      return schemes.find(item => String(item.id || '') === targetId)?.schemeName || '字辈方案名称待维护';
    }
    return '对象名称待维护';
  }

  function toast(data: unknown, error = false) {
    notify?.(data, error);
    const text = typeof data === 'string' ? data : (data as any)?.message;
    if (text) {
      if (error) feedback.error(text);
      else feedback.success(text);
    }
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

  async function submitReview(row: ReviewCandidate) {
    if (!workspace.clanId) {
      toast({ message: '请选择宗族' }, true);
      return;
    }
    setSubmittingTargetKey(row.key);
    try {
      const task: any = await submitReviewTask({
        clanId: workspace.clanId,
        targetType: toApiReviewTargetType(row.targetType),
        targetId: row.targetId,
        comment: '提交审核'
      });
      if (task?.id) workspace.setReviewTaskId(String(task.id));
      toast({ message: '审核任务已提交', id: task?.id });
      await loadReviewData();
    } catch (error) {
      toast({ message: (error as Error).message || '提交审核任务失败' }, true);
    } finally {
      setSubmittingTargetKey('');
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
        <Field label="对象类型">
          <Select<ReviewTargetType[]>
            mode="multiple"
            allowClear
            value={reviewForm.targetTypes}
            onChange={value => setReviewForm({ targetTypes: value })}
            options={targetTypeOptions}
            placeholder="请选择对象类型；不选则查看全部"
            maxTagCount="responsive"
            style={{ width: '100%' }}
          />
        </Field>
      </div>
      <Button className="secondary" disabled={loadingData || !workspace.clanId} onClick={() => void loadReviewData()} style={{ marginBottom: 12 }}>查询审核进度</Button>
      {selectedTargetTypes.includes('relationships') && !workspace.personId ? (
        <Alert type="info" showIcon message="关系候选对象按当前中心人物加载；如需提交关系审核，请先在录入人物/建立关系步骤选中中心人物。" style={{ marginBottom: 12 }} />
      ) : null}

      <section className="review-progress-submit-list step-object-result-panel">
        <div className="step-draft-review-header">
          <div>
            <h4>可提交审核对象</h4>
            <p>草稿/已驳回对象可在列表中直接提交审核，样式与支派列表保持一致。</p>
          </div>
        </div>
        <Table<ReviewCandidate>
          size="small"
          bordered
          loading={loadingData}
          rowKey={row => row.key}
          dataSource={reviewCandidates}
          pagination={false}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={workspace.clanId ? '暂无可提交审核对象' : '请选择宗族后查看可提交对象'} /> }}
          columns={[
            { key: 'title', title: '对象名称', render: (_value, row) => row.title },
            { key: 'targetType', title: '对象类型', width: 130, render: (_value, row) => reviewTargetTypeText(row.targetType) },
            {
              key: 'actions',
              title: '操作',
              width: 140,
              render: (_value, row) => <Button size="small" type="primary" loading={submittingTargetKey === row.key} onClick={() => void submitReview(row)}>提交审核</Button>
            }
          ]}
        />
      </section>

      <section className="review-progress-task-list step-object-result-panel">
        <div className="step-draft-review-header">
          <div>
            <h4>待审任务列表</h4>
            <p>点击任务行可选中并查看当前任务状态；审批请进入审核中心处理。</p>
          </div>
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
            { key: 'objectName', title: '对象名', render: (_value, row) => reviewTaskObjectName(row) },
            { key: 'status', title: '状态', width: 110, render: (_value, row) => <Tag color={statusColor(row)}>{statusText(row)}</Tag> },
            { key: 'createdAt', title: '创建时间', width: 170, render: (_value, row) => createdAtText(row.createdAt) }
          ]}
        />
      </section>
    </Panel>
  );
}
