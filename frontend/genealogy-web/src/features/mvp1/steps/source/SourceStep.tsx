import { useEffect, useMemo, useState } from 'react';
import type { Key } from 'react';
import { Alert, Button, Empty, Space, Table, Tag, message } from 'antd';
import { useWorkspace } from '../../../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../../../shared/ui/Form';
import { Panel } from '../../../../shared/ui/Panel';
import { relationshipName, relationTypeText } from '../../domain/relationship';
import { isOfficial, isReviewable, statusColor, statusText } from '../../domain/status';
import { loadBranches as queryBranches, type BranchLike } from '../../services/branchService';
import { loadClans as queryClans, type ClanLike } from '../../services/clanService';
import { loadPersons as queryPersons, type PersonLike } from '../../services/personService';
import { loadRelationships as queryRelationships, type RelationshipLike } from '../../services/relationshipService';
import { countSettledResults, submitReviewTask, submitReviewTasks } from '../../services/reviewTaskService';
import { bindSourceApi, createSourceApi, loadSourceLinks as querySourceLinks, loadSources as querySources, type SourceLike, type SourceLinkLike } from '../../services/sourceService';

type SourceTargetType = 'person' | 'relationship' | 'branch' | 'clan';

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

type SourceBindValidationResult = {
  errorMessage: string;
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

function clanLabel(clan: ClanLike) {
  return clan.clanName || clan.surname || `宗族#${clan.id || '-'}`;
}

function sourceName(row: SourceLike) {
  return row.sourceName || row.name || `来源#${row.id || '-'}`;
}

function sourceLinkSourceName(row: SourceLinkLike) {
  return row.sourceName || `来源#${row.sourceId || row.id || '-'}`;
}

function sourceLinkTargetName(row: SourceLinkLike) {
  return row.targetName || row.targetLabel || `对象#${row.targetId || '-'}`;
}

function sourceLinkTime(row: SourceLinkLike) {
  return row.createdAt || row.createTime || '-';
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

function sourceTargetTypeText(type: SourceTargetType | string | undefined) {
  const dict: Record<SourceTargetType, string> = {
    person: '人物',
    relationship: '关系',
    branch: '支派',
    clan: '宗族'
  };
  return dict[type as SourceTargetType] || String(type || '-');
}

function dedupeRelationships(rows: RelationshipLike[]) {
  return Array.from(new Map(rows.map(row => [String(row.id || `${row.fromPersonId}-${row.toPersonId}-${row.relationLabel}`), row])).values());
}

export function SourceStep({ notify, onSubmittedReview }: Props) {
  const workspace = useWorkspace();
  const [sourceForm, setSourceForm] = useState<SourceForm>({ ...defaultSourceForm });
  const [clans, setClans] = useState<ClanLike[]>([]);
  const [branches, setBranches] = useState<BranchLike[]>([]);
  const [persons, setPersons] = useState<PersonLike[]>([]);
  const [relationships, setRelationships] = useState<RelationshipLike[]>([]);
  const [sources, setSources] = useState<SourceLike[]>([]);
  const [sourceLinks, setSourceLinks] = useState<SourceLinkLike[]>([]);
  const [selectedSourceRowKeys, setSelectedSourceRowKeys] = useState<Key[]>([]);
  const [loadingClans, setLoadingClans] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingSources, setLoadingSources] = useState(false);
  const [loadingSourceLinks, setLoadingSourceLinks] = useState(false);
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

  function validateSourceForm() {
    if (!workspace.clanId) return '请选择宗族';
    if (!sourceForm.sourceName.trim()) return '请填写来源名称';
    return '';
  }

  function validateBindSourceForm(): SourceBindValidationResult {
    if (!workspace.clanId) return { errorMessage: '请选择宗族', targetId: '' };
    if (!workspace.sourceId) return { errorMessage: '请选择已审核通过的来源', targetId: '' };
    const targetOptions = sourceTargetOptions();
    if (!targetOptions.length) return { errorMessage: `暂无已审核通过的${sourceTargetTypeText(sourceForm.targetType)}`, targetId: '' };
    const targetId = effectiveSourceTargetId();
    if (!targetId) return { errorMessage: `请选择具体${sourceTargetTypeText(sourceForm.targetType)}`, targetId: '' };
    return { errorMessage: '', targetId };
  }

  function bindSourceDisabledReason() {
    if (bindingSource) return '来源正在绑定中';
    return validateBindSourceForm().errorMessage;
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

  async function loadBindingCandidateOptions(sourceClanId = workspace.clanId) {
    if (!sourceClanId) {
      setBranches([]);
      setPersons([]);
      setRelationships([]);
      return;
    }
    setLoadingOptions(true);
    try {
      const [branchRows, personRows] = await Promise.all([
        queryBranches(sourceClanId).catch(() => []),
        queryPersons(sourceClanId).catch(() => [])
      ]);
      setBranches(branchRows);
      setPersons(personRows);
      await loadRelationshipTargetOptions(personRows);
    } finally {
      setLoadingOptions(false);
    }
  }

  async function loadRelationshipTargetOptions(personRows: PersonLike[]) {
    const relationshipResults = await Promise.allSettled(personRows.filter(isOfficial).map(person => queryRelationships(person.id)));
    const relationshipRows = relationshipResults
      .filter(result => result.status === 'fulfilled')
      .flatMap(result => (result as PromiseFulfilledResult<RelationshipLike[]>).value);
    setRelationships(dedupeRelationships(relationshipRows));
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
    await Promise.all([
      loadBindingCandidateOptions(sourceClanId),
      loadSources(sourceClanId)
    ]);
  }

  async function loadSources(sourceClanId = workspace.clanId) {
    if (!sourceClanId) {
      setSources([]);
      setSelectedSourceRowKeys([]);
      return;
    }
    setLoadingSources(true);
    try {
      const rows = await querySources(sourceClanId);
      setSources(rows);
      setSelectedSourceRowKeys([]);
    } catch (error) {
      setSources([]);
      toast({ message: (error as Error).message || '查询来源失败' }, true);
    } finally {
      setLoadingSources(false);
    }
  }

  async function loadSourceLinks(sourceClanId = workspace.clanId) {
    if (!sourceClanId) {
      setSourceLinks([]);
      return;
    }
    setLoadingSourceLinks(true);
    try {
      const rows = await querySourceLinks(sourceClanId).catch(() => []);
      setSourceLinks(rows);
    } finally {
      setLoadingSourceLinks(false);
    }
  }

  useEffect(() => { void loadClans(); }, []);
  useEffect(() => {
    setSourceForm({ ...defaultSourceForm });
    setSourceLinks([]);
    void loadStepData();
    void loadSourceLinks();
  }, [workspace.clanId]);

  function changeClan(nextClanId: string) {
    workspace.patch({ clanId: nextClanId, sourceId: '', relationshipId: '', personId: '' });
    setSourceForm({ ...defaultSourceForm });
    setBranches([]);
    setPersons([]);
    setRelationships([]);
    setSources([]);
    setSourceLinks([]);
    setSelectedSourceRowKeys([]);
  }

  function personSourceTargetOptions(): Option[] {
    return officialPersons.map(person => ({ value: String(person.id), label: `${person.name || `人物#${person.id}`}（${person.generationWord || '无字辈'}）` }));
  }

  function relationshipSourceTargetOptions(): Option[] {
    return officialRelationships.map(relationship => ({ value: String(relationship.id), label: `${relationshipName(relationship)} · ${relationTypeText(relationship)}` }));
  }

  function branchSourceTargetOptions(): Option[] {
    return officialBranches.map(branch => ({ value: String(branch.id), label: branch.branchName || `支派#${branch.id}` }));
  }

  function clanSourceTargetOptions(): Option[] {
    return workspace.clanId ? [{ value: workspace.clanId, label: selectedClan?.clanName || selectedClan?.surname || `宗族#${workspace.clanId}` }] : [];
  }

  function sourceTargetOptions(type = sourceForm.targetType): Option[] {
    if (type === 'person') return personSourceTargetOptions();
    if (type === 'relationship') return relationshipSourceTargetOptions();
    if (type === 'branch') return branchSourceTargetOptions();
    if (type === 'clan') return clanSourceTargetOptions();
    return [];
  }

  function sourceTargetPlaceholder() {
    const typeName = sourceTargetTypeText(sourceForm.targetType);
    return sourceTargetOptions().length ? `请选择具体${typeName}` : `暂无已审核通过的${typeName}`;
  }

  function effectiveSourceTargetId() {
    if (sourceForm.targetId) return sourceForm.targetId;
    if (sourceForm.targetType === 'clan') return clanSourceTargetOptions()[0]?.value || '';
    return '';
  }

  async function createSource(submit = false) {
    const errorMessage = validateSourceForm();
    if (errorMessage) {
      toast({ message: errorMessage }, true);
      return;
    }
    setSavingSource(true);
    try {
      const data = await createSourceApi(workspace.clanId, {
        sourceName: sourceForm.sourceName.trim(),
        sourceType: sourceForm.sourceType,
        description: null
      });
      setSourceForm(prev => ({ ...prev, sourceName: '' }));
      if (data?.id) workspace.setSourceId(String(data.id));
      if (submit && data?.id) {
        const task: any = await submitReviewTask({
          clanId: workspace.clanId,
          targetType: 'source',
          targetId: data.id,
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
    const { errorMessage, targetId } = validateBindSourceForm();
    if (errorMessage) {
      toast({ message: errorMessage }, true);
      return;
    }
    setBindingSource(true);
    try {
      const data = await bindSourceApi(workspace.clanId, {
        sourceId: Number(workspace.sourceId),
        targetType: sourceForm.targetType,
        targetId: Number(targetId)
      });
      setSourceForm(prev => ({ ...prev, targetId }));
      toast({ message: '来源绑定成功。', id: data?.id });
      await loadSourceLinks();
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
      const task: any = await submitReviewTask({
        clanId: workspace.clanId,
        targetType: 'source',
        targetId: row.id,
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
      const results = await submitReviewTasks(selectedReviewableSources.map(source => ({
        clanId: workspace.clanId,
        targetType: 'source',
        targetId: source.id || '',
        comment: '提交来源审核'
      })));
      const { successCount, failedCount } = countSettledResults(results);
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

  const sourceBindDisabledReason = bindSourceDisabledReason();

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
          <select value={effectiveSourceTargetId()} onChange={event => patchSource('targetId', event.target.value)}>
            <option value="">{sourceTargetPlaceholder()}</option>
            {sourceTargetOptions().map(option => <option key={`${sourceForm.targetType}-${option.value}`} value={option.value}>{option.label}</option>)}
          </select>
        </Field>
      </div>
      <Actions>
        <button disabled={savingSource || !workspace.clanId} onClick={() => void createSource(false)}>保存来源草稿</button>
        <button className="secondary" disabled={savingSource || !workspace.clanId} onClick={() => void createSource(true)}>保存并提交审核</button>
        <button className="secondary" disabled={!!sourceBindDisabledReason} title={sourceBindDisabledReason || undefined} onClick={() => void bindSource()}>绑定来源</button>
        <button className="secondary" disabled={loadingOptions || !workspace.clanId} onClick={() => void loadStepData()}>刷新绑定对象</button>
      </Actions>

      <section className="source-step-bound-panel step-object-result-panel">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div className="step-draft-review-header">
            <div>
              <h4>已绑定来源对象</h4>
              <p>仅展示已经建立绑定关系的记录，与上方可绑定对象候选列表相互独立。</p>
            </div>
            <Button loading={loadingSourceLinks} disabled={!workspace.clanId} onClick={() => void loadSourceLinks()}>刷新已绑定对象</Button>
          </div>
          {!workspace.clanId ? <Alert type="warning" showIcon message="请先选择宗族" /> : null}
          {sourceLinks.length ? (
            <div className="source-step-bound-list">
              {sourceLinks.map(link => (
                <div className="source-step-bound-card" key={String(link.id || `${link.sourceId}-${link.targetType}-${link.targetId}`)}>
                  <strong>{sourceLinkSourceName(link)}</strong>
                  <span>{sourceTargetTypeText(link.targetType)}：{sourceLinkTargetName(link)}</span>
                  <small>绑定时间：{sourceLinkTime(link)}</small>
                </div>
              ))}
            </div>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={loadingSourceLinks ? '正在查询已绑定对象' : '暂无已绑定来源对象'} />
          )}
        </Space>
      </section>

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
