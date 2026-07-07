import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Alert, Button, Checkbox, Empty, List, Space, Tag, Typography, message } from 'antd';
import { apiClient } from '../../shared/api/client';
import { toRecordList } from '../../shared/ui/DataTable';

type StepReviewTargetType = 'person' | 'relationship' | 'source' | 'branch' | 'generation_scheme';

type StepConfig = {
  stepIndex: number;
  targetType: StepReviewTargetType;
  label: string;
  loadPath: (ctx: { clanId: string; personId: string }) => string | null;
  titleOf: (row: any, ctx: { persons: any[] }) => string;
  warning?: (ctx: { clanId: string; personId: string }) => string | null;
};

type DraftItem = {
  key: string;
  type: StepReviewTargetType;
  id: string;
  title: string;
  status: string;
};

const STEP_CONFIGS: StepConfig[] = [
  {
    stepIndex: 2,
    targetType: 'branch',
    label: '支派',
    loadPath: ({ clanId }) => clanId ? `/clans/${clanId}/branches` : null,
    titleOf: row => row.branchName || `支派#${row.id}`
  },
  {
    stepIndex: 3,
    targetType: 'generation_scheme',
    label: '字辈方案',
    loadPath: ({ clanId }) => clanId ? `/clans/${clanId}/generation-schemes` : null,
    titleOf: row => row.schemeName || `字辈方案#${row.id}`
  },
  {
    stepIndex: 4,
    targetType: 'person',
    label: '人物',
    loadPath: ({ clanId }) => clanId ? `/clans/${clanId}/persons` : null,
    titleOf: row => row.name || `人物#${row.id}`
  },
  {
    stepIndex: 5,
    targetType: 'relationship',
    label: '关系',
    loadPath: ({ personId }) => personId ? `/persons/${personId}/relationships` : null,
    titleOf: (row, { persons }) => `${personName(persons, row.fromPersonId)} → ${personName(persons, row.toPersonId)} · ${row.relationLabel || row.relationType || '关系'}`,
    warning: ({ personId }) => personId ? null : '关系草稿按当前中心人物加载，请先选择中心人物。'
  },
  {
    stepIndex: 6,
    targetType: 'source',
    label: '来源',
    loadPath: ({ clanId }) => clanId ? `/clans/${clanId}/sources` : null,
    titleOf: row => row.sourceName || `来源#${row.id}`
  }
];

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

function activeStepIndex() {
  const buttons = Array.from(document.querySelectorAll<HTMLElement>('.mvp1-wizard-page .wizard-steps > button'));
  return buttons.findIndex(button => button.classList.contains('active')) + 1;
}

function currentStepPanelBody() {
  const bodies = Array.from(document.querySelectorAll<HTMLElement>('.mvp1-wizard-page > .panel > .ant-card-body'));
  return bodies.length ? bodies[bodies.length - 1] : null;
}

export function StepDraftReviewPanel() {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [config, setConfig] = useState<StepConfig | null>(null);
  const [clanId, setClanId] = useState('');
  const [personId, setPersonId] = useState('');
  const [items, setItems] = useState<DraftItem[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const index = activeStepIndex();
      const nextConfig = STEP_CONFIGS.find(item => item.stepIndex === index) || null;
      setConfig(nextConfig);
      setContainer(nextConfig ? currentStepPanelBody() : null);
      setClanId(getWorkspaceValue('clanId'));
      setPersonId(getWorkspaceValue('personId'));
    }, 500);
    return () => window.clearInterval(timer);
  }, []);

  const selectedItems = useMemo(() => items.filter(item => selectedKeys.includes(item.key)), [items, selectedKeys]);
  const warning = config?.warning?.({ clanId, personId }) || null;

  useEffect(() => {
    setItems([]);
    setSelectedKeys([]);
    setSearched(false);
  }, [config?.targetType, clanId, personId]);

  async function loadDrafts() {
    if (!config) return;
    if (!clanId) {
      message.warning('请先选择宗族');
      return;
    }
    const path = config.loadPath({ clanId, personId });
    if (!path) {
      message.warning(warning || `请先完成${config.label}查询条件`);
      return;
    }
    setLoading(true);
    setSearched(true);
    setSelectedKeys([]);
    try {
      const [data, personsData] = await Promise.all([
        apiClient.get(path),
        config.targetType === 'relationship' ? apiClient.get(`/clans/${clanId}/persons`).catch(() => []) : Promise.resolve([])
      ]);
      const persons = toRecordList<any>(personsData);
      const nextItems = toRecordList<any>(data)
        .filter(isReviewable)
        .map(row => ({
          key: `${config.targetType}:${row.id}`,
          type: config.targetType,
          id: String(row.id),
          title: config.titleOf(row, { persons }),
          status: statusOf(row)
        }));
      setItems(nextItems);
    } catch (error) {
      message.error((error as Error).message || `查询${config.label}草稿失败`);
    } finally {
      setLoading(false);
    }
  }

  async function submitSelected() {
    if (!config || !clanId) return;
    if (!selectedItems.length) {
      message.warning('请先勾选要提交审批的草稿');
      return;
    }
    setSubmitting(true);
    const results = await Promise.allSettled(selectedItems.map(item => apiClient.post(`/clans/${clanId}/review-tasks`, {
      targetType: item.type,
      targetId: Number(item.id),
      comment: `${config.label}批量提交审批`
    })));
    const successCount = results.filter(item => item.status === 'fulfilled').length;
    const failedCount = results.length - successCount;
    if (successCount) message.success(`已提交 ${successCount} 条审批任务`);
    if (failedCount) message.error(`${failedCount} 条提交失败，请刷新后重试`);
    setSubmitting(false);
    await loadDrafts();
  }

  if (!container || !config) return null;

  return createPortal(
    <section className="step-draft-review-panel">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div className="step-draft-review-header">
          <div>
            <Typography.Title level={5}>{config.label}草稿批量提交审批</Typography.Title>
            <Typography.Paragraph type="secondary">查询本步骤已保存的草稿/驳回对象，勾选后可批量提交审批。</Typography.Paragraph>
          </div>
          <Button loading={loading} onClick={loadDrafts}>查询草稿</Button>
        </div>
        {!clanId ? <Alert type="warning" showIcon message="请先选择宗族" /> : null}
        {warning ? <Alert type="info" showIcon message={warning} /> : null}
        {!searched ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="点击查询草稿后展示可提交对象" /> : !items.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`暂无可提交审批的${config.label}草稿/驳回对象`} /> : (
          <>
            <Checkbox checked={selectedKeys.length === items.length} indeterminate={selectedKeys.length > 0 && selectedKeys.length < items.length} onChange={e => setSelectedKeys(e.target.checked ? items.map(item => item.key) : [])}>全选</Checkbox>
            <List
              size="small"
              bordered
              dataSource={items}
              className="step-draft-review-list"
              renderItem={item => (
                <List.Item>
                  <Checkbox checked={selectedKeys.includes(item.key)} onChange={e => setSelectedKeys(prev => e.target.checked ? [...prev, item.key] : prev.filter(key => key !== item.key))}>
                    <Space size={8} wrap>
                      <Typography.Text>{item.title}</Typography.Text>
                      <Tag>{statusLabel(item.status)}</Tag>
                    </Space>
                  </Checkbox>
                </List.Item>
              )}
            />
            <Button type="primary" disabled={!selectedItems.length} loading={submitting} onClick={submitSelected}>批量提交审批（{selectedItems.length}）</Button>
          </>
        )}
      </Space>
    </section>,
    container
  );
}
