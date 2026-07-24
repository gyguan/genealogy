import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import type { ComponentProps } from 'react';
import { createPortal } from 'react-dom';
import { Button, Descriptions, Form, List, Modal, Select, Space, Spin, Tag, Tooltip, Typography } from 'antd';
import { apiClient } from '../../shared/api/client';
import type {
  ReviewQualityCheckAcceptedResponse,
  ReviewQualityCheckMode,
  ReviewQualityCheckQueryScope,
  ReviewQualityCheckResponse,
  ReviewQualityCheckTriggerRequest,
  ReviewQualityRuleResult
} from '../../shared/api/generated/review-quality-types';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { PageFeedback } from '../../shared/ui/Feedback';
import { feedback } from '../../shared/ui/OperationFeedback';
import { ReviewCenterPage as ReviewCenterPageContent } from './ReviewCenterPageContent';
import { hasValidReviewPageSize, withDefaultReviewPageSize } from './reviewCenterPagination';
import './reviewCenterLayout.css';

type Props = ComponentProps<typeof ReviewCenterPageContent>;
type QualityFormValues = {
  scopeType: 'TASK_IDS' | 'QUERY';
  mode: ReviewQualityCheckMode;
  ruleCodes?: string[];
};

const REVIEW_CENTER_BODY_CLASS = 'genealogy-review-center-active';
const RESULT_EXTRA_SELECTOR = '.review-center-page .review-result-card .query-result-outer-card__extra';
const DRAWER_BODY_SELECTOR = '.ant-drawer-open .ant-drawer-body';
const TERMINAL_STATUSES = new Set(['PASSED', 'ISSUES_FOUND', 'FAILED']);

const modeOptions = [
  { value: 'INCREMENTAL', label: '增量检查' },
  { value: 'FULL', label: '完整检查' },
  { value: 'REVIEW_GATE', label: '审核门禁检查' }
];

const ruleOptions = [
  { value: 'PAYLOAD_INVALID', label: '审核快照完整性' },
  { value: 'RELATIONSHIP_CONFLICT', label: '人物关系冲突' },
  { value: 'GENERATION_MISMATCH', label: '字辈与世次一致性' },
  { value: 'MISSING_SOURCE', label: '来源证据覆盖' }
];

function statusMeta(status?: string) {
  switch (status) {
    case 'QUEUED': return { text: '排队中', color: 'default' };
    case 'RUNNING': return { text: '检查中', color: 'processing' };
    case 'PASSED': return { text: '检查通过', color: 'success' };
    case 'ISSUES_FOUND': return { text: '发现问题', color: 'warning' };
    case 'FAILED': return { text: '检查失败', color: 'error' };
    default: return { text: '未检查', color: 'default' };
  }
}

function blockLevelMeta(level?: string) {
  if (level === 'BLOCKING') return { text: '阻断', color: 'error' };
  if (level === 'WARNING') return { text: '警告', color: 'warning' };
  return { text: '通过', color: 'success' };
}

function errorMessage(reason: unknown) {
  if (reason instanceof Error && reason.message) return reason.message;
  if (typeof reason === 'string' && reason.trim()) return reason;
  if (reason && typeof reason === 'object') {
    const record = reason as Record<string, unknown>;
    const response = record.response && typeof record.response === 'object' ? record.response as Record<string, unknown> : {};
    const value = record.message || record.errorMessage || record.detail || response.message;
    if (typeof value === 'string' && value.trim()) return value;
  }
  return '质量检查失败，请稍后重试';
}

function selectedTaskIdsFromTable() {
  return Array.from(document.querySelectorAll<HTMLElement>('.review-center-page tr.ant-table-row-selected[data-row-key]'))
    .map(row => Number(row.dataset.rowKey))
    .filter(id => Number.isInteger(id) && id > 0);
}

function currentQueryScope(): ReviewQualityCheckQueryScope {
  const params = new URLSearchParams(window.location.search);
  const branchId = Number(params.get('branchId'));
  return {
    view: (params.get('reviewTab') as ReviewQualityCheckQueryScope['view']) || 'pending',
    targetType: params.get('targetType') || undefined,
    status: params.get('status') || undefined,
    branchId: Number.isInteger(branchId) && branchId > 0 ? branchId : undefined,
    submittedFrom: params.get('submittedFrom') ? `${params.get('submittedFrom')}T00:00:00` : undefined,
    submittedTo: params.get('submittedTo') ? `${params.get('submittedTo')}T23:59:59` : undefined,
    processedFrom: params.get('processedFrom') ? `${params.get('processedFrom')}T00:00:00` : undefined,
    processedTo: params.get('processedTo') ? `${params.get('processedTo')}T23:59:59` : undefined
  };
}

function QualityResultPanel({ result, loading }: { result: ReviewQualityCheckResponse | null; loading: boolean }) {
  if (loading) return <div style={{ paddingBlock: 16, textAlign: 'center' }}><Spin size="small" /> 正在加载质量检查结果</div>;
  if (!result || result.status === 'NOT_CHECKED') {
    return <PageFeedback tone="info" title="尚未执行质量检查" description="质量检查需从审核列表工具栏触发，详情页仅展示最近一次检查结果。" />;
  }
  const meta = statusMeta(result.status);
  const rules = result.rules || [];
  const tone = result.reviewBlocked || result.status === 'FAILED' ? 'error' : result.status === 'ISSUES_FOUND' ? 'warning' : 'success';
  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <PageFeedback
        tone={tone}
        title={`质量检查：${meta.text}${result.reviewBlocked ? '（禁止审核通过）' : ''}`}
        description={result.failureMessage || (result.reviewBlocked ? '存在阻断性问题，审核通过时后端将拒绝提交。' : '检查结果已由服务端记录。')}
      />
      {result.summary ? (
        <Descriptions size="small" bordered column={2}>
          <Descriptions.Item label="检查任务">{result.summary.taskCount}</Descriptions.Item>
          <Descriptions.Item label="检查规则">{result.summary.ruleCount}</Descriptions.Item>
          <Descriptions.Item label="问题数量">{result.summary.issueCount}</Descriptions.Item>
          <Descriptions.Item label="阻断问题">{result.summary.blockingIssueCount}</Descriptions.Item>
          <Descriptions.Item label="警告问题">{result.summary.warningIssueCount}</Descriptions.Item>
          <Descriptions.Item label="最近检查">{result.lastCheckedAt ? new Date(result.lastCheckedAt).toLocaleString('zh-CN', { hour12: false }) : '-'}</Descriptions.Item>
        </Descriptions>
      ) : null}
      <List<ReviewQualityRuleResult>
        size="small"
        bordered
        locale={{ emptyText: '暂无规则明细' }}
        dataSource={rules}
        renderItem={rule => {
          const block = blockLevelMeta(rule.blockLevel);
          return <List.Item><List.Item.Meta title={<Space wrap><Typography.Text strong>{rule.ruleName}</Typography.Text><Tag color={block.color}>{block.text}</Tag><Tag>{rule.affectedTaskCount} 条</Tag></Space>} description={rule.message || (rule.outcome === 'PASSED' ? '检查通过' : rule.ruleCode)} /></List.Item>;
        }}
      />
    </Space>
  );
}

export function ReviewCenterPage(props: Props) {
  const workspace = useWorkspace();
  const [ready, setReady] = useState(() => hasValidReviewPageSize(window.location.search));
  const [resultExtraHost, setResultExtraHost] = useState<HTMLElement | null>(null);
  const [drawerBodyHost, setDrawerBodyHost] = useState<HTMLElement | null>(null);
  const [qualityModalOpen, setQualityModalOpen] = useState(false);
  const [qualityLoading, setQualityLoading] = useState(false);
  const [qualityResult, setQualityResult] = useState<ReviewQualityCheckResponse | null>(null);
  const [detailQualityResult, setDetailQualityResult] = useState<ReviewQualityCheckResponse | null>(null);
  const [detailQualityLoading, setDetailQualityLoading] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [qualityForm] = Form.useForm<QualityFormValues>();
  const currentView = useMemo(() => new URLSearchParams(window.location.search).get('reviewTab') || 'pending', [qualityModalOpen, resultExtraHost]);

  useEffect(() => {
    document.body.classList.add(REVIEW_CENTER_BODY_CLASS);
    const resolveHosts = () => {
      const nextExtra = document.querySelector<HTMLElement>(RESULT_EXTRA_SELECTOR);
      const nextDrawer = document.querySelector<HTMLElement>(DRAWER_BODY_SELECTOR);
      setResultExtraHost(current => current === nextExtra ? current : nextExtra);
      setDrawerBodyHost(current => current === nextDrawer ? current : nextDrawer);
    };
    resolveHosts();
    const observer = new MutationObserver(resolveHosts);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    return () => {
      observer.disconnect();
      document.body.classList.remove(REVIEW_CENTER_BODY_CLASS);
    };
  }, []);

  useLayoutEffect(() => {
    if (ready) return;
    const nextUrl = withDefaultReviewPageSize(window.location.href);
    window.history.replaceState(window.history.state, '', nextUrl);
    setReady(true);
  }, [ready]);

  useEffect(() => {
    const taskId = Number(workspace.reviewTaskId);
    if (!workspace.clanId || !Number.isInteger(taskId) || taskId <= 0 || !drawerBodyHost) {
      setDetailQualityResult(null);
      return;
    }
    let cancelled = false;
    setDetailQualityLoading(true);
    apiClient.get<ReviewQualityCheckResponse>(`/clans/${workspace.clanId}/review-tasks/${taskId}/quality-check`)
      .then(result => { if (!cancelled) setDetailQualityResult(result); })
      .catch(error => { if (!cancelled) setDetailQualityResult({ status: 'FAILED', reviewBlocked: false, failureMessage: errorMessage(error) }); })
      .finally(() => { if (!cancelled) setDetailQualityLoading(false); });
    return () => { cancelled = true; };
  }, [workspace.clanId, workspace.reviewTaskId, drawerBodyHost]);

  function openQualityModal() {
    const ids = selectedTaskIdsFromTable();
    setSelectedTaskIds(ids);
    qualityForm.setFieldsValue({ scopeType: ids.length ? 'TASK_IDS' : 'QUERY', mode: 'INCREMENTAL', ruleCodes: undefined });
    setQualityModalOpen(true);
  }

  async function loadCheck(checkId: string) {
    if (!workspace.clanId) return;
    const result = await apiClient.get<ReviewQualityCheckResponse>(`/clans/${workspace.clanId}/review-quality-checks/${checkId}`);
    setQualityResult(result);
    return result;
  }

  async function submitQualityCheck() {
    if (!workspace.clanId) return;
    const values = await qualityForm.validateFields();
    const request: ReviewQualityCheckTriggerRequest = values.scopeType === 'TASK_IDS'
      ? { scopeType: 'TASK_IDS', mode: values.mode, reviewTaskIds: selectedTaskIds, ruleCodes: values.ruleCodes }
      : { scopeType: 'QUERY', mode: values.mode, query: currentQueryScope(), ruleCodes: values.ruleCodes };
    setQualityLoading(true);
    try {
      const accepted = await apiClient.post<ReviewQualityCheckAcceptedResponse>(`/clans/${workspace.clanId}/review-quality-checks`, request);
      let result = await loadCheck(accepted.checkId);
      for (let attempt = 0; result && !TERMINAL_STATUSES.has(result.status) && attempt < 10; attempt += 1) {
        await new Promise(resolve => window.setTimeout(resolve, 800));
        result = await loadCheck(accepted.checkId);
      }
      feedback.from({ message: result?.reviewBlocked ? '检查完成：存在阻断性问题' : result?.status === 'FAILED' ? '质量检查执行失败' : '质量检查已完成' }, Boolean(result?.reviewBlocked || result?.status === 'FAILED'));
      setQualityModalOpen(false);
    } catch (error) {
      feedback.from({ message: errorMessage(error) }, true);
    } finally {
      setQualityLoading(false);
    }
  }

  return (
    <>
      {ready ? <ReviewCenterPageContent {...props} /> : null}
      {resultExtraHost ? createPortal(
        <Tooltip title={currentView === 'pending' ? '未选择任务时检查当前查询结果；已选择时检查所选任务' : '质量检查仅支持待我审核队列'}>
          <Button disabled={currentView !== 'pending'} loading={qualityLoading} onClick={openQualityModal}>触发质量检查</Button>
        </Tooltip>,
        resultExtraHost
      ) : null}
      {drawerBodyHost ? createPortal(
        <div className="review-quality-detail-panel" style={{ marginTop: 24 }}>
          <Typography.Title level={5}>质量检查结果</Typography.Title>
          <QualityResultPanel result={detailQualityResult} loading={detailQualityLoading} />
        </div>,
        drawerBodyHost
      ) : null}
      <Modal
        title="触发数据质量检查"
        open={qualityModalOpen}
        confirmLoading={qualityLoading}
        okText="开始检查"
        cancelButtonProps={{ disabled: qualityLoading }}
        closable={!qualityLoading}
        maskClosable={!qualityLoading}
        onOk={() => void submitQualityCheck()}
        onCancel={() => { if (!qualityLoading) setQualityModalOpen(false); }}
        destroyOnHidden
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <PageFeedback tone="info" title={selectedTaskIds.length ? `默认检查已选择的 ${selectedTaskIds.length} 条审核任务` : '当前未选择任务，默认检查当前查询结果'} description="检查只发现并报告问题，不会直接修改正式谱库。" />
          <Form form={qualityForm} layout="vertical">
            <Form.Item name="scopeType" label="检查范围" rules={[{ required: true }]}>
              <Select options={[
                { value: 'TASK_IDS', label: `已选任务（${selectedTaskIds.length}）`, disabled: selectedTaskIds.length === 0 },
                { value: 'QUERY', label: '当前查询结果' }
              ]} />
            </Form.Item>
            <Form.Item name="mode" label="检查模式" rules={[{ required: true, message: '请选择检查模式' }]}><Select options={modeOptions} /></Form.Item>
            <Form.Item name="ruleCodes" label="规则组（可选）"><Select mode="multiple" allowClear placeholder="默认执行该模式的全部规则" options={ruleOptions} /></Form.Item>
          </Form>
          {qualityResult ? <QualityResultPanel result={qualityResult} loading={false} /> : null}
        </Space>
      </Modal>
    </>
  );
}
