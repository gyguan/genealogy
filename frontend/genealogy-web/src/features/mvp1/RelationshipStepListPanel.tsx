import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Key } from 'react';
import { Alert, Button, Empty, Space, Table, Tag, Typography, message } from 'antd';
import { apiClient } from '../../shared/api/client';

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

const RELATIONSHIP_LIST_HOST_CLASS = 'relationship-list-host';

function activeStepIndex() {
  const buttons = Array.from(document.querySelectorAll<HTMLElement>('.mvp1-wizard-page .wizard-steps > button'));
  return buttons.findIndex(button => button.classList.contains('active')) + 1;
}

function stepPanelBody() {
  if (activeStepIndex() !== 5) return null;
  const bodies = Array.from(document.querySelectorAll<HTMLElement>('.mvp1-wizard-page > .panel > .ant-card-body'));
  return bodies.length ? bodies[bodies.length - 1] : null;
}

function getWorkspaceValue(key: string) {
  const runtimeValue = (window as any).__genealogyWorkspace?.[key];
  if (runtimeValue) return String(runtimeValue);
  return localStorage.getItem(`genealogy.workspace.${key}`) || '';
}

function toRows(data: any): RelationshipLike[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.content)) return data.content;
  if (data && typeof data === 'object') return [data];
  return [];
}

function statusOf(row: RelationshipLike) {
  return String(row?.dataStatus || row?.status || '').trim().toLowerCase();
}

function isReviewable(row: RelationshipLike) {
  return ['draft', 'rejected'].includes(statusOf(row));
}

function statusText(row: RelationshipLike) {
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

function statusColor(row: RelationshipLike) {
  const status = statusOf(row);
  if (['official', 'active', 'approved'].includes(status)) return 'success';
  if (status === 'rejected') return 'error';
  if (status === 'draft') return 'default';
  return 'processing';
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

function isSaveButtonText(text: string) {
  return /保存关系草稿|保存并提交审核|提交审核|批量提交审核/.test(text);
}

export function RelationshipStepListPanel() {
  const requestSeq = useRef(0);
  const refreshTimers = useRef<number[]>([]);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [clanId, setClanId] = useState('');
  const [personId, setPersonId] = useState('');
  const [rows, setRows] = useState<RelationshipLike[]>([]);
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
    document.querySelectorAll<HTMLElement>(`.${RELATIONSHIP_LIST_HOST_CLASS}`).forEach(item => {
      if (item !== nextContainer) item.classList.remove(RELATIONSHIP_LIST_HOST_CLASS);
    });
    nextContainer?.classList.add(RELATIONSHIP_LIST_HOST_CLASS);
    setContainer(nextContainer);
    setClanId(getWorkspaceValue('clanId'));
    setPersonId(getWorkspaceValue('personId'));
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
    const handler = () => scheduleRefresh();
    window.addEventListener('genealogy:object-changed', handler);
    window.addEventListener('genealogy:review-submitted', handler);
    return () => {
      window.removeEventListener('genealogy:object-changed', handler);
      window.removeEventListener('genealogy:review-submitted', handler);
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
  }, [container, clanId, personId]);

  useEffect(() => {
    setRows([]);
    setSelectedRowKeys([]);
    setSearched(false);
    if (!container || !clanId) return;
    void loadRows();
  }, [container, clanId, personId]);

  async function loadRows() {
    const effectivePersonId = getWorkspaceValue('personId');
    if (!effectivePersonId || activeStepIndex() !== 5) {
      setRows([]);
      setSearched(Boolean(effectivePersonId));
      return;
    }
    const seq = ++requestSeq.current;
    setLoading(true);
    setSearched(true);
    try {
      const data = await apiClient.get(`/persons/${effectivePersonId}/relationships`);
      if (seq === requestSeq.current && activeStepIndex() === 5) {
        setRows(toRows(data));
        setPersonId(effectivePersonId);
        setClanId(getWorkspaceValue('clanId'));
        setSelectedRowKeys([]);
      }
    } catch (error) {
      if (seq === requestSeq.current && activeStepIndex() === 5) {
        setRows([]);
        message.error((error as Error).message || '查询关系失败');
      }
    } finally {
      if (seq === requestSeq.current && activeStepIndex() === 5) setLoading(false);
    }
  }

  async function submitSelected() {
    if (!clanId || !selectedReviewableRows.length) return;
    setSubmitting(true);
    try {
      const results = await Promise.allSettled(selectedReviewableRows.map(row => apiClient.post(`/clans/${clanId}/review-tasks`, { targetType: 'relationship', targetId: Number(row.id), comment: '提交关系审核' })));
      const successCount = results.filter(result => result.status === 'fulfilled').length;
      const failedCount = results.length - successCount;
      if (successCount) message.success(`已提交 ${successCount} 个关系审核`);
      if (failedCount) message.error(`${failedCount} 个关系提交失败`);
      await loadRows();
    } finally {
      setSubmitting(false);
    }
  }

  if (!container || activeStepIndex() !== 5) return null;

  return createPortal(
    <section className="relationship-step-list-panel step-object-result-panel">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div className="step-draft-review-header">
          <div>
            <Typography.Title level={5}>当前中心人物已有关系</Typography.Title>
            <Typography.Paragraph type="secondary">草稿/已驳回关系可勾选后批量提交审批。</Typography.Paragraph>
          </div>
          <Space wrap>
            <Button type="primary" disabled={!selectedReviewableRows.length} loading={submitting} onClick={() => void submitSelected()}>
              批量提交审核（{selectedReviewableRows.length}）
            </Button>
            <Button loading={loading} disabled={!personId} onClick={() => void loadRows()}>刷新</Button>
          </Space>
        </div>
        {!personId ? <Alert type="info" showIcon message="关系按当前中心人物加载，请先选择中心人物。" /> : null}
        {!searched ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="正在加载关系结果" /> : (
          <Table<RelationshipLike>
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
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无关系数据" /> }}
            columns={[
              { key: 'name', title: '姓名', render: (_value, row) => relativeName(row, personId) },
              { key: 'relationType', title: '关系类型', width: 120, render: (_value, row) => relationTypeText(row, personId) },
              { key: 'dataStatus', title: '状态', width: 110, render: (_value, row) => <Tag color={statusColor(row)}>{statusText(row)}</Tag> }
            ]}
          />
        )}
      </Space>
    </section>,
    container
  );
}
