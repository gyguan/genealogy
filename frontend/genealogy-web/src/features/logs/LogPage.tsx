import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  Input,
  Result,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography
} from 'antd';
import { apiClient, ApiRequestError } from '../../shared/api/client';
import type {
  OperationLogPage,
  OperationLogResponse,
  TrackingObjectPage,
  TrackingObjectResponse,
  TrackingTraceDetailResponse
} from '../../shared/api/generated/tracking-types';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import {
  DEFAULT_AUDIT_FILTERS,
  DEFAULT_OBJECT_FILTERS,
  DEFAULT_RISK_FILTERS,
  TRACKING_TABS,
  buildAuditQuery,
  buildObjectQuery,
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
  actionText,
  display,
  formatDateTime,
  statusColor,
  statusText,
  targetTypeText
} from './trackingCenterLabels';
import { OperationLogDrawer, TrackingTraceDrawer } from './TrackingDetailDrawers';
import { RiskAuditPanel } from './RiskAuditPanel';

const { Paragraph, Text, Title } = Typography;
const { RangePicker } = DatePicker;

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
  return {
    message: (error as Error)?.message || fallback,
    forbidden: requestError?.status === 403
  };
}

function technicalFieldsReturned(row: OperationLogResponse) {
  return Object.prototype.hasOwnProperty.call(row, 'detail')
    || Object.prototype.hasOwnProperty.call(row, 'requestId')
    || Object.prototype.hasOwnProperty.call(row, 'clientIp');
}

export function LogPage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const workspace = useWorkspace();
  const initial = useRef(readTrackingCenterState(window.location.search)).current;

  const [activeTab, setActiveTab] = useState<TrackingTab>(initial.activeTab);
  const [objectFilters, setObjectFilters] = useState<ObjectFilters>(initial.objectFilters);
  const [auditFilters, setAuditFilters] = useState<AuditFilters>(initial.auditFilters);
  const [riskFilters, setRiskFilters] = useState<RiskFilters>(initial.riskFilters);

  const [objectPage, setObjectPage] = useState<TrackingObjectPage | null>(null);
  const [objectLoading, setObjectLoading] = useState(false);
  const [objectError, setObjectError] = useState('');
  const [objectForbidden, setObjectForbidden] = useState(false);

  const [auditPage, setAuditPage] = useState<OperationLogPage | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');
  const [auditForbidden, setAuditForbidden] = useState(false);
  const [auditExporting, setAuditExporting] = useState(false);

  const [selectedTrace, setSelectedTrace] = useState(initial.selectedTrace);
  const [selectedObject, setSelectedObject] = useState<TrackingObjectResponse | null>(null);
  const [traceDetail, setTraceDetail] = useState<TrackingTraceDetailResponse | null>(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [traceError, setTraceError] = useState('');

  const [selectedAuditLogId, setSelectedAuditLogId] = useState(initial.selectedAuditLogId);
  const [selectedAuditLog, setSelectedAuditLog] = useState<OperationLogResponse | null>(null);
  const [selectedRiskLogId, setSelectedRiskLogId] = useState(initial.selectedRiskLogId);

  const objectRequestVersion = useRef(0);
  const auditRequestVersion = useRef(0);
  const traceRequestVersion = useRef(0);
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
    const nextUrl = `${window.location.pathname}${search}${window.location.hash}`;
    window.history.replaceState(window.history.state, '', nextUrl);
  }, [activeTab, objectFilters, auditFilters, riskFilters, selectedTrace, selectedAuditLogId, selectedRiskLogId]);

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
      if (restored.clanId && restored.clanId !== workspace.clanId) {
        pendingClanRestore.current = restored.clanId;
        initializedClan.current = '';
        workspace.patch({ clanId: restored.clanId, branchId: '' });
        return;
      }
      if (!workspace.clanId) return;
      void loadObjects(restored.objectFilters);
      if (restored.activeTab === TRACKING_TABS.AUDIT) void loadAudit(restored.auditFilters, restored.selectedAuditLogId);
      if (restored.selectedTrace.targetType && restored.selectedTrace.targetId) {
        void loadTrace(
          restored.selectedTrace.targetType,
          restored.selectedTrace.targetId,
          null,
          restored.selectedTrace.reviewTaskId
        );
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [workspace.clanId]);

  useEffect(() => {
    if (pendingClanRestore.current && pendingClanRestore.current !== workspace.clanId) return;
    if (!workspace.clanId || initializedClan.current === workspace.clanId) return;
    pendingClanRestore.current = '';
    initializedClan.current = workspace.clanId;
    void loadObjects(objectFilters);
    if (activeTab === TRACKING_TABS.AUDIT) void loadAudit(auditFilters, selectedAuditLogId);
    if (selectedTrace.targetType && selectedTrace.targetId) {
      void loadTrace(selectedTrace.targetType, selectedTrace.targetId, null, selectedTrace.reviewTaskId);
    }
  }, [workspace.clanId]);

  async function loadObjects(filters: ObjectFilters) {
    if (!workspace.clanId) return;
    const requestVersion = ++objectRequestVersion.current;
    setObjectLoading(true);
    setObjectError('');
    setObjectForbidden(false);
    try {
      const query = buildObjectQuery(filters, workspace.clanId, workspace.branchId);
      const page = await apiClient.get<TrackingObjectPage>(`/tracking/objects?${query}`);
      if (requestVersion !== objectRequestVersion.current) return;
      setObjectPage(page);
    } catch (error) {
      if (requestVersion !== objectRequestVersion.current) return;
      const state = errorState(error, '业务对象查询失败');
      setObjectError(state.message);
      setObjectForbidden(state.forbidden);
      setObjectPage(null);
    } finally {
      if (requestVersion === objectRequestVersion.current) setObjectLoading(false);
    }
  }

  async function loadAudit(filters: AuditFilters, auditLogId = selectedAuditLogId) {
    if (!workspace.clanId) return;
    const requestVersion = ++auditRequestVersion.current;
    setAuditLoading(true);
    setAuditError('');
    setAuditForbidden(false);
    try {
      const query = buildAuditQuery(filters, workspace.clanId);
      const page = await apiClient.get<OperationLogPage>(`/logs/operations?${query}`);
      if (requestVersion !== auditRequestVersion.current) return;
      setAuditPage(page);
      if (auditLogId) {
        setSelectedAuditLog(page.records.find(row => String(row.id) === auditLogId) || null);
      }
    } catch (error) {
      if (requestVersion !== auditRequestVersion.current) return;
      const state = errorState(error, '操作审计查询失败');
      setAuditError(state.message);
      setAuditForbidden(state.forbidden);
      setAuditPage(null);
    } finally {
      if (requestVersion === auditRequestVersion.current) setAuditLoading(false);
    }
  }

  async function loadTrace(
    targetType: string,
    targetId: string,
    row: TrackingObjectResponse | null,
    reviewTaskId = ''
  ) {
    if (!workspace.clanId || !targetType || !targetId) return;
    const requestVersion = ++traceRequestVersion.current;
    setSelectedTrace({ targetType, targetId, reviewTaskId });
    setSelectedObject(row);
    setTraceDetail(null);
    setTraceError('');
    setTraceLoading(true);
    try {
      const params = new URLSearchParams({ clanId: workspace.clanId });
      const detail = await apiClient.get<TrackingTraceDetailResponse>(
        `/tracking/objects/${encodeURIComponent(targetType)}/${encodeURIComponent(targetId)}/trace?${params}`
      );
      if (requestVersion !== traceRequestVersion.current) return;
      setTraceDetail(detail);
      setSelectedObject(detail.objectSummary);
    } catch (error) {
      if (requestVersion !== traceRequestVersion.current) return;
      const requestError = error as ApiRequestError;
      if (requestError.status === 403 || requestError.status === 404) {
        setSelectedObject(null);
        setTraceError('当前账号无权查看该对象，或对象已不可用。');
      } else {
        setTraceError((error as Error)?.message || '追踪详情加载失败');
      }
    } finally {
      if (requestVersion === traceRequestVersion.current) setTraceLoading(false);
    }
  }

  function updateObjectFilter<K extends keyof ObjectFilters>(key: K, value: ObjectFilters[K]) {
    setObjectFilters(prev => ({ ...prev, [key]: value }));
  }

  function updateAuditFilter<K extends keyof AuditFilters>(key: K, value: AuditFilters[K]) {
    setAuditFilters(prev => ({ ...prev, [key]: value }));
  }

  function searchObjects() {
    const next = { ...objectFilters, pageNo: 1 };
    setObjectFilters(next);
    void loadObjects(next);
  }

  function resetObjects() {
    const next = { ...DEFAULT_OBJECT_FILTERS };
    setObjectFilters(next);
    setObjectPage(null);
    setObjectError('');
    setObjectForbidden(false);
    void loadObjects(next);
  }

  function searchAudit() {
    const next = { ...auditFilters, pageNo: 1 };
    setAuditFilters(next);
    void loadAudit(next, '');
  }

  function resetAudit() {
    const next = { ...DEFAULT_AUDIT_FILTERS };
    setAuditFilters(next);
    setSelectedAuditLogId('');
    setSelectedAuditLog(null);
    setAuditPage(null);
    setAuditError('');
    setAuditForbidden(false);
    void loadAudit(next, '');
  }

  function changeTab(key: string) {
    const next = key === TRACKING_TABS.RISK
      ? TRACKING_TABS.RISK
      : key === TRACKING_TABS.AUDIT
        ? TRACKING_TABS.AUDIT
        : TRACKING_TABS.OBJECT;
    setActiveTab(next);
    if (next === TRACKING_TABS.OBJECT && !objectPage && !objectLoading) void loadObjects(objectFilters);
    if (next === TRACKING_TABS.AUDIT && !auditPage && !auditLoading) void loadAudit(auditFilters);
  }

  function openAuditLog(row: OperationLogResponse) {
    setSelectedAuditLog(row);
    setSelectedAuditLogId(String(row.id));
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

  const actorOptions = useMemo(() => {
    const names = new Map<string, string>();
    (auditPage?.records || []).forEach(row => {
      if (row.actorId != null) names.set(String(row.actorId), display(row.actorDisplayName, '系统或未知操作者'));
    });
    if (auditFilters.actorId && !names.has(auditFilters.actorId)) names.set(auditFilters.actorId, '已选操作者');
    return Array.from(names.entries()).map(([value, label]) => ({ value, label }));
  }, [auditPage, auditFilters.actorId]);

  const canExportAudit = Boolean(auditPage?.records.some(technicalFieldsReturned));
  const objectRows = objectPage?.records || [];
  const auditRows = auditPage?.records || [];

  const objectTab = (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card className="tracking-filter-card">
        <Form layout="vertical">
          <div className="tracking-filter-grid tracking-filter-grid--object">
            <Form.Item label="对象类型">
              <Select
                value={objectFilters.objectType}
                options={OBJECT_TYPE_OPTIONS}
                onChange={value => updateObjectFilter('objectType', value)}
              />
            </Form.Item>
            <Form.Item label="业务关键词">
              <Input
                value={objectFilters.keyword}
                placeholder="姓名、谱名、来源名称、支派名称或审核摘要"
                allowClear
                maxLength={100}
                onChange={event => updateObjectFilter('keyword', event.target.value)}
                onPressEnter={searchObjects}
              />
            </Form.Item>
            <Form.Item label="所属支派">
              <Input value={workspace.branchId ? '当前工作区支派' : '本人可见支派范围'} disabled />
            </Form.Item>
            <Form.Item label="业务状态">
              <Select
                value={objectFilters.status}
                options={OBJECT_STATUS_OPTIONS}
                onChange={value => updateObjectFilter('status', value)}
              />
            </Form.Item>
            <Form.Item label="最近变更时间">
              <RangePicker
                value={rangeValue(objectFilters.changedFrom, objectFilters.changedTo)}
                showTime
                format="YYYY-MM-DD HH:mm"
                allowClear
                onChange={values => {
                  const [changedFrom, changedTo] = rangeStrings(values);
                  setObjectFilters(prev => ({ ...prev, changedFrom, changedTo }));
                }}
              />
            </Form.Item>
          </div>
        </Form>
        <div className="tracking-filter-actions">
          <Space wrap>
            <Button type="primary" loading={objectLoading} onClick={searchObjects}>查询对象</Button>
            <Button disabled={objectLoading} onClick={resetObjects}>重置</Button>
          </Space>
          <Text type="secondary">仅查询当前宗族、授权支派和隐私规则允许查看的对象。</Text>
        </div>
      </Card>

      {objectForbidden ? (
        <Result status="403" title="无权查看对象追踪" subTitle="当前账号缺少追踪查看权限，或当前宗族没有可见支派范围。" />
      ) : objectError ? (
        <Alert type="error" showIcon message="对象查询失败" description={objectError} action={<Button size="small" onClick={() => void loadObjects(objectFilters)}>重试</Button>} />
      ) : (
        <Card title="可追踪业务对象" extra={<Text type="secondary">点击整行直接查看追踪详情</Text>}>
          <Table<TrackingObjectResponse>
            size="small"
            rowKey={row => `${row.objectType}-${row.objectId}`}
            dataSource={objectRows}
            loading={objectLoading}
            scroll={{ x: 900 }}
            onRow={row => ({ onClick: () => void loadTrace(row.objectType, String(row.objectId), row) })}
            rowClassName="tracking-clickable-row"
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未找到符合条件的业务对象" /> }}
            pagination={{
              current: objectPage?.pageNo || objectFilters.pageNo,
              pageSize: objectPage?.pageSize || objectFilters.pageSize,
              total: objectPage?.total || 0,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50'],
              showTotal: total => `共 ${total} 个对象`,
              onChange: (pageNo, pageSize) => {
                const next = { ...objectFilters, pageNo, pageSize };
                setObjectFilters(next);
                void loadObjects(next);
              }
            }}
            columns={[
              { key: 'name', title: '业务对象', render: (_value, row) => <div><Text strong>{row.displayName}</Text>{row.secondaryLabel ? <div><Text type="secondary">{row.secondaryLabel}</Text></div> : null}</div> },
              { key: 'type', title: '类型', width: 120, render: (_value, row) => targetTypeText(row.objectType) },
              { key: 'branch', title: '所属支派', width: 150, render: (_value, row) => display(row.branchName, '未归属支派') },
              { key: 'summary', title: '业务摘要', render: (_value, row) => display(row.summary, '暂无摘要') },
              { key: 'status', title: '状态', width: 110, render: (_value, row) => <Tag color={statusColor(row.status)}>{statusText(row.status)}</Tag> },
              { key: 'changedAt', title: '最近变更', width: 180, render: (_value, row) => formatDateTime(row.changedAt) },
              { key: 'open', title: '操作', width: 100, render: (_value, row) => <Button type="link" onClick={event => { event.stopPropagation(); void loadTrace(row.objectType, String(row.objectId), row); }}>查看追踪</Button> }
            ]}
          />
        </Card>
      )}
    </Space>
  );

  const auditTab = (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card className="tracking-filter-card">
        <Form layout="vertical">
          <div className="tracking-filter-grid tracking-filter-grid--audit">
            <Form.Item label="时间范围">
              <RangePicker
                value={rangeValue(auditFilters.startTime, auditFilters.endTime)}
                showTime
                format="YYYY-MM-DD HH:mm"
                allowClear
                onChange={values => {
                  const [startTime, endTime] = rangeStrings(values);
                  setAuditFilters(prev => ({ ...prev, startTime, endTime }));
                }}
              />
            </Form.Item>
            <Form.Item label="操作者">
              <Select
                value={auditFilters.actorId || undefined}
                options={actorOptions}
                placeholder="全部操作者"
                allowClear
                showSearch
                optionFilterProp="label"
                notFoundContent="先查询日志后可按当前结果中的操作者筛选"
                onChange={value => updateAuditFilter('actorId', value || '')}
              />
            </Form.Item>
            <Form.Item label="动作分类">
              <Select
                value={auditFilters.actionType || undefined}
                options={ACTION_OPTIONS}
                placeholder="全部动作"
                allowClear
                showSearch
                optionFilterProp="label"
                onChange={value => updateAuditFilter('actionType', value || '')}
              />
            </Form.Item>
            <Form.Item label="对象类型">
              <Select value={auditFilters.targetType} options={AUDIT_TARGET_OPTIONS} onChange={value => updateAuditFilter('targetType', value)} />
            </Form.Item>
            <Form.Item label="执行结果">
              <Select value={auditFilters.resultStatus} options={AUDIT_RESULT_OPTIONS} onChange={value => updateAuditFilter('resultStatus', value)} />
            </Form.Item>
            <Form.Item label="业务关键词">
              <Input
                value={auditFilters.keyword}
                placeholder="业务名称、摘要或动作说明"
                allowClear
                maxLength={100}
                onChange={event => updateAuditFilter('keyword', event.target.value)}
                onPressEnter={searchAudit}
              />
            </Form.Item>
          </div>
        </Form>
        <div className="tracking-filter-actions">
          <Space wrap>
            <Button type="primary" loading={auditLoading} onClick={searchAudit}>查询审计记录</Button>
            <Button disabled={auditLoading} onClick={resetAudit}>重置</Button>
            {canExportAudit ? <Button loading={auditExporting} onClick={() => void exportAuditCsv()}>导出 CSV</Button> : null}
          </Space>
          <Text type="secondary">按操作时间倒序展示；导出入口仅在服务端返回真实导出权限信息时显示。</Text>
        </div>
      </Card>

      {auditForbidden ? (
        <Result status="403" title="无权查看操作审计" subTitle="当前账号缺少操作日志查看权限。" />
      ) : auditError ? (
        <Alert type="error" showIcon message="审计记录查询失败" description={auditError} action={<Button size="small" onClick={() => void loadAudit(auditFilters)}>重试</Button>} />
      ) : (
        <Card title="操作审计记录" extra={<Text type="secondary">点击整行查看详情，技术信息默认折叠</Text>}>
          <Table<OperationLogResponse>
            size="small"
            rowKey={row => String(row.id)}
            dataSource={auditRows}
            loading={auditLoading}
            scroll={{ x: 980 }}
            onRow={row => ({ onClick: () => openAuditLog(row) })}
            rowClassName="tracking-clickable-row"
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前条件下暂无操作审计记录" /> }}
            pagination={{
              current: auditPage?.pageNo || auditFilters.pageNo,
              pageSize: auditPage?.pageSize || auditFilters.pageSize,
              total: auditPage?.total || 0,
              showSizeChanger: true,
              pageSizeOptions: ['20', '50', '100'],
              showTotal: total => `共 ${total} 条记录`,
              onChange: (pageNo, pageSize) => {
                const next = { ...auditFilters, pageNo, pageSize };
                setAuditFilters(next);
                void loadAudit(next, '');
              }
            }}
            columns={[
              { key: 'time', title: '操作时间', width: 180, render: (_value, row) => formatDateTime(row.createdAt) },
              { key: 'actor', title: '操作者', width: 150, render: (_value, row) => display(row.actorDisplayName, '系统或未知操作者') },
              { key: 'action', title: '动作', width: 140, render: (_value, row) => actionText(row.actionType) },
              { key: 'target', title: '业务对象', render: (_value, row) => <div><Text strong>{display(row.targetDisplayName || row.targetSummary, '业务信息不可用')}</Text><div><Text type="secondary">{targetTypeText(row.targetType)}{row.targetBranchName ? ` · ${row.targetBranchName}` : ''}</Text></div></div> },
              { key: 'result', title: '结果', width: 110, render: (_value, row) => row.resultStatus ? <Tag color={statusColor(row.resultStatus)}>{statusText(row.resultStatus)}</Tag> : '未记录' },
              { key: 'summary', title: '摘要', render: (_value, row) => display(row.summary, '暂无摘要') },
              { key: 'detail', title: '操作', width: 90, render: (_value, row) => <Button type="link" onClick={event => { event.stopPropagation(); openAuditLog(row); }}>查看</Button> }
            ]}
          />
        </Card>
      )}
    </Space>
  );

  const riskTab = (
    <RiskAuditPanel
      active={activeTab === TRACKING_TABS.RISK}
      clanId={workspace.clanId}
      workspaceBranchId={workspace.branchId}
      filters={riskFilters}
      setFilters={setRiskFilters}
      selectedRiskLogId={selectedRiskLogId}
      setSelectedRiskLogId={setSelectedRiskLogId}
      onOpenTrace={(targetType, targetId, reviewTaskId = '') => void loadTrace(targetType, targetId, null, reviewTaskId)}
    />
  );

  return (
    <div className="audit-trace-page">
      <Card className="tracking-center-intro">
        <Title level={3}>变更与审计追踪</Title>
        <Paragraph type="secondary">
          对象追踪用于回看业务对象的变更、审核和来源链路；操作审计用于检索与取证；风险审计聚合权限变更、敏感访问、批量导出和异常操作。本页面只读。
        </Paragraph>
      </Card>

      {!workspace.clanId ? (
        <Alert type="warning" showIcon message="请先选择宗族" description="追踪和审计数据均按当前宗族及本人可见范围加载。" />
      ) : (
        <Card className="tracking-center-tabs-card">
          <Tabs
            activeKey={activeTab}
            onChange={changeTab}
            items={[
              { key: TRACKING_TABS.OBJECT, label: '对象追踪', children: objectTab },
              { key: TRACKING_TABS.AUDIT, label: '操作审计', children: auditTab },
              { key: TRACKING_TABS.RISK, label: '风险审计', children: riskTab }
            ]}
          />
        </Card>
      )}

      <TrackingTraceDrawer
        open={Boolean(selectedTrace.targetType && selectedTrace.targetId)}
        loading={traceLoading}
        error={traceError}
        detail={traceDetail}
        selectedObject={selectedObject}
        onClose={() => {
          traceRequestVersion.current += 1;
          setTraceLoading(false);
          setSelectedTrace({ targetType: '', targetId: '', reviewTaskId: '' });
          setSelectedObject(null);
          setTraceDetail(null);
          setTraceError('');
        }}
      />

      <OperationLogDrawer
        log={selectedAuditLog}
        onClose={() => {
          setSelectedAuditLog(null);
          setSelectedAuditLogId('');
        }}
      />
    </div>
  );
}
