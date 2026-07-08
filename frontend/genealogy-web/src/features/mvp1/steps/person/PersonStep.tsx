import { useEffect, useMemo, useState } from 'react';
import type { Key } from 'react';
import { Alert, Button, Empty, Space, Table, Tag, message } from 'antd';
import { apiClient } from '../../../../shared/api/client';
import { useWorkspace } from '../../../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../../../shared/ui/Form';
import { Panel } from '../../../../shared/ui/Panel';
import { nullableBoolean, nullableNumber, nullableString, toRows } from '../../domain/normalize';
import { isOfficial, isReviewable, statusColor, statusText } from '../../domain/status';
import { loadClans as queryClans, type ClanLike } from '../../services/clanService';
import { loadPersons as queryPersons, type PersonLike } from '../../services/personService';
import { countSettledResults, submitReviewTask, submitReviewTasks } from '../../services/reviewTaskService';

type BranchLike = {
  id?: number | string;
  branchName?: string;
  dataStatus?: string;
  status?: string;
};

type GenerationSchemeLike = {
  id?: number | string;
  schemeName?: string;
  branchId?: number | string;
  dataStatus?: string;
  status?: string;
  verificationStatus?: string;
};

type GenerationItemLike = {
  id?: number | string;
  generationNo?: number | string;
  word?: string;
};

type PersonForm = {
  branchId: string;
  personCode: string;
  name: string;
  genealogyName: string;
  courtesyName: string;
  aliasName: string;
  gender: string;
  generationNo: string;
  generationWord: string;
  rankInFamily: string;
  birthDate: string;
  birthDatePrecision: string;
  deathDate: string;
  deathDatePrecision: string;
  isLiving: string;
  birthPlace: string;
  residencePlace: string;
  occupation: string;
  education: string;
  titleOrHonor: string;
  biography: string;
  tombPlace: string;
  epitaph: string;
  hasDescendant: string;
  lineageStatus: string;
  privacyLevel: string;
  dataStatus: string;
};

type Props = {
  notify?: (data: unknown, error?: boolean) => void;
  onSubmittedReview?: (taskId: string) => void;
};

const defaultPersonForm: PersonForm = {
  branchId: '',
  personCode: '',
  name: '',
  genealogyName: '',
  courtesyName: '',
  aliasName: '',
  gender: 'male',
  generationNo: '',
  generationWord: '',
  rankInFamily: '',
  birthDate: '',
  birthDatePrecision: 'day',
  deathDate: '',
  deathDatePrecision: 'day',
  isLiving: 'true',
  birthPlace: '',
  residencePlace: '',
  occupation: '',
  education: '',
  titleOrHonor: '',
  biography: '',
  tombPlace: '',
  epitaph: '',
  hasDescendant: '',
  lineageStatus: 'normal',
  privacyLevel: 'clan_only',
  dataStatus: 'draft'
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

function branchName(branch: BranchLike) {
  return branch.branchName || `支派#${branch.id || '-'}`;
}

function schemeName(scheme: GenerationSchemeLike) {
  return scheme.schemeName || `方案#${scheme.id || '-'}`;
}

function generationOptionValue(item: GenerationItemLike) {
  return `${item.word || ''}@@${item.generationNo || ''}`;
}

function generationLabel(item: GenerationItemLike) {
  return `${item.word || '-'} · 第${item.generationNo || '-'}世`;
}

function generationSelectedValue(word: string, generationNo: string, items: GenerationItemLike[]) {
  if (!word && !generationNo) return '';
  const selected = items.find(item => String(item.word || '') === String(word || '') && String(item.generationNo || '') === String(generationNo || ''));
  return selected ? generationOptionValue(selected) : '';
}

export function PersonStep({ notify, onSubmittedReview }: Props) {
  const workspace = useWorkspace();
  const [personForm, setPersonForm] = useState<PersonForm>({ ...defaultPersonForm });
  const [clans, setClans] = useState<ClanLike[]>([]);
  const [branches, setBranches] = useState<BranchLike[]>([]);
  const [schemes, setSchemes] = useState<GenerationSchemeLike[]>([]);
  const [generationItems, setGenerationItems] = useState<GenerationItemLike[]>([]);
  const [persons, setPersons] = useState<PersonLike[]>([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState('');
  const [selectedPersonRowKeys, setSelectedPersonRowKeys] = useState<Key[]>([]);
  const [loadingClans, setLoadingClans] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingPersons, setLoadingPersons] = useState(false);
  const [savingPerson, setSavingPerson] = useState(false);
  const [submittingPersons, setSubmittingPersons] = useState(false);

  const officialBranches = useMemo(() => branches.filter(isOfficial), [branches]);
  const officialSchemes = useMemo(() => schemes.filter(isOfficial), [schemes]);
  const selectedReviewablePersons = useMemo(
    () => persons.filter(person => selectedPersonRowKeys.includes(String(person.id)) && isReviewable(person)),
    [persons, selectedPersonRowKeys]
  );

  function toast(data: unknown, error = false) {
    notify?.(data, error);
    const text = typeof data === 'string' ? data : (data as any)?.message;
    if (text) {
      if (error) message.error(text);
      else message.success(text);
    }
  }

  function patchPerson(key: keyof PersonForm, value: string) {
    setPersonForm(prev => ({ ...prev, [key]: value }));
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

  async function loadStepOptions(sourceClanId = workspace.clanId) {
    if (!sourceClanId) {
      setBranches([]);
      setSchemes([]);
      setGenerationItems([]);
      return;
    }
    setLoadingOptions(true);
    try {
      const [branchData, schemeData] = await Promise.all([
        apiClient.get(`/clans/${sourceClanId}/branches`).catch(() => []),
        apiClient.get(`/clans/${sourceClanId}/generation-schemes`).catch(() => [])
      ]);
      const branchRows = toRows<BranchLike>(branchData);
      const schemeRows = toRows<GenerationSchemeLike>(schemeData);
      setBranches(branchRows);
      setSchemes(schemeRows);
      const nextBranchId = personForm.branchId || workspace.branchId || branchRows.filter(isOfficial)[0]?.id;
      if (nextBranchId) {
        workspace.setBranchId(String(nextBranchId));
        setPersonForm(prev => ({ ...prev, branchId: String(nextBranchId) }));
      }
      const nextScheme = selectedSchemeId
        ? schemeRows.find(scheme => String(scheme.id) === selectedSchemeId)
        : schemeRows.filter(isOfficial).find(scheme => !nextBranchId || String(scheme.branchId || '') === String(nextBranchId)) || schemeRows.filter(isOfficial)[0];
      if (nextScheme?.id) await selectScheme(nextScheme, false);
      else {
        setSelectedSchemeId('');
        setGenerationItems([]);
      }
    } finally {
      setLoadingOptions(false);
    }
  }

  async function loadPersons(sourceClanId = workspace.clanId) {
    if (!sourceClanId) {
      setPersons([]);
      setSelectedPersonRowKeys([]);
      return;
    }
    setLoadingPersons(true);
    try {
      const rows = await queryPersons(sourceClanId);
      setPersons(rows);
      setSelectedPersonRowKeys([]);
    } catch (error) {
      setPersons([]);
      toast({ message: (error as Error).message || '查询人物失败' }, true);
    } finally {
      setLoadingPersons(false);
    }
  }

  useEffect(() => { void loadClans(); }, []);
  useEffect(() => {
    setPersons([]);
    setSelectedPersonRowKeys([]);
    setGenerationItems([]);
    setSelectedSchemeId('');
    void loadStepOptions();
    void loadPersons();
  }, [workspace.clanId]);

  function changeClan(nextClanId: string) {
    workspace.patch({ clanId: nextClanId, branchId: '', personId: '' });
    setPersonForm({ ...defaultPersonForm });
    setBranches([]);
    setSchemes([]);
    setGenerationItems([]);
    setPersons([]);
    setSelectedPersonRowKeys([]);
    setSelectedSchemeId('');
  }

  function changeBranch(nextBranchId: string) {
    workspace.setBranchId(nextBranchId);
    setPersonForm(prev => ({ ...prev, branchId: nextBranchId }));
    const branchScheme = officialSchemes.find(scheme => String(scheme.branchId || '') === String(nextBranchId)) || (officialSchemes.length === 1 ? officialSchemes[0] : null);
    if (branchScheme) void selectScheme(branchScheme);
  }

  async function selectScheme(row: GenerationSchemeLike, showMessage = true) {
    if (!isOfficial(row)) {
      toast({ message: '只能选择已审核通过的字辈方案' }, true);
      return;
    }
    const nextSchemeId = String(row.id || '');
    setSelectedSchemeId(nextSchemeId);
    if (row.branchId) {
      workspace.setBranchId(String(row.branchId));
      setPersonForm(prev => ({ ...prev, branchId: String(row.branchId) }));
    }
    try {
      const data = await apiClient.get(`/generation-schemes/${nextSchemeId}/items`);
      setGenerationItems(toRows<GenerationItemLike>(data));
      if (showMessage) toast({ message: `已选择字辈方案：${schemeName(row)}` });
    } catch (error) {
      setGenerationItems([]);
      toast({ message: (error as Error).message || '查询字辈明细失败' }, true);
    }
  }

  function selectGenerationItem(value: string) {
    const selected = generationItems.find(item => generationOptionValue(item) === value);
    setPersonForm(prev => ({
      ...prev,
      generationWord: selected?.word ? String(selected.word) : '',
      generationNo: selected?.generationNo ? String(selected.generationNo) : ''
    }));
  }

  function buildPersonPayload(form = personForm) {
    return {
      branchId: nullableNumber(form.branchId || workspace.branchId),
      personCode: null,
      name: form.name.trim(),
      genealogyName: nullableString(form.genealogyName),
      courtesyName: nullableString(form.courtesyName),
      aliasName: nullableString(form.aliasName),
      gender: nullableString(form.gender) || 'unknown',
      generationNo: nullableNumber(form.generationNo),
      generationWord: nullableString(form.generationWord),
      rankInFamily: nullableString(form.rankInFamily),
      birthDate: nullableString(form.birthDate),
      birthDatePrecision: nullableString(form.birthDatePrecision),
      deathDate: nullableString(form.deathDate),
      deathDatePrecision: nullableString(form.deathDatePrecision),
      isLiving: nullableBoolean(form.isLiving),
      birthPlace: nullableString(form.birthPlace),
      residencePlace: nullableString(form.residencePlace),
      occupation: nullableString(form.occupation),
      education: nullableString(form.education),
      titleOrHonor: nullableString(form.titleOrHonor),
      biography: nullableString(form.biography),
      tombPlace: nullableString(form.tombPlace),
      epitaph: nullableString(form.epitaph),
      hasDescendant: nullableBoolean(form.hasDescendant),
      lineageStatus: nullableString(form.lineageStatus),
      privacyLevel: nullableString(form.privacyLevel),
      dataStatus: nullableString(form.dataStatus)
    };
  }

  function resetPersonFormForNext() {
    setPersonForm(prev => ({
      ...defaultPersonForm,
      branchId: prev.branchId || workspace.branchId,
      generationNo: prev.generationNo,
      generationWord: prev.generationWord,
      privacyLevel: prev.privacyLevel,
      dataStatus: prev.dataStatus
    }));
  }

  async function createPerson(continueAdding = false, submit = false) {
    if (!workspace.clanId) {
      toast({ message: '请选择宗族' }, true);
      return;
    }
    if (!(personForm.branchId || workspace.branchId)) {
      toast({ message: '请选择已审核通过的所属支派' }, true);
      return;
    }
    if (!personForm.name.trim()) {
      toast({ message: '请填写人物姓名' }, true);
      return;
    }
    if (!personForm.gender) {
      toast({ message: '请选择性别' }, true);
      return;
    }
    setSavingPerson(true);
    try {
      const data: any = await apiClient.post(`/clans/${workspace.clanId}/persons`, buildPersonPayload());
      const nextPersonId = String(data?.id || '');
      if (continueAdding) resetPersonFormForNext();
      if (submit && nextPersonId) {
        const task: any = await submitReviewTask({
          clanId: workspace.clanId,
          targetType: 'person',
          targetId: nextPersonId,
          comment: '提交人物审核'
        });
        if (task?.id) onSubmittedReview?.(String(task.id));
        toast({ message: '人物已保存并提交审核，审核通过后才能建立关系。' });
      } else {
        toast({ message: continueAdding ? '人物已保存为草稿，可继续录入；审核通过后才能建立关系。' : '人物已保存为草稿，审核通过后才能建立关系。' });
      }
      await loadPersons();
    } catch (error) {
      toast({ message: (error as Error).message || '保存人物失败' }, true);
    } finally {
      setSavingPerson(false);
    }
  }

  async function submitSelectedPersons() {
    if (!workspace.clanId || !selectedReviewablePersons.length) return;
    setSubmittingPersons(true);
    try {
      const results = await submitReviewTasks(selectedReviewablePersons.map(person => ({
        clanId: workspace.clanId,
        targetType: 'person',
        targetId: person.id || '',
        comment: '提交人物审核'
      })));
      const { successCount, failedCount } = countSettledResults(results);
      if (successCount) toast({ message: `已提交 ${successCount} 个人物审核` });
      if (failedCount) toast({ message: `${failedCount} 个人物提交失败` }, true);
      await loadPersons();
    } finally {
      setSubmittingPersons(false);
    }
  }

  function selectPerson(row: PersonLike) {
    if (!isOfficial(row)) {
      toast({ message: '该人物未审核通过，暂不能作为中心人物建立关系' }, true);
      return;
    }
    workspace.setPersonId(String(row.id || ''));
    toast({ message: `已选中人物：${row.name || `人物#${row.id}`}` });
  }

  return (
    <Panel title="录入人物" description="人物保存后默认为草稿；审核通过后才能作为中心人物建立关系。">
      <div className="wizard-form-grid">
        <Field label="适用宗族 *">
          <select value={workspace.clanId} onChange={event => changeClan(event.target.value)} disabled={loadingClans} required>
            <option value="">请选择宗族</option>
            {clans.map(clan => <option key={clan.id} value={String(clan.id)}>{clanLabel(clan)}</option>)}
          </select>
        </Field>
        <Field label="所属支派 *">
          <select value={personForm.branchId || workspace.branchId} onChange={event => changeBranch(event.target.value)} disabled={!workspace.clanId || loadingOptions || !officialBranches.length} required>
            <option value="">请选择已通过支派</option>
            {officialBranches.map(branch => <option key={branch.id} value={String(branch.id)}>{branchName(branch)}</option>)}
          </select>
        </Field>
        <Field label="字辈方案">
          <select value={selectedSchemeId} disabled={!workspace.clanId || loadingOptions || !officialSchemes.length} onChange={event => { const selected = officialSchemes.find(scheme => String(scheme.id) === event.target.value); if (selected) void selectScheme(selected); else setSelectedSchemeId(''); }}>
            <option value="">{officialSchemes.length ? '请选择已通过字辈方案' : '暂无已通过方案'}</option>
            {officialSchemes.map(scheme => <option key={scheme.id} value={String(scheme.id)}>{schemeName(scheme)}</option>)}
          </select>
        </Field>
        <Field label="人物编码"><input value="保存后自动生成" disabled readOnly /></Field>
        <Field label="姓名 *"><input value={personForm.name} onChange={event => patchPerson('name', event.target.value)} required /></Field>
        <Field label="谱名"><input value={personForm.genealogyName} onChange={event => patchPerson('genealogyName', event.target.value)} /></Field>
        <Field label="字号"><input value={personForm.courtesyName} onChange={event => patchPerson('courtesyName', event.target.value)} /></Field>
        <Field label="别名"><input value={personForm.aliasName} onChange={event => patchPerson('aliasName', event.target.value)} /></Field>
        <Field label="性别 *"><select value={personForm.gender} onChange={event => patchPerson('gender', event.target.value)} required><option value="male">男</option><option value="female">女</option><option value="unknown">未知</option></select></Field>
        <Field label="字辈"><select value={generationSelectedValue(personForm.generationWord, personForm.generationNo, generationItems)} onChange={event => selectGenerationItem(event.target.value)} disabled={!generationItems.length}><option value="">{generationItems.length ? '请选择字辈' : '无字辈明细，可先保存人物'}</option>{generationItems.map(item => <option key={generationOptionValue(item)} value={generationOptionValue(item)}>{generationLabel(item)}</option>)}</select></Field>
        <Field label="代次"><input value={personForm.generationNo ? `第${personForm.generationNo}世` : '选择字辈后自动带出'} disabled readOnly /></Field>
        <Field label="排行"><input value={personForm.rankInFamily} onChange={event => patchPerson('rankInFamily', event.target.value)} /></Field>
        <Field label="出生日期"><input type="text" value={personForm.birthDate} onChange={event => patchPerson('birthDate', event.target.value)} placeholder="例如：1888-03-15" /></Field>
        <Field label="逝世日期"><input type="text" value={personForm.deathDate} onChange={event => patchPerson('deathDate', event.target.value)} placeholder="例如：1950-01-01" /></Field>
        <Field label="是否在世"><select value={personForm.isLiving} onChange={event => patchPerson('isLiving', event.target.value)}><option value="true">在世</option><option value="false">已故</option><option value="">未知</option></select></Field>
        <Field label="出生地"><input value={personForm.birthPlace} onChange={event => patchPerson('birthPlace', event.target.value)} /></Field>
        <Field label="居住地"><input value={personForm.residencePlace} onChange={event => patchPerson('residencePlace', event.target.value)} /></Field>
        <Field label="职业"><input value={personForm.occupation} onChange={event => patchPerson('occupation', event.target.value)} /></Field>
        <Field label="教育程度"><select value={personForm.education} onChange={event => patchPerson('education', event.target.value)}><option value="">请选择教育程度</option><option value="私塾/家学">私塾/家学</option><option value="小学">小学</option><option value="初中">初中</option><option value="高中">高中</option><option value="中专">中专</option><option value="大专">大专</option><option value="本科">本科</option><option value="硕士">硕士</option><option value="博士">博士</option><option value="其他">其他</option></select></Field>
        <Field label="世系状态"><select value={personForm.lineageStatus} onChange={event => patchPerson('lineageStatus', event.target.value)}><option value="normal">正常</option><option value="adopted_in">继入</option><option value="adopted_out">出嗣</option><option value="unknown">未知</option></select></Field>
        <Field label="隐私级别"><select value={personForm.privacyLevel} onChange={event => patchPerson('privacyLevel', event.target.value)}><option value="public">公开</option><option value="clan_only">宗族内可见</option><option value="branch_only">支派内可见</option><option value="private">私密</option></select></Field>
      </div>
      <Field label="人物传记"><textarea value={personForm.biography} onChange={event => patchPerson('biography', event.target.value)} rows={4} placeholder="记录生平、迁徙、功名、事迹等" /></Field>
      <Field label="墓志铭"><textarea value={personForm.epitaph} onChange={event => patchPerson('epitaph', event.target.value)} rows={3} placeholder="记录墓志、碑文或相关摘录" /></Field>
      <Actions>
        <button disabled={savingPerson} onClick={() => void createPerson(true, false)}>保存草稿，继续录入</button>
        <button className="secondary" disabled={savingPerson} onClick={() => void createPerson(false, false)}>保存草稿</button>
        <button className="secondary" disabled={savingPerson} onClick={() => void createPerson(false, true)}>保存并提交审核</button>
        <button className="secondary" onClick={() => setPersonForm({ ...defaultPersonForm, branchId: workspace.branchId })}>重置</button>
      </Actions>

      <section className="person-step-list-panel step-object-result-panel">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div className="step-draft-review-header">
            <div>
              <h4>该宗族下已录入人物</h4>
              <p>草稿/已驳回人物可勾选后批量提交审批；已通过人物可选中后用于建立关系。</p>
            </div>
            <Space wrap>
              <Button type="primary" disabled={!selectedReviewablePersons.length} loading={submittingPersons} onClick={() => void submitSelectedPersons()}>
                批量提交审核（{selectedReviewablePersons.length}）
              </Button>
              <Button loading={loadingPersons} disabled={!workspace.clanId} onClick={() => void loadPersons()}>刷新</Button>
            </Space>
          </div>
          {!workspace.clanId ? <Alert type="warning" showIcon message="请先选择宗族" /> : null}
          <Table<PersonLike>
            size="small"
            bordered
            loading={loadingPersons}
            rowKey={row => String(row.id || '')}
            dataSource={persons}
            pagination={false}
            rowSelection={{
              selectedRowKeys: selectedPersonRowKeys,
              columnTitle: '勾选',
              columnWidth: 72,
              onChange: keys => setSelectedPersonRowKeys(keys),
              getCheckboxProps: row => ({ disabled: !isReviewable(row) || !row.id })
            }}
            onRow={row => ({ onClick: () => selectPerson(row) })}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={workspace.clanId ? '暂无人物数据' : '请选择宗族后查看人物'} /> }}
            columns={[
              { key: 'name', title: '姓名', render: (_value, row) => row.name || `人物#${row.id || '-'}` },
              { key: 'gender', title: '性别', width: 90, render: (_value, row) => genderText(row.gender) },
              { key: 'generationNo', title: '代次', width: 100, render: (_value, row) => row.generationNo ? `第${row.generationNo}世` : '-' },
              { key: 'generationWord', title: '字辈', width: 100, render: (_value, row) => row.generationWord || '-' },
              { key: 'dataStatus', title: '状态', width: 110, render: (_value, row) => <Tag color={statusColor(row)}>{statusText(row)}</Tag> }
            ]}
          />
        </Space>
      </section>
    </Panel>
  );
}
