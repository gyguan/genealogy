import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Key } from 'react';
import { Alert, Button, Empty, Space, Table, Tag, Typography, message } from 'antd';
import { apiClient } from '../../shared/api/client';

type PersonLike = {
  id?: number | string;
  name?: string;
  gender?: string;
  generationNo?: number | string;
  generationWord?: string;
  dataStatus?: string;
  status?: string;
};

const PERSON_STEP_HOST_CLASS = 'person-step-host';

function activeStepIndex() {
  const buttons = Array.from(document.querySelectorAll<HTMLElement>('.mvp1-wizard-page .wizard-steps > button'));
  return buttons.findIndex(button => button.classList.contains('active')) + 1;
}

function stepPanelBody() {
  if (activeStepIndex() !== 4) return null;
  const bodies = Array.from(document.querySelectorAll<HTMLElement>('.mvp1-wizard-page > .panel > .ant-card-body'));
  return bodies.length ? bodies[bodies.length - 1] : null;
}

function getWorkspaceValue(key: string) {
  const runtimeValue = (window as any).__genealogyWorkspace?.[key];
  if (runtimeValue) return String(runtimeValue);
  return localStorage.getItem(`genealogy.workspace.${key}`) || '';
}

function toRows(data: any): PersonLike[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.content)) return data.content;
  if (data && typeof data === 'object') return [data];
  return [];
}

function statusOf(row: PersonLike) {
  return String(row?.dataStatus || row?.status || '').trim().toLowerCase();
}

function isReviewable(row: PersonLike) {
  return ['draft', 'rejected'].includes(statusOf(row));
}

function statusText(row: PersonLike) {
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

function statusColor(row: PersonLike) {
  const status = statusOf(row);
  if (['official', 'active', 'approved'].includes(status)) return 'success';
  if (status === 'rejected') return 'error';
  if (status === 'draft') return 'default';
  return 'processing';
}

function genderText(value: unknown) {
  const text = String(value || '').toLowerCase();
  if (text === 'male') return '男';
  if (text === 'female') return '女';
  return '未知';
}

function isSaveButtonText(text: string) {
  return /保存草稿|继续录入|保存并提交审核|批量提交审批/.test(text);
}

export function PersonStepListPanel() {
  const requestSeq = useRef(0);
  const refreshTimers = useRef<number[]>([]);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [clanId, setClanId] = useState('');
  const [rows, setRows] = useState<PersonLike[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searched, setSearched] = useState(false);

  const selectedReviewableRows = useMemo(
    () => rows.filter(row => selectedRowKeys.includes(String(row.id)) && isReviewable(row)),
    [rows, selectedRowKeys]
  );

  function syncTarget() {
    const nextContainer = stepPanelBody();
    document.querySelectorAll<HTMLElement>(`.${PERSON_STEP_HOST_CLASS}`).forEach(item => {
      if (item !== nextContainer) item.classList.remove(PERSON_STEP_HOST_CLASS);
    });
    nextContainer?.classList.add(PERSON_STEP_HOST_CLASS);
    setContainer(nextContainer);
    setClanId(getWorkspaceValue('clanId'));
  }

  function scheduleRefresh() {
    refreshTimers.current.forEach(timer => window.clearTimeout(timer));
    refreshTimers.current = [
      window.setTimeout(() => void loadRows(), 600),
      window.setTimeout(() => void loadRows(), 1400)
    ];
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
    setRows([]);
    setSelectedRowKeys([]);
    setSearched(false);
    if (!container || !clanId) return;
    void loadRows();
  }, [container, clanId]);

  async function loadRows() {
    const effectiveClanId = getWorkspaceValue('clanId');
    if (!effectiveClanId || activeStepIndex() !== 4) return;
    const seq = ++requestSeq.current;
    setLoading(true);
    setSearched(true);
    try {
      const data = await apiClient.get(`/clans/${effectiveClanId}/persons`);
      if (seq === requestSeq.current && activeStepIndex() === 4) {
        setRows(toRows(data));
        setClanId(effectiveClanId);
        setSelectedRowKeys([]);
      }
    } catch (error) {
      if (seq === requestSeq.current && activeStepIndex() === 4) {
        setRows([]);
        message.error((error as Error).message || '查询人物失败');
      }
    } finally {
      if (seq === requestSeq.current && activeStepIndex() === 4) setLoading(false);
    }
  }

  async function submitSelected() {
    if (!clanId || !selectedReviewableRows.length) return;
    setSubmitting(true);
    try {
      const results = await Promise.allSettled(selectedReviewableRows.map(row => apiClient.post(`/clans/${clanId}/review-tasks`, { targetType: 'person', targetId: Number(row.id), comment: '提交人物审核' })));
      const successCount = results.filter(result => result.status === 'fulfilled').length;
      const failedCount = results.length - successCount;
      if (successCount) message.success(`已提交 ${successCount} 个人物审核`);
      if (failedCount) message.error(`${failedCount} 个人物提交失败`);
      await loadRows();
    } finally {
      setSubmitting(false);
    }
  }

  if (!container || activeStepIndex() !== 4) return null;

  return createPortal(
    <section className="person-step-list-panel step-object-result-panel">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div className="step-draft-review-header">
          <div>
            <Typography.Title level={5}>该宗族下已录入人物</Typography.Title>
            <Typography.Paragraph type="secondary">草稿/已驳回人物可勾选后批量提交审批。</Typography.Paragraph>
          </div>
          <Space wrap>
            <Button type="primary" disabled={!selectedReviewableRows.length} loading={submitting} onClick={() => void submitSelected()}>
              批量提交审核（{selectedReviewableRows.length}）
            </Button>
            <Button loading={loading} disabled={!clanId} onClick={() => void loadRows()}>刷新</Button>
          </Space>
        </div>
        {!clanId ? <Alert type="warning" showIcon message="请先选择宗族" /> : null}
        {!searched ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="正在加载人物结果" /> : (
          <Table<PersonLike>
            size="small"
            bordered
            loading={loading}
            rowKey={row => String(row.id || '')}
            dataSource={rows}
            pagination={false}
            rowSelection={{
              selectedRowKeys,
              columnTitle: '勾选',
              columnWidth: 72,
              onChange: keys => setSelectedRowKeys(keys),
              getCheckboxProps: row => ({ disabled: !isReviewable(row) || !row.id })
            }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无人物数据" /> }}
            columns={[
              { key: 'name', title: '姓名', render: (_value, row) => row.name || `人物#${row.id || '-'}` },
              { key: 'gender', title: '性别', width: 90, render: (_value, row) => genderText(row.gender) },
              { key: 'generationNo', title: '代次', width: 100, render: (_value, row) => row.generationNo ? `第${row.generationNo}世` : '-' },
              { key: 'generationWord', title: '字辈', width: 100, render: (_value, row) => row.generationWord || '-' },
              { key: 'dataStatus', title: '状态', width: 110, render: (_value, row) => <Tag color={statusColor(row)}>{statusText(row)}</Tag> }
            ]}
          />
        )}
      </Space>
    </section>,
    container
  );
}
