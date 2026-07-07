import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Alert, Button, Empty, Space, Typography, message } from 'antd';
import { apiClient } from '../../shared/api/client';
import { DataTable, type Column } from '../../shared/ui/DataTable';

type StepReviewTargetType = 'person' | 'relationship' | 'source' | 'generation_scheme';

type StepConfig = {
  stepIndex: number;
  targetType: StepReviewTargetType;
  label: string;
  resultTitle: string;
  loadPath: (ctx: { clanId: string; personId: string }) => string | null;
  columns: Column<any>[];
  warning?: (ctx: { clanId: string; personId: string }) => string | null;
};

const STEP_CONFIGS: StepConfig[] = [
  {
    stepIndex: 3,
    targetType: 'generation_scheme',
    label: '字辈方案',
    resultTitle: '该宗族下已有字辈方案',
    loadPath: ({ clanId }) => clanId ? `/clans/${clanId}/generation-schemes` : null,
    columns: [
      { key: 'schemeName', title: '字辈方案' },
      { key: 'branchId', title: '支派', render: row => row.branchName || row.branchId || '-' },
      { key: 'status', title: '状态', render: row => statusText(row) }
    ]
  },
  {
    stepIndex: 4,
    targetType: 'person',
    label: '人物',
    resultTitle: '该宗族下已录入人物',
    loadPath: ({ clanId }) => clanId ? `/clans/${clanId}/persons` : null,
    columns: [
      { key: 'name', title: '姓名' },
      { key: 'gender', title: '性别', render: row => genderText(row.gender) },
      { key: 'generationNo', title: '代次', render: row => row.generationNo ? `第${row.generationNo}世` : '-' },
      { key: 'generationWord', title: '字辈', render: row => row.generationWord || '-' },
      { key: 'dataStatus', title: '状态', render: row => statusText(row) }
    ]
  },
  {
    stepIndex: 5,
    targetType: 'relationship',
    label: '关系',
    resultTitle: '当前中心人物已有关系',
    loadPath: ({ personId }) => personId ? `/persons/${personId}/relationships` : null,
    columns: [
      { key: 'fromPersonId', title: '起点', render: row => row.fromPersonName || row.fromName || `人物#${row.fromPersonId}` },
      { key: 'toPersonId', title: '终点', render: row => row.toPersonName || row.toName || `人物#${row.toPersonId}` },
      { key: 'relationLabel', title: '关系', render: row => row.relationLabel || row.relationType || '-' },
      { key: 'dataStatus', title: '状态', render: row => statusText(row) }
    ],
    warning: ({ personId }) => personId ? null : '关系按当前中心人物加载，请先选择中心人物。'
  },
  {
    stepIndex: 6,
    targetType: 'source',
    label: '来源',
    resultTitle: '该宗族下已有来源',
    loadPath: ({ clanId }) => clanId ? `/clans/${clanId}/sources` : null,
    columns: [
      { key: 'sourceName', title: '来源名称' },
      { key: 'sourceType', title: '来源类型' },
      { key: 'verificationStatus', title: '状态', render: row => statusText(row) }
    ]
  }
];

function statusOf(row: any) {
  return String(row?.dataStatus || row?.status || row?.verificationStatus || '').trim().toLowerCase();
}

function statusText(row: any) {
  const status = statusOf(row);
  const dict: Record<string, string> = {
    draft: '草稿',
    pending_review: '待审核',
    official: '已通过',
    rejected: '已驳回',
    archived: '已归档'
  };
  return dict[status] || status || '-';
}

function genderText(value: unknown) {
  const text = String(value || '').toLowerCase();
  if (text === 'male') return '男';
  if (text === 'female') return '女';
  return '未知';
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
  const [rows, setRows] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    setRows([]);
    setSearched(false);
  }, [config?.targetType, clanId, personId]);

  const warning = config?.warning?.({ clanId, personId }) || null;

  async function loadObjects() {
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
    try {
      const data = await apiClient.get(path);
      setRows(toRows(data));
    } catch (error) {
      message.error((error as Error).message || `查询${config.label}失败`);
    } finally {
      setLoading(false);
    }
  }

  if (!container || !config) return null;

  return createPortal(
    <section className="step-draft-review-panel step-object-result-panel">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div className="step-draft-review-header">
          <div>
            <Typography.Title level={5}>{config.resultTitle}</Typography.Title>
            <Typography.Paragraph type="secondary">复用当前步骤对象查询结果；草稿/已驳回版本可在列表中勾选后批量提交审批。</Typography.Paragraph>
          </div>
          <Button loading={loading} onClick={loadObjects}>查询{config.label}</Button>
        </div>
        {!clanId ? <Alert type="warning" showIcon message="请先选择宗族" /> : null}
        {warning ? <Alert type="info" showIcon message={warning} /> : null}
        {!searched ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`点击查询${config.label}后展示结果`} /> : (
          <DataTable data={rows} empty={`暂无${config.label}数据`} columns={config.columns} />
        )}
      </Space>
    </section>,
    container
  );
}

function toRows(data: any) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.content)) return data.content;
  if (data && typeof data === 'object') return [data];
  return [];
}
