import { useEffect, useMemo, useState } from 'react';
import type { Key } from 'react';
import { Alert, Button, Empty, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd';
import { apiClient } from '../../../../shared/api/client';
import { useWorkspace } from '../../../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../../../shared/ui/Form';
import { Panel } from '../../../../shared/ui/Panel';
import { toRows } from '../../domain/normalize';
import { isOfficial, isReviewable, statusColor, statusText } from '../../domain/status';
import { loadClans as queryClans, type ClanLike } from '../../services/clanService';
import { loadGenerationItems as queryGenerationItems, loadGenerationSchemes as queryGenerationSchemes, type GenerationItemLike, type GenerationSchemeLike } from '../../services/generationService';
import { countSettledResults, submitReviewTask, submitReviewTasks } from '../../services/reviewTaskService';

type BranchLike = {
  id?: number | string;
  branchName?: string;
  dataStatus?: string;
  status?: string;
};

type SchemeForm = {
  schemeName: string;
  branchId: string;
};

type WordForm = {
  generationNo: string;
  word: string;
};

type Props = {
  notify?: (data: unknown, error?: boolean) => void;
  onSubmittedReview?: (taskId: string) => void;
};

function clanLabel(clan: ClanLike) {
  return clan.clanName || clan.surname || `宗族#${clan.id || '-'}`;
}

function branchName(branch: BranchLike) {
  return branch.branchName || `支派#${branch.id || '-'}`;
}

function schemeName(row: GenerationSchemeLike) {
  return row.schemeName || row.name || `方案#${row.id || '-'}`;
}

function generationNoOptions() {
  return Array.from({ length: 60 }, (_, index) => ({ label: `第${index + 1}世`, value: String(index + 1) }));
}

export function GenerationStep({ notify, onSubmittedReview }: Props) {
  const workspace = useWorkspace();
  const [schemeForm, setSchemeForm] = useState<SchemeForm>({ schemeName: '', branchId: '' });
  const [wordForm, setWordForm] = useState<WordForm>({ generationNo: '1', word: '' });
  const [clans, setClans] = useState<ClanLike[]>([]);
  const [branches, setBranches] = useState<BranchLike[]>([]);
  const [schemes, setSchemes] = useState<GenerationSchemeLike[]>([]);
  const [items, setItems] = useState<GenerationItemLike[]>([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState('');
  const [selectedSchemeRowKeys, setSelectedSchemeRowKeys] = useState<Key[]>([]);
  const [wordsModalOpen, setWordsModalOpen] = useState(false);
  const [loadingClans, setLoadingClans] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [loadingSchemes, setLoadingSchemes] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [savingScheme, setSavingScheme] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [submittingSchemes, setSubmittingSchemes] = useState(false);

  const officialBranches = useMemo(() => branches.filter(isOfficial), [branches]);
  const selectedScheme = useMemo(() => schemes.find(scheme => String(scheme.id) === selectedSchemeId), [schemes, selectedSchemeId]);
  const selectedReviewableSchemes = useMemo(
    () => schemes.filter(scheme => selectedSchemeRowKeys.includes(String(scheme.id)) && isReviewable(scheme)),
    [schemes, selectedSchemeRowKeys]
  );

  function toast(data: unknown, error = false) {
    notify?.(data, error);
    const text = typeof data === 'string' ? data : (data as any)?.message;
    if (text) {
      if (error) message.error(text);
      else message.success(text);
    }
  }

  function patchScheme(key: keyof SchemeForm, value: string) {
    setSchemeForm(prev => ({ ...prev, [key]: value }));
  }

  function patchWord(key: keyof WordForm, value: string) {
    setWordForm(prev => ({ ...prev, [key]: value }));
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

  async function loadBranches(sourceClanId = workspace.clanId) {
    if (!sourceClanId) {
      setBranches([]);
      return;
    }
    setLoadingBranches(true);
    try {
      const data = await apiClient.get(`/clans/${sourceClanId}/branches`).catch(() => []);
      const rows = toRows<BranchLike>(data);
      setBranches(rows);
      const nextBranchId = workspace.branchId && rows.some(branch => String(branch.id) === workspace.branchId)
        ? workspace.branchId
        : rows.filter(isOfficial)[0]?.id ? String(rows.filter(isOfficial)[0].id) : '';
      workspace.setBranchId(nextBranchId);
      setSchemeForm(prev => ({ ...prev, branchId: nextBranchId }));
    } finally {
      setLoadingBranches(false);
    }
  }

  async function loadSchemes(sourceClanId = workspace.clanId) {
    if (!sourceClanId) {
      setSchemes([]);
      setSelectedSchemeRowKeys([]);
      return;
    }
    setLoadingSchemes(true);
    try {
      const rows = await queryGenerationSchemes(sourceClanId);
      setSchemes(rows);
      setSelectedSchemeRowKeys([]);
    } catch (error) {
      setSchemes([]);
      toast({ message: (error as Error).message || '查询字辈方案失败' }, true);
    } finally {
      setLoadingSchemes(false);
    }
  }

  async function loadGenerationItems(sourceSchemeId = selectedSchemeId) {
    if (!sourceSchemeId) {
      setItems([]);
      return;
    }
    setLoadingItems(true);
    try {
      const rows = await queryGenerationItems(sourceSchemeId);
      setItems(rows);
    } catch (error) {
      setItems([]);
      toast({ message: (error as Error).message || '查询字辈明细失败' }, true);
    } finally {
      setLoadingItems(false);
    }
  }

  useEffect(() => { void loadClans(); }, []);
  useEffect(() => {
    setSchemeForm(prev => ({ ...prev, branchId: '' }));
    setSelectedSchemeId('');
    setItems([]);
    void loadBranches();
    void loadSchemes();
  }, [workspace.clanId]);

  useEffect(() => {
    if (!wordsModalOpen || !selectedSchemeId) return;
    void loadGenerationItems(selectedSchemeId);
  }, [wordsModalOpen, selectedSchemeId]);

  function changeClan(nextClanId: string) {
    workspace.patch({ clanId: nextClanId, branchId: '' });
    setSchemes([]);
    setBranches([]);
    setSelectedSchemeId('');
    setItems([]);
  }

  async function createScheme(submit = false) {
    if (!workspace.clanId) {
      toast({ message: '请选择宗族' }, true);
      return;
    }
    if (!schemeForm.schemeName.trim()) {
      toast({ message: '请填写字辈方案名称' }, true);
      return;
    }
    setSavingScheme(true);
    try {
      const data: any = await apiClient.post(`/clans/${workspace.clanId}/generation-schemes`, {
        branchId: schemeForm.branchId ? Number(schemeForm.branchId) : null,
        schemeName: schemeForm.schemeName.trim(),
        isDefault: true,
        validationEnabled: true,
        strictMode: false
      });
      setSchemeForm(prev => ({ ...prev, schemeName: '' }));
      if (submit && data?.id) {
        const task: any = await submitReviewTask({
          clanId: workspace.clanId,
          targetType: 'generation_scheme',
          targetId: data.id,
          comment: '提交字辈方案审核'
        });
        if (task?.id) onSubmittedReview?.(String(task.id));
        toast({ message: '字辈方案已保存并提交审核，审核通过后才能用于录入人物。' });
      } else {
        toast({ message: '字辈方案已保存为草稿，请维护字辈明细后提交审核。' });
      }
      await loadSchemes();
    } catch (error) {
      toast({ message: (error as Error).message || '保存字辈方案失败' }, true);
    } finally {
      setSavingScheme(false);
    }
  }

  function openWordsModal(row: GenerationSchemeLike) {
    if (!isReviewable(row)) {
      toast({ message: '仅草稿/已驳回字辈方案可维护字辈' }, true);
      return;
    }
    setSelectedSchemeId(String(row.id || ''));
    setWordForm({ generationNo: '1', word: '' });
    setWordsModalOpen(true);
  }

  async function addGenerationItem() {
    if (!selectedSchemeId) {
      toast({ message: '请先选择草稿/已驳回的字辈方案' }, true);
      return;
    }
    if (!wordForm.generationNo) {
      toast({ message: '请选择代次' }, true);
      return;
    }
    if (!wordForm.word.trim()) {
      toast({ message: '请填写字辈' }, true);
      return;
    }
    setAddingItem(true);
    try {
      await apiClient.post(`/generation-schemes/${selectedSchemeId}/items`, {
        generationNo: Number(wordForm.generationNo),
        word: wordForm.word.trim()
      });
      setWordForm(prev => ({ generationNo: String(Number(prev.generationNo || '0') + 1), word: '' }));
      toast({ message: '字辈明细已追加；完善后请在方案列表勾选该方案并提交审批' });
      await loadGenerationItems(selectedSchemeId);
    } catch (error) {
      toast({ message: (error as Error).message || '追加字辈明细失败' }, true);
    } finally {
      setAddingItem(false);
    }
  }

  async function submitScheme(row: GenerationSchemeLike) {
    if (!workspace.clanId || !row.id) return;
    setSubmittingSchemes(true);
    try {
      const task: any = await submitReviewTask({
        clanId: workspace.clanId,
        targetType: 'generation_scheme',
        targetId: row.id,
        comment: '提交字辈方案审核'
      });
      if (task?.id) onSubmittedReview?.(String(task.id));
      toast({ message: '字辈方案已提交审核' });
      await loadSchemes();
    } catch (error) {
      toast({ message: (error as Error).message || '提交字辈方案审核失败' }, true);
    } finally {
      setSubmittingSchemes(false);
    }
  }

  async function submitSelectedSchemes() {
    if (!workspace.clanId || !selectedReviewableSchemes.length) return;
    setSubmittingSchemes(true);
    try {
      const results = await submitReviewTasks(selectedReviewableSchemes.map(scheme => ({
        clanId: workspace.clanId,
        targetType: 'generation_scheme',
        targetId: scheme.id || '',
        comment: '提交字辈方案审核'
      })));
      const { successCount, failedCount } = countSettledResults(results);
      if (successCount) toast({ message: `已提交 ${successCount} 个字辈方案审核` });
      if (failedCount) toast({ message: `${failedCount} 个字辈方案提交失败` }, true);
      await loadSchemes();
    } finally {
      setSubmittingSchemes(false);
    }
  }

  return (
    <Panel title="维护字辈" description="字辈方案保存后默认为草稿；审核通过后才能用于人物录入。">
      <section className="wizard-generation-section">
        <h4>一、创建字辈方案</h4>
        <div className="wizard-form-grid wizard-generation-scheme-grid">
          <Field label="适用宗族 *">
            <select value={workspace.clanId} onChange={event => changeClan(event.target.value)} disabled={loadingClans} required>
              <option value="">请选择宗族</option>
              {clans.map(clan => <option key={clan.id} value={String(clan.id)}>{clanLabel(clan)}</option>)}
            </select>
          </Field>
          <Field label="适用支派">
            <select value={schemeForm.branchId || workspace.branchId} disabled={!workspace.clanId || loadingBranches || !officialBranches.length} onChange={event => { workspace.setBranchId(event.target.value); patchScheme('branchId', event.target.value); }}>
              <option value="">{officialBranches.length ? '请选择已通过支派' : '暂无已通过支派'}</option>
              {officialBranches.map(branch => <option key={branch.id} value={String(branch.id)}>{branchName(branch)}</option>)}
            </select>
          </Field>
          <Field label="字辈方案名称 *">
            <input value={schemeForm.schemeName} onChange={event => patchScheme('schemeName', event.target.value)} required />
          </Field>
          <Field label="系统生成编号"><input value="创建方案后自动生成" disabled readOnly /></Field>
        </div>
        <Actions>
          <button disabled={savingScheme || !workspace.clanId} onClick={() => void createScheme(false)}>保存草稿</button>
          <button className="secondary" disabled={savingScheme || !workspace.clanId} onClick={() => void createScheme(true)}>保存并提交审核</button>
        </Actions>
      </section>

      <section className="wizard-branch-list wizard-generation-inline-list">
        <div className="wizard-inline-list-header">
          <h4>该宗族下已有字辈方案</h4>
          <Space wrap>
            <Button type="primary" size="small" disabled={!selectedReviewableSchemes.length} loading={submittingSchemes} onClick={() => void submitSelectedSchemes()}>
              批量提交审核（{selectedReviewableSchemes.length}）
            </Button>
            <Button size="small" loading={loadingSchemes} disabled={!workspace.clanId} onClick={() => void loadSchemes()}>刷新</Button>
          </Space>
        </div>
        <Alert type="info" showIcon message="字辈方案与字辈明细作为一个整体提交审批：先保存草稿方案，再从列表点击“维护字辈”补充明细，最后勾选方案提交审批。" style={{ marginBottom: 10 }} />
        <Table<GenerationSchemeLike>
          size="small"
          bordered
          loading={loadingSchemes}
          rowKey={row => String(row.id || '')}
          dataSource={schemes}
          pagination={false}
          rowSelection={{
            selectedRowKeys: selectedSchemeRowKeys,
            columnTitle: '勾选',
            columnWidth: 72,
            onChange: keys => setSelectedSchemeRowKeys(keys),
            getCheckboxProps: row => ({ disabled: !isReviewable(row) || !row.id })
          }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={workspace.clanId ? '暂无字辈方案，创建后会显示在这里' : '请选择宗族后查看字辈方案'} /> }}
          columns={[
            { key: 'schemeName', title: '字辈方案', render: (_value, row) => schemeName(row) },
            { key: 'branchId', title: '支派', render: (_value, row) => row.branchName || row.branchId || '-' },
            { key: 'status', title: '状态', width: 110, render: (_value, row) => <Tag color={statusColor(row)}>{statusText(row)}</Tag> },
            {
              key: 'actions',
              title: '操作',
              width: 200,
              render: (_value, row) => (
                <Space size="small" wrap>
                  {isReviewable(row) ? <Button size="small" onClick={() => openWordsModal(row)}>维护字辈</Button> : null}
                  {isReviewable(row) ? <Button size="small" type="primary" loading={submittingSchemes} onClick={() => void submitScheme(row)}>提交审核</Button> : null}
                  {!isReviewable(row) ? '-' : null}
                </Space>
              )
            }
          ]}
        />
      </section>

      <Modal
        title="维护字辈"
        open={wordsModalOpen}
        width={760}
        footer={null}
        destroyOnClose
        onCancel={() => setWordsModalOpen(false)}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message={selectedScheme ? `当前维护方案：${schemeName(selectedScheme)}（${statusText(selectedScheme)}）` : '请选择草稿/已驳回字辈方案'}
          />
          <div className="wizard-generation-detail-form wizard-generation-word-grid">
            <label className="wizard-inline-form-field">
              <span>代次 *</span>
              <Select value={wordForm.generationNo} options={generationNoOptions()} onChange={value => patchWord('generationNo', value)} />
            </label>
            <label className="wizard-inline-form-field">
              <span>字辈 *</span>
              <Input value={wordForm.word} onChange={event => patchWord('word', event.target.value)} placeholder="例如：德" />
            </label>
            <label className="wizard-inline-form-field wizard-generation-modal-action">
              <span>&nbsp;</span>
              <Button type="primary" disabled={!selectedSchemeId} loading={addingItem} onClick={() => void addGenerationItem()}>追加字辈</Button>
            </label>
          </div>
          <div className="wizard-inline-list-header">
            <h4>字辈明细查询列表</h4>
            <Button size="small" disabled={!selectedSchemeId} loading={loadingItems} onClick={() => void loadGenerationItems()}>刷新</Button>
          </div>
          <Typography.Paragraph type="secondary">字辈明细会随字辈方案整体提交审批；正式方案不可在此直接维护。</Typography.Paragraph>
          <Table<GenerationItemLike>
            size="small"
            bordered
            loading={loadingItems}
            rowKey={row => String(row.id || `${row.generationNo || ''}-${row.word || ''}`)}
            dataSource={items}
            pagination={false}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无字辈明细，追加后会显示在这里" /> }}
            columns={[
              { key: 'generationNo', title: '代次', render: (_value, row) => row.generationNo ? `第${row.generationNo}世` : '-' },
              { key: 'word', title: '字辈', render: (_value, row) => row.word || '-' }
            ]}
          />
        </Space>
      </Modal>
    </Panel>
  );
}
