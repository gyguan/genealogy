import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Key } from 'react';
import { Alert, Button, Empty, Space, Table, Tag, Typography, message } from 'antd';
import { apiClient } from '../../shared/api/client';

type SourceLike = {
  id?: number | string;
  sourceName?: string;
  name?: string;
  sourceType?: string;
  dataStatus?: string;
  status?: string;
  verificationStatus?: string;
};

const SOURCE_STEP_HOST_CLASS = 'source-step-host';

function activeStepIndex() {
  const buttons = Array.from(document.querySelectorAll<HTMLElement>('.mvp1-wizard-page .wizard-steps > button'));
  return buttons.findIndex(button => button.classList.contains('active')) + 1;
}

function stepPanelBody() {
  if (activeStepIndex() !== 6) return null;
  const bodies = Array.from(document.querySelectorAll<HTMLElement>('.mvp1-wizard-page > .panel > .ant-card-body'));
  return bodies.length ? bodies[bodies.length - 1] : null;
}

function getWorkspaceValue(key: string) {
  const runtimeValue = (window as any).__genealogyWorkspace?.[key];
  if (runtimeValue) return String(runtimeValue);
  return localStorage.getItem(`genealogy.workspace.${key}`) || '';
}

function toRows(data: any): SourceLike[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.content)) return data.content;
  if (data && typeof data === 'object') return [data];
  return [];
}

function statusOf(row: SourceLike) {
  return String(row?.dataStatus || row?.status || row?.verificationStatus || '').trim().toLowerCase();
}

function isReviewable(row: SourceLike) {
  return ['draft', 'rejected'].includes(statusOf(row));
}

function statusText(row: SourceLike) {
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

function statusColor(row: SourceLike) {
  const status = statusOf(row);
  if (['official', 'active', 'approved'].includes(status)) return 'success';
  if (status === 'rejected') return 'error';
  if (status === 'draft') return 'default';
  return 'processing';
}

function sourceName(row: SourceLike) {
  return row.sourceName || row.name || `来源#${row.id || '-'}`;
}

function sourceTypeText(value: unknown) {
  const type = String(value || '').toLowerCase();
  const dict: Record<string, string> = {
    genealogy_book: '族谱书籍',
    local_chronicle: '地方志',
    oral_history: '口述记录',
    photo: '照片影像',
    archive: '档案资料',
    other: '其他'
  };
  return dict[type] || String(value || '-');
}

function isSaveButtonText(text: string) {
  return /保存来源草稿|保存并提交审核|绑定来源|提交审核|批量提交审核/.test(text);
}

export function SourceStepListPanel() {
  const requestSeq = useRef(0);
  const refreshTimers = useRef<number[]>([]);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [clanId, setClanId] = useState('');
  const [rows, setRows] = useState<SourceLike[]>([]);
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
    document.querySelectorAll<HTMLElement>(`.${SOURCE_STEP_HOST_CLASS}`).forEach(item => {
      if (item !== nextContainer) item.classList.remove(SOURCE_STEP_HOST_CLASS);
    });
    nextContainer?.classList.add(SOURCE_STEP_HOST_CLASS);
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
    if (!effectiveClanId || activeStepIndex() !== 6) return;
    const seq = ++requestSeq.current;
    setLoading(true);
    setSearched(true);
    try {
      const data = await apiClient.get(`/clans/${effectiveClanId}/sources`);
      if (seq === requestSeq.current && activeStepIndex() === 6) {
        setRows(toRows(data));
        setClanId(effectiveClanId);
        setSelectedRowKeys([]);
      }
    } catch (error) {
      if (seq === requestSeq.current && activeStepIndex() === 6) {
        setRows([]);
        message.error((error as Error).message || '查询来源失败');
      }
    } finally {
      if (seq === requestSeq.current && activeStepIndex() === 6) setLoading(false);
    }
  }

  async function submitSelected() {
    if (!clanId || !selectedReviewableRows.length) return;
    setSubmitting(true);
    try {
      const results = await Promise.allSettled(selectedReviewableRows.map(row => apiClient.post(`/clans/${clanId}/review-tasks`, { targetType: 'source', targetId: Number(row.id), comment: '提交来源审核' })));
      const successCount = results.filter(result => result.status === 'fulfilled').length;
      const failedCount = results.length - successCount;
      if (successCount) message.success(`已提交 ${successCount} 个来源审核`);
      if (failedCount) message.error(`${failedCount} 个来源提交失败`);
      await loadRows();
    } finally {
      setSubmitting(false);
    }
  }

  if (!container || activeStepIndex() !== 6) return null;

  return createPortal(
    <section className="source-step-list-panel step-object-result-panel">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div className="step-draft-review-header">
          <div>
            <Typography.Title level={5}>该宗族下已有来源</Typography.Title>
            <Typography.Paragraph type="secondary">草稿/已驳回来源可勾选后批量提交审批。</Typography.Paragraph>
          </div>
          <Space wrap>
            <Button type="primary" disabled={!selectedReviewableRows.length} loading={submitting} onClick={() => void submitSelected()}>
              批量提交审核（{selectedReviewableRows.length}）
            </Button>
            <Button loading={loading} disabled={!clanId} onClick={() => void loadRows()}>刷新</Button>
          </Space>
        </div>
        {!clanId ? <Alert type="warning" showIcon message="请先选择宗族" /> : null}
        {!searched ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="正在加载来源结果" /> : (
          <Table<SourceLike>
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
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无来源数据" /> }}
            columns={[
              { key: 'sourceName', title: '来源名称', render: (_value, row) => sourceName(row) },
              { key: 'sourceType', title: '来源类型', width: 140, render: (_value, row) => sourceTypeText(row.sourceType) },
              { key: 'dataStatus', title: '状态', width: 110, render: (_value, row) => <Tag color={statusColor(row)}>{statusText(row)}</Tag> }
            ]}
          />
        )}
      </Space>
    </section>,
    container
  );
}
