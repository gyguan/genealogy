import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Grid,
  Input,
  List,
  Modal,
  Row,
  Col,
  Select,
  Space,
  Table,
  Tag,
  Typography
} from 'antd';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { toRecordList } from '../../shared/ui/DataTable';
import {
  memberPermissionApi,
  type GrantableRole,
  type MemberAggregate,
  type MemberCandidate,
  type MemberGrant,
  type MemberPermissionAudit
} from './memberPermissionApi';
import {
  auditActionText,
  createMemberQuery,
  formatAuditValue,
  memberPermissionErrorMessage,
  resetMemberQuery,
  roleCapabilityText,
  scopePreview,
  type MemberQuery
} from './memberPageModel.js';

const { TextArea } = Input;
const { useBreakpoint } = Grid;
const DEFAULT_PAGE_SIZE = 10;

type ClanRow = { id: number; clanName: string; hallName?: string };
type BranchRow = { id: number; branchName: string; parentId?: number };
type GrantFormValues = { userId?: number; roleCode: string; scopeType: string; scopeId: number; reason: string };
type StatusFormValues = { status: string; reason: string };
type RevokeFormValues = { reason: string };

function statusText(status?: string) {
  const map: Record<string, string> = {
    active: '有效',
    disabled: '已停用',
    inactive: '已停用',
    invited: '待加入',
    removed: '已移除'
  };
  return map[String(status || '').toLowerCase()] || status || '-';
}

function statusColor(status?: string) {
  if (status === 'active') return 'success';
  if (status === 'invited') return 'processing';
  return 'default';
}

function dateTime(value?: string) {
  return value ? value.replace('T', ' ').slice(0, 16) : '-';
}

function readUrlState(): MemberQuery & { memberId?: number } {
  const params = new URLSearchParams(window.location.search);
  return {
    keyword: params.get('keyword') || '',
    roleCode: params.get('role') || '',
    scopeType: params.get('scope') || '',
    status: params.get('status') || '',
    pageNo: Math.max(1, Number(params.get('page')) || 1),
    pageSize: Math.max(1, Number(params.get('pageSize')) || DEFAULT_PAGE_SIZE),
    memberId: Number(params.get('member')) || undefined
  };
}

function writeUrlState(query: MemberQuery, memberId?: number, replace = false) {
  const params = new URLSearchParams(window.location.search);
  const values: Record<string, string | number | undefined> = {
    keyword: query.keyword || undefined,
    role: query.roleCode || undefined,
    scope: query.scopeType || undefined,
    status: query.status || undefined,
    page: query.pageNo > 1 ? query.pageNo : undefined,
    pageSize: query.pageSize !== DEFAULT_PAGE_SIZE ? query.pageSize : undefined,
    member: memberId
  };
  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === '') params.delete(key);
    else params.set(key, String(value));
  });
  const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`;
  window.history[replace ? 'replaceState' : 'pushState']({}, '', next);
}

export function MemberPage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const workspace = useWorkspace();
  const [grantForm] = Form.useForm<GrantFormValues>();
  const [statusForm] = Form.useForm<StatusFormValues>();
  const [revokeForm] = Form.useForm<RevokeFormValues>();

  const initialUrlState = useMemo(() => readUrlState(), []);
  const [clans, setClans] = useState<ClanRow[]>([]);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [roles, setRoles] = useState<GrantableRole[]>([]);
  const [candidates, setCandidates] = useState<MemberCandidate[]>([]);
  const [members, setMembers] = useState<MemberAggregate[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState<MemberQuery>(() => createMemberQuery(initialUrlState, initialUrlState.pageNo, initialUrlState.pageSize));

  const [keyword, setKeyword] = useState(initialUrlState.keyword);
  const [roleFilter, setRoleFilter] = useState(initialUrlState.roleCode);
  const [scopeFilter, setScopeFilter] = useState(initialUrlState.scopeType);
  const [statusFilter, setStatusFilter] = useState(initialUrlState.status);

  const [initializing, setInitializing] = useState(false);
  const [queryLoading, setQueryLoading] = useState(false);
  const [grantSubmitting, setGrantSubmitting] = useState(false);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [revokeSubmitting, setRevokeSubmitting] = useState(false);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [queryError, setQueryError] = useState('');
  const [grantError, setGrantError] = useState('');
  const [statusError, setStatusError] = useState('');
  const [revokeError, setRevokeError] = useState('');

  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [editingGrant, setEditingGrant] = useState<MemberGrant | null>(null);
  const [memberDrawerOpen, setMemberDrawerOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberAggregate | null>(null);
  const [pendingMemberId, setPendingMemberId] = useState<number | undefined>(initialUrlState.memberId);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<MemberAggregate | null>(null);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<MemberGrant | null>(null);

  const [audits, setAudits] = useState<MemberPermissionAudit[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');
  const [auditPageNo, setAuditPageNo] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(10);
  const [auditTotal, setAuditTotal] = useState(0);

  const selectedClanId = String(workspace.clanId || clans[0]?.id || '');
  const selectedClanName = clans.find(clan => String(clan.id) === selectedClanId)?.clanName || '当前宗族';
  const selectedRoleCode = Form.useWatch('roleCode', grantForm);
  const selectedRole = roles.find(role => role.roleCode === selectedRoleCode);
  const selectedScopeType = Form.useWatch('scopeType', grantForm);
  const selectedScopeId = Form.useWatch('scopeId', grantForm);

  const roleOptions = useMemo(
    () => roles.map(role => ({
      value: role.roleCode,
      label: `${role.roleName}${role.riskLevel === 'high' ? '（高风险）' : ''}`
    })),
    [roles]
  );

  async function loadMembers(clanId: string, nextQuery: MemberQuery, selectedMembershipId?: number, syncUrl = true) {
    if (!clanId) {
      setMembers([]);
      setTotal(0);
      return;
    }
    setQueryLoading(true);
    setQueryError('');
    try {
      const result = await memberPermissionApi.listMembers(clanId, {
        keyword: nextQuery.keyword || undefined,
        roleCode: nextQuery.roleCode || undefined,
        scopeType: nextQuery.scopeType || undefined,
        status: nextQuery.status || undefined,
        pageNo: nextQuery.pageNo,
        pageSize: nextQuery.pageSize
      });
      const resolvedQuery = createMemberQuery(nextQuery, result.pageNo || nextQuery.pageNo, result.pageSize || nextQuery.pageSize);
      setQuery(resolvedQuery);
      setMembers(result.records || []);
      setTotal(result.total || 0);
      if (syncUrl) writeUrlState(resolvedQuery, selectedMembershipId ?? selectedMember?.membershipId, true);

      const membershipId = selectedMembershipId ?? selectedMember?.membershipId ?? pendingMemberId;
      if (membershipId) {
        const refreshed = (result.records || []).find(item => item.membershipId === membershipId);
        if (refreshed) {
          setSelectedMember(refreshed);
          setMemberDrawerOpen(true);
          setPendingMemberId(undefined);
        }
      }
    } catch (error) {
      setQueryError(memberPermissionErrorMessage(error, '成员列表加载失败'));
    } finally {
      setQueryLoading(false);
    }
  }

  async function loadClanContext(clanId: string, nextQuery: MemberQuery) {
    if (!clanId) return;
    const [branchResult, roleResult] = await Promise.all([
      apiClient.get(`/clans/${clanId}/branches`).catch(() => []),
      memberPermissionApi.grantableRoles(clanId).catch(() => [])
    ]);
    setBranches(toRecordList(branchResult) as BranchRow[]);
    setRoles(roleResult || []);
    await loadMembers(clanId, nextQuery, pendingMemberId, false);
  }

  async function loadMemberAudits(clanId: string, membershipId: number, nextPage = 1, nextPageSize = auditPageSize) {
    setAuditLoading(true);
    setAuditError('');
    try {
      const result = await memberPermissionApi.listAudits(clanId, { membershipId, pageNo: nextPage, pageSize: nextPageSize });
      setAudits(result.records || []);
      setAuditTotal(result.total || 0);
      setAuditPageNo(result.pageNo || nextPage);
      setAuditPageSize(result.pageSize || nextPageSize);
    } catch (error) {
      setAudits([]);
      setAuditTotal(0);
      setAuditError(memberPermissionErrorMessage(error, '权限变更记录加载失败'));
    } finally {
      setAuditLoading(false);
    }
  }

  async function initialize() {
    setInitializing(true);
    try {
      const clanResult = await apiClient.get('/clans').catch(() => []);
      const nextClans = toRecordList(clanResult) as ClanRow[];
      setClans(nextClans);
      const nextClanId = workspace.clanId && nextClans.some(clan => String(clan.id) === workspace.clanId)
        ? workspace.clanId
        : String(nextClans[0]?.id || '');
      if (nextClanId && nextClanId !== workspace.clanId) workspace.setClanId(nextClanId);
      if (nextClanId) await loadClanContext(nextClanId, query);
    } catch (error) {
      setQueryError(memberPermissionErrorMessage(error, '成员权限页面初始化失败'));
    } finally {
      setInitializing(false);
    }
  }

  useEffect(() => { void initialize(); }, []);

  useEffect(() => {
    const onPopState = () => {
      const state = readUrlState();
      const nextQuery = createMemberQuery(state, state.pageNo, state.pageSize);
      setKeyword(nextQuery.keyword);
      setRoleFilter(nextQuery.roleCode);
      setScopeFilter(nextQuery.scopeType);
      setStatusFilter(nextQuery.status);
      setPendingMemberId(state.memberId);
      void loadMembers(selectedClanId, nextQuery, state.memberId, false);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [selectedClanId]);

  function changeClan(clanId: string) {
    workspace.patch({ clanId, branchId: '', personId: '', relationshipId: '', sourceId: '', attachmentId: '', reviewTaskId: '' });
    setSelectedMember(null);
    setMemberDrawerOpen(false);
    setPendingMemberId(undefined);
    setKeyword('');
    setRoleFilter('');
    setScopeFilter('');
    setStatusFilter('');
    const nextQuery = resetMemberQuery(query.pageSize);
    writeUrlState(nextQuery, undefined, true);
    void loadClanContext(clanId, nextQuery);
  }

  async function searchCandidates(searchText: string) {
    const value = searchText.trim();
    if (!selectedClanId || value.length < 2) {
      setCandidates([]);
      return;
    }
    setCandidateLoading(true);
    try {
      const result = await memberPermissionApi.searchCandidates(selectedClanId, value);
      setCandidates(result.records || []);
    } catch (error) {
      setGrantError(memberPermissionErrorMessage(error, '候选成员搜索失败'));
    } finally {
      setCandidateLoading(false);
    }
  }

  function openCreateGrant() {
    setEditingGrant(null);
    setCandidates([]);
    setGrantError('');
    const defaultRole = roles[0];
    const defaultScopeType = defaultRole?.allowedScopeTypes?.[0] || 'clan';
    grantForm.resetFields();
    grantForm.setFieldsValue({
      roleCode: defaultRole?.roleCode,
      scopeType: defaultScopeType,
      scopeId: defaultScopeType === 'clan' ? Number(selectedClanId) : undefined,
      reason: ''
    });
    setGrantModalOpen(true);
  }

  function openEditGrant(grant: MemberGrant) {
    setEditingGrant(grant);
    setGrantError('');
    grantForm.resetFields();
    grantForm.setFieldsValue({
      roleCode: grant.roleCode,
      scopeType: grant.scopeType === 'branch' ? 'branch_subtree' : grant.scopeType,
      scopeId: grant.scopeId,
      reason: ''
    });
    setGrantModalOpen(true);
  }

  function onRoleChange(roleCode: string) {
    const role = roles.find(item => item.roleCode === roleCode);
    const allowedScopes = role?.allowedScopeTypes || ['clan'];
    const currentScope = grantForm.getFieldValue('scopeType');
    const nextScope = allowedScopes.includes(currentScope) ? currentScope : allowedScopes[0];
    grantForm.setFieldsValue({
      roleCode,
      scopeType: nextScope,
      scopeId: nextScope === 'clan' ? Number(selectedClanId) : undefined
    });
  }

  async function confirmHighRiskGrant(values: GrantFormValues) {
    if (selectedRole?.riskLevel !== 'high') return true;
    return new Promise<boolean>(resolve => {
      Modal.confirm({
        title: `确认授予高风险角色“${selectedRole.roleName}”`,
        content: (
          <Space direction="vertical" size={8}>
            <Typography.Text>角色能力：{roleCapabilityText(selectedRole)}</Typography.Text>
            <Typography.Text>{scopePreview(values.scopeType, values.scopeId, selectedClanName, branches)}</Typography.Text>
            <Typography.Text>变更原因：{values.reason.trim()}</Typography.Text>
          </Space>
        ),
        okText: '确认授权',
        cancelText: '返回检查',
        okButtonProps: { danger: true },
        onOk: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });
  }

  async function submitGrant() {
    const values = await grantForm.validateFields();
    if (!(await confirmHighRiskGrant(values))) return;
    setGrantSubmitting(true);
    setGrantError('');
    try {
      if (editingGrant) {
        await memberPermissionApi.updateGrant(selectedClanId, editingGrant.grantId, {
          roleCode: values.roleCode,
          scopeType: values.scopeType,
          scopeId: Number(values.scopeId),
          reason: values.reason.trim()
        });
        notify({ message: '成员授权已更新' });
      } else {
        await memberPermissionApi.createGrant(selectedClanId, {
          userId: Number(values.userId),
          roleCode: values.roleCode,
          scopeType: values.scopeType,
          scopeId: Number(values.scopeId),
          reason: values.reason.trim()
        });
        notify({ message: '成员授权已创建' });
      }
      setGrantModalOpen(false);
      const refreshQuery = createMemberQuery(query, editingGrant ? query.pageNo : 1, query.pageSize);
      await loadMembers(selectedClanId, refreshQuery, selectedMember?.membershipId);
    } catch (error) {
      setGrantError(memberPermissionErrorMessage(error));
    } finally {
      setGrantSubmitting(false);
    }
  }

  function openMember(member: MemberAggregate) {
    setSelectedMember(member);
    setMemberDrawerOpen(true);
    setAudits([]);
    setAuditTotal(0);
    writeUrlState(query, member.membershipId);
    if (member.allowedActions?.canViewHistory) void loadMemberAudits(selectedClanId, member.membershipId, 1, auditPageSize);
  }

  function closeMember() {
    setMemberDrawerOpen(false);
    setSelectedMember(null);
    writeUrlState(query, undefined);
  }

  function openStatus(member: MemberAggregate) {
    setStatusTarget(member);
    setStatusError('');
    statusForm.resetFields();
    statusForm.setFieldsValue({ status: member.membershipStatus === 'active' ? 'disabled' : 'active', reason: '' });
    setStatusModalOpen(true);
  }

  async function submitStatus() {
    if (!statusTarget) return;
    const values = await statusForm.validateFields();
    setStatusSubmitting(true);
    setStatusError('');
    try {
      await memberPermissionApi.updateMemberStatus(selectedClanId, statusTarget.membershipId, values.status, values.reason.trim());
      notify({ message: values.status === 'active' ? '成员已恢复' : '成员已停用' });
      setStatusModalOpen(false);
      await loadMembers(selectedClanId, query, statusTarget.membershipId);
    } catch (error) {
      setStatusError(memberPermissionErrorMessage(error));
    } finally {
      setStatusSubmitting(false);
    }
  }

  function openRevoke(grant: MemberGrant) {
    setRevokeTarget(grant);
    setRevokeError('');
    revokeForm.resetFields();
    setRevokeModalOpen(true);
  }

  async function submitRevoke() {
    if (!revokeTarget) return;
    const values = await revokeForm.validateFields();
    setRevokeSubmitting(true);
    setRevokeError('');
    try {
      await memberPermissionApi.revokeGrant(selectedClanId, revokeTarget.grantId, values.reason.trim());
      notify({ message: '成员授权已撤销' });
      setRevokeModalOpen(false);
      await loadMembers(selectedClanId, query, selectedMember?.membershipId);
    } catch (error) {
      setRevokeError(memberPermissionErrorMessage(error));
    } finally {
      setRevokeSubmitting(false);
    }
  }

  const scopeOptions = (selectedRole?.allowedScopeTypes || ['clan']).map(scope => ({
    value: scope,
    label: scope === 'clan' ? '全宗族' : '指定支派及下级支派'
  }));

  const memberColumns = [
    {
      key: 'member',
      title: '成员',
      render: (_value: unknown, row: MemberAggregate) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{row.displayName || '未命名成员'}</Typography.Text>
          <Typography.Text type="secondary">{row.maskedAccount || '***'}</Typography.Text>
        </Space>
      )
    },
    {
      key: 'roles',
      title: '当前角色',
      render: (_value: unknown, row: MemberAggregate) => row.grants.length
        ? <Space wrap>{row.grants.map(grant => <Tag key={grant.grantId} color={grant.roleCode === 'clan_admin' ? 'red' : 'blue'}>{grant.roleName || grant.roleCode}</Tag>)}</Space>
        : <Typography.Text type="secondary">暂无可见有效授权</Typography.Text>
    },
    {
      key: 'scopes',
      title: '授权范围',
      render: (_value: unknown, row: MemberAggregate) => row.grants.length
        ? <Space direction="vertical" size={2}>{row.grants.map(grant => <span key={grant.grantId}>{grant.scopeName}</span>)}</Space>
        : '-'
    },
    { dataIndex: 'membershipStatus', title: '状态', render: (value: string) => <Tag color={statusColor(value)}>{statusText(value)}</Tag> },
    { dataIndex: 'updatedAt', title: '最近变更', render: (value: string) => dateTime(value) },
    {
      key: 'actions',
      title: '操作',
      render: (_value: unknown, row: MemberAggregate) => (
        <Space>
          <Button type="link" onClick={() => openMember(row)}>查看详情</Button>
          {row.allowedActions?.canDisableMember ? (
            <Button type="link" danger={row.membershipStatus === 'active'} onClick={() => openStatus(row)}>
              {row.membershipStatus === 'active' ? '停用成员' : '恢复成员'}
            </Button>
          ) : null}
        </Space>
      )
    }
  ];

  const emptyDescription = query.keyword || query.roleCode || query.scopeType || query.status
    ? '没有符合当前筛选条件的成员'
    : '当前宗族尚未配置成员授权';

  return (
    <div className="member-role-page">
      <Card title="成员与权限" extra={<Button onClick={openCreateGrant} disabled={!selectedClanId || !roles.length}>新增成员授权</Button>}>
        <Row gutter={[16, 12]}>
          <Col xs={24} md={12} xl={6}>
            <Typography.Text type="secondary">当前宗族</Typography.Text>
            <Select
              showSearch
              optionFilterProp="label"
              style={{ width: '100%' }}
              value={selectedClanId}
              onChange={changeClan}
              options={clans.map(clan => ({
                value: String(clan.id),
                label: `${clan.clanName}${clan.hallName ? ` · ${clan.hallName}` : ''}`
              }))}
            />
          </Col>
          <Col xs={24} md={12} xl={6}>
            <Typography.Text type="secondary">成员关键词</Typography.Text>
            <Input allowClear value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="姓名 / 账号" />
          </Col>
          <Col xs={24} md={12} xl={6}>
            <Typography.Text type="secondary">角色</Typography.Text>
            <Select style={{ width: '100%' }} value={roleFilter} onChange={setRoleFilter} options={[{ value: '', label: '全部角色' }, ...roles.map(role => ({ value: role.roleCode, label: role.roleName }))]} />
          </Col>
          <Col xs={24} md={12} xl={6}>
            <Typography.Text type="secondary">授权范围</Typography.Text>
            <Select style={{ width: '100%' }} value={scopeFilter} onChange={setScopeFilter} options={[
              { value: '', label: '全部范围' },
              { value: 'clan', label: '全宗族' },
              { value: 'branch_subtree', label: '支派及下级支派' }
            ]} />
          </Col>
          <Col xs={24} md={12} xl={6}>
            <Typography.Text type="secondary">成员状态</Typography.Text>
            <Select style={{ width: '100%' }} value={statusFilter} onChange={setStatusFilter} options={[
              { value: '', label: '全部状态' },
              { value: 'active', label: '有效' },
              { value: 'disabled', label: '已停用' },
              { value: 'removed', label: '已移除' }
            ]} />
          </Col>
        </Row>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <Space>
            <Button onClick={() => {
              setKeyword('');
              setRoleFilter('');
              setScopeFilter('');
              setStatusFilter('');
              const nextQuery = resetMemberQuery(query.pageSize);
              writeUrlState(nextQuery, undefined);
              void loadMembers(selectedClanId, nextQuery);
            }}>重置</Button>
            <Button type="primary" loading={queryLoading} onClick={() => {
              const nextQuery = createMemberQuery({ keyword, roleCode: roleFilter, scopeType: scopeFilter, status: statusFilter }, 1, query.pageSize);
              writeUrlState(nextQuery, undefined);
              void loadMembers(selectedClanId, nextQuery);
            }}>查询</Button>
          </Space>
        </div>
      </Card>

      <Alert
        style={{ marginTop: 16 }}
        type="info"
        showIcon
        message="成员与权限按角色与数据范围共同生效"
        description="支派管理员只能查看和管理授权支派及下级支派；高风险授权和成员停用均需填写原因，后端会执行越级、范围和最后管理员校验。"
      />


      <Card title="成员列表" extra={<Typography.Text type="secondary">共 {total} 名成员</Typography.Text>} style={{ marginTop: 16 }}>
        {queryError ? <Alert type="error" showIcon message={queryError} action={<Button size="small" onClick={() => void loadMembers(selectedClanId, query)}>重试</Button>} style={{ marginBottom: 16 }} /> : null}
        {isMobile ? (
          <List
            loading={initializing || queryLoading}
            dataSource={members}
            locale={{ emptyText: <Empty description={emptyDescription} /> }}
            renderItem={member => (
              <List.Item actions={[<Button key="detail" type="link" onClick={() => openMember(member)}>查看详情</Button>]}>
                <List.Item.Meta
                  title={<Space><span>{member.displayName || '未命名成员'}</span><Tag color={statusColor(member.membershipStatus)}>{statusText(member.membershipStatus)}</Tag></Space>}
                  description={(
                    <Space direction="vertical" size={4}>
                      <Typography.Text type="secondary">{member.maskedAccount || '***'}</Typography.Text>
                      <Space wrap>{member.grants.map(grant => <Tag key={grant.grantId}>{grant.roleName || grant.roleCode}</Tag>)}</Space>
                      <Typography.Text type="secondary">{member.grants.map(grant => grant.scopeName).join('；') || '暂无可见有效授权'}</Typography.Text>
                    </Space>
                  )}
                />
              </List.Item>
            )}
          />
        ) : (
          <Table<MemberAggregate>
            rowKey="membershipId"
            loading={initializing || queryLoading}
            dataSource={members}
            locale={{ emptyText: <Empty description={emptyDescription} /> }}
            scroll={{ x: 900 }}
            pagination={{
              current: query.pageNo,
              pageSize: query.pageSize,
              total,
              showSizeChanger: true,
              showTotal: value => `共 ${value} 名成员`,
              onChange: (nextPage, nextPageSize) => {
                const nextQuery = createMemberQuery(query, nextPage, nextPageSize);
                writeUrlState(nextQuery, selectedMember?.membershipId);
                void loadMembers(selectedClanId, nextQuery);
              }
            }}
            columns={memberColumns}
          />
        )}
      </Card>

      <Modal
        title={editingGrant ? '编辑成员授权' : '新增成员授权'}
        open={grantModalOpen}
        onCancel={() => setGrantModalOpen(false)}
        onOk={() => void submitGrant()}
        okText={editingGrant ? '保存修改' : '确认授权'}
        confirmLoading={grantSubmitting}
        destroyOnClose
      >
        {grantError ? <Alert type="error" showIcon message={grantError} style={{ marginBottom: 16 }} /> : null}
        <Form form={grantForm} layout="vertical">
          {!editingGrant ? (
            <Form.Item name="userId" label="选择成员" rules={[{ required: true, message: '请搜索并选择成员' }]}>
              <Select showSearch filterOption={false} onSearch={value => void searchCandidates(value)} loading={candidateLoading} placeholder="输入至少两个字符搜索" options={candidates.map(candidate => ({
                value: candidate.userId,
                disabled: candidate.alreadyMember,
                label: `${candidate.displayName} · ${candidate.maskedAccount}${candidate.alreadyMember ? '（已是成员）' : ''}`
              }))} />
            </Form.Item>
          ) : null}
          <Form.Item name="roleCode" label="授权角色" rules={[{ required: true, message: '请选择角色' }]}><Select options={roleOptions} onChange={onRoleChange} /></Form.Item>
          <Form.Item name="scopeType" label="授权范围" rules={[{ required: true, message: '请选择授权范围' }]}>
            <Select options={scopeOptions} onChange={value => grantForm.setFieldValue('scopeId', value === 'clan' ? Number(selectedClanId) : undefined)} />
          </Form.Item>
          {selectedScopeType === 'branch_subtree' ? (
            <Form.Item name="scopeId" label="选择支派" rules={[{ required: true, message: '请选择支派' }]}>
              <Select showSearch optionFilterProp="label" options={branches.map(branch => ({ value: branch.id, label: `${branch.branchName}及下级支派` }))} />
            </Form.Item>
          ) : <Form.Item name="scopeId" hidden><Input /></Form.Item>}
          <Form.Item name="reason" label="变更原因" rules={[{ required: true, whitespace: true, message: '请填写权限变更原因' }]}>
            <TextArea rows={3} maxLength={500} showCount placeholder="用于安全校验和审计追溯" />
          </Form.Item>
          {selectedRole ? <Alert type={selectedRole.riskLevel === 'high' ? 'warning' : 'info'} showIcon message={`${selectedRole.roleName}${selectedRole.riskLevel === 'high' ? ' · 高风险角色' : ''}`} description={<Space direction="vertical" size={2}><span>{roleCapabilityText(selectedRole)}</span><span>{scopePreview(selectedScopeType, selectedScopeId, selectedClanName, branches)}</span></Space>} /> : null}
        </Form>
      </Modal>

      <Drawer
        title={selectedMember ? (
          <Space direction="vertical" size={0}>
            <Space><span>{selectedMember.displayName}</span><Tag color={statusColor(selectedMember.membershipStatus)}>{statusText(selectedMember.membershipStatus)}</Tag></Space>
            <Typography.Text type="secondary">{selectedMember.maskedAccount || '***'}</Typography.Text>
          </Space>
        ) : '权限详情'}
        width={isMobile ? '100vw' : 720}
        open={memberDrawerOpen}
        onClose={closeMember}
      >
        {selectedMember ? (
          <>
            <Typography.Title level={5}>成员摘要</Typography.Title>
            <Descriptions column={isMobile ? 1 : 2} size="small" bordered>
              <Descriptions.Item label="成员状态"><Tag color={statusColor(selectedMember.membershipStatus)}>{statusText(selectedMember.membershipStatus)}</Tag></Descriptions.Item>
              <Descriptions.Item label="加入时间">{dateTime(selectedMember.joinedAt)}</Descriptions.Item>
            </Descriptions>
            <Typography.Title level={5} style={{ marginTop: 24 }}>当前授权</Typography.Title>
            <Table<MemberGrant>
              size="small"
              rowKey="grantId"
              pagination={false}
              locale={{ emptyText: <Empty description="暂无可见有效授权" /> }}
              dataSource={selectedMember.grants}
              scroll={{ x: 560 }}
              columns={[
                { dataIndex: 'roleName', title: '角色' },
                { dataIndex: 'scopeName', title: '范围' },
                { dataIndex: 'updatedAt', title: '最近变更', render: value => dateTime(value) },
                {
                  key: 'actions',
                  title: '操作',
                  render: (_value, grant) => <Space>
                    {grant.canEditGrant ? <Button type="link" onClick={() => openEditGrant(grant)}>编辑</Button> : null}
                    {grant.canRevokeGrant ? <Button type="link" danger onClick={() => openRevoke(grant)}>撤销</Button> : null}
                  </Space>
                }
              ]}
            />
            {selectedMember.allowedActions?.canViewHistory ? (
              <>
                <Typography.Title level={5} style={{ marginTop: 24 }}>权限变更记录</Typography.Title>
                {auditError ? <Alert type="error" showIcon message={auditError} action={<Button size="small" onClick={() => void loadMemberAudits(selectedClanId, selectedMember.membershipId)}>重新加载</Button>} style={{ marginBottom: 12 }} /> : null}
                <Table<MemberPermissionAudit>
                  size="small"
                  rowKey="auditId"
                  loading={auditLoading}
                  locale={{ emptyText: <Empty description="暂无权限变更记录" /> }}
                  dataSource={audits}
                  scroll={{ x: 720 }}
                  pagination={{
                    current: auditPageNo,
                    pageSize: auditPageSize,
                    total: auditTotal,
                    showSizeChanger: true,
                    showTotal: value => `共 ${value} 条记录`,
                    onChange: (nextPage, nextPageSize) => void loadMemberAudits(selectedClanId, selectedMember.membershipId, nextPage, nextPageSize)
                  }}
                  columns={[
                    { dataIndex: 'actionType', title: '动作', width: 100, render: value => auditActionText(value) },
                    { key: 'actor', title: '操作者', width: 130, render: (_value, row) => `${row.actorDisplayName} · ${row.actorMaskedAccount}` },
                    { key: 'change', title: '变更内容', render: (_value, row) => <Space direction="vertical" size={0}><Typography.Text type="secondary">变更前：{formatAuditValue(row.beforeValue, branches)}</Typography.Text><Typography.Text>变更后：{formatAuditValue(row.afterValue, branches)}</Typography.Text><Typography.Text type="secondary">原因：{row.reason || '-'}</Typography.Text></Space> },
                    { dataIndex: 'changedAt', title: '时间', width: 140, render: value => dateTime(value) }
                  ]}
                />
              </>
            ) : null}
          </>
        ) : null}
      </Drawer>

      <Modal title={statusTarget?.membershipStatus === 'active' ? '停用成员' : '恢复成员'} open={statusModalOpen} onCancel={() => setStatusModalOpen(false)} onOk={() => void submitStatus()} okText={statusTarget?.membershipStatus === 'active' ? '确认停用' : '确认恢复'} okButtonProps={{ danger: statusTarget?.membershipStatus === 'active' }} confirmLoading={statusSubmitting}>
        {statusError ? <Alert type="error" showIcon message={statusError} style={{ marginBottom: 16 }} /> : null}
        <Form form={statusForm} layout="vertical">
          <Form.Item name="status" hidden><Input /></Form.Item>
          <Alert type="warning" showIcon message={statusTarget?.membershipStatus === 'active' ? '停用后该成员不能继续访问宗族数据，但成员关系和授权记录仍会保留' : '恢复后该成员重新获得有效授权范围内的访问能力'} />
          <Form.Item name="reason" label="操作原因" style={{ marginTop: 16 }} rules={[{ required: true, whitespace: true, message: '请填写操作原因' }]}><TextArea rows={3} maxLength={500} showCount /></Form.Item>
        </Form>
      </Modal>

      <Modal title="撤销成员授权" open={revokeModalOpen} onCancel={() => setRevokeModalOpen(false)} onOk={() => void submitRevoke()} okText="确认撤销" okButtonProps={{ danger: true }} confirmLoading={revokeSubmitting}>
        {revokeError ? <Alert type="error" showIcon message={revokeError} style={{ marginBottom: 16 }} /> : null}
        <Alert type="warning" showIcon message={`将仅撤销“${revokeTarget?.roleName || ''}”这一条授权，成员的其他授权不受影响；最后管理员保护由后端强制执行。`} />
        <Form form={revokeForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="reason" label="撤销原因" rules={[{ required: true, whitespace: true, message: '请填写撤销原因' }]}><TextArea rows={3} maxLength={500} showCount /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
