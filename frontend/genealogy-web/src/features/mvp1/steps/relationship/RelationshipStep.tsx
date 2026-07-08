import { useEffect, useMemo, useState } from 'react';
import type { Key } from 'react';
import { Alert, Button, Empty, Select, Space, Table, Tag, Typography, message } from 'antd';
import { apiClient } from '../../../../shared/api/client';
import { useWorkspace } from '../../../../shared/context/WorkspaceContext';
import { Panel } from '../../../../shared/ui/Panel';
import { toRows } from '../../domain/normalize';
import { isOfficial, isReviewable, statusColor, statusText } from '../../domain/status';

type RelationshipMode = 'father' | 'mother' | 'spouse' | 'child';

type PersonLike = {
  id?: number | string;
  name?: string;
  gender?: string;
  generationNo?: number | string;
  generationWord?: string;
  dataStatus?: string;
  status?: string;
  branchId?: number | string;
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
};

type ClanLike = {
  id?: number | string;
  clanName?: string;
  surname?: string;
};

type Props = {
  notify?: (data: unknown, error?: boolean) => void;
  onSubmittedReview?: (taskId: string) => void;
};

const MODE_LABEL: Record<RelationshipMode, string> = {
  father: '父亲',
  mother: '母亲',
  spouse: '配偶',
  child: '子女'
};

function genderText(value: unknown) {
  const text = String(value || '').toLowerCase();
  if (text === 'male') return '男';
  if (text === 'female') return '女';
  return '未知';
}

function clanLabel(clan: ClanLike) {
  return clan.clanName || clan.surname || `宗族#${clan.id || '-'}`;
}

function personLabel(person: PersonLike) {
  const generation = person.generationNo ? `第${person.generationNo}世` : '未维护代次';
  const word = person.generationWord ? `${person.generationWord}字辈` : '无字辈';
  return `${person.name || `人物#${person.id}`}（${generation} · ${word} · ${genderText(person.gender)}）`;
}

function expectedGenerationNo(center: PersonLike | undefined, mode: RelationshipMode) {
  const centerNo = Number(center?.generationNo);
  if (!Number.isFinite(centerNo) || centerNo <= 0) return null;
  const expected = mode === 'child' ? centerNo + 1 : mode === 'spouse' ? centerNo : centerNo - 1;
  return expected > 0 ? expected : null;
}

function relationshipRuleText(mode: RelationshipMode) {
  if (mode === 'father') return '父亲必须是中心人物上一代男性';
  if (mode === 'mother') return '母亲必须是中心人物上一代女性';
  if (mode === 'spouse') return '配偶必须是中心人物同一代女性';
  return '子女必须是中心人物下一代';
}

function isCandidate(center: PersonLike | undefined, candidate: PersonLike, mode: RelationshipMode) {
  if (!center?.id || !candidate?.id || String(center.id) === String(candidate.id)) return false;
  const expectedNo = expectedGenerationNo(center, mode);
  if (!expectedNo) return false;
  if (Number(candidate.generationNo) !== expectedNo) return false;
  const gender = String(candidate.gender || '').toLowerCase();
  if (mode === 'father') return gender === 'male';
  if (mode === 'mother') return gender === 'female';
  if (mode === 'spouse') return gender === 'female';
  return true;
}

function relationBody(center: PersonLike, relative: PersonLike, mode: RelationshipMode) {
  if (mode === 'spouse') {
    return {
      fromPersonId: Number(center.id),
      toPersonId: Number(relative.id),
      relationType: 'spouse',
      relationLabel: 'spouse',
      isLineageRelation: false,
      isBiological: false,
      isPrimary: true,
      confidenceLevel: 'high'
    };
  }
  if (mode === 'child') {
    return {
      fromPersonId: Number(center.id),
      toPersonId: Number(relative.id),
      relationType: 'parent_child',
      relationLabel: String(center.gender || '').toLowerCase() === 'female' ? 'mother' : 'father',
      isLineageRelation: true,
      isBiological: true,
      isPrimary: true,
      confidenceLevel: 'high'
    };
  }
  return {
    fromPersonId: Number(relative.id),
    toPersonId: Number(center.id),
    relationType: 'parent_child',
    relationLabel: mode,
    isLineageRelation: true,
    isBiological: true,
    isPrimary: true,
    confidenceLevel: 'high'
  };
}

function relativeName(row: RelationshipLike, centerPersonId: string) {
  const centerIsFrom = String(row.fromPersonId) === String(centerPersonId);
  if (centerIsFrom) return row.toPersonName || row.toName || `人物#${row.toPersonId || '-'}`;
  return row.fromPersonName || row.fromName || `人物#${row.fromPersonId || '-'}`;
}

function relationTypeText(row: RelationshipLike, centerPersonId: string) {
  const label = String(row.relationLabel || row.relationType || '').toLowerCase();
  if (label === 'spouse' || row.relationType === 'spouse') return '配偶';
  const centerIsFrom = String(row.fromPersonId) === String(centerPersonId);
  if (centerIsFrom) return '子女';
  if (label === 'father') return '父亲';
  if (label === 'mother') return '母亲';
  return '亲属';
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

export function RelationshipStep({ notify, onSubmittedReview }: Props) {
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
    .filter(item => isCandidate(centerPerson, item, mode))
    .map(item => ({ value: String(item.id), label: personLabel(item) })), [officialPersons, centerPerson, mode]);
  const selectedReviewableRelationships = useMemo(
    () => relationships.filter(row => selectedRelationshipRowKeys.includes(String(row.id)) && isReviewable(row)),
    [relationships, selectedRelationshipRowKeys]
  );

  function toast(data: unknown, error = false) {
    notify?.(data, error);
    const text = typeof data === 'string' ? data : (data as any)?.message;
    if (text) {
      if (error) message.error(text);
      else message.success(text);
    }
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

  async function loadPersons(sourceClanId = workspace.clanId) {
    if (!sourceClanId) {
      setPersons([]);
      return;
    }
    setLoadingPersons(true);
    try {
      const data = await apiClient.get(`/clans/${sourceClanId}/persons`);
      setPersons(toRows<PersonLike>(data));
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
      const data = await apiClient.get(`/persons/${sourcePersonId}/relationships`);
      setRelationships(toRows<RelationshipLike>(data));
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
    if (!workspace.clanId) {
      toast({ message: '请先选择宗族' }, true);
      return;
    }
    if (!centerPerson) {
      toast({ message: '请选择已审核通过的中心人物' }, true);
      return;
    }
    if (!centerPerson.generationNo) {
      toast({ message: '中心人物未维护代次，无法建立关系' }, true);
      return;
    }
    const relative = officialPersons.find(item => String(item.id) === String(relativePersonId));
    if (!relative || !isCandidate(centerPerson, relative, mode)) {
      toast({ message: `请选择符合规则的${MODE_LABEL[mode]}：${relationshipRuleText(mode)}` }, true);
      return;
    }
    setSavingRelationship(true);
    try {
      const relation: any = await apiClient.post(`/clans/${workspace.clanId}/relationships`, relationBody(centerPerson, relative, mode));
      const relationId = String(relation?.id || '');
      workspace.setRelationshipId(relationId);
      if (submit && relationId) {
        const task: any = await apiClient.post(`/clans/${workspace.clanId}/review-tasks`, {
          targetType: 'relationship',
          targetId: Number(relationId),
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
      const results = await Promise.allSettled(selectedReviewableRelationships.map(row => apiClient.post(`/clans/${workspace.clanId}/review-tasks`, {
        targetType: 'relationship',
        targetId: Number(row.id),
        comment: '提交关系审核'
      })));
      const successCount = results.filter(result => result.status === 'fulfilled').length;
      const failedCount = results.length - successCount;
      if (successCount) toast({ message: `已提交 ${successCount} 个关系审核` });
      if (failedCount) toast({ message: `${failedCount} 个关系提交失败` }, true);
      await loadRelationships(centerPersonId);
    } finally {
      setSubmittingRelationships(false);
    }
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
              <select value={workspace.clanId} onChange={event => changeClan(event.target.value)} disabled={loadingClans} required>
                <option value="">请选择宗族</option>
                {clans.map(clan => <option key={clan.id} value={String(clan.id)}>{clanLabel(clan)}</option>)}
              </select>
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
                placeholder={relativeOptions.length ? `请选择${MODE_LABEL[mode]}` : relationshipRuleText(mode)}
                optionFilterProp="label"
                onChange={value => {
                  setRelativePersonId(value);
                  setSaveError('');
                }}
              />
            </label>
            <label className="relationship-step-field relationship-step-field--wide">
              <span>选择规则</span>
              <Alert type="info" showIcon message={expectedNo ? `${relationshipRuleText(mode)}，应选择第${expectedNo}世人物` : '请先为中心人物维护代次'} />
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

      <section className="relationship-step-list-panel step-object-result-panel">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div className="step-draft-review-header">
            <div>
              <Typography.Title level={5}>当前中心人物已有关系</Typography.Title>
              <Typography.Paragraph type="secondary">草稿/已驳回关系可勾选后批量提交审批。</Typography.Paragraph>
            </div>
            <Space wrap>
              <Button type="primary" disabled={!selectedReviewableRelationships.length} loading={submittingRelationships} onClick={() => void submitSelectedRelationships()}>
                批量提交审核（{selectedReviewableRelationships.length}）
              </Button>
              <Button loading={loadingRelationships} disabled={!centerPersonId} onClick={() => void loadRelationships(centerPersonId)}>刷新</Button>
            </Space>
          </div>
          {!centerPersonId ? <Alert type="info" showIcon message="关系按当前中心人物加载，请先选择中心人物。" /> : null}
          <Table<RelationshipLike>
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
              { key: 'dataStatus', title: '状态', width: 110, render: (_value, row) => <Tag color={statusColor(row)}>{statusText(row)}</Tag> }
            ]}
          />
        </Space>
      </section>
    </Panel>
  );
}
