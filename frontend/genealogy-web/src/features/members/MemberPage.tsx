import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
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
  type MemberGrant
} from './memberPermissionApi';

const { TextArea } = Input;
const DEFAULT_PAGE_SIZE = 10;

type ClanRow = {
  id: number;
  clanName: string;
  hallName?: string;
};

type BranchRow = {
  id: number;
  branchName: string;
  parentId?: number;
};

type GrantFormValues = {
  userId?: number;
  roleCode: string;
  scopeType: string;
  scopeId: number;
  reason: string;
};

type StatusFormValues = {
  status: string;
  reason: string;
};

type RevokeFormValues = {
  reason: string;
};

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

export function MemberPage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const workspace = useWorkspace();
  const [grantForm] = Form.useForm<GrantFormValues>();
  const [statusForm] = Form.useForm<StatusFormValues>();
  const [revokeForm] = Form.useForm<RevokeFormValues>();

  const [clans, setClans] = useState<ClanRow[]>([]);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [roles, setRoles] = useState<GrantableRole[]>([]);
  const [candidates, setCandidates] = useState<MemberCandidate[]>([]);
  const [members, setMembers] = useState<MemberAggregate[]>([]);
  const [total, setTotal] = useState(0);
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [scopeFilter, setScopeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [candidateLoading, setCandidateLoading] = useState(false);

  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [editingGrant, setEditingGrant] = useState<MemberGrant | null>(null);
  const [memberDrawerOpen, setMemberDrawerOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberAggregate | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<MemberAggregate | null>(null);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<MemberGrant | null>(null);

  const selectedClanId = String(workspace.clanId || clans[0]?.id || '');
  const selectedRole = roles.find(role => role.roleCode === grantForm.getFieldValue('roleCode'));
  const selectedScopeType = Form.useWatch('scopeType', grantForm);

  const roleOptions = useMemo(
    () => roles.map(role => ({
      value: role.roleCode,
      label: `${role.roleName}${role.riskLevel === 'high' ? '（高风险）' : ''}`
    })),
    [roles]
  );

  async function execute(action: () => Promise<void>) {
    setLoading(true);
    try {
      await action();
    } catch (error) {
      notify({ message: (error as Error).message || '操作失败' }, true);
    } finally {
      setLoading(false);
    }
  }

  async function loadMembers(clanId = selectedClanId, nextPage = pageNo, nextPageSize = pageSize) {
    if (!clanId) {
      setMembers([]);
      setTotal(0);
      return;
    }
    const result = await memberPermissionApi.listMembers(clanId, {
      keyword: keyword.trim() || undefined,
      roleCode: roleFilter || undefined,
      scopeType: scopeFilter || undefined,
      status: statusFilter || undefined,
      pageNo: nextPage,
      pageSize: nextPageSize
    });
    setMembers(result.records || []);
    setTotal(result.total || 0);
    setPageNo(result.pageNo || nextPage);
    setPageSize(result.pageSize || nextPageSize);
    if (selectedMember) {
      const refreshed = (result.records || []).find(item => item.membershipId === selectedMember.membershipId);
      if (refreshed) setSelectedMember(refreshed);
    }
  }

  async function loadClanContext(clanId: string) {
    if (!clanId) return;
    const [branchResult, roleResult] = await Promise.all([
      apiClient.get(`/clans/${clanId}/branches`).catch(() => []),
      memberPermissionApi.grantableRoles(clanId).catch(() => [])
    ]);
    setBranches(toRecordList(branchResult) as BranchRow[]);
    setRoles(roleResult || []);
    await loadMembers(clanId, 1, pageSize);
  }

  async function initialize() {
    await execute(async () => {
      const clanResult = await apiClient.get('/clans').catch(() => []);
      const nextClans = toRecordList(clanResult) as ClanRow[];
      setClans(nextClans);
      const nextClanId = workspace.clanId && nextClans.some(clan => String(clan.id) === workspace.clanId)
        ? workspace.clanId
        : String(nextClans[0]?.id || '');
      if (nextClanId && nextClanId !== workspace.clanId) workspace.setClanId(nextClanId);
      if (nextClanId) await loadClanContext(nextClanId);
    });
  }

  useEffect(() => {
    void initialize();
  }, []);

  function changeClan(clanId: string) {
    workspace.patch({ clanId, branchId: '', personId: '', relationshipId: '', sourceId: '', attachmentId: '', reviewTaskId: '' });
    setSelectedMember(null);
    setMemberDrawerOpen(false);
    setKeyword('');
    setRoleFilter('');
    setScopeFilter('');
    setStatusFilter('');
    void execute(async () => { await loadClanContext(clanId); });
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
      notify({ message: (error as Error).message || '候选成员搜索失败' }, true);
    } finally {
      setCandidateLoading(false);
    }
  }

  function openCreateGrant() {
    setEditingGrant(null);
    setCandidates([]);
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

  async function submitGrant() {
    const values = await grantForm.validateFields();
    await execute(async () => {
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
      await loadMembers(selectedClanId, editingGrant ? pageNo : 1, pageSize);
    });
  }

  function openMember(member: MemberAggregate) {
    setSelectedMember(member);
    setMemberDrawerOpen(true);
  }

  function openStatus(member: MemberAggregate) {
    setStatusTarget(member);
    statusForm.resetFields();
    statusForm.setFieldsValue({
      status: member.membershipStatus === 'active' ? 'disabled' : 'active',
      reason: ''
    });
    setStatusModalOpen(true);
  }

  async function submitStatus() {
    if (!statusTarget) return;
    const values = await statusForm.validateFields();
    await execute(async () => {
      await memberPermissionApi.updateMemberStatus(
        selectedClanId,
        statusTarget.membershipId,
        values.status,
        values.reason.trim()
      );
      notify({ message: values.status === 'active' ? '成员已恢复' : '成员已停用' });
      setStatusModalOpen(false);
      await loadMembers();
    });
  }

  function openRevoke(grant: MemberGrant) {
    setRevokeTarget(grant);
    revokeForm.resetFields();
    setRevokeModalOpen(true);
  }

  async function submitRevoke() {
    if (!revokeTarget) return;
    const values = await revokeForm.validateFields();
    await execute(async () => {
      await memberPermissionApi.revokeGrant(selectedClanId, revokeTarget.grantId, values.reason.trim());
      notify({ message: '成员授权已撤销' });
      setRevokeModalOpen(false);
      await loadMembers();
    });
  }

  const scopeOptions = (selectedRole?.allowedScopeTypes || ['clan']).map(scope => ({
    value: scope,
    label: scope === 'clan' ? '全宗族' : '指定支派及下级支派'
  }));

  return (
    <div className="member-role-page">
      <Alert
        type="info"
        showIcon
        message="成员权限按角色与数据范围共同生效"
        description="支派管理员只能管理授权支派及下级支派；高风险授权和成员停用均需填写原因，并由后端执行越级、范围和最后管理员校验。"
      />

      <Card
        title="成员权限"
        extra={(
          <Space wrap>
            <Select
              showSearch
              optionFilterProp="label"
              style={{ width: 240 }}
              value={selectedClanId}
              onChange={changeClan}
              options={clans.map(clan => ({
                value: String(clan.id),
                label: `${clan.clanName}${clan.hallName ? ` · ${clan.hallName}` : ''}`
              }))}
            />
            <Button type="primary" onClick={openCreateGrant} disabled={!selectedClanId || !roles.length}>
              新增成员授权
            </Button>
          </Space>
        )}
      >
        <Space wrap align="end" style={{ marginBottom: 16 }}>
          <Space direction="vertical" size={4}>
            <Typography.Text type="secondary">成员关键词</Typography.Text>
            <Input allowClear style={{ width: 220 }} value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="姓名 / 账号" />
          </Space>
          <Space direction="vertical" size={4}>
            <Typography.Text type="secondary">角色</Typography.Text>
            <Select
              style={{ width: 180 }}
              value={roleFilter}
              onChange={setRoleFilter}
              options={[{ value: '', label: '全部角色' }, ...roles.map(role => ({ value: role.roleCode, label: role.roleName }))]}
            />
          </Space>
          <Space direction="vertical" size={4}>
            <Typography.Text type="secondary">授权范围</Typography.Text>
            <Select
              style={{ width: 190 }}
              value={scopeFilter}
              onChange={setScopeFilter}
              options={[
                { value: '', label: '全部范围' },
                { value: 'clan', label: '全宗族' },
                { value: 'branch_subtree', label: '支派及下级支派' }
              ]}
            />
          </Space>
          <Space direction="vertical" size={4}>
            <Typography.Text type="secondary">成员状态</Typography.Text>
            <Select
              style={{ width: 140 }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: '', label: '全部状态' },
                { value: 'active', label: '有效' },
                { value: 'disabled', label: '已停用' },
                { value: 'removed', label: '已移除' }
              ]}
            />
          </Space>
          <Button type="primary" loading={loading} onClick={() => void execute(async () => { await loadMembers(selectedClanId, 1, pageSize); })}>
            查询
          </Button>
          <Button onClick={() => {
            setKeyword('');
            setRoleFilter('');
            setScopeFilter('');
            setStatusFilter('');
            void execute(async () => { await loadMembers(selectedClanId, 1, pageSize); });
          }}>
            重置
          </Button>
        </Space>

        <Table<MemberAggregate>
          rowKey="membershipId"
          loading={loading}
          dataSource={members}
          pagination={{
            current: pageNo,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: value => `共 ${value} 名成员`,
            onChange: (nextPage, nextPageSize) => void execute(async () => { await loadMembers(selectedClanId, nextPage, nextPageSize); })
          }}
          columns={[
            {
              key: 'member',
              title: '成员',
              render: (_value, row) => (
                <Space direction="vertical" size={0}>
                  <Typography.Text strong>{row.displayName || '未命名成员'}</Typography.Text>
                  <Typography.Text type="secondary">{row.maskedAccount || '***'}</Typography.Text>
                </Space>
              )
            },
            {
              key: 'roles',
              title: '当前角色',
              render: (_value, row) => row.grants.length
                ? <Space wrap>{row.grants.map(grant => <Tag key={grant.grantId} color={grant.roleCode === 'clan_admin' ? 'red' : 'blue'}>{grant.roleName || grant.roleCode}</Tag>)}</Space>
                : <Typography.Text type="secondary">暂无有效授权</Typography.Text>
            },
            {
              key: 'scopes',
              title: '授权范围',
              render: (_value, row) => row.grants.length
                ? <Space direction="vertical" size={2}>{row.grants.map(grant => <span key={grant.grantId}>{grant.scopeName}</span>)}</Space>
                : '-'
            },
            {
              dataIndex: 'membershipStatus',
              title: '状态',
              render: value => <Tag color={statusColor(value)}>{statusText(value)}</Tag>
            },
            {
              dataIndex: 'updatedAt',
              title: '最近变更',
              render: value => dateTime(value)
            },
            {
              key: 'actions',
              title: '操作',
              render: (_value, row) => (
                <Space>
                  <Button type="link" onClick={() => openMember(row)}>管理授权</Button>
                  {row.allowedActions?.canDisableMember ? (
                    <Button type="link" danger={row.membershipStatus === 'active'} onClick={() => openStatus(row)}>
                      {row.membershipStatus === 'active' ? '停用成员' : '恢复成员'}
                    </Button>
                  ) : null}
                </Space>
              )
            }
          ]}
        />
      </Card>

      <Modal
        title={editingGrant ? '编辑成员授权' : '新增成员授权'}
        open={grantModalOpen}
        onCancel={() => setGrantModalOpen(false)}
        onOk={() => void submitGrant()}
        confirmLoading={loading}
        destroyOnClose
      >
        <Form form={grantForm} layout="vertical">
          {!editingGrant ? (
            <Form.Item name="userId" label="选择成员" rules={[{ required: true, message: '请搜索并选择成员' }]}>
              <Select
                showSearch
                filterOption={false}
                onSearch={value => void searchCandidates(value)}
                loading={candidateLoading}
                placeholder="输入至少两个字符搜索"
                options={candidates.map(candidate => ({
                  value: candidate.userId,
                  disabled: candidate.alreadyMember,
                  label: `${candidate.displayName} · ${candidate.maskedAccount}${candidate.alreadyMember ? '（已是成员）' : ''}`
                }))}
              />
            </Form.Item>
          ) : null}
          <Form.Item name="roleCode" label="授权角色" rules={[{ required: true, message: '请选择角色' }]}>
            <Select options={roleOptions} onChange={onRoleChange} />
          </Form.Item>
          <Form.Item name="scopeType" label="授权范围" rules={[{ required: true, message: '请选择授权范围' }]}>
            <Select
              options={scopeOptions}
              onChange={value => grantForm.setFieldValue('scopeId', value === 'clan' ? Number(selectedClanId) : undefined)}
            />
          </Form.Item>
          {selectedScopeType === 'branch_subtree' ? (
            <Form.Item name="scopeId" label="选择支派" rules={[{ required: true, message: '请选择支派' }]}>
              <Select
                showSearch
                optionFilterProp="label"
                options={branches.map(branch => ({ value: branch.id, label: `${branch.branchName}及下级支派` }))}
              />
            </Form.Item>
          ) : (
            <Form.Item name="scopeId" hidden><Input /></Form.Item>
          )}
          <Form.Item name="reason" label="变更原因" rules={[{ required: true, whitespace: true, message: '请填写权限变更原因' }]}>
            <TextArea rows={3} maxLength={500} showCount placeholder="用于安全校验和审计追溯" />
          </Form.Item>
          {selectedRole?.riskLevel === 'high' ? (
            <Alert type="warning" showIcon message="高风险授权" description="该角色具有全宗族治理或审核能力，请确认人员、职责和授权范围。" />
          ) : null}
        </Form>
      </Modal>

      <Drawer
        title={selectedMember ? `${selectedMember.displayName} · 授权管理` : '授权管理'}
        width={620}
        open={memberDrawerOpen}
        onClose={() => setMemberDrawerOpen(false)}
      >
        {selectedMember ? (
          <>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="成员状态"><Tag color={statusColor(selectedMember.membershipStatus)}>{statusText(selectedMember.membershipStatus)}</Tag></Descriptions.Item>
              <Descriptions.Item label="加入时间">{dateTime(selectedMember.joinedAt)}</Descriptions.Item>
            </Descriptions>
            <Typography.Title level={5} style={{ marginTop: 20 }}>当前有效授权</Typography.Title>
            <Table<MemberGrant>
              size="small"
              rowKey="grantId"
              pagination={false}
              dataSource={selectedMember.grants}
              columns={[
                { dataIndex: 'roleName', title: '角色' },
                { dataIndex: 'scopeName', title: '范围' },
                { dataIndex: 'updatedAt', title: '最近变更', render: value => dateTime(value) },
                {
                  key: 'actions',
                  title: '操作',
                  render: (_value, grant) => (
                    <Space>
                      {selectedMember.allowedActions?.canEditGrant ? <Button type="link" onClick={() => openEditGrant(grant)}>编辑</Button> : null}
                      {selectedMember.allowedActions?.canRevokeGrant ? <Button type="link" danger onClick={() => openRevoke(grant)}>撤销</Button> : null}
                    </Space>
                  )
                }
              ]}
            />
          </>
        ) : null}
      </Drawer>

      <Modal
        title={statusTarget?.membershipStatus === 'active' ? '停用成员' : '恢复成员'}
        open={statusModalOpen}
        onCancel={() => setStatusModalOpen(false)}
        onOk={() => void submitStatus()}
        confirmLoading={loading}
      >
        <Form form={statusForm} layout="vertical">
          <Form.Item name="status" hidden><Input /></Form.Item>
          <Alert
            type="warning"
            showIcon
            message={statusTarget?.membershipStatus === 'active' ? '停用后该成员不能继续访问宗族数据' : '恢复后该成员重新获得有效授权范围内的访问能力'}
          />
          <Form.Item name="reason" label="操作原因" style={{ marginTop: 16 }} rules={[{ required: true, whitespace: true, message: '请填写操作原因' }]}>
            <TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="撤销成员授权"
        open={revokeModalOpen}
        onCancel={() => setRevokeModalOpen(false)}
        onOk={() => void submitRevoke()}
        okButtonProps={{ danger: true }}
        confirmLoading={loading}
      >
        <Alert type="warning" showIcon message={`将撤销“${revokeTarget?.roleName || ''}”授权，最后管理员保护由后端强制执行。`} />
        <Form form={revokeForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="reason" label="撤销原因" rules={[{ required: true, whitespace: true, message: '请填写撤销原因' }]}>
            <TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
