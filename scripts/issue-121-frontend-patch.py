from pathlib import Path
import re

path = Path(__file__).resolve().parents[1] / "frontend/genealogy-web/src/features/logs/LogPage.tsx"
text = path.read_text()

old_types = '''import type {
  CheckTaskResponse,
  FieldDiff,
  OperationLogPage,
  OperationLogResponse,
  OperationLogStatsResponse,
  ReviewDiffResponse,
  ReviewTaskDetailResponse,
  TrackingObjectPage,
  TrackingObjectResponse
} from '../../shared/api/generated/tracking-types';'''
new_types = '''import type {
  OperationLogPage,
  OperationLogResponse,
  OperationLogStatsResponse,
  TrackingObjectPage,
  TrackingObjectResponse,
  TrackingTraceDetailResponse,
  TrackingTraceRevisionResponse,
  TrackingTraceSourceBindingResponse,
  TrackingTraceTimelineEventResponse
} from '../../shared/api/generated/tracking-types';'''
if old_types not in text:
    raise SystemExit("tracking type import anchor not found")
text = text.replace(old_types, new_types, 1)

old_model = '''import {
  buildOperationLogScopes,
  buildTraceTimelineEntries,
  evaluateTraceCoverage,
  mergeTraceLogs,
  resolveTraceContext,
  traceResetFromLog
} from './logTraceModel.js';
import type { TraceCoverage, TraceTarget, TraceTimelineEntry } from './logTraceModel.js';'''
new_model = '''import { traceResetFromLog } from './logTraceModel.js';'''
if old_model not in text:
    raise SystemExit("trace model import anchor not found")
text = text.replace(old_model, new_model, 1)

helper_pattern = re.compile(
    r"\nfunction targetText\(.*?\nfunction trackingObjectSummary\(row: TrackingObjectResponse\) \{\n  const parts = \[row\.displayName, row\.branchName, row\.secondaryLabel\]\.filter\(Boolean\);\n  return `\$\{targetTypeText\(row\.objectType\)\}：\$\{parts\.join\(' · '\)\}`;\n\}\n",
    re.S,
)
new_helpers = '''
function targetTextFromLog(log: OperationLogResponse) {
  const name = log.targetDisplayName || log.targetSummary || log.summary;
  const branch = log.targetBranchName ? `（${log.targetBranchName}）` : '';
  return `${targetTypeText(log.targetType)}：${display(name, '业务信息不可用')}${branch}`;
}

function traceSourceText(source: TrackingTraceTimelineEventResponse['sourceType']) {
  const dict: Record<TrackingTraceTimelineEventResponse['sourceType'], string> = {
    revision: '版本记录',
    review_task: '审核事项',
    source_binding: '来源绑定',
    operation_log: '操作日志'
  };
  return dict[source];
}

function traceEventColor(event: TrackingTraceTimelineEventResponse) {
  if (event.eventType === 'REVIEW_REJECTED' || event.eventType === 'OBJECT_DELETED') return 'red';
  if (event.eventType === 'REVIEW_APPROVED' || event.eventType === 'OBJECT_CREATED') return 'green';
  if (event.eventType === 'REVIEW_REQUESTED' || event.eventType === 'REVISION_SUBMITTED') return 'blue';
  return 'gray';
}

function trackingObjectSummary(row: TrackingObjectResponse) {
  const parts = [row.displayName, row.branchName, row.secondaryLabel].filter(Boolean);
  return `${targetTypeText(row.objectType)}：${parts.join(' · ')}`;
}
'''
text, count = helper_pattern.subn(new_helpers, text, count=1)
if count != 1:
    raise SystemExit(f"helper replacement count={count}")

old_state = '''  const [traceLogs, setTraceLogs] = useState<OperationLogResponse[]>([]);
  const [reviewTask, setReviewTask] = useState<CheckTaskResponse | null>(null);
  const [reviewDiff, setReviewDiff] = useState<ReviewDiffResponse | null>(null);
  const [resolvedTarget, setResolvedTarget] = useState<TraceTarget | null>(null);
  const [traceCoverage, setTraceCoverage] = useState<TraceCoverage | null>(null);'''
new_state = '''  const [traceDetail, setTraceDetail] = useState<TrackingTraceDetailResponse | null>(null);'''
if old_state not in text:
    raise SystemExit("trace state anchor not found")
text = text.replace(old_state, new_state, 1)

old_clear = '''  function clearTraceResults() {
    setTraceLogs([]);
    setReviewTask(null);
    setReviewDiff(null);
    setResolvedTarget(null);
    setTraceCoverage(null);
  }'''
new_clear = '''  function clearTraceResults() {
    setTraceDetail(null);
  }'''
if old_clear not in text:
    raise SystemExit("clear trace anchor not found")
text = text.replace(old_clear, new_clear, 1)

load_pattern = re.compile(r"  async function loadTrace\(\) \{.*?\n  function resetTraceSelection", re.S)
new_load = '''  async function loadTrace() {
    const clanId = traceForm.clanId || workspace.clanId;
    const targetType = traceForm.targetType || (traceForm.reviewTaskId ? 'review_task' : '');
    const targetId = traceForm.targetId || traceForm.reviewTaskId;
    if (!clanId) { notify({ message: '请先选择宗族' }, true); return; }
    if (!targetType || !targetId) {
      notify({ message: '请先选择一条可追踪的业务记录' }, true);
      return;
    }
    if (loading) return;

    const requestVersion = ++traceRequestVersion.current;
    setLoading(true);
    clearTraceResults();
    setResult(null);

    try {
      const params = new URLSearchParams({ clanId });
      const detail = await apiClient.get<TrackingTraceDetailResponse>(
        `/tracking/objects/${encodeURIComponent(targetType)}/${encodeURIComponent(targetId)}/trace?${params}`
      );
      if (traceRequestVersion.current !== requestVersion) return;
      setTraceDetail(detail);
      const coverage = detail.traceCoverage;
      const message = coverage.level === 'complete'
        ? `追踪完成：时间线 ${detail.timeline.length} 条，版本 ${detail.revisions.length} 条，审核 ${detail.reviewTasks.length} 条`
        : `${coverage.level === 'minimal' ? '追踪信息有限' : '追踪信息不完整'}：${coverage.notes.join('；') || '部分历史记录不可用'}`;
      setResult({ message });
      notify({ message: coverage.level === 'complete' ? '追踪链路已生成' : '追踪链路已生成，存在覆盖说明' }, coverage.level !== 'complete');
    } catch (error) {
      if (traceRequestVersion.current !== requestVersion) return;
      clearTraceResults();
      setResult({ message: '追踪信息不完整：追踪请求执行失败' });
      notify({ message: (error as Error).message || '追踪链路查询失败' }, true);
    } finally {
      if (traceRequestVersion.current === requestVersion) setLoading(false);
    }
  }

  function resetTraceSelection'''
text, count = load_pattern.subn(new_load, text, count=1)
if count != 1:
    raise SystemExit(f"loadTrace replacement count={count}")

derived_pattern = re.compile(
    r"  const timeline = useMemo\(.*?  const resolvedTargetSummary = resolvedTarget\n    \? targetText\(resolvedTarget\.targetType, reviewDiff\?\.diffSummary \|\| reviewTask\?\.diffSummary \|\| traceForm\.targetSummary\)\n    : traceForm\.targetSummary \|\| '-';",
    re.S,
)
new_derived = '''  const traceLogs = traceDetail?.operationLogs || [];
  const timeline = traceDetail?.timeline || [];
  const traceCoverage = traceDetail?.traceCoverage || null;
  const latestReviewTask = traceDetail?.reviewTasks[0] || null;
  const logRows = data?.records || [];
  const objectRows = objectPage?.records || [];
  const actionTypes = useMemo(() => {
    const map = new Map<string, number>();
    traceLogs.forEach(log => map.set(display(log.actionType, 'unknown'), (map.get(display(log.actionType, 'unknown')) || 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [traceLogs]);
  const canTrace = Boolean(traceForm.targetType && traceForm.targetId);
  const resolvedTargetSummary = traceDetail
    ? trackingObjectSummary(traceDetail.objectSummary)
    : traceForm.targetSummary || '-';'''
text, count = derived_pattern.subn(new_derived, text, count=1)
if count != 1:
    raise SystemExit(f"derived replacement count={count}")

text = text.replace(
    '''<Descriptions.Item label="审核状态"><Tag color={statusColor(reviewTask?.status)}>{statusText(reviewTask?.status)}</Tag></Descriptions.Item>''',
    '''<Descriptions.Item label="当前状态"><Tag color={statusColor(traceDetail?.currentStatus)}>{statusText(traceDetail?.currentStatus)}</Tag></Descriptions.Item>''',
    1,
)
text = text.replace(
    '''<Descriptions.Item label="审核任务关联">{traceForm.reviewTaskId ? '已明确关联审核事项' : '当前对象未提供审核事项关联'}</Descriptions.Item>''',
    '''<Descriptions.Item label="聚合方式">由后端统一解析版本、审核、来源与日志</Descriptions.Item>''',
    1,
)
text = text.replace(
    '''<Alert type="info" showIcon message="业务对象搜索用于准确选中对象；只有明确选择审核事项时，才加载真实审核详情和任务日志。" style={{ marginTop: 12 }} />''',
    '''<Alert type="info" showIcon message="业务对象搜索用于准确选中对象；追踪详情由单一聚合接口返回，页面不再拼接或推断审核链路。" style={{ marginTop: 12 }} />''',
    1,
)
text = text.replace(
    '''description={traceCoverage.message}''',
    '''description={traceCoverage.notes.join('；') || '当前可见历史已加载'}''',
    1,
)

timeline_pattern = re.compile(
    r"\{timeline\.length \? \(\n            <Timeline items=\{timeline\.map\(item => \{.*?\}\)\} />\n          \) : <Empty",
    re.S,
)
new_timeline = '''{timeline.length ? (
            <Timeline items={timeline.map(item => ({
              color: traceEventColor(item),
              children: <div><Space><Tag>{traceSourceText(item.sourceType)}</Tag><strong>{item.title}</strong>{item.resultStatus ? <Tag color={statusColor(item.resultStatus)}>{statusText(item.resultStatus)}</Tag> : null}</Space><p>{display(item.summary, '暂无摘要')}</p><span>{display(item.occurredAt, '时间未记录')} · 操作者 {display(item.actorDisplayName, '未知操作者')}</span></div>
            }))} />
          ) : <Empty'''
text, count = timeline_pattern.subn(new_timeline, text, count=1)
if count != 1:
    raise SystemExit(f"timeline replacement count={count}")

summary_pattern = re.compile(
    r'''<Descriptions.Item label="审核任务">\{reviewTask \? statusText\(reviewTask\.status\) : '未加载可信审核任务'\}</Descriptions.Item>\n            <Descriptions.Item label="审核状态"><Tag color=\{statusColor\(reviewTask\?\.status\)\}>\{statusText\(reviewTask\?\.status\)\}</Tag></Descriptions.Item>\n            <Descriptions.Item label="审核意见">\{display\(reviewTask\?\.reviewComment, reviewTask \? '暂无审核意见' : '-'\)\}</Descriptions.Item>\n            <Descriptions.Item label="变更记录">\{display\(reviewDiff\?\.diffSummary, reviewDiff \? '字段变更已记录' : '-'\)\}</Descriptions.Item>\n            <Descriptions.Item label="已覆盖">\{traceCoverage\?\.covered\.join\('、'\) \|\| '-'\}</Descriptions.Item>\n            <Descriptions.Item label="缺失信息">\{traceCoverage\?\.missing\.join\('；'\) \|\| '-'\}</Descriptions.Item>'''
)
new_summary = '''<Descriptions.Item label="审核事项">{latestReviewTask ? statusText(latestReviewTask.status) : '暂无审核事项'}</Descriptions.Item>
            <Descriptions.Item label="审核意见">{display(latestReviewTask?.reviewComment)}</Descriptions.Item>
            <Descriptions.Item label="版本记录">{traceDetail?.revisions.length || 0} 条</Descriptions.Item>
            <Descriptions.Item label="来源绑定">{traceDetail?.sourceBindings.length || 0} 条</Descriptions.Item>
            <Descriptions.Item label="截断分段">{traceCoverage?.truncatedSegments.join('、') || '-'}</Descriptions.Item>
            <Descriptions.Item label="缺失分段">{traceCoverage?.missingSegments.join('、') || '-'}</Descriptions.Item>'''
text, count = summary_pattern.subn(new_summary, text, count=1)
if count != 1:
    raise SystemExit(f"summary replacement count={count}")

old_diff_table_pattern = re.compile(r"          \{reviewDiff \? \(\n            <Table<FieldDiff>.*?          \) : null\}", re.S)
new_tables = '''          {traceDetail?.revisions.length ? (
            <Table<TrackingTraceRevisionResponse>
              size="small"
              bordered
              style={{ marginTop: 12 }}
              rowKey={row => String(row.id)}
              dataSource={traceDetail.revisions}
              pagination={false}
              columns={[
                { key: 'changeType', title: '变更类型', dataIndex: 'changeType' },
                { key: 'summary', title: '变更摘要', render: (_value, row) => display(row.diffSummary) },
                { key: 'status', title: '状态', render: (_value, row) => <Tag color={statusColor(row.status)}>{statusText(row.status)}</Tag> },
                { key: 'submitter', title: '提交人', render: (_value, row) => display(row.submitterDisplayName, '未知操作者') },
                { key: 'time', title: '提交时间', render: (_value, row) => display(row.submitTime, '时间未记录') }
              ]}
            />
          ) : null}
          {traceDetail?.sourceBindings.length ? (
            <Table<TrackingTraceSourceBindingResponse>
              size="small"
              bordered
              style={{ marginTop: 12 }}
              rowKey={row => String(row.id)}
              dataSource={traceDetail.sourceBindings}
              pagination={false}
              columns={[
                { key: 'source', title: '来源', dataIndex: 'sourceDisplayName' },
                { key: 'target', title: '关联对象', render: (_value, row) => display(row.targetDisplayName) },
                { key: 'confidence', title: '可信度', render: (_value, row) => display(row.confidenceLevel) },
                { key: 'status', title: '状态', render: (_value, row) => <Tag color={statusColor(row.bindingStatus)}>{statusText(row.bindingStatus)}</Tag> }
              ]}
            />
          ) : null}'''
text, count = old_diff_table_pattern.subn(new_tables, text, count=1)
if count != 1:
    raise SystemExit(f"diff table replacement count={count}")

path.write_text(text)
