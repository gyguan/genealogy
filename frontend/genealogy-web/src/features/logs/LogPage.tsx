import { DownOutlined, UpOutlined } from '@ant-design/icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import {
  Alert, Button, Card, DatePicker, Empty, Form, Input, Result, Select, Space, Table, Tabs, Tag, Typography
} from 'antd';
import { apiClient, ApiRequestError } from '../../shared/api/client';
import type {
  OperationLogPage,
  OperationLogResponse,
  RiskAuditEventPage,
  RiskAuditEventResponse,
  TrackingObjectPage,
  TrackingObjectResponse
} from '../../shared/api/generated/tracking-types';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import {
  DEFAULT_AUDIT_FILTERS,
  DEFAULT_OBJECT_FILTERS,
  DEFAULT_RISK_FILTERS,
  TRACKING_PAGE_SIZE,
  TRACKING_TABS,
  buildAuditQuery,
  buildObjectQuery,
  buildRiskQuery,
  readTrackingCenterState,
  writeTrackingCenterState
} from './trackingCenterModel.js';
import type { AuditFilters, ObjectFilters, RiskFilters, TrackingTab } from './trackingCenterModel.js';
import {
  ACTION_OPTIONS,
  AUDIT_RESULT_OPTIONS,
  AUDIT_TARGET_OPTIONS,
  OBJECT_STATUS_OPTIONS,
  OBJECT_TYPE_OPTIONS,
  RISK_DISPOSITION_OPTIONS,
  RISK_EVENT_OPTIONS,
  RISK_LEVEL_OPTIONS,
  actionText,
  display,
  formatDateTime,
  riskDispositionColor,
  riskDispositionText,
  riskEventText,
  riskLevelColor,
  riskLevelText,
  statusColor,
  statusText,
  targetTypeText
} from './trackingCenterLabels';
import { TrackingMultiSelect } from './TrackingMultiSelect';
import { OperationLogDrawer } from './TrackingDetailDrawers';
import { TrackingTraceDetailPage } from './TrackingTraceDetailPage';
import './tracking-page.css';
import { BusinessResultCard } from '../../shared/ui/QueryResultCards';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;
const TRACEABLE_TYPES = new Set(['person', 'relationship', 'source', 'branch', 'review_task', 'culture_item', 'migration_event', 'culture_site']);

type ExpandedState = Record<TrackingTab, boolean>;

function rangeValue(from: string, to: string) {
  if (!from || !to) return null;
  const start = dayjs(from);
  const end = dayjs(to);
  return start.isValid() && end.isValid() ? [start, end] as any : null;
}

function rangeStrings(values: any) {
  if (!values?.[0] || !values?.[1]) return ['', ''] as const;
  return [values[0].format('YYYY-MM-DDTHH:mm:ss'), values[1].format('YYYY-MM-DDTHH:mm:ss')] as const;
}

function errorState(error: unknown, fallback: string) {
  const requestError = error as ApiRequestError;
  return { message: (error as Error)?.message || fallback, forbidden: requestError?.status === 403 };
}

function technicalFieldsReturned(row: OperationLogResponse) {
  return Object.prototype.hasOwnProperty.call(row, 'detail')
    || Object.prototype.hasOwnProperty.call(row, 'requestId')
    || Object.prototype.hasOwnProperty.call(row, 'clientIp');
}

function asOperationLog(row: RiskAuditEventResponse): OperationLogResponse {
  return {
    id: row.id,
    clanId: row.clanId,
    actorId: row.actorId,
    actorDisplayName: row.actorDisplayName,
    actionType: row.actionType,
    targetType: row.targetType,
    targetId: row.targetId,
    targetDisplayName: row.targetDisplayName,
    targetBranchName: row.targetBranchName,
    targetSummary: row.targetSummary,
    resultStatus: row.resultStatus,
    summary: row.summary,
    detail: row.detail,
    requestId: row.requestId,
    clientIp: row.clientIp,
    createdAt: row.createdAt,
    traceId: row.traceId,
    revisionId: row.revisionId,
    reviewTaskId: row.reviewTaskId,
    businessTargetType: row.trackingTargetType,
    businessTargetId: row.trackingTargetId,
    eventResult: row.resultStatus
  };
}

export function LogPage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const workspace = useWorkspace();
  const initial = useRef(readTrackingCenterState(window.location.search)).current;
  const [activeTab, setActiveTab] = useState<TrackingTab>(initial.activeTab);
  const [expanded, setExpanded] = useState<ExpandedState>({ object: false, audit: false, risk: false });
  const [objectFilters, setObjectFilters] = useState<ObjectFilters>(initial.objectFilters);
  const [auditFilters, setAuditFilters] = useState<AuditFilters>(initial.auditFilters);
  const [riskFilters, setRiskFilters] = useState<RiskFilters>(initial.riskFilters);
  const [objectPage, setObjectPage] = useState<TrackingObjectPage | null>(null);
  const [auditPage, setAuditPage] = useState<OperationLogPage | null>(null);
  const [riskPage, setRiskPage] = useState<RiskAuditEventPage | null>(null);
  const [objectLoading, setObjectLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [riskLoading, setRiskLoading] = useState(false);
  const [objectError, setObjectError] = useState('');
  const [auditError, setAuditError] = useState('');
  const [riskError, setRiskError] = useState('');
  const [objectForbidden, setObjectForbidden] = useState(false);
  const [auditForbidden, setAuditForbidden] = useState(false);
  const [riskForbidden, setRiskForbidden] = useState(false);
  const [auditExporting, setAuditExporting] = useState(false);
  const [selectedTrace, setSelectedTrace] = useState(initial.selectedTrace);
  const [selectedObject, setSelectedObject] = useState<TrackingObjectResponse | null>(null);
  const [selectedAuditLogId, setSelectedAuditLogId] = useState(initial.selectedAuditLogId);
  const [selectedAuditLog, setSelectedAuditLog] = useState<OperationLogResponse | null>(null);
  const [selectedRiskLogId, setSelectedRiskLogId] = useState(initial.selectedRiskLogId);
  const [selectedRiskLog, setSelectedRiskLog] = useState<RiskAuditEventResponse | null>(null);
  const objectRequestVersion = useRef(0);
  const auditRequestVersion = useRef(0);
  const riskRequestVersion = useRef(0);
  const initializedClan = useRef('');
  const pendingClanRestore = useRef(initial.clanId);

  useEffect(() => {
    if (!pendingClanRestore.current || pendingClanRestore.current === workspace.clanId) {
      pendingClanRestore.current = '';
      return;
    }
    initializedClan.current = '';
    workspace.patch({ clanId: pendingClanRestore.current, branchId: '' });
  }, []);

  useEffect(() => {
    if (pendingClanRestore.current && pendingClanRestore.current !== workspace.clanId) return;
    const search = writeTrackingCenterState({
      clanId: workspace.clanId,
      activeTab,
      objectFilters,
      auditFilters,
      riskFilters,
      selectedTrace,
      selectedAuditLogId,
      selectedRiskLogId
    }, window.location.search);
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${search}${window.location.hash}`);
  }, [workspace.clanId, activeTab, objectFilters, auditFilters, riskFilters, selectedTrace, selectedAuditLogId, selectedRiskLogId]);

  useEffect(() => {
    const onPopState = () => {
      const restored = readTrackingCenterState(window.location.search);
      setActiveTab(restored.activeTab);
      setObjectFilters(restored.objectFilters);
      setAuditFilters(restored.auditFilters);
      setRiskFilters(restored.riskFilters);
      setSelectedTrace(restored.selectedTrace);
      setSelectedAuditLogId(restored.selectedAuditLogId);
      setSelectedRiskLogId(restored.selectedRiskLogId);
      setSelectedAuditLog(null);
      setSelectedRiskLog(null);
      setSelectedObject(null);
      if (restored.clanId && restored.clanId !== workspace.clanId) {
        pendingClanRestore.current = restored.clanId;
        initializedClan.current = '';
        workspace.patch({ clanId: restored.clanId, branchId: '' });
        return;
      }
      if (!workspace.clanId || restored.selectedTrace.targetId) return;
      if (restored.activeTab === TRACKING_TABS.OBJECT) void loadObjects(restored.objectFilters);
      if (restored.activeTab === TRACKING_TABS.AUDIT) void loadAudit(restored.auditFilters, restored.selectedAuditLogId);
      if (restored.activeTab === TRACKING_TABS.RISK) void loadRisk(restored.riskFilters, restored.selectedRiskLogId);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [workspace.clanId]);

  useEffect(() => {
    if (pendingClanRestore.current && pendingClanRestore.current !== workspace.clanId) return;
    if (!workspace.clanId || initializedClan.current === workspace.clanId) return;
    pendingClanRestore.current = '';
    initializedClan.current = workspace.clanId;
    if (!selectedTrace.targetId) {
      if (activeTab === TRACKING_TABS.OBJECT) void loadObjects(objectFilters);
      if (activeTab === TRACKING_TABS.AUDIT) void loadAudit(auditFilters, selectedAuditLogId);
      if (activeTab === TRACKING_TABS.RISK) void loadRisk(riskFilters, selectedRiskLogId);
    }
  }, [workspace.clanId]);

  async function loadObjects(filters: ObjectFilters) {
    if (!workspace.clanId) return;
    const version = ++objectRequestVersion.current;
    setObjectLoading(true);
    setObjectError('');
    setObjectForbidden(false);
    try {
      const page = await apiClient.get<TrackingObjectPage>(`/tracking/objects?${buildObjectQuery(filters, workspace.clanId, workspace.branchId)}`);
      if (version === objectRequestVersion.current) setObjectPage(page);
    } catch (error) {
      if (version !== objectRequestVersion.current) return;
      const state = errorState(error, '业务对象查询失败');
      setObjectError(state.message);
      setObjectForbidden(state.forbidden);
      setObjectPage(null);
    } finally {
      if (version === objectRequestVersion.current) setObjectLoading(false);
    }
  }

  async function loadAudit(filters: AuditFilters, selectedId = selectedAuditLogId) {
    if (!workspace.clanId) return;
    const version = ++auditRequestVersion.current;
    setAuditLoading(true);
    setAuditError('');
    setAuditForbidden(false);
    try {
      const page = await apiClient.get<OperationLogPage>(`/logs/operations?${buildAuditQuery(filters, workspace.clanId)}`);
      if (version !== auditRequestVersion.current) return;
      setAuditPage(page);
      if (selectedId) setSelectedAuditLog(page.records.find(row => String(row.id) === selectedId) || null);
    } catch (error) {
      if (version !== auditRequestVersion.current) return;
      const state = errorState(error, '操作审计查询失败');
      setAuditError(state.message);
      setAuditForbidden(state.forbidden);
      setAuditPage(null);
    } finally {
      if (version === auditRequestVersion.current) setAuditLoading(false);
    }
  }

  async function loadRisk(filters: RiskFilters, selectedId = selectedRiskLogId) {
    if (!workspace.clanId) return;
    const version = ++riskRequestVersion.current;
    setRiskLoading(true);
    setRiskError('');
    setRiskForbidden(false);
    try {
      const page = await apiClient.get<RiskAuditEventPage>(`/logs/risks?${buildRiskQuery(filters, workspace.clanId)}`);
      if (version !== riskRequestVersion.current) return;
      setRiskPage(page);
      if (selectedId) setSelectedRiskLog(page.records.find(row => String(row.id) === selectedId) || null);
    } catch (error) {
      if (version !== riskRequestVersion.current) return;
      const state = errorState(error, '风险审计查询失败');
      setRiskError(state.message);
      setRiskForbidden(state.forbidden);
      setRiskPage(null);
      setSelectedRiskLog(null);
    } finally {
      if (version === riskRequestVersion.current) setRiskLoading(false);
    }
  }

  function openTrace(row: TrackingObjectResponse, reviewTaskId = '') {
    setSelectedObject(row);
    setSelectedTrace({ targetType: row.objectType, targetId: String(row.objectId), reviewTaskId });
  }

  function closeTrace() {
    setSelectedTrace({ targetType: '', targetId: '', reviewTaskId: '' });
    setSelectedObject(null);
    window.setTimeout(() => void loadObjects(objectFilters), 0);
  }

  function changeTab(key: string) {
    const next = key === TRACKING_TABS.RISK ? TRACKING_TABS.RISK : key === TRACKING_TABS.AUDIT ? TRACKING_TABS.AUDIT : TRACKING_TABS.OBJECT;
    setActiveTab(next);
    if (next === TRACKING_TABS.OBJECT && !objectPage && !objectLoading) void loadObjects(objectFilters);
    if (next === TRACKING_TABS.AUDIT && !auditPage && !auditLoading) void loadAudit(auditFilters);
    if (next === TRACKING_TABS.RISK && !riskPage && !riskLoading) void loadRisk(riskFilters);
  }

  async function exportAuditCsv() {
    if (!workspace.clanId || auditExporting) return;
    setAuditExporting(true);
    try {
      const params = new URLSearchParams(buildAuditQuery(auditFilters, workspace.clanId));
      params.delete('pageNo');
      params.delete('pageSize');
      const blob = await apiClient.download(`/logs/operations/export.csv?${params}`);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `operation-audit-${dayjs().format('YYYYMMDD-HHmm')}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      notify({ message: '操作审计已导出' });
    } catch (error) {
      notify({ message: (error as Error)?.message || '操作审计导出失败' }, true);
    } finally {
      setAuditExporting(false);
    }
  }

  const objectRows = objectPage?.records || [];
  const auditRows = auditPage?.records || [];
  const riskRows = riskPage?.records || [];
  const canExportAudit = Boolean(auditRows.some(technicalFieldsReturned));

  const auditActorOptions = useMemo(() => {
    const names = new Map<string, string>();
    auditRows.forEach(row => { if (row.actorId != null) names.set(String(row.actorId), display(row.actorDisplayName, '系统或未知操作者')); });
    String(auditFilters.actorId || '').split(',').filter(Boolean).forEach(id => { if (!names.has(id)) names.set(id, '已选操作者'); });
    return Array.from(names.entries()).map(([value, label]) => ({ value, label }));
  }, [auditPage, auditFilters.actorId]);

  const riskActorOptions = useMemo(() => {
    const names = new Map<string, string>();
    riskRows.forEach(row => { if (row.actorId != null) names.set(String(row.actorId), display(row.actorDisplayName, '系统或未知操作者')); });
    String(riskFilters.actorId || '').split(',').filter(Boolean).forEach(id => { if (!names.has(id)) names.set(id, '已选操作者'); });
    return Array.from(names.entries()).map(([value, label]) => ({ value, label }));
  }, [riskPage, riskFilters.actorId]);

  const branchOptions = [
    ...(workspace.branchId ? [{ value: workspace.branchId, label: '当前工作区支派' }] : [])
  ];

  if (selectedTrace.targetType && selectedTrace.targetId) {
    return <TrackingTraceDetailPage clanId={workspace.clanId} targetType={selectedTrace.targetType} targetId={selectedTrace.targetId} reviewTaskId={selectedTrace.reviewTaskId} selectedObject={selectedObject} onBack={closeTrace} />;
  }

  function moreButton() {
    const isExpanded = expanded[activeTab];
    return (
      <Button type="link" className="tracking-more-button" icon={isExpanded ? <UpOutlined /> : <DownOutlined />} iconPosition="end" onClick={() => setExpanded(previous => ({ ...previous, [activeTab]: !isExpanded }))}>
        {isExpanded ? '收起' : '更多筛选'}
      </Button>
    );
  }

  function queryActions(reset: () => void, query: () => void, loading: boolean) {
    return <div className="tracking-query-actions"><Space wrap>{moreButton()}<Button disabled={loading} onClick={reset}>重置</Button><Button type="primary" loading={loading} onClick={query}>查询</Button></Space></div>;
  }

  const objectFiltersView = (
    <Form layout="vertical" className="tracking-query-form">
      <div className="tracking-query-grid">
        <Form.Item label="对象类型"><TrackingMultiSelect ariaLabel="对象类型" value={objectFilters.objectType} options={OBJECT_TYPE_OPTIONS} placeholder="全部对象类型" onChange={value => setObjectFilters(previous => ({ ...previous, objectType: value }))} /></Form.Item>
        <Form.Item label="业务关键词"><Input value={objectFilters.keyword} placeholder="姓名、谱名、来源名称、支派名称或审核摘要" allowClear maxLength={100} onChange={event => setObjectFilters(previous => ({ ...previous, keyword: event.target.value }))} onPressEnter={() => void loadObjects({ ...objectFilters, pageNo: 1 })} /></Form.Item>
        <Form.Item label="业务状态"><TrackingMultiSelect ariaLabel="业务状态" value={objectFilters.status} options={OBJECT_STATUS_OPTIONS} placeholder="全部状态" onChange={value => setObjectFilters(previous => ({ ...previous, status: value }))} /></Form.Item>
        <Form.Item label="最近变更时间"><RangePicker value={rangeValue(objectFilters.changedFrom, objectFilters.changedTo)} showTime format="YYYY-MM-DD HH:mm" allowClear onChange={values => { const [changedFrom, changedTo] = rangeStrings(values); setObjectFilters(previous => ({ ...previous, changedFrom, changedTo })); }} /></Form.Item>
        {expanded.object ? <Form.Item label="所属支派"><Input value={workspace.branchId ? '当前工作区支派' : '本人可见支派范围'} disabled /></Form.Item> : null}
      </div>
      {queryActions(() => { const next = { ...DEFAULT_OBJECT_FILTERS }; setObjectFilters(next); void loadObjects(next); }, () => { const next = { ...objectFilters, pageNo: 1 }; setObjectFilters(next); void loadObjects(next); }, objectLoading)}
    </Form>
  );

  const auditFiltersView = (
    <Form layout="vertical" className="tracking-query-form">
      <div className="tracking-query-grid">
        <Form.Item label="时间范围"><RangePicker value={rangeValue(auditFilters.startTime, auditFilters.endTime)} showTime format="YYYY-MM-DD HH:mm" allowClear onChange={values => { const [startTime, endTime] = rangeStrings(values); setAuditFilters(previous => ({ ...previous, startTime, endTime })); }} /></Form.Item>
        <Form.Item label="操作者"><TrackingMultiSelect ariaLabel="操作者" value={auditFilters.actorId} options={auditActorOptions} placeholder="全部操作者" notFoundContent="先查询日志后可按当前结果中的操作者筛选" onChange={value => setAuditFilters(previous => ({ ...previous, actorId: value }))} /></Form.Item>
        <Form.Item label="动作分类"><TrackingMultiSelect ariaLabel="动作分类" value={auditFilters.actionType} options={ACTION_OPTIONS} placeholder="全部动作" onChange={value => setAuditFilters(previous => ({ ...previous, actionType: value }))} /></Form.Item>
        <Form.Item label="对象类型"><TrackingMultiSelect ariaLabel="日志对象类型" value={auditFilters.targetType} options={AUDIT_TARGET_OPTIONS} placeholder="全部对象" onChange={value => setAuditFilters(previous => ({ ...previous, targetType: value }))} /></Form.Item>
        {expanded.audit ? <><Form.Item label="执行结果"><TrackingMultiSelect ariaLabel="执行结果" value={auditFilters.resultStatus} options={AUDIT_RESULT_OPTIONS} placeholder="全部结果" onChange={value => setAuditFilters(previous => ({ ...previous, resultStatus: value }))} /></Form.Item><Form.Item label="业务关键词"><Input value={auditFilters.keyword} placeholder="业务名称、摘要或动作说明" allowClear maxLength={100} onChange={event => setAuditFilters(previous => ({ ...previous, keyword: event.target.value }))} onPressEnter={() => void loadAudit({ ...auditFilters, pageNo: 1 }, '')} /></Form.Item></> : null}
      </div>
      {queryActions(() => { const next = { ...DEFAULT_AUDIT_FILTERS }; setAuditFilters(next); setSelectedAuditLog(null); setSelectedAuditLogId(''); void loadAudit(next, ''); }, () => { const next = { ...auditFilters, pageNo: 1 }; setAuditFilters(next); void loadAudit(next, ''); }, auditLoading)}
    </Form>
  );

  const riskFiltersView = (
    <Form layout="vertical" className="tracking-query-form">
      <div className="tracking-query-grid">
        <Form.Item label="时间范围"><RangePicker value={rangeValue(riskFilters.startTime, riskFilters.endTime)} showTime format="YYYY-MM-DD HH:mm" allowClear onChange={values => { const [startTime, endTime] = rangeStrings(values); setRiskFilters(previous => ({ ...previous, startTime, endTime })); }} /></Form.Item>
        <Form.Item label="风险等级"><TrackingMultiSelect ariaLabel="风险等级" value={riskFilters.riskLevel} options={RISK_LEVEL_OPTIONS} placeholder="全部等级" onChange={value => setRiskFilters(previous => ({ ...previous, riskLevel: value }))} /></Form.Item>
        <Form.Item label="事件类型"><TrackingMultiSelect ariaLabel="事件类型" value={riskFilters.eventType} options={RISK_EVENT_OPTIONS} placeholder="全部事件" onChange={value => setRiskFilters(previous => ({ ...previous, eventType: value }))} /></Form.Item>
        <Form.Item label="处置状态"><TrackingMultiSelect ariaLabel="处置状态" value={riskFilters.dispositionStatus} options={RISK_DISPOSITION_OPTIONS} placeholder="全部处置状态" onChange={value => setRiskFilters(previous => ({ ...previous, dispositionStatus: value }))} /></Form.Item>
        {expanded.risk ? <><Form.Item label="操作者"><TrackingMultiSelect ariaLabel="风险操作者" value={riskFilters.actorId} options={riskActorOptions} placeholder="全部操作者" onChange={value => setRiskFilters(previous => ({ ...previous, actorId: value }))} /></Form.Item><Form.Item label="所属支派"><TrackingMultiSelect ariaLabel="风险所属支派" value={riskFilters.branchId} options={branchOptions} placeholder="本人可见支派范围" onChange={value => setRiskFilters(previous => ({ ...previous, branchId: value }))} /></Form.Item></> : null}
      </div>
      {queryActions(() => { const next = { ...DEFAULT_RISK_FILTERS }; setRiskFilters(next); setSelectedRiskLog(null); setSelectedRiskLogId(''); void loadRisk(next, ''); }, () => { const next = { ...riskFilters, pageNo: 1 }; setRiskFilters(next); void loadRisk(next, ''); }, riskLoading)}
    </Form>
  );

  const objectResult = objectForbidden ? <Result status="403" title="无权查看对象追踪" subTitle="当前账号缺少追踪查看权限，或当前宗族没有可见支派范围。" /> : objectError ? <Alert type="error" showIcon message="对象查询失败" description={objectError} action={<Button onClick={() => void loadObjects(objectFilters)}>重试</Button>} /> : (
    <Table<TrackingObjectResponse> size="small" rowKey={row => `${row.objectType}-${row.objectId}`} dataSource={objectRows} loading={objectLoading} scroll={{ x: 900 }} onRow={row => ({ onClick: () => openTrace(row) })} rowClassName="tracking-clickable-row" locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未找到符合条件的业务对象" /> }} pagination={{ current: objectPage?.pageNo || objectFilters.pageNo, pageSize: TRACKING_PAGE_SIZE, total: objectPage?.total || 0, showSizeChanger: false, showTotal: total => `共 ${total} 个对象`, onChange: pageNo => { const next = { ...objectFilters, pageNo, pageSize: TRACKING_PAGE_SIZE }; setObjectFilters(next); void loadObjects(next); } }} columns={[
      { key: 'name', title: '业务对象', render: (_value, row) => <div><Text strong>{row.displayName}</Text>{row.secondaryLabel ? <div><Text type="secondary">{row.secondaryLabel}</Text></div> : null}</div> },
      { key: 'type', title: '类型', width: 120, render: (_value, row) => targetTypeText(row.objectType) },
      { key: 'branch', title: '所属支派', width: 150, render: (_value, row) => display(row.branchName, '未归属支派') },
      { key: 'summary', title: '业务摘要', render: (_value, row) => display(row.summary, '暂无摘要') },
      { key: 'status', title: '状态', width: 110, render: (_value, row) => <Tag color={statusColor(row.status)}>{statusText(row.status)}</Tag> },
      { key: 'changedAt', title: '最近变更', width: 180, render: (_value, row) => formatDateTime(row.changedAt) },
      { key: 'open', title: '操作', width: 100, fixed: 'right', render: (_value, row) => <Button type="link" onClick={event => { event.stopPropagation(); openTrace(row); }}>查看追踪</Button> }
    ]} />
  );

  const auditResult = auditForbidden ? <Result status="403" title="无权查看操作审计" subTitle="当前账号缺少操作日志查看权限。" /> : auditError ? <Alert type="error" showIcon message="审计记录查询失败" description={auditError} action={<Button onClick={() => void loadAudit(auditFilters)}>重试</Button>} /> : (
    <Table<OperationLogResponse> size="small" rowKey={row => String(row.id)} dataSource={auditRows} loading={auditLoading} scroll={{ x: 980 }} onRow={row => ({ onClick: () => { setSelectedAuditLog(row); setSelectedAuditLogId(String(row.id)); } })} rowClassName="tracking-clickable-row" locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前条件下暂无操作审计记录" /> }} pagination={{ current: auditPage?.pageNo || auditFilters.pageNo, pageSize: TRACKING_PAGE_SIZE, total: auditPage?.total || 0, showSizeChanger: false, showTotal: total => `共 ${total} 条记录`, onChange: pageNo => { const next = { ...auditFilters, pageNo, pageSize: TRACKING_PAGE_SIZE }; setAuditFilters(next); void loadAudit(next, ''); } }} columns={[
      { key: 'time', title: '操作时间', width: 180, render: (_value, row) => formatDateTime(row.createdAt) },
      { key: 'actor', title: '操作者', width: 150, render: (_value, row) => display(row.actorDisplayName, '系统或未知操作者') },
      { key: 'action', title: '动作', width: 140, render: (_value, row) => actionText(row.actionType) },
      { key: 'target', title: '业务对象', render: (_value, row) => <div><Text strong>{display(row.targetDisplayName || row.targetSummary, '业务信息不可用')}</Text><div><Text type="secondary">{targetTypeText(row.targetType)}{row.targetBranchName ? ` · ${row.targetBranchName}` : ''}</Text></div></div> },
      { key: 'result', title: '结果', width: 110, render: (_value, row) => row.resultStatus ? <Tag color={statusColor(row.resultStatus)}>{statusText(row.resultStatus)}</Tag> : '未记录' },
      { key: 'summary', title: '摘要', render: (_value, row) => display(row.summary, '暂无摘要') },
      { key: 'detail', title: '操作', width: 90, fixed: 'right', render: (_value, row) => <Button type="link" onClick={event => { event.stopPropagation(); setSelectedAuditLog(row); setSelectedAuditLogId(String(row.id)); }}>查看</Button> }
    ]} />
  );

  const riskResult = riskForbidden ? <Result status="403" title="无权查看高风险审计" subTitle="当前账号缺少高风险操作审计权限，风险事件不会返回。" /> : riskError ? <Alert type="error" showIcon message="风险审计查询失败" description={riskError} action={<Button onClick={() => void loadRisk(riskFilters)}>重试</Button>} /> : (
    <Table<RiskAuditEventResponse> size="small" rowKey={row => String(row.id)} dataSource={riskRows} loading={riskLoading} scroll={{ x: 1180 }} onRow={row => ({ onClick: () => { setSelectedRiskLog(row); setSelectedRiskLogId(String(row.id)); } })} rowClassName="tracking-clickable-row" locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前条件下暂无高风险操作" /> }} pagination={{ current: riskPage?.pageNo || riskFilters.pageNo, pageSize: TRACKING_PAGE_SIZE, total: riskPage?.total || 0, showSizeChanger: false, showTotal: total => `共 ${total} 条风险事件`, onChange: pageNo => { const next = { ...riskFilters, pageNo, pageSize: TRACKING_PAGE_SIZE }; setRiskFilters(next); void loadRisk(next, ''); } }} columns={[
      { key: 'time', title: '发生时间', width: 180, render: (_value, row) => formatDateTime(row.createdAt) },
      { key: 'level', title: '风险等级', width: 100, render: (_value, row) => <Tag color={riskLevelColor(row.riskLevel)}>{riskLevelText(row.riskLevel)}</Tag> },
      { key: 'event', title: '事件类型', width: 170, render: (_value, row) => riskEventText(row.eventType) },
      { key: 'actor', title: '操作者', width: 150, render: (_value, row) => display(row.actorDisplayName, '系统或未知操作者') },
      { key: 'target', title: '业务对象', render: (_value, row) => <div><Text strong>{display(row.targetDisplayName || row.targetSummary, targetTypeText(row.targetType))}</Text><div><Text type="secondary">{targetTypeText(row.targetType)}{row.targetBranchName ? ` · ${row.targetBranchName}` : ''}</Text></div></div> },
      { key: 'action', title: '动作', width: 150, render: (_value, row) => actionText(row.actionType) },
      { key: 'disposition', title: '处置状态', width: 110, render: (_value, row) => <Tag color={riskDispositionColor(row.dispositionStatus)}>{riskDispositionText(row.dispositionStatus)}</Tag> },
      { key: 'summary', title: '风险摘要', render: (_value, row) => display(row.summary, '暂无摘要') },
      { key: 'actions', title: '操作', width: 170, fixed: 'right', render: (_value, row) => <Space size={4}><Button type="link" onClick={event => { event.stopPropagation(); setSelectedRiskLog(row); setSelectedRiskLogId(String(row.id)); }}>日志详情</Button>{row.trackingTargetType && row.trackingTargetId != null && TRACEABLE_TYPES.has(row.trackingTargetType) ? <Button type="link" onClick={event => { event.stopPropagation(); setSelectedTrace({ targetType: row.trackingTargetType!, targetId: String(row.trackingTargetId), reviewTaskId: row.reviewTaskId ? String(row.reviewTaskId) : '' }); }}>对象追踪</Button> : null}</Space> }
    ]} />
  );

  const resultTotal = activeTab === TRACKING_TABS.OBJECT ? objectPage?.total || 0 : activeTab === TRACKING_TABS.AUDIT ? auditPage?.total || 0 : riskPage?.total || 0;
  const activeFilters = activeTab === TRACKING_TABS.OBJECT ? objectFiltersView : activeTab === TRACKING_TABS.AUDIT ? auditFiltersView : riskFiltersView;
  const activeResult = activeTab === TRACKING_TABS.OBJECT ? objectResult : activeTab === TRACKING_TABS.AUDIT ? auditResult : riskResult;

  return (
    <div className="audit-trace-page tracking-double-card-page">
      <Card className="tracking-query-card" title="审计追踪">
        <Tabs className="tracking-query-tabs" activeKey={activeTab} onChange={changeTab} items={[
          { key: TRACKING_TABS.OBJECT, label: '对象追踪' },
          { key: TRACKING_TABS.AUDIT, label: '操作日志' },
          { key: TRACKING_TABS.RISK, label: '风险事件' }
        ]} />
        {!workspace.clanId ? <Alert type="warning" showIcon message="请先选择宗族" description="追踪和审计数据均按当前宗族及本人可见范围加载。" /> : activeFilters}
      </Card>
      {workspace.clanId ? (
        <Card
          className="tracking-result-card query-result-outer-card"
          title="查询结果"
          extra={activeTab === TRACKING_TABS.AUDIT && canExportAudit ? <Button loading={auditExporting} onClick={() => void exportAuditCsv()}>导出 CSV</Button> : null}
        >
          <BusinessResultCard
            title={activeTab === TRACKING_TABS.OBJECT ? '业务对象' : activeTab === TRACKING_TABS.AUDIT ? '操作日志' : '风险事件'}
            total={resultTotal}
            totalSuffix={activeTab === TRACKING_TABS.OBJECT ? '个对象' : activeTab === TRACKING_TABS.AUDIT ? '条记录' : '条风险事件'}
          >
            {activeResult}
          </BusinessResultCard>
        </Card>
      ) : null}

      <OperationLogDrawer log={selectedAuditLog} onClose={() => { setSelectedAuditLog(null); setSelectedAuditLogId(''); }} />
      <OperationLogDrawer log={selectedRiskLog ? asOperationLog(selectedRiskLog) : null} onClose={() => { setSelectedRiskLog(null); setSelectedRiskLogId(''); }} />
    </div>
  );
}
