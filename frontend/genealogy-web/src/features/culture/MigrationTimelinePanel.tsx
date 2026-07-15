import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Empty, Input, List, Modal, Pagination, Result, Select, Space, Tag, Timeline, Typography, message } from 'antd';
import type {
  MigrationEventCreateRequest,
  MigrationEventDetailResponse,
  MigrationEventSummaryResponse,
  MigrationEventUpdateRequest
} from '../../shared/api/generated/culture-types';
import type { TrackingTraceDetailResponse } from '../../shared/api/generated/tracking-types';
import { ApiRequestError } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { optionLabel, privacyOptions, statusColor, statusOptions } from './cultureOptions';
import { MigrationDetailDrawer, MigrationEventFormModal } from './MigrationEventDialogs';
import {
  archiveMigrationEvent,
  createMigrationEvent,
  deleteMigrationEvent,
  getMigrationEvent,
  getMigrationTrace,
  listMigrationBranches,
  listMigrationEvents,
  listMigrationPersons,
  submitMigrationEventReview,
  updateMigrationEvent,
  type MigrationBranchOption,
  type MigrationPersonOption,
  type MigrationSearchState
} from './migrationTimelineService';

const { Text } = Typography;

const defaultSearch: MigrationSearchState = {
  keyword: '',
  fromLocation: '',
  toLocation: '',
  migrationTimeText: '',
  sort: 'sequenceNo,asc',
  pageNo: 1,
  pageSize: 10
};

const SORT_OPTIONS = [
  { value: 'sequenceNo,asc', label: '迁徙顺序升序' },
  { value: 'sequenceNo,desc', label: '迁徙顺序降序' },
  { value: 'updatedAt,desc', label: '最近更新优先' },
  { value: 'migrationTimeText,asc', label: '时期文本升序' }
];

function errorText(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function forbidden(error: unknown) {
  return error instanceof ApiRequestError && error.status === 403;
}

function positive(value: string | null) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function bool(value: string | null) {
  return value === 'true' ? true : value === 'false' ? false : undefined;
}

function readLocation() {
  const params = new URLSearchParams(window.location.search);
  return {
    search: {
      keyword: params.get('migrationKeyword') || '',
      branchId: positive(params.get('migrationBranch')),
      fromLocation: params.get('migrationFrom') || '',
      toLocation: params.get('migrationTo') || '',
      migrationTimeText: params.get('migrationTime') || '',
      founderPersonId: positive(params.get('migrationFounder')),
      dataStatus: params.get('migrationStatus') || undefined,
      privacyLevel: params.get('migrationPrivacy') || undefined,
      hasSource: bool(params.get('migrationHasSource')),
      sort: params.get('migrationSort') || 'sequenceNo,asc',
      pageNo: Math.max(1, Number(params.get('migrationPage')) || 1),
      pageSize: Math.min(100, Math.max(1, Number(params.get('migrationPageSize')) || 10))
    } satisfies MigrationSearchState,
    selected: positive(params.get('migrationEvent'))
  };
}

function writeLocation(
  search: MigrationSearchState,
  selected?: number,
  mode: 'push' | 'replace' = 'push'
) {
  const url = new URL(window.location.href);
  const keys = [
    'migrationKeyword', 'migrationBranch', 'migrationFrom', 'migrationTo', 'migrationTime',
    'migrationFounder', 'migrationStatus', 'migrationPrivacy', 'migrationHasSource',
    'migrationSort', 'migrationPage', 'migrationPageSize', 'migrationEvent'
  ];
  keys.forEach(key => url.searchParams.delete(key));
  if (search.keyword.trim()) url.searchParams.set('migrationKeyword', search.keyword.trim());
  if (search.branchId) url.searchParams.set('migrationBranch', String(search.branchId));
  if (search.fromLocation.trim()) url.searchParams.set('migrationFrom', search.fromLocation.trim());
  if (search.toLocation.trim()) url.searchParams.set('migrationTo', search.toLocation.trim());
  if (search.migrationTimeText.trim()) url.searchParams.set('migrationTime', search.migrationTimeText.trim());
  if (search.founderPersonId) url.searchParams.set('migrationFounder', String(search.founderPersonId));
  if (search.dataStatus) url.searchParams.set('migrationStatus', search.dataStatus);
  if (search.privacyLevel) url.searchParams.set('migrationPrivacy', search.privacyLevel);
  if (search.hasSource !== undefined) url.searchParams.set('migrationHasSource', String(search.hasSource));
  if (search.sort !== 'sequenceNo,asc') url.searchParams.set('migrationSort', search.sort);
  if (search.pageNo !== 1) url.searchParams.set('migrationPage', String(search.pageNo));
  if (search.pageSize !== 10) url.searchParams.set('migrationPageSize', String(search.pageSize));
  if (selected) url.searchParams.set('migrationEvent', String(selected));
  window.history[mode === 'push' ? 'pushState' : 'replaceState'](
    window.history.state,
    '',
    `${url.pathname}${url.search}${url.hash}`
  );
}

function branchLabel(item: MigrationBranchOption) {
  return item.branchName || item.branchPath || '未命名支派';
}

function routeLabel(item: Pick<MigrationEventSummaryResponse, 'fromLocation' | 'toLocation'>) {
  return `${item.fromLocation || '未知迁出地'} → ${item.toLocation || '未知迁入地'}`;
}

function completeness(item: MigrationEventSummaryResponse) {
  const missing = [
    !item.migrationTimeText && '时期',
    !item.founderPersonName && '始迁祖',
    !item.reason && '原因',
    !item.sourceCount && '来源'
  ].filter(Boolean);
  return missing.length ? `待补充：${missing.join('、')}` : '信息完整';
}

export function MigrationTimelinePanel() {
  const { clanId } = useWorkspace();
  const initial = useRef(readLocation()).current;
  const [messageApi, messageContext] = message.useMessage();
  const [modalApi, modalContext] = Modal.useModal();
  const [search, setSearch] = useState<MigrationSearchState>(initial.search || defaultSearch);
  const [selectedId, setSelectedId] = useState<number | undefined>(initial.selected);
  const [items, setItems] = useState<MigrationEventSummaryResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [branches, setBranches] = useState<MigrationBranchOption[]>([]);
  const [persons, setPersons] = useState<MigrationPersonOption[]>([]);
  const [detail, setDetail] = useState<MigrationEventDetailResponse | null>(null);
  const [trace, setTrace] = useState<TrackingTraceDetailResponse | null>(null);
  const [traceError, setTraceError] = useState('');
  const [editing, setEditing] = useState<MigrationEventDetailResponse | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [listForbidden, setListForbidden] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const listRequest = useRef(0);
  const detailRequest = useRef(0);

  useEffect(() => {
    const onPopState = () => {
      const next = readLocation();
      setSearch(next.search);
      setSelectedId(next.selected);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!clanId) {
      setBranches([]);
      setPersons([]);
      return;
    }
    let active = true;
    Promise.all([listMigrationBranches(clanId), listMigrationPersons(clanId)])
      .then(([nextBranches, nextPersons]) => {
        if (!active) return;
        setBranches(nextBranches);
        setPersons(nextPersons);
      })
      .catch(loadError => {
        if (active) messageApi.warning(errorText(loadError, '迁徙关联数据加载失败'));
      });
    return () => { active = false; };
  }, [clanId]);

  useEffect(() => {
    if (!clanId) {
      setItems([]);
      setTotal(0);
      return;
    }
    const token = ++listRequest.current;
    setListLoading(true);
    setError('');
    setListForbidden(false);
    listMigrationEvents(clanId, search)
      .then(data => {
        if (token !== listRequest.current) return;
        setItems(data.items);
        setTotal(data.page.totalElements);
      })
      .catch(loadError => {
        if (token !== listRequest.current) return;
        setItems([]);
        setTotal(0);
        setListForbidden(forbidden(loadError));
        setError(errorText(loadError, '迁徙事件加载失败'));
      })
      .finally(() => {
        if (token === listRequest.current) setListLoading(false);
      });
  }, [clanId, search, refreshVersion]);

  useEffect(() => {
    if (!clanId || !selectedId) {
      setDetail(null);
      setTrace(null);
      setTraceError('');
      return;
    }
    const token = ++detailRequest.current;
    setDetailLoading(true);
    setDetail(null);
    setTrace(null);
    setTraceError('');
    Promise.allSettled([getMigrationEvent(selectedId), getMigrationTrace(clanId, selectedId)])
      .then(([detailResult, traceResult]) => {
        if (token !== detailRequest.current) return;
        if (detailResult.status === 'fulfilled') setDetail(detailResult.value);
        else messageApi.error(errorText(detailResult.reason, '迁徙详情加载失败'));
        if (traceResult.status === 'fulfilled') setTrace(traceResult.value);
        else setTraceError(errorText(traceResult.reason, '暂无权限查看完整追踪或追踪服务暂不可用'));
      })
      .finally(() => {
        if (token === detailRequest.current) setDetailLoading(false);
      });
  }, [clanId, selectedId, refreshVersion]);

  function refresh() {
    setRefreshVersion(value => value + 1);
  }

  function applySearch(next: MigrationSearchState) {
    setSearch(next);
    setSelectedId(undefined);
    writeLocation(next);
  }

  function resetSearch() {
    setSearch(defaultSearch);
    setSelectedId(undefined);
    writeLocation(defaultSearch);
  }

  function openDetail(id: number) {
    setSelectedId(id);
    writeLocation(search, id);
  }

  function closeDetail() {
    setSelectedId(undefined);
    setDetail(null);
    setTrace(null);
    writeLocation(search, undefined, 'replace');
  }

  async function openForm(item?: MigrationEventSummaryResponse | MigrationEventDetailResponse) {
    try {
      setActionLoading(true);
      const value = item ? detail?.id === item.id ? detail : await getMigrationEvent(item.id) : null;
      setEditing(value);
      setFormOpen(true);
    } catch (loadError) {
      messageApi.error(errorText(loadError, '无法打开迁徙编辑表单'));
    } finally {
      setActionLoading(false);
    }
  }

  async function save(values: MigrationEventCreateRequest) {
    if (!clanId || saving) return;
    setSaving(true);
    try {
      const result = editing
        ? await updateMigrationEvent(editing.id, { ...values, version: editing.version } as MigrationEventUpdateRequest)
        : await createMigrationEvent(clanId, values);
      messageApi.success(editing?.dataStatus === 'official' ? '正式迁徙变更申请已提交审核' : '迁徙事件已保存为草稿');
      setFormOpen(false);
      setEditing(null);
      setSelectedId(result.id);
      writeLocation(search, result.id, 'replace');
      refresh();
    } catch (saveError) {
      messageApi.error(errorText(saveError, '迁徙事件保存失败'));
    } finally {
      setSaving(false);
    }
  }

  function submitReview(item: MigrationEventSummaryResponse | MigrationEventDetailResponse) {
    let comment = '';
    modalApi.confirm({
      title: `提交审核：${routeLabel(item)}`,
      content: (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert type="info" showIcon message="审核通过后才进入正式迁徙时间轴" description="提交前请确认已绑定可核验的正式来源。" />
          <Input.TextArea placeholder="补充审核说明（选填）" onChange={event => { comment = event.target.value; }} />
        </Space>
      ),
      okText: '提交审核',
      cancelText: '取消',
      async onOk() {
        if (actionLoading) return;
        setActionLoading(true);
        try {
          const result = await submitMigrationEventReview(item.id, { comment: comment.trim() || undefined });
          messageApi.success(result.message || '迁徙事件已提交审核');
          refresh();
        } catch (submitError) {
          messageApi.error(errorText(submitError, '提交审核失败'));
          throw submitError;
        } finally {
          setActionLoading(false);
        }
      }
    });
  }

  function archive(item: MigrationEventSummaryResponse | MigrationEventDetailResponse) {
    let reason = '';
    const reviewRequired = item.allowedActions.includes('request_archive');
    modalApi.confirm({
      title: `${reviewRequired ? '申请归档' : '归档'}：${routeLabel(item)}`,
      content: (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert
            type="warning"
            showIcon
            message={reviewRequired ? '正式事件不会立即归档' : '归档后将退出当前迁徙时间轴'}
            description={reviewRequired ? '系统将创建归档审核申请，审核通过后生效。' : '归档原因会进入操作记录。'}
          />
          <Input.TextArea aria-label="归档原因" placeholder="请填写归档原因" onChange={event => { reason = event.target.value; }} />
        </Space>
      ),
      okText: reviewRequired ? '提交归档申请' : '确认归档',
      cancelText: '取消',
      async onOk() {
        if (!reason.trim()) {
          messageApi.warning('请填写归档原因');
          return Promise.reject(new Error('请填写归档原因'));
        }
        setActionLoading(true);
        try {
          const result = await archiveMigrationEvent(item.id, { reason: reason.trim() });
          messageApi.success(result.message || '归档操作已提交');
          refresh();
        } catch (archiveError) {
          messageApi.error(errorText(archiveError, '归档失败'));
          throw archiveError;
        } finally {
          setActionLoading(false);
        }
      }
    });
  }

  function remove(item: MigrationEventSummaryResponse | MigrationEventDetailResponse) {
    const reviewRequired = item.allowedActions.includes('request_delete');
    modalApi.confirm({
      title: `${reviewRequired ? '申请删除' : '删除'}：${routeLabel(item)}`,
      content: reviewRequired ? '正式事件不会立即删除，将创建删除审核申请。' : '草稿或驳回事件删除后无法继续维护。',
      okText: reviewRequired ? '提交删除申请' : '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      async onOk() {
        setActionLoading(true);
        try {
          const result = await deleteMigrationEvent(item.id);
          messageApi.success(result.message || '删除操作已完成');
          if (!reviewRequired && selectedId === item.id) closeDetail();
          refresh();
        } catch (deleteError) {
          messageApi.error(errorText(deleteError, '删除失败'));
          throw deleteError;
        } finally {
          setActionLoading(false);
        }
      }
    });
  }

  const officialTimeline = items
    .filter(item => item.dataStatus === 'official')
    .map(item => ({
      children: (
        <Button type="text" className="migration-timeline-item" onClick={() => openDetail(item.id)}>
          <Space direction="vertical" align="start" size={1}>
            <Text strong>{item.scope.branchName || '宗族支派'} · 第 {item.sequenceNo} 段</Text>
            <Text>{routeLabel(item)}</Text>
            <Text type="secondary">{item.migrationTimeText || '时期待考'} · {item.founderPersonName || '始迁祖待补'} · 来源 {item.sourceCount} 条</Text>
          </Space>
        </Button>
      )
    }));

  return (
    <Card
      title="迁徙脉络"
      extra={clanId ? <Button type="primary" loading={actionLoading} onClick={() => void openForm()}>新增迁徙事件</Button> : null}
      className="migration-timeline-panel"
    >
      {messageContext}
      {modalContext}
      {!clanId ? <Empty description="请选择宗族后查看迁徙脉络" /> : (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message="仅展示真实迁徙事件"
            description="旧支派迁徙字段只读兼容；缺失时期、始迁祖、原因或来源时只显示完整度提示，不拼接或推断路线。"
          />
          <Space wrap className="migration-filter-bar">
            <Input
              aria-label="迁徙关键词"
              value={search.keyword}
              allowClear
              placeholder="地点、时期、原因或说明"
              onChange={event => setSearch({ ...search, keyword: event.target.value })}
              onPressEnter={() => applySearch({ ...search, pageNo: 1 })}
              style={{ width: 240 }}
            />
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="全部支派"
              value={search.branchId}
              onChange={branchId => applySearch({ ...search, branchId, founderPersonId: undefined, pageNo: 1 })}
              options={branches.map(item => ({ value: item.id, label: branchLabel(item) }))}
              style={{ width: 180 }}
            />
            <Input aria-label="迁出地" value={search.fromLocation} allowClear placeholder="迁出地" onChange={event => setSearch({ ...search, fromLocation: event.target.value })} style={{ width: 150 }} />
            <Input aria-label="迁入地" value={search.toLocation} allowClear placeholder="迁入地" onChange={event => setSearch({ ...search, toLocation: event.target.value })} style={{ width: 150 }} />
            <Input aria-label="迁徙时期" value={search.migrationTimeText} allowClear placeholder="时期文本" onChange={event => setSearch({ ...search, migrationTimeText: event.target.value })} style={{ width: 150 }} />
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="全部始迁祖"
              value={search.founderPersonId}
              onChange={founderPersonId => applySearch({ ...search, founderPersonId, pageNo: 1 })}
              options={persons.map(item => ({ value: item.id, label: item.name }))}
              style={{ width: 170 }}
            />
            <Select allowClear placeholder="全部状态" value={search.dataStatus} onChange={dataStatus => applySearch({ ...search, dataStatus, pageNo: 1 })} options={statusOptions} style={{ width: 140 }} />
            <Select allowClear placeholder="全部可见范围" value={search.privacyLevel} onChange={privacyLevel => applySearch({ ...search, privacyLevel, pageNo: 1 })} options={privacyOptions} style={{ width: 160 }} />
            <Select
              allowClear
              placeholder="来源覆盖"
              value={search.hasSource}
              onChange={hasSource => applySearch({ ...search, hasSource, pageNo: 1 })}
              options={[{ value: true, label: '已有来源' }, { value: false, label: '缺少来源' }]}
              style={{ width: 130 }}
            />
            <Select value={search.sort} onChange={sort => applySearch({ ...search, sort, pageNo: 1 })} options={SORT_OPTIONS} style={{ width: 170 }} />
            <Button type="primary" onClick={() => applySearch({ ...search, pageNo: 1 })}>查询</Button>
            <Button onClick={resetSearch}>重置</Button>
          </Space>

          {error ? (
            listForbidden
              ? <Result status="403" title="暂无权限查看迁徙脉络" subTitle="请联系宗族管理员确认角色和支派范围。" />
              : <Alert type="error" showIcon message="迁徙事件加载失败" description={error} />
          ) : null}

          {!listForbidden ? (
            <>
              <Card size="small" title="正式迁徙时间轴">
                {officialTimeline.length ? <Timeline items={officialTimeline} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前筛选范围暂无审核通过的迁徙事件" />}
              </Card>
              <List
                loading={listLoading}
                dataSource={items}
                locale={{ emptyText: '暂无符合条件的迁徙事件' }}
                renderItem={item => (
                  <List.Item
                    actions={[
                      <Button key="detail" type="link" onClick={() => openDetail(item.id)}>详情</Button>,
                      item.allowedActions.some(action => ['update', 'request_update'].includes(action)) ? <Button key="edit" type="link" onClick={() => void openForm(item)}>编辑</Button> : null,
                      item.allowedActions.includes('submit_review') ? <Button key="review" type="link" disabled={actionLoading} onClick={() => submitReview(item)}>提交审核</Button> : null,
                      item.allowedActions.some(action => ['archive', 'request_archive'].includes(action)) ? <Button key="archive" type="link" disabled={actionLoading} onClick={() => archive(item)}>归档</Button> : null,
                      item.allowedActions.some(action => ['delete', 'request_delete'].includes(action)) ? <Button key="delete" danger type="link" disabled={actionLoading} onClick={() => remove(item)}>删除</Button> : null
                    ].filter(Boolean)}
                  >
                    <List.Item.Meta
                      title={(
                        <Space wrap>
                          <Text strong>{item.scope.branchName || '宗族支派'} · 第 {item.sequenceNo} 段</Text>
                          <Tag color={statusColor(item.dataStatus)}>{optionLabel(statusOptions, item.dataStatus)}</Tag>
                        </Space>
                      )}
                      description={(
                        <Space direction="vertical" size={1}>
                          <Text>{routeLabel(item)}</Text>
                          <Text type="secondary">{item.migrationTimeText || '时期待考'} · {item.founderPersonName || '始迁祖待补'} · {completeness(item)}</Text>
                        </Space>
                      )}
                    />
                  </List.Item>
                )}
              />
              <Pagination
                current={search.pageNo}
                pageSize={search.pageSize}
                total={total}
                showSizeChanger
                showTotal={value => `共 ${value} 条迁徙事件`}
                onChange={(pageNo, pageSize) => applySearch({ ...search, pageNo, pageSize })}
              />
            </>
          ) : null}
        </Space>
      )}

      <MigrationDetailDrawer
        open={Boolean(selectedId)}
        clanId={clanId}
        detail={detail}
        trace={trace}
        loading={detailLoading}
        traceError={traceError}
        actionLoading={actionLoading}
        onClose={closeDetail}
        onEdit={() => { if (detail) void openForm(detail); }}
        onSubmitReview={() => { if (detail) submitReview(detail); }}
        onArchive={() => { if (detail) archive(detail); }}
        onDelete={() => { if (detail) remove(detail); }}
      />
      <MigrationEventFormModal
        open={formOpen}
        item={editing}
        branches={branches}
        persons={persons}
        saving={saving}
        defaultSequence={Math.max(1, ...items.map(item => item.sequenceNo + 1))}
        onCancel={() => {
          if (!saving) {
            setFormOpen(false);
            setEditing(null);
          }
        }}
        onSubmit={save}
      />
    </Card>
  );
}
