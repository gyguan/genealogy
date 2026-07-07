import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Alert, Button, Empty, Space, Typography, message } from 'antd';
import { apiClient } from '../../shared/api/client';
import { DataTable, type Column } from '../../shared/ui/DataTable';

type StepReviewTargetType = 'person' | 'relationship' | 'source';

type StepConfig = {
  stepIndex: number;
  targetType: StepReviewTargetType;
  label: string;
  resultTitle: string;
  loadPath: (ctx: { clanId: string; personId: string }) => string | null;
  columns: Column<any>[];
  normalizeReviewColumns?: boolean;
  warning?: (ctx: { clanId: string; personId: string }) => string | null;
};

const STEP_CONFIGS: StepConfig[] = [
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
    normalizeReviewColumns: false,
    columns: [
      { key: 'relationshipObjectName', title: '对象名', render: row => relationshipObjectName(row) },
      { key: 'relationshipObjectRelation', title: '对象关系', render: row => relationshipObjectRelation(row) },
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

function relationshipObjectName(row: any) {
  const centerPersonId = getWorkspaceValue('personId');
  const centerIsFrom = String(row?.fromPersonId) === String(centerPersonId);
  if (centerIsFrom) return row.toPersonName || row.toName || `人物#${row.toPersonId}`;
  return row.fromPersonName || row.fromName || `人物#${row.fromPersonId}`;
}

function relationshipObjectRelation(row: any) {
  const centerPersonId = getWorkspaceValue('personId');
  const label = String(row?.relationLabel || row?.relationType || '').toLowerCase();
  if (label === 'spouse' || row?.relationType === 'spouse') return '配偶';
  const centerIsFrom = String(row?.fromPersonId) === String(centerPersonId);
  if (centerIsFrom) return '子女';
  if (label === 'father') return '父亲';
  if (label === 'mother') return '母亲';
  return '亲属';
}

function activeStepIndex() {
  const buttons = Array.from(document.querySelectorAll<HTMLElement>('.mvp1-wizard-page .wizard-steps > button'));
  return buttons.findIndex(button => button.classList.contains('active')) + 1;
}

function currentStepPanelBody() {
  const bodies = Array.from(document.querySelectorAll<HTMLElement>('.mvp1-wizard-page > .panel > .ant-card-body'));
  return bodies.length ? bodies[bodies.length - 1] : null;
}

function isSaveOrReviewButtonText(text: string) {
  return /保存草稿|继续录入|保存关系草稿|保存来源草稿|保存并提交审核|批量提交审批/.test(text);
}

export function StepDraftReviewPanel() {
  const requestSeq = useRef(0);
  const refreshTimers = useRef<number[]>([]);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [config, setConfig] = useState<StepConfig | null>(null);
  const [clanId, setClanId] = useState('');
  const [personId, setPersonId] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [rows, setRows] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  function scheduleRefresh() {
    refreshTimers.current.forEach(timer => window.clearTimeout(timer));
    refreshTimers.current = [
      window.setTimeout(() => setRefreshToken(Date.now()), 600),
      window.setTimeout(() => setRefreshToken(Date.now()), 1400)
    ];
  }

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
    const handler = () => scheduleRefresh();
    window.addEventListener('genealogy:review-submitted', handler);
    window.addEventListener('genealogy:object-changed', handler);
    return () => {
      window.removeEventListener('genealogy:review-submitted', handler);
      window.removeEventListener('genealogy:object-changed', handler);
      refreshTimers.current.forEach(timer => window.clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (!container) return;
    const handleClick = (event: MouseEvent) => {
      const button = (event.target as HTMLElement | null)?.closest('button');
      const text = button?.textContent?.trim() || '';
      if (isSaveOrReviewButtonText(text)) scheduleRefresh();
    };
    container.addEventListener('click', handleClick, true);
    return () => container.removeEventListener('click', handleClick, true);
  }, [container]);

  useEffect(() => {
    setRows([]);
    setSearched(false);
    if (!config || !clanId) return;
    const timer = window.setTimeout(() => void loadObjects(config), 0);
    return () => window.clearTimeout(timer);
  }, [config?.targetType, clanId, personId, refreshToken]);

  const warning = config?.warning?.({ clanId, personId }) || null;

  async function loadObjects(sourceConfig = config) {
    if (!sourceConfig) return;
    if (!clanId) return;
    const seq = ++requestSeq.current;
    const path = sourceConfig.loadPath({ clanId, personId });
    if (!path) {
      setRows([]);
      setSearched(true);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const data = await apiClient.get(path);
      if (seq === requestSeq.current) setRows(toRows(data));
    } catch (error) {
      if (seq === requestSeq.current) {
        setRows([]);
        setSearched(true);
        message.error((error as Error).message || `查询${sourceConfig.label}失败`);
      }
    } finally {
      if (seq === requestSeq.current) setLoading(false);
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
          <Button loading={loading} onClick={() => void loadObjects()}>刷新</Button>
        </div>
        {!clanId ? <Alert type="warning" showIcon message="请先选择宗族" /> : null}
        {warning ? <Alert type="info" showIcon message={warning} /> : null}
        {!searched ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`正在加载${config.label}结果`} /> : (
          <DataTable data={rows} empty={`暂无${config.label}数据`} columns={config.columns} normalizeReviewColumns={config.normalizeReviewColumns !== false} />
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
