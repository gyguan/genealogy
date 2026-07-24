import {
  useEffect,
  useMemo,
  useState } from 'react';
import type { Key } from 'react';
import { Alert,
  Button,
  Empty,
  Select,
  Space,
  Tag,
  Typography
} from 'antd';
import { useWorkspace } from '../../../../shared/context/WorkspaceContext';
import { TrackingLinkButton } from '../../../../shared/navigation/TrackingLinkButton';
import { Panel } from '../../../../shared/ui/Panel';
import { ResultListCard } from '../../../../shared/ui/ResultListCard';
import { DraftDeleteButton } from '../../../../shared/ui/DraftDeleteButton';
import {
  RELATIONSHIP_MODE_LABEL,
  buildRelationshipBody,
  expectedGenerationNo,
  isRelationshipCandidate,
  personLabel,
  relationTypeText,
  relationshipRuleText,
  relativeName,
  type RelationshipMode
} from '../../domain/relationship';
import { isOfficial, isReviewable, statusColor, statusText } from '../../domain/status';
import { loadClans as queryClans, type ClanLike } from '../../services/clanService';
import { loadPersons as queryPersons, type PersonLike } from '../../services/personService';
import { createRelationshipApi, deleteRelationshipApi, loadRelationships as queryRelationships, type RelationshipLike } from '../../services/relationshipService';
import { countSettledResults, submitReviewTask, submitReviewTasks } from '../../services/reviewTaskService';

import { feedback } from '../../../../shared/ui/OperationFeedback';

type Props = {
  onSubmittedReview?: (taskId: string) => void;
};

type RelationshipValidationResult = {
  errorMessage: string;
  centerPerson?: PersonLike;
  relative?: PersonLike;
};

function clanLabel(clan: ClanLike) {
  return clan.clanName || clan.surname || `宗族#${clan.id || '-'}`;
}

function readableError(error: unknown, fallback: string) {
  const errorMessage = error instanceof Error ? error.message : String(error || '');
  if (!errorMessage) return fallback;
  const lower = errorMessage.toLowerCase();
  if (lower.includes('same relationship already exists') || lower.includes('relationship_duplicated')) return '该关系已存在，请勿重复创建';
  if (lower.includes('spouse relationship already exists') || lower.includes('relationship_spouse_duplicated')) return '配偶关系已存在，请勿重复创建';
  if (lower.includes('biological parent relationship already exists') || lower.includes('relationship_parent_duplicated')) return '父母关系已存在，请勿重复创建';
  return errorMessage;
}

export function RelationshipStep({ onSubmittedReview }: Props) {
  const workspace = useWorkspace();
  const [clans, setClans] = useState<ClanLike[]>([]);
  const [persons, setPersons] = useState<PersonLike[]>([]);
  const [relationships, setRelationships] = useState<RelationshipLike[]>([]);
  const [mode, setMode] = useState<RelationshipMode>('father');
  const [centerPersonId, setCenterPersonId] = useState('');
  const [relativePersonId, setRelativePersonId] = useState('');
  const [selectedRelationshipRowKeys, setSelectedRelationshipRowKeys] = useState<Key[]>([]);
  const [loadingClans, setLoadingClans] = useState(false);
  const [loadingPersons, setLoadingPersons] = useState(false);
  const [loadingRelationships, setLoadingRelationships] = useState(false);
  const [savingRelationship, setSavingRelationship] = useState(false);
  const [submittingRelationships, setSubmittingRelationships] = useState(false);
  const [saveError, setSaveError] = useState('');

  const officialPersons = useMemo(() => persons.filter(isOfficial), [persons]);
  const centerPerson = useMemo(() => officialPersons.find(item => String(item.id) === String(centerPersonId)), [officialPersons, centerPersonId]);
  const expectedNo = expectedGenerationNo(centerPerson, mode);
  const relativeOptions = useMemo(() => officialPersons
    .filter(item => isRelationshipCandidate(centerPerson, item, mode))
    .map(item => ({ value: String(item.id), label: personLabel(item) })), [officialPersons, centerPerson, mode]);
  const selectedReviewableRelationships = useMemo(
    () => relationships.filter(row => selectedRelationshipRowKeys.includes(String(row.id)) && isReviewable(row)),
    [relationships, selectedRelationshipRowKeys]
  );

  function toast(data: unknown, error = false) {
    const text = typeof data === 'string' ? data : (data as any)?.message;
    if (text) {
      if (error) feedback.error(text);
      else feedback.success(text);
    }
  }

  function validateRelationshipForm(): RelationshipValidationResult {
    if (!workspace.clanId) return { errorMessage: '请先选择宗族' };
    if (!centerPerson) return { errorMessage: '请选择已审核通过的中心人物' };
    if (!centerPerson.generationNo) return { errorMessage: '中心人物未维护代次，无法建立关系' };
    const relative = officialPersons.find(item => String(item.id) === String(relativePersonId));
    if (!relative || !isRelationshipCandidate(centerPerson, relative, mode)) {
      return { errorMessage: `请选择符合规则的${RELATIONSHIP_MODE_LABEL[mode]}：${relationshipRuleText(mode)}` };
    }
    return { errorMessage: '', centerPerson, relative };
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

  async function loadPersons(sourceClanId = workspace.clanId) {
    if (!sourceClanId) {
      setPersons([]);
      return;
    }
    setLoadingPersons(true);
    try {
      const rows = await queryPersons(sourceClanId);
      setPersons(rows);
    } catch (error) {
      const text = readableError(error, '查询人物失败');
      setPersons([]);
      setSaveError(text);
      toast({ message: text }, true);
    } finally {
      setLoadingPersons(false);
    }
  }

  async function loadRelationships(sourcePersonId = centerPersonId || workspace.personId) {
    if (!sourcePersonId) {
      setRelationships([]);
      setSelectedRelationshipRowKeys([]);
      return;
    }
    setLoadingRelationships(true);
    try {
      const rows = await queryRelationships(sourcePersonId);
      setRelationships(rows);
      setSelectedRelationshipRowKeys([]);
    } catch (error) {
      setRelationships([]);
      toast({ message: (error as Error).message || '查询关系失败' }, true);
    } finally {
      setLoadingRelationships(false);
    }
  }

  useEffect(() => { void loadClans(); }, []);
  useEffect(() => {
    setPersons([]);
    setRelationships([]);
    setSelectedRelationshipRowKeys([]);
    setCenterPersonId(workspace.personId || '');
    setRelativePersonId('');
    setSaveError('');
    void loadPersons();
  }, [workspace.clanId]);

  useEffect(() => {
    if (!centerPersonId) {
      setRelationships([]);
      return;
    }
    workspace.setPersonId(centerPersonId);
    setRelativePersonId('');
    setSaveError('');
    void loadRelationships(centerPersonId);
  }, [centerPersonId]);

  function changeClan(nextClanId: string) {
    workspace.patch({ clanId: nextClanId, personId: '', relationshipId: '' });
    setCenterPersonId('');
    setRelativePersonId('');
    setPersons([]);
    setRelationships([]);
    setSelectedRelationshipRowKeys([]);
    setSaveError('');
  }

  function changeMode(value: RelationshipMode) {
    setMode(value);
    setRelativePersonId('');
    setSaveError('');
  }

  async function saveRelationship(submit = false) {
    setSaveError('');
    const { errorMessage, centerPerson: validCenterPerson, relative } = validateRelationshipForm();
    if (errorMessage || !validCenterPerson || !relative) {
      toast({ message: errorMessage || '关系信息不完整' }, true);
      return;
    }
    setSavingRelationship(true);
    try {
      const relation = await createRelationshipApi(workspace.clanId, buildRelationshipBody(validCenterPerson, relative, mode));
      const relationId = String(relation?.id || '');
      workspace.setRelationshipId(relationId);
      if (submit && relationId) {
        const task: any = await submitReviewTask({
          clanId: workspace.clanId,
          targetType: 'relationship',
          targetId: relationId,
          comment: '提交关系审核'
        });
        if (task?.id) onSubmittedReview?.(String(task.id));
        toast({ message: '关系已保存并提交审核' });
      } else {
        toast({ message: '关系已保存为草稿' });
      }
      setRelativePersonId('');
      await loadRelationships(centerPersonId);
    } catch (error) {
      const text = readableError(error, '保存关系失败');
      setSaveError(text);
      toast({ message: text }, true);
    } finally {
      setSavingRelationship(false);
    }
  }

  async function submitSelectedRelationships() {
    if (!workspace.clanId || !selectedReviewableRelationships.length) return;
    setSubmittingRelationships(true);
    try {
      const results = await submitReviewTasks(selectedReviewableRelationships.map(row => ({
        clanId: workspace.clanId,
        targetType: 'relationship',
        targetId: row.id || '',
        comment: '提交关系审核'
      })));
      const { successCount, failedCount } = countSettledResults(results);
      if (successCount) toast({ message: `已提交 ${successCount} 个关系审核` });
      if (failedCount) toast({ message: `${failedCount} 个关系提交失败` }, true);
      await loadRelationships(centerPersonId);
    } finally {
      setSubmittingRelationships(false);
    }
  }

  async function afterDeleteRelationship(row: RelationshipLike) {
    const relationshipId = String(row.id || '');
    setSelectedRelationshipRowKeys(prev => prev.filter(key => String(key) !== relationshipId));
    if (workspace.relationshipId === relationshipId) workspace.setRelationshipId('');
    await loadRelationships(centerPersonId || workspace.personId);
  }

  function selectRelationship(row: RelationshipLike) {
    workspace.setRelationshipId(String(row.id || ''));
    toast({ message: `已选中关系：${relationTypeText(row, centerPersonId || workspace.personId)}` });
  }

  return (
    <Panel title="建立亲属关系" description="只能选择已审核通过的人物建立关系；新关系审核通过后才能绑定来源。">
      <section className="relationship-step-panel">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Typography.Title level={5}>建立亲属关系</Typography.Title>
            <Typography.Paragraph type="secondary">先选择中心人物和关系类型，再从符合代次、性别规则的已审核人物中选择亲属。</Typography.Paragraph>
          </div>
          <div className="relationship-step-form-grid">
            <label className="relationship-step-field">
              <span>适用宗族 *</span>
              <Select
                showSearch
                loading={loadingClans}
                value={workspace.clanId || undefined}
                options={[{ value: '', label: '请选择宗族' }, ...clans.map(clan => ({ value: String(clan.id), label: clanLabel(clan) }))]}
                placeholder="请选择宗族"
                optionFilterProp="label"
                onChange={changeClan}
                style={{ width: '100%' }}
              />
            </label>
            <label className="relationship-step-field">
              <span>中心人物 *</span>
              <Select
                showSearch
                loading={loadingPersons}
                value={centerPersonId || undefined}
                options={officialPersons.map(item => ({ value: String(item.id), label: personLabel(item) }))}
                placeholder="请选择已审核通过的中心人物"
                optionFilterProp="label"
                onChange={value => setCenterPersonId(value)}
              />
            </label>
            <label className="relationship-step-field">
              <span>中心人物代次</span>
              <Select disabled value={centerPerson?.generationNo ? `第${centerPerson.generationNo}世` : '中心人物未维护代次'} options={[{ value: centerPerson?.generationNo ? `第${centerPerson.generationNo}世` : '中心人物未维护代次', label: centerPerson?.generationNo ? `第${centerPerson.generationNo}世` : '中心人物未维护代次' }]} />
            </label>
            <label className="relationship-step-field">
              <span>关系类型 *</span>
              <Select value={mode} onChange={changeMode} options={[
                { value: 'father', label: '父亲' },
                { value: 'mother', label: '母亲' },
                { value: 'spouse', label: '配偶' },
                { value: 'child', label: '子女' }
              ]} />
            </label>
            <label className="relationship-step-field">
              <span>亲属 *</span>
              <Select
                showSearch
                value={relativePersonId || undefined}
                disabled={!centerPerson || !expectedNo || !relativeOptions.length}
                options={relativeOptions}
                placeholder={relativeOptions.length ? `请选择${RELATIONSHIP_MODE_LABEL[mode]}` : relationshipRuleText(mode)}
                optionFilterProp="label"
                onChange={value => {
                  setRelativePersonId(value);
                  setSaveError('');
                }}
              />
            </label>
            <label className="relationship-step-field relationship-step-field--wide">
              <span>选择规则</span>
              <input value={expectedNo ? `${relationshipRuleText(mode)} · 目标代次：第${expectedNo}世` : '中心人物需维护代次后才能自动筛选'} disabled readOnly />
            </label>
          </div>
          {!workspace.clanId ? <Alert type="warning" showIcon message="请先选择宗族" /> : null}
          {saveError ? <Alert type="error" showIcon message={saveError} /> : null}
          <Space wrap>
            <Button type="primary" loading={savingRelationship} disabled={!centerPersonId || !relativePersonId} onClick={() => void saveRelationship(false)}>保存关系草稿</Button>
            <Button loading={savingRelationship} disabled={!centerPersonId || !relativePersonId} onClick={() => void saveRelationship(true)}>保存并提交审核</Button>
          </Space>
        </Space>
      </section>

      <ResultListCard<RelationshipLike>
        cardClassName="relationship-step-query-results"
        totalSuffix="条关系"
        description="草稿/已驳回关系可勾选后批量提交审批。"
        notice={!centerPersonId ? <Alert type="info" showIcon message="关系按当前中心人物加载，请先选择中心人物。" /> : null}
        extra={(
          <Space wrap>
            <Button type="primary" disabled={!selectedReviewableRelationships.length} loading={submittingRelationships} onClick={() => void submitSelectedRelationships()}>
              批量提交审核（{selectedReviewableRelationships.length}）
            </Button>
            <Button loading={loadingRelationships} disabled={!centerPersonId} onClick={() => void loadRelationships(centerPersonId)}>刷新</Button>
          </Space>
        )}
        size="small"
        bordered
        loading={loadingRelationships}
        rowKey={row => String(row.id || '')}
        dataSource={relationships}
        pagination={false}
        rowSelection={{
          selectedRowKeys: selectedRelationshipRowKeys,
          columnTitle: '勾选',
          columnWidth: 72,
          onChange: keys => setSelectedRelationshipRowKeys(keys),
          getCheckboxProps: row => ({ disabled: !isReviewable(row) || !row.id })
        }}
        onRow={row => ({ onClick: () => selectRelationship(row) })}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={centerPersonId ? '暂无关系数据' : '请选择中心人物后查看关系'} /> }}
        columns={[
          { key: 'name', title: '姓名', render: (_value, row) => relativeName(row, centerPersonId || workspace.personId) },
          { key: 'relationType', title: '关系类型', width: 120, render: (_value, row) => relationTypeText(row, centerPersonId || workspace.personId) },
          { key: 'dataStatus', title: '状态', width: 110, render: (_value, row) => <Tag color={statusColor(row)}>{statusText(row)}</Tag> },
          {
            key: 'actions',
            title: '操作',
            width: 220,
            render: (_value, row) => (
              <Space size={4} wrap>
                <TrackingLinkButton size="small" type="link" clanId={workspace.clanId} targetType="relationship" targetId={row.id} />
                {row.id ? (
                  <DraftDeleteButton
                    object={row}
                    objectName={relativeName(row, centerPersonId || workspace.personId)}
                    objectType="关系"
                    onDelete={() => deleteRelationshipApi(row.id!)}
                    onDeleted={() => afterDeleteRelationship(row)}
                    label="删除草稿"
                    buttonProps={{ size: 'small', type: 'link' }}
                  />
                ) : null}
              </Space>
            )
          }
        ]}
      />
    </Panel>
  );
}
