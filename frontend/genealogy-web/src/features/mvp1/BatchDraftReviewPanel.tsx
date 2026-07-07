import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Checkbox, Empty, List, Select, Space, Tag, Typography, message } from 'antd';
import { apiClient } from '../../shared/api/client';
import { toRecordList } from '../../shared/ui/DataTable';

type DraftTargetType = 'person' | 'relationship' | 'source' | 'branch' | 'generation_scheme';

type DraftTarget = {
  key: string;
  type: DraftTargetType;
  id: string;
  title: string;
  status: string;
};

const TYPE_LABEL: Record<DraftTargetType, string> = {
  person: '人物',
  relationship: '关系',
  source: '来源',
  branch: '支派',
  generation_scheme: '字辈方案'
};

const TYPE_OPTIONS = Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }));

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

function isWizardVisible() {
  return Boolean(document.querySelector('.mvp1-wizard-page'));
}

export function BatchDraftReviewPanel() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [clanId, setClanId] = useState('');
  const [personId, setPersonId] = useState('');
  const [type, setType] = useState<DraftTargetType>('person');
  const [items, setItems] = useState<DraftTarget[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setVisible(isWizardVisible());
      setClanId(getWorkspaceValue('clanId'));
      setPersonId(getWorkspaceValue('personId'));
    }, 800);
    return () => window.clearInterval(timer);
  }, []);

  const selectedItems = useMemo(() => items.filter(item => selectedKeys.includes(item.key)), [items, selectedKeys]);

  async function loadDrafts(nextType = type) {
    if (!clanId) {
      setItems([]);
      setSelectedKeys([]);
      return;
    }
    setLoading(true);
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
      const relationships = personId ? toRecordList<any>(await apiClient.get(`/persons/${personId}/relationships`).catch(() => [])) : [];
      const nextItems: DraftTarget[] = [];

      if (nextType === 'person') {
        persons.filter(isReviewable).forEach(item => nextItems.push({ key: `person:${item.id}`, type: 'person', id: String(item.id), title: item.name || `人物#${item.id}`, status: statusOf(item) }));
      }
      if (nextType === 'relationship') {
        relationships.filter(isReviewable).forEach(item => nextItems.push({ key: `relationship:${item.id}`, type: 'relationship', id: String(item.id), title: `${personName(persons, item.fromPersonId)} → ${personName(persons, item.toPersonId)} · ${item.relationLabel || item.relationType || '关系'}`, status: statusOf(item) }));
      }
      if (nextType === 'source') {
        sources.filter(isReviewable).forEach(item => nextItems.push({ key: `source:${item.id}`, type: 'source', id: String(item.id), title: item.sourceName || `来源#${item.id}`, status: statusOf(item) }));
      }
      if (nextType === 'branch') {
        branches.filter(isReviewable).forEach(item => nextItems.push({ key: `branch:${item.id}`, type: 'branch', id: String(item.id), title: item.branchName || `支派#${item.id}`, status: statusOf(item) }));
      }
      if (nextType === 'generation_scheme') {
        schemes.filter(isReviewable).forEach(item => nextItems.push({ key: `generation_scheme:${item.id}`, type: 'generation_scheme', id: String(item.id), title: item.schemeName || `字辈方案#${item.id}`, status: statusOf(item) }));
      }

      setItems(nextItems);
      setSelectedKeys(prev => prev.filter(key => nextItems.some(item => item.key === key)));
    } catch (error) {
      message.error((error as Error).message || '加载草稿失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (visible && expanded && clanId) void loadDrafts(type);
  }, [visible, expanded, clanId, personId, type]);

  async function submitSelected() {
    if (!clanId) {
      message.warning('请先选择宗族');
      return;
    }
    if (!selectedItems.length) {
      message.warning('请先勾选要提交审核的草稿');
      return;
    }
    setSubmitting(true);
    const results = await Promise.allSettled(selectedItems.map(item => apiClient.post(`/clans/${clanId}/review-tasks`, { targetType: item.type, targetId: Number(item.id), comment: '批量提交审核' })));
    const successCount = results.filter(item => item.status === 'fulfilled').length;
    const failedCount = results.length - successCount;
    if (successCount) message.success(`已提交 ${successCount} 条审核任务`);
    if (failedCount) message.error(`${failedCount} 条提交失败，请刷新后重试`);
    setSelectedKeys([]);
    setSubmitting(false);
    await loadDrafts(type);
  }

  if (!visible) return null;

  return (
    <Card
      size="small"
      title="草稿批量提交审核"
      extra={<Button size="small" type="link" onClick={() => setExpanded(prev => !prev)}>{expanded ? '收起' : '展开'}</Button>}
      style={{ position: 'fixed', right: 20, bottom: 20, width: expanded ? 440 : 240, zIndex: 1000, boxShadow: '0 8px 24px rgba(0,0,0,.12)' }}
    >
      {!expanded ? <Typography.Text type="secondary">勾选草稿后可批量提交审核</Typography.Text> : null}
      {expanded ? (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {!clanId ? <Alert type="warning" showIcon message="请先在建谱向导中选择宗族" /> : null}
          <Space>
            <Typography.Text>对象类型</Typography.Text>
            <Select size="small" value={type} options={TYPE_OPTIONS} onChange={value => { setType(value); setSelectedKeys([]); }} style={{ width: 140 }} />
            <Button size="small" onClick={() => void loadDrafts(type)} loading={loading}>刷新</Button>
          </Space>
          {type === 'relationship' && !personId ? <Alert type="info" showIcon message="关系草稿按当前中心人物加载，请先在建谱向导中选择中心人物。" /> : null}
          {!items.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可提交草稿/驳回对象" /> : (
            <>
              <Checkbox checked={selectedKeys.length === items.length} indeterminate={selectedKeys.length > 0 && selectedKeys.length < items.length} onChange={e => setSelectedKeys(e.target.checked ? items.map(item => item.key) : [])}>全选</Checkbox>
              <List
                size="small"
                bordered
                dataSource={items}
                style={{ maxHeight: 260, overflow: 'auto' }}
                renderItem={item => (
                  <List.Item>
                    <Checkbox checked={selectedKeys.includes(item.key)} onChange={e => setSelectedKeys(prev => e.target.checked ? [...prev, item.key] : prev.filter(key => key !== item.key))}>
                      <Space size={6} wrap>
                        <Typography.Text>{item.title}</Typography.Text>
                        <Tag>{statusLabel(item.status)}</Tag>
                      </Space>
                    </Checkbox>
                  </List.Item>
                )}
              />
              <Button type="primary" block disabled={!selectedItems.length} loading={submitting} onClick={submitSelected}>批量提交审核（{selectedItems.length}）</Button>
            </>
          )}
        </Space>
      ) : null}
    </Card>
  );
}
