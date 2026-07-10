import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Form, Input, Popconfirm, Row, Select, Space, Table, Tag, Typography } from 'antd';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { toRecordList } from '../../shared/ui/DataTable';

type ClanRow = {
  id: number;
  clanName: string;
  surname?: string;
  clanCode?: string;
  hallName?: string;
};

type BranchRow = {
  id: number;
  branchName: string;
  parentId?: number;
  status?: string;
};

type UserRow = {
  id: number;
  username: string;
  displayName: string;
  email?: string;
  status?: string;
};

type RoleRow = {
  id: number;
  roleCode: string;
  roleName: string;
  roleType: 'manage' | 'view' | string;
  description?: string;
};

type MemberRow = {
  id: number;
  userId: number;
  username: string;
  displayName: string;
  roleCode: string;
  roleName: string;
  roleType: 'manage' | 'view' | string;
  memberName: string;
  memberStatus: string;
  scopeType: string;
  scopeId?: number;
  branchId?: number;
};

type MemberPermissionSummary = {
  activeMemberCount?: number;
  adminCount?: number;
  branchManagerCount?: number;
  unassignedBranchCount?: number;
  highRiskGrantCount?: number;
  latestPermissionChangedAt?: string;
};

const manageRoleCodes = ['clan_admin', 'branch_admin', 'editor', 'reviewer'];
const memberManagementBase = '/member-management';

const roleAbilityText: Record<string, string[]> = {
  clan_admin: ['可管理宗族成员与支派', '可维护全宗族人物、关系、来源', '可处理导出与审计类高风险事项'],
  branch_admin: ['可管理授权支派范围内资料', '可维护授权支派下人物、关系、来源', '删除和审核通过仍需更高权限'],
  editor: ['可录入和编辑授权范围内资料', '可提交入谱审核', '不可调整成员权限或直接审核通过'],
  reviewer: ['可查看待审内容', '可通过或驳回审核任务', '不可直接维护业务资料'],
  viewer: ['可查看允许范围内人物、世系和来源摘要', '不可新增、编辑、审核或导出']
};

function roleTypeText(roleType?: string) {
  return roleType === 'view' ? '查看角色' : '管理角色';
}

function roleTypeColor(roleType?: string) {
  return roleType === 'view' ? 'blue' : 'green';
}

function memberStatusText(status?: string) {
  const value = String(status || '').toLowerCase();
  const dict: Record<string, string> = { active: '有效', disabled: '已停用', revoked: '已撤销' };
  return dict[value] || status || '-';
}

function memberStatusColor(status?: string) {
  const value = String(status || '').toLowerCase();
  if (value === 'active') return 'success';
  if (['disabled', 'revoked'].includes(value)) return 'default';
  return 'processing';
}

function defaultRoleCode(roles: RoleRow[]) {
  return roles.find(role => role.roleCode === 'viewer')?.roleCode || roles[0]?.roleCode || '';
}

function display(value: unknown, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function isBranchScope(scopeType?: string) {
  return scopeType === 'branch' || scopeType === 'branch_subtree';
}

function formatDateTime(value?: string) {
  if (!value) return '暂无记录';
  return value.replace('T', ' ').slice(0, 16);
}

export function MemberPage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const workspace = useWorkspace();
  const [clans, setClans] = useState<ClanRow[]>([]);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [summary, setSummary] = useState<MemberPermissionSummary>({});
  const [userId, setUserId] = useState('');
  const [roleCode, setRoleCode] = useState('');
  const [memberName, setMemberName] = useState('');
  const [scopeType, setScopeType] = useState('clan');
  const [scopeBranchId, setScopeBranchId] = useState('');
  const [loading, setLoading] = useState(false);

  const manageRoles = useMemo(() => roles.filter(role => role.roleType !== 'view' || manageRoleCodes.includes(role.roleCode)), [roles]);
  const viewRoles = useMemo(() => roles.filter(role => role.roleType === 'view'), [roles]);
  const selectedRole = roles.find(role => role.roleCode === roleCode);
  const selectedClan = useMemo(() => {
    const targetId = String(workspace.clanId || '');
    return clans.find(clan => String(clan.id) === targetId) || clans[0] || null;
  }, [clans, workspace.clanId]);
  const selectedClanId = String(selectedClan?.id || workspace.clanId || '');

  function branchName(branchId?: number | string) {
    const id = String(branchId || '');
    return branches.find(branch => String(branch.id) === id)?.branchName || '';
  }

  function scopeText(row?: Pick<MemberRow, 'scopeType' | 'scopeId' | 'branchId'>) {
    const type = row?.scopeType || scopeType;
    const targetBranchId = row ? (row.scopeId || row.branchId) : scopeBranchId;
    if (isBranchScope(type)) {
      return branchName(targetBranchId) ? `指定支派：${branchName(targetBranchId)}` : '指定支派';
    }
    return selectedClan?.clanName ? `全宗族：${selectedClan.clanName}` : '全宗族';
  }

  function effectiveScopeId() {
    if (isBranchScope(scopeType)) return Number(scopeBranchId);
    return Number(selectedClanId);
  }

  function effectiveBranchId() {
    return isBranchScope(scopeType) && scopeBranchId ? Number(scopeBranchId) : null;
  }

  function permissionPreview() {
    const roleItems = selectedRole ? (roleAbilityText[selectedRole.roleCode] || [selectedRole.description || '按该角色权限执行']) : [];
    return [
      selectedClan?.clanName ? `授权宗族：${selectedClan.clanName}` : '请先选择宗族',
      `授权范围：${scopeText()}`,
      ...roleItems
    ];
  }

  async function run(action: () => Promise<void>) {
    if (loading) return;
    setLoading(true);
    try {
      await action();
    } catch (error) {
      notify({ message: (error as Error).message || '操作失败' }, true);
    } finally {
      setLoading(false);
    }
  }

  async function loadSummary(clanId = selectedClanId) {
    if (!clanId) {
      setSummary({});
      return;
    }
    const summaryRes = await apiClient.get(`${memberManagementBase}/clans/${clanId}/members/summary`).catch(() => ({}));
    setSummary((summaryRes || {}) as MemberPermissionSummary);
  }

  async function loadBranches(clanId: string) {
    if (!clanId) {
      setBranches([]);
      setScopeBranchId('');
      return [] as BranchRow[];
    }
    const branchRes = await apiClient.get(`/clans/${clanId}/branches`).catch(() => []);
    const nextBranches = toRecordList(branchRes) as BranchRow[];
    setBranches(nextBranches);
    if (nextBranches.length && !nextBranches.some(branch => String(branch.id) === scopeBranchId)) {
      setScopeBranchId(String(nextBranches[0].id));
    }
    if (!nextBranches.length) setScopeBranchId('');
    return nextBranches;
  }

  async function loadBase() {
    await run(async () => {
      const [clanRes, userRes, roleRes] = await Promise.all([
        apiClient.get('/clans').catch(() => []),
        apiClient.get(`${memberManagementBase}/users`).catch(() => []),
        apiClient.get(`${memberManagementBase}/roles`).catch(() => [])
      ]);
      const nextClans = toRecordList(clanRes) as ClanRow[];
      const nextUsers = toRecordList(userRes) as UserRow[];
      const nextRoles = toRecordList(roleRes) as RoleRow[];
      const nextClanId = workspace.clanId && nextClans.some(clan => String(clan.id) === workspace.clanId)
        ? workspace.clanId
        : String(nextClans[0]?.id || '');

      setClans(nextClans);
      setUsers(nextUsers);
      setRoles(nextRoles);
      if (nextClanId && workspace.clanId !== nextClanId) workspace.setClanId(nextClanId);
      if (!userId && nextUsers[0]?.id) {
        setUserId(String(nextUsers[0].id));
        setMemberName(nextUsers[0].displayName || nextUsers[0].username);
      }
      if (!roleCode) setRoleCode(defaultRoleCode(nextRoles));
      if (nextClanId) {
        await loadBranches(nextClanId);
        const [memberRes] = await Promise.all([
          apiClient.get(`${memberManagementBase}/clans/${nextClanId}/members`).catch(() => []),
          loadSummary(nextClanId)
        ]);
        setMembers(toRecordList(memberRes) as MemberRow[]);
      } else {
        setBranches([]);
        setMembers([]);
        setSummary({});
      }
    });
  }

  async function listMembers(clanId = selectedClanId) {
    if (!clanId) {
      notify({ message: '请先选择宗族' }, true);
      return;
    }
    const res = await apiClient.get(`${memberManagementBase}/clans/${clanId}/members`);
    setMembers(toRecordList(res) as MemberRow[]);
    await loadSummary(clanId);
  }

  async function create() {
    await run(async () => {
      if (!selectedClanId) throw new Error('请先选择宗族');
      if (!userId) throw new Error('请选择用户');
      if (!roleCode) throw new Error('请选择角色');
      if (isBranchScope(scopeType) && !scopeBranchId) throw new Error('支派范围授权需要先选择支派');
      const selectedUser = users.find(user => String(user.id) === userId);
      await apiClient.post(`${memberManagementBase}/clans/${selectedClanId}/members`, {
        userId: Number(userId),
        roleCode,
        memberName: memberName.trim() || selectedUser?.displayName || selectedUser?.username || `用户${userId}`,
        scopeType,
        scopeId: effectiveScopeId(),
        branchId: effectiveBranchId()
      });
      notify({ message: '成员授权成功' });
      await listMembers(selectedClanId);
    });
  }

  async function updateRole(member: MemberRow, nextRoleCode: string) {
    await run(async () => {
      if (!selectedClanId) throw new Error('请先选择宗族');
      const nextScopeType = isBranchScope(member.scopeType) ? 'branch' : 'clan';
      const nextScopeId = isBranchScope(nextScopeType) ? (member.scopeId || member.branchId) : Number(selectedClanId);
      await apiClient.put(`${memberManagementBase}/clans/${selectedClanId}/members/${member.id}`, {
        roleCode: nextRoleCode,
        memberStatus: member.memberStatus || 'active',
        scopeType: nextScopeType,
        scopeId: nextScopeId,
        branchId: member.branchId || (isBranchScope(nextScopeType) ? nextScopeId : null)
      });
      notify({ message: '成员角色已更新' });
      await listMembers(selectedClanId);
    });
  }

  async function revokeRole(member: MemberRow) {
    await run(async () => {
      if (!selectedClanId) throw new Error('请先选择宗族');
      await apiClient.delete(`${memberManagementBase}/clans/${selectedClanId}/members/${member.id}`);
      notify({ message: '成员授权已撤销' });
      await listMembers(selectedClanId);
    });
  }

  useEffect(() => { void loadBase(); }, []);

  function onClanChange(nextClanId: string) {
    const clanId = String(nextClanId || '').trim();
    workspace.patch({ clanId, branchId: '', personId: '', relationshipId: '', sourceId: '', attachmentId: '', reviewTaskId: '' });
    if (clanId) {
      void run(async () => {
        await loadBranches(clanId);
        await listMembers(clanId);
      });
    } else {
      setBranches([]);
      setMembers([]);
      setSummary({});
    }
  }

  function onUserChange(nextUserId: string) {
    setUserId(nextUserId);
    const user = users.find(item => String(item.id) === nextUserId);
    if (user) setMemberName(user.displayName || user.username);
  }

  const roleOptions = [
    ...(manageRoles.length ? [{ label: '管理与协作角色', options: manageRoles.map(role => ({ value: role.roleCode, label: role.roleName })) }] : []),
    ...(viewRoles.length ? [{ label: '查看角色', options: viewRoles.map(role => ({ value: role.roleCode, label: role.roleName })) }] : [])
  ];

  return (
    <div className="member-role-page">
      <Alert
        type="info"
        showIcon
        className="member-role-tip"
        message="中国式族谱权限说明"
        description="权限由宗族成员身份、角色动作、授权范围、隐私规则和审核流程共同决定。界面只展示宗族名称、支派名称和成员姓名，不需要用户填写技术 ID。"
      />

      <Row gutter={[12, 12]}>
        <Col xs={24} md={12} xl={4}>
          <Card loading={loading}>
            <Typography.Text type="secondary">有效成员</Typography.Text>
            <Typography.Title level={3}>{summary.activeMemberCount ?? 0}</Typography.Title>
            <Tag>宗族身份</Tag>
          </Card>
        </Col>
        <Col xs={24} md={12} xl={4}>
          <Card loading={loading}>
            <Typography.Text type="secondary">管理员</Typography.Text>
            <Typography.Title level={3}>{summary.adminCount ?? 0}</Typography.Title>
            <Tag color={(summary.adminCount ?? 0) > 0 ? 'success' : 'warning'}>{(summary.adminCount ?? 0) > 0 ? '治理可用' : '需配置'}</Tag>
          </Card>
        </Col>
        <Col xs={24} md={12} xl={4}>
          <Card loading={loading}>
            <Typography.Text type="secondary">支派负责人</Typography.Text>
            <Typography.Title level={3}>{summary.branchManagerCount ?? 0}</Typography.Title>
            <Tag color={(summary.branchManagerCount ?? 0) > 0 ? 'processing' : 'default'}>支派治理</Tag>
          </Card>
        </Col>
        <Col xs={24} md={12} xl={4}>
          <Card loading={loading}>
            <Typography.Text type="secondary">未配置负责人支派</Typography.Text>
            <Typography.Title level={3}>{summary.unassignedBranchCount ?? 0}</Typography.Title>
            <Tag color={(summary.unassignedBranchCount ?? 0) > 0 ? 'warning' : 'success'}>{(summary.unassignedBranchCount ?? 0) > 0 ? '待补齐' : '已覆盖'}</Tag>
          </Card>
        </Col>
        <Col xs={24} md={12} xl={4}>
          <Card loading={loading}>
            <Typography.Text type="secondary">高风险授权</Typography.Text>
            <Typography.Title level={3}>{summary.highRiskGrantCount ?? 0}</Typography.Title>
            <Tag color={(summary.highRiskGrantCount ?? 0) > 0 ? 'error' : 'success'}>{(summary.highRiskGrantCount ?? 0) > 0 ? '需关注' : '暂无风险'}</Tag>
          </Card>
        </Col>
        <Col xs={24} md={12} xl={4}>
          <Card loading={loading}>
            <Typography.Text type="secondary">最近权限变更</Typography.Text>
            <Typography.Title level={5} style={{ marginTop: 8 }}>{formatDateTime(summary.latestPermissionChangedAt)}</Typography.Title>
            <Tag>审计线索</Tag>
          </Card>
        </Col>
      </Row>

      <div className="page-grid two">
        <Card title="新增成员授权">
          <Form layout="vertical">
            <Form.Item label="宗族名称">
              <Select
                showSearch
                optionFilterProp="label"
                value={selectedClanId}
                onChange={onClanChange}
                disabled={loading || !clans.length}
                options={[{ value: '', label: '请选择宗族' }, ...clans.map(clan => ({ value: String(clan.id), label: `${display(clan.clanName, '未命名宗族')}${clan.hallName ? ` · ${clan.hallName}` : ''}` }))]}
              />
            </Form.Item>
            <Form.Item label="选择成员">
              <Select
                showSearch
                optionFilterProp="label"
                value={userId}
                onChange={onUserChange}
                options={[{ value: '', label: '请选择成员' }, ...users.map(user => ({ value: String(user.id), label: user.displayName || user.username }))]}
              />
            </Form.Item>
            <Form.Item label="族内称呼"><Input value={memberName} onChange={e => setMemberName(e.target.value)} placeholder="默认使用用户显示名" /></Form.Item>
            <Form.Item label="授权角色"><Select value={roleCode} onChange={setRoleCode} options={roleOptions} /></Form.Item>
            <Form.Item label="授权范围">
              <Select value={scopeType} onChange={setScopeType} options={[{ value: 'clan', label: '全宗族' }, { value: 'branch', label: '指定支派' }]} />
            </Form.Item>
            {isBranchScope(scopeType) ? (
              <Form.Item label="选择支派">
                <Select
                  showSearch
                  optionFilterProp="label"
                  value={scopeBranchId}
                  onChange={setScopeBranchId}
                  disabled={!branches.length}
                  options={[{ value: '', label: '请选择支派' }, ...branches.map(branch => ({ value: String(branch.id), label: display(branch.branchName, '未命名支派') }))]}
                />
              </Form.Item>
            ) : null}
          </Form>
          <Card size="small" title="数据权限预览" className="permission-preview-card">
            {permissionPreview().map(item => <Typography.Paragraph key={item} type="secondary">• {item}</Typography.Paragraph>)}
          </Card>
          {selectedRole ? <Tag color={roleTypeColor(selectedRole.roleType)}>{selectedRole.roleName}：{roleTypeText(selectedRole.roleType)}</Tag> : null}
          <Space style={{ marginTop: 12 }} wrap>
            <Button type="primary" disabled={loading} loading={loading} onClick={() => void create()}>新增授权</Button>
            <Button disabled={loading} onClick={() => void run(async () => { await listMembers(); })}>刷新成员</Button>
          </Space>
        </Card>

        <Card title="角色清单">
          <div className="role-card-grid">
            {roles.map(role => (
              <Card key={role.roleCode} size="small" title={<Space><span>{role.roleName}</span><Tag color={roleTypeColor(role.roleType)}>{roleTypeText(role.roleType)}</Tag></Space>}>
                <Typography.Paragraph type="secondary">{role.description || '-'}</Typography.Paragraph>
                {(roleAbilityText[role.roleCode] || []).map(item => <Typography.Text key={item} type="secondary">• {item}<br /></Typography.Text>)}
              </Card>
            ))}
          </div>
        </Card>
      </div>

      <Card title="成员与角色列表">
        <Table<MemberRow>
          size="small"
          bordered
          rowKey={(row, index) => String(row.id || index)}
          dataSource={members}
          pagination={false}
          columns={[
            { key: 'displayName', title: '成员', render: (_value, row) => row.displayName || row.memberName || '-' },
            { key: 'roleName', title: '角色', render: (_value, row) => <Space><Tag color={roleTypeColor(row.roleType)}>{roleTypeText(row.roleType)}</Tag><span>{row.roleName || row.roleCode}</span></Space> },
            { key: 'scopeType', title: '授权范围', render: (_value, row) => scopeText(row) },
            { key: 'memberStatus', title: '状态', render: (_value, row) => <Tag color={memberStatusColor(row.memberStatus)}>{memberStatusText(row.memberStatus)}</Tag> },
            {
              key: 'actions',
              title: '操作',
              render: (_value, row) => (
                <Space size="small" wrap>
                  <Button size="small" type="link" onClick={() => void updateRole(row, 'clan_admin')}>设为宗族管理员</Button>
                  <Button size="small" type="link" onClick={() => void updateRole(row, 'editor')}>设为修谱编辑</Button>
                  <Button size="small" type="link" onClick={() => void updateRole(row, 'viewer')}>设为查看者</Button>
                  <Popconfirm title="撤销授权" description={`确认撤销“${row.displayName || row.memberName || '该成员'}”的授权吗？`} okText="撤销" cancelText="取消" onConfirm={() => void revokeRole(row)}>
                    <Button size="small" type="link" danger>撤销授权</Button>
                  </Popconfirm>
                </Space>
              )
            }
          ]}
        />
      </Card>
    </div>
  );
}
