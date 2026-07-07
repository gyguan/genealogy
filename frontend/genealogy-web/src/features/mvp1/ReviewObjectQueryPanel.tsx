import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Key } from 'react';
import { Alert, Button, Empty, Select, Space, Table, Tag, Typography, message } from 'antd';
import { apiClient } from '../../shared/api/client';
import { toRecordList } from '../../shared/ui/DataTable';

type ReviewTargetType = 'person' | 'relationship' | 'source' | 'branch' | 'generation_scheme';
type ObjectStatus = 'draft' | 'rejected' | 'pending_review' | 'official' | 'archived';

type ReviewTarget = {
  key: string;
  type: ReviewTargetType;
  id: string;
  title: string;
  status: string;
};

const TYPE_LABEL: Record<ReviewTargetType, string> = {
  person: '人物',
  relationship: '关系',
  source: '来源',
  branch: '支派',
  generation_scheme: '字辈方案'
};

const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  rejected: '已驳回',
  pending: '待审核',
  pending_review: '待审核',
  official: '已通过',
  active: '已通过',
  approved: '已通过',
  archived: '已归档'
};

const TYPE_OPTIONS = Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }));
const STATUS_OPTIONS = [
  { value: 'draft', label: '草稿' },
  { value: 'rejected', label: '已驳回' },
  { value: 'pending_review', label: '待审核' },
  { value: 'official', label: '已通过' },
  { value: 'archived', label: '已归档' }
];
const DEFAULT_TYPES: ReviewTargetType[] = ['person', 'relationship', 'source', 'branch', 'generation_scheme'];
const DEFAULT_STATUSES: ObjectStatus[] = ['draft', 'rejected'];
const REVIEW_HOST_CLASS = 'review-object-query-host';

function statusOf(row: any) {
  return String(row?.dataStatus || row?.status || row?.verificationStatus || '').trim().toLowerCase();
}

function normalizedStatus(status: string) {
  if (status === 'pending') return 'pending_review';
  if (status === 'active' || status === 'approved') return 'official';
  return status;
}

function isReviewableStatus(status: string) {
  return ['draft', 'rejected'].includes(normalizedStatus(status));
}

function statusLabel(status: string) {
  return STATUS_LABEL[status] || STATUS_LABEL[normalizedStatus(status)] || status || '-';
}

function shouldInclude(row: any, statuses: ObjectStatus[]) {
  return statuses.includes(normalizedStatus(statusOf(row)) as ObjectStatus);
}

function personName(persons: any[], id: unknown) {
  const person = persons.find(item => String(item.id) === String(id));
  return person?.name || `人物#${id}`;
}

function clanName(row: any) {
  return row?.clanName || row?.surname || `宗族#${row?.id}`;
}

function getWorkspaceValue(key: string) {
  const runtimeValue = (window as any).__genealogyWorkspace?.[key];
  if (runtimeValue) return String(runtimeValue);
  return localStorage.getItem(`genealogy.workspace.${key}`) || '';
}

function activeStepIndex() {
  const buttons = Array.from(document.querySelectorAll<HTMLElement>('.mvp1-wizard-page .wizard-steps > button'));
  return buttons.findIndex(button => button.classList.contains('active')) + 1;
}

function reviewPanelBody() {
  if (activeStepIndex() !== 7) return null;
  const bodies = Array.from(document.querySelectorAll<HTMLElement>('.mvp1-wizard-page > .panel > .ant-card-body'));
  return bodies.length ? bodies[bodies.length - 1] : null;
}

export function ReviewObjectQueryPanel() {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [workspaceClanId, setWorkspaceClanId] = useState('');
  const [selectedClanId, setSelectedClanId] = useState('');
  const [personId, setPersonId] = useState('');
  const [clans, setClans] = useState<any[]>([]);
  const [types, setTypes] = useState<ReviewTargetType[]>(DEFAULT_TYPES);
  const [statuses, setStatuses] = useState<ObjectStatus[]>(DEFAULT_STATUSES);
  const [items, setItems] = useState<ReviewTarget[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingClans, setLoadingClans] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const nextContainer = reviewPanelBody();
      const nextClanId = getWorkspaceValue('clanId');
      document.querySelectorAll<HTMLElement>(`.${REVIEW_HOST_CLASS}`).forEach(item => {
        if (item !== nextContainer) item.classList.remove(REVIEW_HOST_CLASS);
      });
      nextContainer?.classList.add(REVIEW_HOST_CLASS);
      setContainer(nextContainer);
      setWorkspaceClanId(nextClanId);
      setSelectedClanId(prev => prev || nextClanId);
      setPersonId(getWorkspaceValue('personId'));
    }, 500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!container) return;
    const timer = window.setTimeout(() => void loadClans(), 0);
    return () => window.clearTimeout(timer);
  }, [container]);

  const clanOptions = useMemo(() => clans.map(clan => ({ value: String(clan.id), label: clanName(clan) })), [clans]);
  const reviewableItems = useMemo(() => items.filter(item => isReviewableStatus(item.status)), [items]);
  const reviewableKeySet = useMemo(() => new Set(reviewableItems.map(item => item.key)), [reviewableItems]);
  const effectiveSelectedKeys = selectedKeys.filter(key => reviewableKeySet.has(String(key)));
  const selectedItems = useMemo(() => items.filter(item => effectiveSelectedKeys.includes(item.key)), [items, effectiveSelectedKeys]);
  const groupedCount = useMemo(() => items.reduce<Record<string, number>>((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {}), [items]);

  async function loadClans() {
    setLoadingClans(true);
    try {
      const data = toRecordList<any>(await apiClient.get('/clans'));
      setClans(data);
      setSelectedClanId(prev => prev || workspaceClanId || (data.length === 1 && data[0]?.id ? String(data[0].id) : ''));
    } catch (error) {
      message.error((error as Error).message || '查询宗族失败');
    } finally {
      setLoadingClans(false);
    }
  }

  async function queryObjects() {
    if (!selectedClanId) {
      message.warning('请先选择宗族');
      return;
    }
    if (!types.length) {
      message.warning('请至少选择一个对象类型');
      return;
    }
    if (!statuses.length) {
      message.warning('请至少选择一个对象状态');
      return;
    }
    setLoading(true);
    setSearched(true);
    setSelectedKeys([]);
    try {
      const [personsRes, branchesRes, sourcesRes, schemesRes] = await Promise.all([
        apiClient.get(`/clans/${selectedClanId}/persons`),
        apiClient.get(`/clans/${selectedClanId}/branches`),
        apiClient.get(`/clans/${selectedClanId}/sources`),
        apiClient.get(`/clans/${selectedClanId}/generation-schemes`)
      ]);
      const persons = toRecordList<any>(personsRes);
      const branches = toRecordList<any>(branchesRes);
      const sources = toRecordList<any>(sourcesRes);
      const schemes = toRecordList<any>(schemesRes);
      const relationships = types.includes('relationship') && personId
        ? toRecordList<any>(await apiClient.get(`/persons/${personId}/relationships`).catch(() => []))
        : [];
      const nextItems: ReviewTarget[] = [];

      if (types.includes('person')) {
        persons.filter(item => shouldInclude(item, statuses)).forEach(item => nextItems.push({ key: `person:${item.id}`, type: 'person', id: String(item.id), title: item.name || `人物#${item.id}`, status: statusOf(item) }));
      }
      if (types.includes('relationship')) {
        relationships.filter(item => shouldInclude(item, statuses)).forEach(item => nextItems.push({ key: `relationship:${item.id}`, type: 'relationship', id: String(item.id), title: `${personName(persons, item.fromPersonId)} → ${personName(persons, item.toPersonId)} · ${item.relationLabel || item.relationType || '关系'}`, status: statusOf(item) }));
      }
      if (types.includes('source')) {
        sources.filter(item => shouldInclude(item, statuses)).forEach(item => nextItems.push({ key: `source:${item.id}`, type: 'source', id: String(item.id), title: item.sourceName || `来源#${item.id}`, status: statusOf(item) }));
      }
      if (types.includes('branch')) {
        branches.filter(item => shouldInclude(item, statuses)).forEach(item => nextItems.push({ key: `branch:${item.id}`, type: 'branch', id: String(item.id), title: item.branchName || `支派#${item.id}`, status: statusOf(item) }));
      }
      if (types.includes('generation_scheme')) {
        schemes.filter(item => shouldInclude(item, statuses)).forEach(item => nextItems.push({ key: `generation_scheme:${item.id}`, type: 'generation_scheme', id: String(item.id), title: item.schemeName || `字辈方案#${item.id}`, status: statusOf(item) }));
      }

      setItems(nextItems);
    } catch (error) {
      message.error((error as Error).message || '查询对象失败');
    } finally {
      setLoading(false);
    }
  }

  async function submitSelected() {
    if (!selectedClanId) {
      message.warning('请先选择宗族');
      return;
    }
    if (!selectedItems.length) {
      message.warning('请先勾选草稿/已驳回对象');
      return;
    }
    setSubmitting(true);
    const results = await Promise.allSettled(selectedItems.map(item => apiClient.post(`/clans/${selectedClanId}/review-tasks`, {
      targetType: item.type,
      targetId: Number(item.id),
      comment: '批量提交审核'
    })));
    const successCount = results.filter(item => item.status === 'fulfilled').length;
    const failedCount = results.length - successCount;
    if (successCount) message.success(`已提交 ${successCount} 条审核任务`);
    if (failedCount) message.error(`${failedCount} 条提交失败，请刷新后重试`);
    setSubmitting(false);
    await queryObjects();
  }

  if (!container) return null;

  return createPortal(
    <div className="review-object-query-panel">
      <section className="review-object-query-section review-object-query-search-section">
        <div>
          <Typography.Title level={5}>查询对象</Typography.Title>
          <Typography.Paragraph type="secondary">按宗族、对象类型和对象状态查询对象。</Typography.Paragraph>
        </div>
        <div className="review-object-query-filter">
          <label className="review-object-query-field">
            <span>宗族</span>
            <Select
              showSearch
              loading={loadingClans}
              value={selectedClanId || undefined}
              options={clanOptions}
              placeholder="请选择宗族"
              optionFilterProp="label"
              onChange={value => {
                setSelectedClanId(value);
                setSearched(false);
                setItems([]);
                setSelectedKeys([]);
              }}
            />
          </label>
          <label className="review-object-query-field">
            <span>对象类型</span>
            <Select
              mode="multiple"
              allowClear
              value={types}
              options={TYPE_OPTIONS}
              placeholder="请选择对象类型"
              onChange={value => setTypes(value as ReviewTargetType[])}
            />
          </label>
          <label className="review-object-query-field">
            <span>对象状态</span>
            <Select
              mode="multiple"
              allowClear
              value={statuses}
              options={STATUS_OPTIONS}
              placeholder="请选择对象状态"
              onChange={value => setStatuses(value as ObjectStatus[])}
            />
          </label>
          <Button type="primary" loading={loading} onClick={queryObjects}>查询对象</Button>
        </div>
      </section>

      <section className="review-object-query-section review-object-query-result-section">
        <div className="review-object-query-section-header">
          <div>
            <Typography.Title level={5}>查询结果列表</Typography.Title>
            <Typography.Paragraph type="secondary">对象状态为草稿/已驳回时，可勾选后批量提交审批。</Typography.Paragraph>
          </div>
          {searched && items.length ? <Space size={8} wrap>{Object.entries(groupedCount).map(([key, count]) => <Tag key={key}>{TYPE_LABEL[key as ReviewTargetType]}：{count}</Tag>)}</Space> : null}
        </div>
        {!selectedClanId ? <Alert type="warning" showIcon message="请先在上方选择宗族" /> : null}
        {types.includes('relationship') && !personId ? <Alert type="info" showIcon message="关系对象当前按中心人物加载。请先在建谱向导中选择中心人物，再查询关系对象。" /> : null}
        {!searched ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请选择查询条件后点击查询对象" /> : !items.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无匹配对象" /> : (
          <>
            <div className="batch-review-actions review-object-query-result-actions">
              <Typography.Text type="secondary">仅草稿/已驳回对象可勾选提交审批。</Typography.Text>
              <Button type="primary" disabled={!selectedItems.length} loading={submitting} onClick={submitSelected}>批量提交审批（{selectedItems.length}）</Button>
            </div>
            <Table<ReviewTarget>
              size="small"
              bordered
              rowKey="key"
              dataSource={items}
              pagination={false}
              rowSelection={{
                selectedRowKeys: effectiveSelectedKeys,
                columnTitle: '勾选',
                columnWidth: 88,
                getCheckboxProps: item => ({ disabled: !isReviewableStatus(item.status), title: isReviewableStatus(item.status) ? '可提交审批' : '仅草稿/已驳回对象可提交审批' }),
                onChange: keys => setSelectedKeys(keys.filter(key => reviewableKeySet.has(String(key))))
              }}
              columns={[
                { title: '对象类型', dataIndex: 'type', key: 'type', width: 120, render: value => <Tag color="blue">{TYPE_LABEL[value as ReviewTargetType]}</Tag> },
                { title: '对象名', dataIndex: 'title', key: 'title', ellipsis: true },
                { title: '状态', dataIndex: 'status', key: 'status', width: 120, render: value => <Tag>{statusLabel(String(value))}</Tag> }
              ]}
            />
          </>
        )}
      </section>
    </div>,
    container
  );
}
