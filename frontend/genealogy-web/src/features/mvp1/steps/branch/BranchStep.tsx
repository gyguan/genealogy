import { useEffect, useMemo, useState } from 'react';
import type { Key } from 'react';
import { Button, Space, Tag } from 'antd';
import { useWorkspace } from '../../../../shared/context/WorkspaceContext';
import { TrackingLinkButton } from '../../../../shared/navigation/TrackingLinkButton';
import { Actions, Field } from '../../../../shared/ui/Form';
import { ConfirmAction, EmptyState, PageFeedback } from '../../../../shared/ui/Feedback';
import { feedback } from '../../../../shared/ui/OperationFeedback';
import { Panel } from '../../../../shared/ui/Panel';
import { ResultListCard } from '../../../../shared/ui/ResultListCard';
import { isOfficial, isReviewable, statusColor, statusOf, statusText } from '../../domain/status';
import { createBranchApi, deleteBranchApi, loadBranches as queryBranches, type BranchLike } from '../../services/branchService';
import { loadClans as queryClans, type ClanLike } from '../../services/clanService';
import { countSettledResults, submitReviewTask, submitReviewTasks } from '../../services/reviewTaskService';

type BranchForm = {
  branchName: string;
  parentId: string;
};

type Props = {

  onSubmittedReview?: (taskId: string) => void;
};

function branchName(row: BranchLike) {
  return row.branchName || row.name || `支派#${row.id || '-'}`;
}

function parentName(row: BranchLike, branches: BranchLike[]) {
  if (!row.parentId) return '无';
  const parent = branches.find(item => String(item.id) === String(row.parentId));
  return parent ? branchName(parent) : `支派#${row.parentId}`;
}

function clanLabel(clan: ClanLike) {
  return clan.clanName || clan.surname || `宗族#${clan.id || '-'}`;
}

function errorText(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function BranchStep({ onSubmittedReview }: Props) {
  const workspace = useWorkspace();
  const [form, setForm] = useState<BranchForm>({ branchName: '', parentId: '' });
  const [selectedClanId, setSelectedClanId] = useState(workspace.clanId);
  const [clans, setClans] = useState<ClanLike[]>([]);
  const [branches, setBranches] = useState<BranchLike[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [listError, setListError] = useState('');

  const officialBranches = useMemo(() => branches.filter(isOfficial), [branches]);
  const selectedReviewableRows = useMemo(
    () => branches.filter(row => selectedRowKeys.includes(String(row.id)) && isReviewable(row)),
    [branches, selectedRowKeys]
  );

  function patch(key: keyof BranchForm, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function validateBranchForm() {
    if (!selectedClanId) return clans.length > 1 ? '请选择宗族' : '请先创建或选择宗族';
    if (!form.branchName.trim()) return '请填写支派名称';
    return '';
  }

  async function loadClans() {
    try {
      const rows = await queryClans();
      setClans(rows);
      if (!selectedClanId && rows[0]?.id) {
        const defaultClanId = String(rows[0].id);
        setSelectedClanId(defaultClanId);
        workspace.setClanId(defaultClanId);
      }
    } catch (error) {
      feedback.error(errorText(error, '查询宗族失败'));
    }
  }

  async function loadBranches(sourceClanId = selectedClanId) {
    if (!sourceClanId) {
      setBranches([]);
      setSelectedRowKeys([]);
      setListError('');
      return;
    }
    setLoading(true);
    setListError('');
    try {
      const rows = await queryBranches(sourceClanId);
      setBranches(rows);
      setSelectedRowKeys([]);
    } catch (error) {
      setBranches([]);
      setListError(errorText(error, '查询支派失败'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadClans(); }, []);
  useEffect(() => {
    setSelectedClanId(workspace.clanId);
  }, [workspace.clanId]);
  useEffect(() => { void loadBranches(selectedClanId); }, [selectedClanId]);

  function selectBranch(row: BranchLike) {
    if (!isOfficial(row)) {
      feedback.warning('该支派未审核通过，暂不能进入下一步关联');
      return;
    }
    const id = String(row.id || '');
    workspace.setBranchId(id);
    feedback.success(`已选中支派：${branchName(row)}`);
  }

  function selectClan(value: string) {
    setSelectedClanId(value);
    setForm(current => ({ ...current, parentId: '' }));
    setListError('');
    workspace.patch({ clanId: value, branchId: '' });
  }

  async function createBranch(append = false, submit = false) {
    const validationMessage = validateBranchForm();
    if (validationMessage) {
      feedback.warning(validationMessage);
      return;
    }
    setSubmitting(true);
    try {
      const data = await createBranchApi(selectedClanId, {
        branchName: form.branchName.trim(),
        parentId: form.parentId ? Number(form.parentId) : null
      });
      setForm({ branchName: '', parentId: append ? form.parentId : '' });
      if (submit && data?.id) {
        const task: any = await submitReviewTask({
          clanId: selectedClanId,
          targetType: 'branch',
          targetId: data.id,
          comment: '提交支派审核'
        });
        if (task?.id) onSubmittedReview?.(String(task.id));
        feedback.success('支派已保存并提交审核，审核通过后才能用于维护字辈和录入人物。');
      } else {
        feedback.success('支派已保存为草稿，提交并审核通过后才能进入下一步关联。');
      }
      await loadBranches(selectedClanId);
    } catch (error) {
      feedback.error(errorText(error, '保存支派失败'));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitOne(row: BranchLike) {
    if (!selectedClanId || !row.id) return;
    setSubmitting(true);
    try {
      const task: any = await submitReviewTask({
        clanId: selectedClanId,
        targetType: 'branch',
        targetId: row.id,
        comment: '提交支派审核'
      });
      if (task?.id) onSubmittedReview?.(String(task.id));
      feedback.success('支派已提交审核');
      await loadBranches(selectedClanId);
    } catch (error) {
      feedback.error(errorText(error, '提交支派审核失败'));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitSelected() {
    if (!selectedClanId || !selectedReviewableRows.length) return;
    setSubmitting(true);
    try {
      const results = await submitReviewTasks(selectedReviewableRows.map(row => ({
        clanId: selectedClanId,
        targetType: 'branch',
        targetId: row.id || '',
        comment: '提交支派审核'
      })));
      const { successCount, failedCount } = countSettledResults(results);
      if (successCount) feedback.success(`已提交 ${successCount} 个支派审核`);
      if (failedCount) feedback.error(`${failedCount} 个支派提交失败`);
      await loadBranches(selectedClanId);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteDraft(row: BranchLike) {
    if (!row.id) return;
    setSubmitting(true);
    try {
      await deleteBranchApi(row.id);
      feedback.success('支派草稿已删除');
      await loadBranches(selectedClanId);
    } catch (error) {
      feedback.error(errorText(error, '删除支派草稿失败'));
    } finally {
      setSubmitting(false);
    }
  }

  const resultNotice = listError || !selectedClanId ? (
    <Space direction="vertical" size={8} style={{ width: '100%' }}>
      {!selectedClanId ? (
        <PageFeedback tone="warning" title="请先选择宗族后查看支派" />
      ) : null}
      {listError ? (
        <PageFeedback
          tone="error"
          title="支派列表加载失败"
          description={listError}
          action={<Button type="link" onClick={() => void loadBranches(selectedClanId)}>重新加载</Button>}
          closable
          onClose={() => setListError('')}
        />
      ) : null}
    </Space>
  ) : null;

  return (
    <Panel title="建立支派" description="支派保存后默认为草稿；审核通过后才能用于字辈、人物和来源关联。">
      <div className="wizard-form-grid">
        <Field label="适用宗族 *">
          <select value={selectedClanId} onChange={event => selectClan(event.target.value)} required>
            <option value="">请选择宗族</option>
            {clans.map(clan => <option key={clan.id} value={String(clan.id)}>{clanLabel(clan)}</option>)}
          </select>
        </Field>
        <Field label="支派名称 *">
          <input value={form.branchName} onChange={event => patch('branchName', event.target.value)} placeholder="例如：长沙支" required />
        </Field>
        <Field label="父支派">
          <select value={form.parentId} disabled={!selectedClanId} onChange={event => patch('parentId', event.target.value)}>
            <option value="">无父支派/作为一级支派</option>
            {officialBranches.map(branch => <option key={branch.id} value={String(branch.id)}>{branchName(branch)}</option>)}
          </select>
        </Field>
        <Field label="系统生成编号"><input value="保存后自动生成" disabled readOnly /></Field>
      </div>
      <Actions>
        <button disabled={submitting || !selectedClanId} onClick={() => void createBranch(false, false)}>保存草稿</button>
        <button className="secondary" disabled={submitting || !selectedClanId} onClick={() => void createBranch(false, true)}>保存并提交审核</button>
        <button className="secondary" disabled={submitting || !selectedClanId} onClick={() => void createBranch(true, false)}>追加草稿</button>
      </Actions>

      <ResultListCard<BranchLike>
        cardClassName="branch-step-query-results"
        totalSuffix="个支派"
        description="草稿/已驳回支派可勾选后提交审核；已通过支派可选中后进入后续步骤。"
        notice={resultNotice}
        extra={(
          <Space wrap>
            <Button type="primary" size="small" disabled={!selectedReviewableRows.length} loading={submitting} onClick={() => void submitSelected()}>
              批量提交审核（{selectedReviewableRows.length}）
            </Button>
            <Button size="small" loading={loading} disabled={!selectedClanId} onClick={() => void loadBranches(selectedClanId)}>刷新</Button>
          </Space>
        )}
        size="small"
        bordered
        rowKey={row => String(row.id || '')}
        loading={loading}
        dataSource={branches}
        pagination={false}
        rowSelection={{
          selectedRowKeys,
          columnTitle: '勾选',
          columnWidth: 72,
          onChange: keys => setSelectedRowKeys(keys),
          getCheckboxProps: row => ({ disabled: !isReviewable(row) || !row.id })
        }}
        locale={{
          emptyText: (
            <EmptyState
              compact
              title={selectedClanId ? '暂无支派' : '尚未选择宗族'}
              description={selectedClanId ? '创建支派后会显示在这里。' : '请选择宗族后查看支派。'}
            />
          )
        }}
        onRow={row => {
          const selected = String(workspace.branchId || '') === String(row.id || '');
          return {
            onClick: () => selectBranch(row),
            style: selected ? { background: '#e6f4ff', cursor: 'pointer' } : { cursor: 'pointer' }
          };
        }}
        columns={[
          { key: 'name', title: '支派名称', render: (_value, row) => <Space><span>{branchName(row)}</span>{String(workspace.branchId || '') === String(row.id || '') ? <Tag color="processing">已选择</Tag> : null}</Space> },
          { key: 'parentId', title: '父支派', render: (_value, row) => parentName(row, branches) },
          { key: 'level', title: '层级', width: 88, render: (_value, row) => row.level ?? '-' },
          { key: 'status', title: '状态', width: 110, render: (_value, row) => <Tag color={statusColor(row)}>{statusText(row, '已通过')}</Tag> },
          {
            key: 'actions',
            title: '操作',
            width: 290,
            render: (_value, row) => {
              const selected = String(workspace.branchId || '') === String(row.id || '');
              return (
                <Space size="small" wrap onClick={event => event.stopPropagation()}>
                  <TrackingLinkButton size="small" type="link" clanId={selectedClanId} targetType="branch" targetId={row.id} />
                  <Button size="small" type={selected ? 'primary' : 'default'} disabled={!isOfficial(row)} onClick={() => selectBranch(row)}>{selected ? '已选中' : '选中支派'}</Button>
                  {isReviewable(row) ? <Button size="small" type="primary" loading={submitting} onClick={() => void submitOne(row)}>提交审核</Button> : null}
                  {statusOf(row) === 'draft' ? (
                    <ConfirmAction
                      title="确认删除该支派草稿？"
                      description="删除后不可恢复。"
                      okText="删除"
                      cancelText="取消"
                      danger
                      onConfirm={() => void deleteDraft(row)}
                    >
                      <Button size="small" danger loading={submitting}>删除草稿</Button>
                    </ConfirmAction>
                  ) : null}
                </Space>
              );
            }
          }
        ]}
      />
    </Panel>
  );
}
