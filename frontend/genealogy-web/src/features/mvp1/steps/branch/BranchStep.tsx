import { useEffect, useMemo, useState } from 'react';
import type { Key } from 'react';
import { Alert, Button, Empty, Popconfirm, Space, Table, Tag, Typography, message } from 'antd';
import { apiClient } from '../../../../shared/api/client';
import { useWorkspace } from '../../../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../../../shared/ui/Form';
import { Panel } from '../../../../shared/ui/Panel';
import { toRows } from '../../domain/normalize';
import { isOfficial, isReviewable, statusColor, statusOf, statusText } from '../../domain/status';

type BranchLike = {
  id?: number | string;
  branchName?: string;
  name?: string;
  parentId?: number | string;
  branchPath?: string;
  level?: number | string;
  sortOrder?: number | string;
  status?: string;
  dataStatus?: string;
};

type ClanLike = {
  id?: number | string;
  clanName?: string;
  surname?: string;
};

type BranchForm = {
  branchName: string;
  parentId: string;
};

type Props = {
  notify?: (data: unknown, error?: boolean) => void;
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

export function BranchStep({ notify, onSubmittedReview }: Props) {
  const workspace = useWorkspace();
  const [form, setForm] = useState<BranchForm>({ branchName: '', parentId: '' });
  const [clans, setClans] = useState<ClanLike[]>([]);
  const [branches, setBranches] = useState<BranchLike[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const officialBranches = useMemo(() => branches.filter(isOfficial), [branches]);
  const selectedReviewableRows = useMemo(
    () => branches.filter(row => selectedRowKeys.includes(String(row.id)) && isReviewable(row)),
    [branches, selectedRowKeys]
  );

  function patch(key: keyof BranchForm, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function toast(data: unknown, error = false) {
    notify?.(data, error);
    const text = typeof data === 'string' ? data : (data as any)?.message;
    if (text) {
      if (error) message.error(text);
      else message.success(text);
    }
  }

  async function loadClans() {
    const data = await apiClient.get('/clans').catch(() => []);
    const rows = toRows<ClanLike>(data);
    setClans(rows);
    if (!workspace.clanId && rows[0]?.id) workspace.setClanId(String(rows[0].id));
  }

  async function loadBranches(sourceClanId = workspace.clanId) {
    if (!sourceClanId) {
      setBranches([]);
      setSelectedRowKeys([]);
      return;
    }
    setLoading(true);
    try {
      const data = await apiClient.get(`/clans/${sourceClanId}/branches`);
      setBranches(toRows<BranchLike>(data));
      setSelectedRowKeys([]);
    } catch (error) {
      toast({ message: (error as Error).message || '查询支派失败' }, true);
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadClans(); }, []);
  useEffect(() => { void loadBranches(); }, [workspace.clanId]);

  function selectBranch(row: BranchLike) {
    if (!isOfficial(row)) {
      toast({ message: '该支派未审核通过，暂不能进入下一步关联' }, true);
      return;
    }
    const id = String(row.id || '');
    workspace.setBranchId(id);
    toast({ message: `已选中支派：${branchName(row)}` });
  }

  async function createBranch(append = false, submit = false) {
    if (!workspace.clanId) {
      toast({ message: clans.length > 1 ? '请选择宗族' : '请先创建或选择宗族' }, true);
      return;
    }
    if (!form.branchName.trim()) {
      toast({ message: '请填写支派名称' }, true);
      return;
    }
    setSubmitting(true);
    try {
      const data: any = await apiClient.post(`/clans/${workspace.clanId}/branches`, {
        branchName: form.branchName.trim(),
        parentId: form.parentId ? Number(form.parentId) : null
      });
      setForm({ branchName: '', parentId: append ? form.parentId : '' });
      if (submit && data?.id) {
        const task: any = await apiClient.post(`/clans/${workspace.clanId}/review-tasks`, {
          targetType: 'branch',
          targetId: Number(data.id),
          comment: '提交支派审核'
        });
        if (task?.id) onSubmittedReview?.(String(task.id));
        toast({ message: '支派已保存并提交审核，审核通过后才能用于维护字辈和录入人物。' });
      } else {
        toast({ message: '支派已保存为草稿，提交并审核通过后才能进入下一步关联。' });
      }
      await loadBranches();
    } catch (error) {
      toast({ message: (error as Error).message || '保存支派失败' }, true);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitOne(row: BranchLike) {
    if (!workspace.clanId || !row.id) return;
    setSubmitting(true);
    try {
      const task: any = await apiClient.post(`/clans/${workspace.clanId}/review-tasks`, {
        targetType: 'branch',
        targetId: Number(row.id),
        comment: '提交支派审核'
      });
      if (task?.id) onSubmittedReview?.(String(task.id));
      toast({ message: '支派已提交审核' });
      await loadBranches();
    } catch (error) {
      toast({ message: (error as Error).message || '提交支派审核失败' }, true);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitSelected() {
    if (!workspace.clanId || !selectedReviewableRows.length) return;
    setSubmitting(true);
    try {
      const results = await Promise.allSettled(selectedReviewableRows.map(row => apiClient.post(`/clans/${workspace.clanId}/review-tasks`, {
        targetType: 'branch',
        targetId: Number(row.id),
        comment: '提交支派审核'
      })));
      const successCount = results.filter(result => result.status === 'fulfilled').length;
      const failedCount = results.length - successCount;
      if (successCount) toast({ message: `已提交 ${successCount} 个支派审核` });
      if (failedCount) toast({ message: `${failedCount} 个支派提交失败` }, true);
      await loadBranches();
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteDraft(row: BranchLike) {
    if (!row.id) return;
    setSubmitting(true);
    try {
      await apiClient.delete(`/branches/${row.id}`);
      toast({ message: '支派草稿已删除' });
      await loadBranches();
    } catch (error) {
      toast({ message: (error as Error).message || '删除支派草稿失败' }, true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Panel title="建立支派" description="支派保存后默认为草稿；审核通过后才能用于字辈、人物和来源关联。">
      <div className="wizard-form-grid">
        <Field label="适用宗族 *">
          <select value={workspace.clanId} onChange={event => workspace.patch({ clanId: event.target.value, branchId: '' })} required>
            <option value="">请选择宗族</option>
            {clans.map(clan => <option key={clan.id} value={String(clan.id)}>{clanLabel(clan)}</option>)}
          </select>
        </Field>
        <Field label="支派名称 *">
          <input value={form.branchName} onChange={event => patch('branchName', event.target.value)} placeholder="例如：长沙支" required />
        </Field>
        <Field label="父支派">
          <select value={form.parentId} disabled={!workspace.clanId} onChange={event => patch('parentId', event.target.value)}>
            <option value="">无父支派/作为一级支派</option>
            {officialBranches.map(branch => <option key={branch.id} value={String(branch.id)}>{branchName(branch)}</option>)}
          </select>
        </Field>
        <Field label="系统生成编号"><input value="保存后自动生成" disabled readOnly /></Field>
      </div>
      <Actions>
        <button disabled={submitting || !workspace.clanId} onClick={() => void createBranch(false, false)}>保存草稿</button>
        <button className="secondary" disabled={submitting || !workspace.clanId} onClick={() => void createBranch(false, true)}>保存并提交审核</button>
        <button className="secondary" disabled={submitting || !workspace.clanId} onClick={() => void createBranch(true, false)}>追加草稿</button>
      </Actions>

      <section className="branch-step-list-panel">
        <div className="branch-step-list-header">
          <div>
            <Typography.Title level={5}>该宗族下已有支派</Typography.Title>
            <Typography.Paragraph type="secondary">草稿/已驳回支派可勾选后提交审核；已通过支派可选中后进入后续步骤。</Typography.Paragraph>
          </div>
          <Space wrap>
            <Button type="primary" size="small" disabled={!selectedReviewableRows.length} loading={submitting} onClick={() => void submitSelected()}>
              批量提交审核（{selectedReviewableRows.length}）
            </Button>
            <Button size="small" loading={loading} disabled={!workspace.clanId} onClick={() => void loadBranches()}>刷新</Button>
          </Space>
        </div>
        {!workspace.clanId ? <Alert type="warning" showIcon message="请先选择宗族后查看支派" /> : null}
        <Table<BranchLike>
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
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={workspace.clanId ? '暂无支派，创建后会显示在这里' : '请选择宗族后查看支派'} /> }}
          onRow={row => ({ onClick: () => selectBranch(row) })}
          columns={[
            { key: 'branchName', title: '支派名', render: (_value, row) => branchName(row) },
            { key: 'parentName', title: '父支派', render: (_value, row) => parentName(row, branches) },
            { key: 'level', title: '层级', width: 88, render: (_value, row) => row.level ?? '-' },
            { key: 'status', title: '状态', width: 110, render: (_value, row) => <Tag color={statusColor(row)}>{statusText(row, '已通过')}</Tag> },
            {
              key: 'actions',
              title: '操作',
              width: 210,
              render: (_value, row) => (
                <Space size="small" wrap onClick={event => event.stopPropagation()}>
                  <Button size="small" disabled={!isOfficial(row)} onClick={() => selectBranch(row)}>选中支派</Button>
                  {isReviewable(row) ? <Button size="small" type="primary" loading={submitting} onClick={() => void submitOne(row)}>提交审核</Button> : null}
                  {statusOf(row) === 'draft' ? (
                    <Popconfirm title="确认删除该支派草稿？" okText="删除" cancelText="取消" onConfirm={() => void deleteDraft(row)}>
                      <Button size="small" danger loading={submitting}>删除草稿</Button>
                    </Popconfirm>
                  ) : null}
                </Space>
              )
            }
          ]}
        />
      </section>
    </Panel>
  );
}
