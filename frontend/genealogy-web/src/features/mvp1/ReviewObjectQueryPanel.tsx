import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Alert, Button, Checkbox, Empty, List, Select, Space, Tag, Typography, message } from 'antd';
import { apiClient } from '../../shared/api/client';
import { toRecordList } from '../../shared/ui/DataTable';

type ReviewTargetType = 'person' | 'relationship' | 'source' | 'branch' | 'generation_scheme';

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

const TYPE_OPTIONS = Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }));
const DEFAULT_TYPES: ReviewTargetType[] = ['person', 'relationship', 'source', 'branch', 'generation_scheme'];

function statusOf(row: any) {
  return String(row?.dataStatus || row?.status || row?.verificationStatus || '').trim().toLowerCase();
}

function isReviewable(row: any) {
  return ['draft', 'rejected'].includes(statusOf(row));
}

function statusLabel(status: string) {
  return status === 'rejected' ? '已驳回' : '草稿';
}

function personName(persons: any[], id: unknown) {
  const person = persons.find(item => String(item.id) === String(id));
  return person?.name || `人物#${id}`;
}

function getWorkspaceValue(key: string) {
  const runtimeValue = (window as any).__genealogyWorkspace?.[key];
  if (runtimeValue) return String(runtimeValue);
  return localStorage.getItem(`genealogy.workspace.${key}`) || '';
}

function reviewPanelBody() {
  return document.querySelector<HTMLElement>('.mvp1-wizard-page:has(.wizard-steps > button:nth-child(7).active) .panel:has(select option[value="generation-schemes"]) .ant-card-body');
}

export function ReviewObjectQueryPanel() {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [clanId, setClanId] = useState('');
  const [personId, setPersonId] = useState('');
  const [types, setTypes] = useState<ReviewTargetType[]>(DEFAULT_TYPES);
  const [items, setItems] = useState<ReviewTarget[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setContainer(reviewPanelBody());
      setClanId(getWorkspaceValue('clanId'));
      setPersonId(getWorkspaceValue('personId'));
    }, 500);
    return () => window.clearInterval(timer);
  }, []);

  const selectedItems = useMemo(() => items.filter(item => selectedKeys.includes(item.key)), [items, selectedKeys]);
  const groupedCount = useMemo(() => items.reduce<Record<string, number>>((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {}), [items]);

  async function queryObjects() {
    if (!clanId) {
      message.warning('请先选择宗族');
      return;
    }
    if (!types.length) {
      message.warning('请至少选择一个对象类型');
      return;
    }
    setLoading(true);
    setSearched(true);
    setSelectedKeys([]);
    try {
      const [personsRes, branchesRes, sourcesRes, schemesRes] = await Promise.all([
        apiClient.get(`/clans/${clanId}/persons`),
        apiClient.get(`/clans/${clanId}/branches`),
        apiClient.get(`/clans/${clanId}/sources`),
        apiClient.get(`/clans/${clanId}/generation-schemes`)
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
        persons.filter(isReviewable).forEach(item => nextItems.push({ key: `person:${item.id}`, type: 'person', id: String(item.id), title: item.name || `人物#${item.id}`, status: statusOf(item) }));
      }
      if (types.includes('relationship')) {
        relationships.filter(isReviewable).forEach(item => nextItems.push({ key: `relationship:${item.id}`, type: 'relationship', id: String(item.id), title: `${personName(persons, item.fromPersonId)} → ${personName(persons, item.toPersonId)} · ${item.relationLabel || item.relationType || '关系'}`, status: statusOf(item) }));
      }
      if (types.includes('source')) {
        sources.filter(isReviewable).forEach(item => nextItems.push({ key: `source:${item.id}`, type: 'source', id: String(item.id), title: item.sourceName || `来源#${item.id}`, status: statusOf(item) }));
      }
      if (types.includes('branch')) {
        branches.filter(isReviewable).forEach(item => nextItems.push({ key: `branch:${item.id}`, type: 'branch', id: String(item.id), title: item.branchName || `支派#${item.id}`, status: statusOf(item) }));
      }
      if (types.includes('generation_scheme')) {
        schemes.filter(isReviewable).forEach(item => nextItems.push({ key: `generation_scheme:${item.id}`, type: 'generation_scheme', id: String(item.id), title: item.schemeName || `字辈方案#${item.id}`, status: statusOf(item) }));
      }

      setItems(nextItems);
    } catch (error) {
      message.error((error as Error).message || '查询对象失败');
    } finally {
      setLoading(false);
    }
  }

  async function submitSelected() {
    if (!clanId) {
      message.warning('请先选择宗族');
      return;
    }
    if (!selectedItems.length) {
      message.warning('请先勾选要提交审核的对象');
      return;
    }
    setSubmitting(true);
    const results = await Promise.allSettled(selectedItems.map(item => apiClient.post(`/clans/${clanId}/review-tasks`, {
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
      <Typography.Title level={5}>查询对象信息</Typography.Title>
      <Typography.Paragraph type="secondary">选择对象类型后查询草稿/已驳回对象，在查询结果中勾选后可批量提交审核。</Typography.Paragraph>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {!clanId ? <Alert type="warning" showIcon message="请先选择宗族" /> : null}
        <div className="review-object-query-filter">
          <Typography.Text>对象类型</Typography.Text>
          <Select
            mode="multiple"
            allowClear
            value={types}
            options={TYPE_OPTIONS}
            placeholder="请选择对象类型"
            onChange={value => setTypes(value as ReviewTargetType[])}
            style={{ minWidth: 320, flex: 1 }}
          />
          <Button type="primary" loading={loading} onClick={queryObjects}>查询</Button>
        </div>
        {types.includes('relationship') && !personId ? <Alert type="info" showIcon message="关系对象当前按中心人物加载。请先在建谱向导中选择中心人物，再查询关系草稿。" /> : null}
        {searched && items.length ? (
          <Space size={8} wrap>
            {Object.entries(groupedCount).map(([key, count]) => <Tag key={key}>{TYPE_LABEL[key as ReviewTargetType]}：{count}</Tag>)}
          </Space>
        ) : null}
        {!searched ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请选择对象类型后查询" /> : !items.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可提交审核的草稿/驳回对象" /> : (
          <>
            <Checkbox checked={selectedKeys.length === items.length} indeterminate={selectedKeys.length > 0 && selectedKeys.length < items.length} onChange={e => setSelectedKeys(e.target.checked ? items.map(item => item.key) : [])}>全选</Checkbox>
            <List
              size="small"
              bordered
              dataSource={items}
              className="review-object-query-list"
              renderItem={item => (
                <List.Item>
                  <Checkbox checked={selectedKeys.includes(item.key)} onChange={e => setSelectedKeys(prev => e.target.checked ? [...prev, item.key] : prev.filter(key => key !== item.key))}>
                    <Space size={8} wrap>
                      <Tag color="blue">{TYPE_LABEL[item.type]}</Tag>
                      <Typography.Text>{item.title}</Typography.Text>
                      <Tag>{statusLabel(item.status)}</Tag>
                    </Space>
                  </Checkbox>
                </List.Item>
              )}
            />
            <Button type="primary" disabled={!selectedItems.length} loading={submitting} onClick={submitSelected}>批量提交审核（{selectedItems.length}）</Button>
          </>
        )}
      </Space>
    </div>,
    container
  );
}
