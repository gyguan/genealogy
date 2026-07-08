import { useEffect, useMemo, useState } from 'react';
import type { Key } from 'react';
import { Alert, Button, Empty, Space, Table, Tag, message } from 'antd';
import { apiClient } from '../../../../shared/api/client';
import { useWorkspace } from '../../../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../../../shared/ui/Form';
import { Panel } from '../../../../shared/ui/Panel';

type SourceTargetType = 'person' | 'relationship' | 'branch' | 'clan';

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
};

type PersonLike = {
  id?: number | string;
  name?: string;
  generationWord?: string;
  dataStatus?: string;
  status?: string;
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

type SourceLike = {
  id?: number | string;
  sourceName?: string;
  name?: string;
  sourceType?: string;
  dataStatus?: string;
  status?: string;
  verificationStatus?: string;
};

type Option = {
  value: string;
  label: string;
};

type SourceForm = {
  sourceName: string;
  sourceType: string;
  targetType: SourceTargetType;
  targetId: string;
};

type Props = {
  notify?: (data: unknown, error?: boolean) => void;
  onSubmittedReview?: (taskId: string) => void;
};

const defaultSourceForm: SourceForm = {
  sourceName: '',
  sourceType: 'genealogy_book',
  targetType: 'person',
  targetId: ''
};

function toRows<T = any>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.content)) return data.content;
  if (data && typeof data === 'object') return [data];
  return [];
}

function statusOf(row: any) {
  return String(row?.dataStatus || row?.status || row?.verificationStatus || '').trim().toLowerCase();
}

function isOfficial(row: any) {
  const status = statusOf(row);
  return !status || ['official', 'active', 'approved'].includes(status);
}

function isReviewable(row: any) {
  return ['draft', 'rejected'].includes(statusOf(row));
}

function statusText(row: any) {
  const status = statusOf(row);
  const dict: Record<string, string> = {
    draft: '草稿',
    pending: '待审核',
    pending_review: '待审核',
    official: '已通过',
    active: '已通过',
    approved: '已通过',
    rejected: '已驳回',
    archived: '已归档'
  };
  return dict[status] || status || '-';
}

function statusColor(row: any) {
  const status = statusOf(row);
  if (['official', 'active', 'approved'].includes(status)) return 'success';
  if (status === 'rejected') return 'error';
  if (status === 'draft') return 'default';
  return 'processing';
}

function nullableString(value: string) {
  const text = String(value ?? '').trim();
  return text || null;
}

function clanLabel(clan: ClanLike) {
  return clan.clanName || clan.surname || `宗族#${clan.id || '-'}`;
}

function sourceName(row: SourceLike) {
  return row.sourceName || row.name || `来源#${row.id || '-'}`;
}

function sourceTypeText(value: unknown) {
  const type = String(value || '').toLowerCase();
  const dict: Record<string, string> = {
    genealogy_book: '族谱',
    local_chronicle: '地方志',
    oral_history: '口述',
    tombstone: '墓碑',
    photo: '照片',
    archive: '档案',
    other: '其他'
  };
  return dict[type] || String(value || '-');
}

function relationshipName(row: RelationshipLike) {
  const fromName = row.fromPersonName || row.fromName || `人物#${row.fromPersonId || '-'}`;
  const toName = row.toPersonName || row.toName || `人物#${row.toPersonId || '-'}`;
  return `${fromName} → ${toName}`;
}

function relationTypeText(row: RelationshipLike) {
  const label = String(row.relationLabel || row.relationType || '').toLowerCase();
  if (label === 'spouse' || row.relationType === 'spouse') return '配偶';
  if (label === 'father') return '父亲';
  if (label === 'mother') return '母亲';
  return row.relationLabel || row.relationType || '关系';
}

export function SourceStep({ notify, onSubmittedReview }: Props) {
  const workspace = useWorkspace();
  const [sourceForm, setSourceForm] = useState<SourceForm>({ ...defaultSourceForm });
  const [clans, setClans] = useState<ClanLike[]>([]);
  const [branches, setBranches] = useState<BranchLike[]>([]);
  const [persons, setPersons] = useState<PersonLike[]>([]);
  const [relationships, setRelationships] = useState<RelationshipLike[]>([]);
  const [sources, setSources] = useState<SourceLike[]>([]);
  const [selectedSourceRowKeys, setSelectedSourceRowKeys] = useState<Key[]>([]);
  const [loadingClans, setLoadingClans] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingSources, setLoadingSources] = useState(false);
  const [savingSource, setSavingSource] = useState(false);
  const [bindingSource, setBindingSource] = useState(false);
  const [submittingSources, setSubmittingSources] = useState(false);

  const officialBranches = useMemo(() => branches.filter(isOfficial), [branches]);
  const officialPersons = useMemo(() => persons.filter(isOfficial), [persons]);
  const officialRelationships = useMemo(() => relationships.filter(isOfficial), [relationships]);
  const officialSources = useMemo(() => sources.filter(isOfficial), [sources]);
  const selectedReviewableSources = useMemo(
    () => sources.filter(source => selectedSourceRowKeys.includes(String(source.id)) && isReviewable(source)),
    [sources, selectedSourceRowKeys]
  );
  const selectedClan = useMemo(() => clans.find(clan => String(clan.id) === workspace.clanId), [clans, workspace.clanId]);

  function toast(data: unknown, error = false) {
    notify?.(data, error);
    const text = typeof data === 'string' ? data : (data as any)?.message;
    if (text) {
      if (error) message.error(text);
      else message.success(text);
    }
  }

  function patchSource(key: keyof SourceForm, value: string) {
    setSourceForm(prev => ({ ...prev, [key]: value }));
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

  async function loadStepData(sourceClanId = workspace.clanId) {
    if (!sourceClanId) {
      setBranches([]);
      setPersons([]);
      setRelationships([]);
      setSources([]);
      setSelectedSourceRowKeys([]);
      return;
    }
    setLoadingOptions(true);
    setLoadingSources(true);
    try {
      const [branchData, personData, sourceData] = await Promise.all([
        apiClient.get(`/clans/${sourceClanId}/branches`).catch(() => []),
        apiClient.get(`/clans/${sourceClanId}/persons`).catch(() => []),
        apiClient.get(`/clans/${sourceClanId}/sources`).catch(() => [])
      ]);
      const personRows = toRows<PersonLike>(personData);
      setBranches(toRows<BranchLike>(branchData));
      setPersons(personRows);
      setSources(toRows<SourceLike>(sourceData));
      setSelectedSourceRowKeys([]);
      const relationshipResults = await Promise.allSettled(personRows.filter(isOfficial).map(person => apiClient.get(`/persons/${person.id}/relationships`)));
      const relationshipRows = relationshipResults
        .filter(result => result.status === 'fulfilled')
        .flatMap(result => toRows<RelationshipLike>((result as PromiseFulfilledResult<unknown>).value));
      const uniqueRelationships = Array.from(new Map(relationshipRows.map(row => [String(row.id || `${row.fromPersonId}-${row.toPersonId}-${row.relationLabel}`), row])).values());
      setRelationships(uniqueRelationships);
    } finally {
      setLoadingOptions(false);
      setLoadingSources(false);
    }
  }

  async function loadSources(sourceClanId = workspace.clanId) {
    if (!sourceClanId) {
      setSources([]);
      setSelectedSourceRowKeys([]);
      return;
    }
    setLoadingSources(true);
    try {
      const data = await apiClient.get(`/clans/${sourceClanId}/sources`);
      setSources(toRows<SourceLike>(data));
      setSelectedSourceRowKeys([]);
    } catch (error) {
      setSources([]);
      toast({ message: (error as Error).message || '查询来源失败' }, true);
    } finally {
      setLoadingSources(false);
    }
  }

  useEffect(() => { void loadClans(); }, []);
  useEffect(() => {
    setSourceForm({ ...defaultSourceForm });
    void loadStepData();
  }, [workspace.clanId]);

  function changeClan(nextClanId: string) {
    workspace.patch({ clanId: nextClanId, sourceId: '', relationshipId: '', personId: '' });
    setSourceForm({ ...defaultSourceForm });
    setBranches([]);
    setPersons([]);
    setRelationships([]);
    setSources([]);
    setSelectedSourceRowKeys([]);
  }

  function sourceTargetOptions(type = sourceForm.targetType): Option[] {
    if (type === 'person') {
      return officialPersons.map(person => ({ value: String(person.id), label: `${person.name || `人物#${person.id}`}（${person.generationWord || '无字辈'}）` }));
    }
    if (type === 'relationship') {
      return officialRelationships.map(relationship => ({ value: String(relationship.id), label: `${relationshipName(relationship)} · ${relationTypeText(relationship)}` }));
    }
    if (type === 'branch') {
      return officialBranches.map(branch => ({ value: String(branch.id), label: branch.branchName || `支派#${branch.id}` }));
    }
    if (type === 'clan') {
      return workspace.clanId ? [{ value: workspace.clanId, label: selectedClan?.clanName || selectedClan?.surname || `宗族#${workspace.clanId}` }] : [];
    }
    return [];
  }

  function effectiveSourceTargetId() {
    return sourceForm.targetId || sourceTargetOptions()[0]?.value || '';
  }

  async function createSource(submit = false) {
    if (!workspace.clanId) {
      toast({ message: '请选择宗族' }, true);
      return;
    }
    if (!sourceForm.sourceName.trim()) {
      toast({ message: '请填写来源名称' }, true);
      return;
    }
    setSavingSource(true);
    try {
      const data: any = await apiClient.post(`/clans/${workspace.clanId}/sources`, {
        sourceName: sourceForm.sourceName.trim(),
        sourceType: sourceForm.sourceType,
        description: null
      });
      setSourceForm(prev => ({ ...prev, sourceName: '' }));
      if (data?.id) workspace.setSourceId(String(data.id));
      if (submit && data?.id) {
        const task: any = await apiClient.post(`/clans/${workspace.clanId}/review-tasks`, {
          targetType: 'source',
          targetId: Number(data.id),
          comment: '提交来源审核'
        });
        if (task?.id) onSubmittedReview?.(String(task.id));
        toast({ message: '来源已保存并提交审核，审核通过后才能绑定到对象。' });
      } else {
        toast({ message: '来源已保存为草稿，审核通过后才能绑定到对象。' });
      }
      await loadSources();
    } catch (error) {
      toast({ message: (error as Error).message || '保存来源失败' }, true);
    } finally {
      setSavingSource(false);
    }
  }

  async function bindSource() {
    if (!workspace.clanId) {
      toast({ message: '请选择宗族' }, true);
      return;
    }
    if (!workspace.sourceId) {
      toast({ message: '请选择已审核通过的来源' }, true);
      return;
    }
    const targetId = effectiveSourceTargetId();
    if (!targetId) {
      toast({ message: '请选择已审核通过的绑定对象' }, true);
      return;
    }
    setBindingSource(true);
    try {
      const data: any = await apiClient.post(`/clans/${workspace.clanId}/source-links`, {
        sourceId: Number(workspace.sourceId),
        targetType: sourceForm.targetType,
        targetId: Number(targetId)
      });
      setSourceForm(prev => ({ ...prev, targetId }));
      toast({ message: '来源绑定成功。', id: data?.id });
    } catch (error) {
      toast({ message: (error as Error).message || '绑定来源失败' }, true);
    } finally {
      setBindingSource(false);
    }
  }

  async function submitSource(row: SourceLike) {
    if (!workspace.clanId || !row.id) return;
    setSubmittingSources(true);
    try {
      const task: any = await apiClient.post(`/clans/${workspace.clanId}/review-tasks`, {
        targetType: 'source',
        targetId: Number(row.id),
        comment: '提交来源审核'
      });
      if (task?.id) onSubmittedReview?.(String(task.id));
      toast({ message: '来源已提交审核' });
      await loadSources();
    } catch (error) {
      toast({ message: (error as Error).message || '提交来源审核失败' }, true);
    } finally {
      setSubmittingSources(false);
    }
  }

  async function submitSelectedSources() {
    if (!workspace.clanId || !selectedReviewableSources.length) return;
    setSubmittingSources(true);
    try {
      const results = await Promise.allSettled(selectedReviewableSources.map(source => apiClient.post(`/clans/${workspace.clanId}/review-tasks`, {
        targetType: 'source',
        targetId: Number(source.id),
        comment: '提交来源审核'
      })));
      const successCount = results.filter(result => result.status === 'fulfilled').length;
      const failedCount = results.length - successCount;
      if (successCount) toast({ message: `已提交 ${successCount} 个来源审核` });
      if (failedCount) toast({ message: `${failedCount} 个来源提交失败` }, true);
      await loadSources();
    } finally {
      setSubmittingSources(false);
    }
  }

  function selectSource(row: SourceLike) {
    if (!isOfficial(row)) {
      toast({ message: '该来源未审核通过，暂不能绑定到对象' }, true);
      return;
    }
    workspace.setSourceId(String(row.id || ''));
    toast({ message: `已选中来源：${sourceName(row)}` });
  }

  return (
    <Panel title="绑定来源证据" description="来源和绑定对象都必须审核通过后才能建立绑定。">
      <div className="wizard-form-grid">
        <Field label="适用宗族 *">
          <select value={workspace.clanId} onChange={event => changeClan(event.target.value)} disabled={loadingClans} required>
            <option value="">请选择宗族</option>
            {clans.map(clan => <option key={clan.id} value={String(clan.id)}>{clanLabel(clan)}</option>)}
          </select>
        </Field>
        <Field label="已有来源">
          <select value={workspace.sourceId} disabled={!officialSources.length} onChange={event => workspace.setSourceId(event.target.value)}>
            <option value="">{officialSources.length ? '请选择已通过来源' : '暂无已通过来源，可先创建并提交审核'}</option>
            {officialSources.map(source => <option key={source.id} value={String(source.id)}>{sourceName(source)}</option>)}
          </select>
        </Field>
        <Field label="来源名称 *">
          <input value={sourceForm.sourceName} onChange={event => patchSource('sourceName', event.target.value)} placeholder="例如：民国二十年族谱" />
        </Field>
        <Field label="来源类型">
          <select value={sourceForm.sourceType} onChange={event => patchSource('sourceType', event.target.value)}>
            <option value="genealogy_book">族谱</option>
            <option value="oral_history">口述</option>
            <option value="tombstone">墓碑</option>
            <option value="photo">照片</option>
            <option value="archive">档案</option>
          </select>
        </Field>
        <Field label="绑定对象类型">
          <select value={sourceForm.targetType} onChange={event => setSourceForm(prev => ({ ...prev, targetType: event.target.value as SourceTargetType, targetId: '' }))}>
            <option value="person">人物</option>
            <option value="relationship">关系</option>
            <option value="branch">支派</option>
            <option value="clan">宗族</option>
          </select>
        </Field>
        <Field label="绑定对象">
          <select value={sourceForm.targetId || effectiveSourceTargetId()} onChange={event => patchSource('targetId', event.target.value)}>
            <option value="">请选择已通过绑定对象</option>
            {sourceTargetOptions().map(option => <option key={`${sourceForm.targetType}-${option.value}`} value={option.value}>{option.label}</option>)}
          </select>
        </Field>
      </div>
      <Actions>
        <button disabled={savingSource || !workspace.clanId} onClick={() => void createSource(false)}>保存来源草稿</button>
        <button className="secondary" disabled={savingSource || !workspace.clanId} onClick={() => void createSource(true)}>保存并提交审核</button>
        <button className="secondary" disabled={bindingSource || !workspace.sourceId} onClick={() => void bindSource()}>绑定来源</button>
        <button className="secondary" disabled={loadingOptions || !workspace.clanId} onClick={() => void loadStepData()}>刷新绑定对象</button>
      </Actions>

      <section className="source-step-list-panel step-object-result-panel">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div className="step-draft-review-header">
            <div>
              <h4>该宗族下已有来源</h4>
              <p>草稿/已驳回来源可勾选后批量提交审批；已通过来源可选中后绑定到对象。</p>
            </div>
            <Space wrap>
              <Button type="primary" disabled={!selectedReviewableSources.length} loading={submittingSources} onClick={() => void submitSelectedSources()}>
                批量提交审核（{selectedReviewableSources.length}）
              </Button>
              <Button loading={loadingSources} disabled={!workspace.clanId} onClick={() => void loadSources()}>刷新</Button>
            </Space>
          </div>
          {!workspace.clanId ? <Alert type="warning" showIcon message="请先选择宗族" /> : null}
          <Table<SourceLike>
            size="small"
            bordered
            loading={loadingSources}
            rowKey={row => String(row.id || '')}
            dataSource={sources}
            pagination={false}
            rowSelection={{
              selectedRowKeys: selectedSourceRowKeys,
              columnTitle: '勾选',
              columnWidth: 72,
              onChange: keys => setSelectedSourceRowKeys(keys),
              getCheckboxProps: row => ({ disabled: !isReviewable(row) || !row.id })
            }}
            onRow={row => ({ onClick: () => selectSource(row) })}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={workspace.clanId ? '暂无来源数据' : '请选择宗族后查看来源'} /> }}
            columns={[
              { key: 'sourceName', title: '来源名称', render: (_value, row) => sourceName(row) },
              { key: 'sourceType', title: '来源类型', width: 140, render: (_value, row) => sourceTypeText(row.sourceType) },
              { key: 'dataStatus', title: '状态', width: 110, render: (_value, row) => <Tag color={statusColor(row)}>{statusText(row)}</Tag> },
              {
                key: 'actions',
                title: '操作',
                width: 150,
                render: (_value, row) => isReviewable(row)
                  ? <Button size="small" type="primary" loading={submittingSources} onClick={event => { event.stopPropagation(); void submitSource(row); }}>提交审核</Button>
                  : '-'
              }
            ]}
          />
        </Space>
      </section>
    </Panel>
  );
}
