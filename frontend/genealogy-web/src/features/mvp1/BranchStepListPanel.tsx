import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Key } from 'react';
import { Alert, Button, Empty, Popconfirm, Space, Table, Tag, Typography, message } from 'antd';
import { apiClient } from '../../shared/api/client';

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

const BRANCH_STEP_HOST_CLASS = 'branch-step-host';

function activeStepIndex() {
  const buttons = Array.from(document.querySelectorAll<HTMLElement>('.mvp1-wizard-page .wizard-steps > button'));
  return buttons.findIndex(button => button.classList.contains('active')) + 1;
}

function branchPanelBody() {
  if (activeStepIndex() !== 2) return null;
  const bodies = Array.from(document.querySelectorAll<HTMLElement>('.mvp1-wizard-page > .panel > .ant-card-body'));
  return bodies.length ? bodies[bodies.length - 1] : null;
}

function getWorkspaceValue(key: string) {
  const runtimeValue = (window as any).__genealogyWorkspace?.[key];
  if (runtimeValue) return String(runtimeValue);
  return localStorage.getItem(`genealogy.workspace.${key}`) || '';
}

function patchWorkspace(values: Record<string, string>) {
  const workspace = (window as any).__genealogyWorkspace;
  if (workspace?.patch) workspace.patch(values);
  Object.entries(values).forEach(([key, value]) => localStorage.setItem(`genealogy.workspace.${key}`, value || ''));
}

function toRows(data: any): BranchLike[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.content)) return data.content;
  if (data && typeof data === 'object') return [data];
  return [];
}

function statusOf(row: BranchLike) {
  return String(row?.dataStatus || row?.status || '').trim().toLowerCase();
}

function isOfficial(row: BranchLike) {
  const status = statusOf(row);
  return !status || ['official', 'active', 'approved'].includes(status);
}

function isReviewable(row: BranchLike) {
  return ['draft', 'rejected'].includes(statusOf(row));
}

function statusText(row: BranchLike) {
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
  return dict[status] || status || '已通过';
}

function statusColor(row: BranchLike) {
  const status = statusOf(row);
  if (['official', 'active', 'approved'].includes(status) || !status) return 'success';
  if (status === 'rejected') return 'error';
  if (status === 'draft') return 'default';
  return 'processing';
}

function branchName(row: BranchLike) {
  return row.branchName || row.name || `支派#${row.id || '-'}`;
}

function parentName(row: BranchLike, branches: BranchLike[]) {
  if (!row.parentId) return '无';
  const parent = branches.find(item => String(item.id) === String(row.parentId));
  return parent ? branchName(parent) : `支派#${row.parentId}`;
}

function isSaveButtonText(text: string) {
  return /保存草稿|保存并提交审核|追加草稿|删除草稿|提交审核|批量提交审核/.test(text);
}

export function BranchStepListPanel() {
  const refreshTimers = useRef<number[]>([]);
  const requestSeq = useRef(0);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [clanId, setClanId] = useState('');
  const [branches, setBranches] = useState<BranchLike[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedReviewableRows = useMemo(
    () => branches.filter(row => selectedRowKeys.includes(String(row.id)) && isReviewable(row)),
    [branches, selectedRowKeys]
  );

  function scheduleRefresh() {
    refreshTimers.current.forEach(timer => window.clearTimeout(timer));
    refreshTimers.current = [
      window.setTimeout(() => void loadBranches(), 600),
      window.setTimeout(() => void loadBranches(), 1400)
    ];
  }

  function syncTarget() {
    const nextContainer = branchPanelBody();
    document.querySelectorAll<HTMLElement>(`.${BRANCH_STEP_HOST_CLASS}`).forEach(item => {
      if (item !== nextContainer) item.classList.remove(BRANCH_STEP_HOST_CLASS);
    });
    nextContainer?.classList.add(BRANCH_STEP_HOST_CLASS);
    setContainer(nextContainer);
    setClanId(getWorkspaceValue('clanId'));
  }

  useEffect(() => {
    syncTarget();
    const stepContainer = document.querySelector('.mvp1-wizard-page .wizard-steps');
    const observer = stepContainer ? new MutationObserver(syncTarget) : null;
    observer?.observe(stepContainer, { attributes: true, subtree: true, attributeFilter: ['class'] });
    const timer = window.setInterval(syncTarget, 300);
    return () => {
      observer?.disconnect();
      window.clearInterval(timer);
      refreshTimers.current.forEach(refreshTimer => window.clearTimeout(refreshTimer));
    };
  }, []);

  useEffect(() => {
    if (!container) return;
    const handleClick = (event: MouseEvent) => {
      const button = (event.target as HTMLElement | null)?.closest('button');
      const text = button?.textContent?.trim() || '';
      if (isSaveButtonText(text)) scheduleRefresh();
    };
    container.addEventListener('click', handleClick, true);
    return () => container.removeEventListener('click', handleClick, true);
  }, [container, clanId]);

  useEffect(() => {
    setBranches([]);
    setSelectedRowKeys([]);
    if (!container || !clanId) return;
    void loadBranches();
  }, [container, clanId]);

  async function loadBranches() {
    const effectiveClanId = getWorkspaceValue('clanId');
    if (!effectiveClanId || activeStepIndex() !== 2) return;
    const seq = ++requestSeq.current;
    setLoading(true);
    try {
      const data = await apiClient.get(`/clans/${effectiveClanId}/branches`);
      if (seq === requestSeq.current && activeStepIndex() === 2) {
        setBranches(toRows(data));
        setClanId(effectiveClanId);
        setSelectedRowKeys([]);
      }
    } catch (error) {
      if (seq === requestSeq.current && activeStepIndex() === 2) {
        setBranches([]);
        message.error((error as Error).message || '查询支派失败');
      }
    } finally {
      if (seq === requestSeq.current && activeStepIndex() === 2) setLoading(false);
    }
  }

  function selectBranch(row: BranchLike) {
    if (!isOfficial(row)) {
      message.warning('该支派未审核通过，暂不能进入下一步关联');
      return;
    }
    const id = String(row.id || '');
    patchWorkspace({ branchId: id });
    message.success(`已选中支派：${branchName(row)}`);
  }

  async function submitOne(row: BranchLike) {
    if (!clanId || !row.id) return;
    setSubmitting(true);
    try {
      await apiClient.post(`/clans/${clanId}/review-tasks`, { targetType: 'branch', targetId: Number(row.id), comment: '提交支派审核' });
      message.success('支派已提交审核');
      await loadBranches();
    } catch (error) {
      message.error((error as Error).message || '提交支派审核失败');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitSelected() {
    if (!clanId || !selectedReviewableRows.length) return;
    setSubmitting(true);
    try {
      const results = await Promise.allSettled(selectedReviewableRows.map(row => apiClient.post(`/clans/${clanId}/review-tasks`, { targetType: 'branch', targetId: Number(row.id), comment: '提交支派审核' })));
      const successCount = results.filter(result => result.status === 'fulfilled').length;
      const failedCount = results.length - successCount;
      if (successCount) message.success(`已提交 ${successCount} 个支派审核`);
      if (failedCount) message.error(`${failedCount} 个支派提交失败`);
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
      message.success('支派草稿已删除');
      await loadBranches();
    } catch (error) {
      message.error((error as Error).message || '删除支派草稿失败');
    } finally {
      setSubmitting(false);
    }
  }

  if (!container || activeStepIndex() !== 2) return null;

  return createPortal(
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
          <Button size="small" loading={loading} disabled={!clanId} onClick={() => void loadBranches()}>刷新</Button>
        </Space>
      </div>
      {!clanId ? <Alert type="warning" showIcon message="请先选择宗族后查看支派" /> : null}
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
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={clanId ? '暂无支派，创建后会显示在这里' : '请选择宗族后查看支派'} /> }}
        onRow={row => ({ onClick: () => selectBranch(row) })}
        columns={[
          { key: 'branchName', title: '支派名', render: (_value, row) => branchName(row) },
          { key: 'parentName', title: '父支派', render: (_value, row) => parentName(row, branches) },
          { key: 'level', title: '层级', width: 88, render: (_value, row) => row.level ?? '-' },
          { key: 'status', title: '状态', width: 110, render: (_value, row) => <Tag color={statusColor(row)}>{statusText(row)}</Tag> },
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
    </section>,
    container
  );
}
