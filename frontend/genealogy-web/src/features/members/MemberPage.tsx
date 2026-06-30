import { useEffect, useMemo, useState } from 'react';
import { Alert, Card, Space, Tag, Typography } from 'antd';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { DataTable, toRecordList } from '../../shared/ui/DataTable';
import { Panel } from '../../shared/ui/Panel';

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

const manageRoleCodes = ['clan_admin', 'branch_admin', 'editor', 'reviewer'];

function roleTypeText(roleType?: string) {
  return roleType === 'view' ? '查看角色' : '管理角色';
}

function roleTypeColor(roleType?: string) {
  return roleType === 'view' ? 'blue' : 'green';
}

function defaultRoleCode(roles: RoleRow[]) {
  return roles.find(role => role.roleCode === 'viewer')?.roleCode || roles[0]?.roleCode || '';
}

export function MemberPage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const workspace = useWorkspace();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [userId, setUserId] = useState('');
  const [roleCode, setRoleCode] = useState('');
  const [memberName, setMemberName] = useState('');
  const [scopeType, setScopeType] = useState('clan');
  const [scopeId, setScopeId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [loading, setLoading] = useState(false);

  const manageRoles = useMemo(() => roles.filter(role => role.roleType !== 'view' || manageRoleCodes.includes(role.roleCode)), [roles]);
  const viewRoles = useMemo(() => roles.filter(role => role.roleType === 'view'), [roles]);
  const selectedRole = roles.find(role => role.roleCode === roleCode);

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

  async function loadBase() {
    await run(async () => {
      const [userRes, roleRes] = await Promise.all([
        apiClient.get('/users').catch(() => []),
        apiClient.get('/roles').catch(() => [])
      ]);
      const nextUsers = toRecordList(userRes) as UserRow[];
      const nextRoles = toRecordList(roleRes) as RoleRow[];
      setUsers(nextUsers);
      setRoles(nextRoles);
      if (!userId && nextUsers[0]?.id) {
        setUserId(String(nextUsers[0].id));
        setMemberName(nextUsers[0].displayName || nextUsers[0].username);
      }
      if (!roleCode) setRoleCode(defaultRoleCode(nextRoles));
      if (workspace.clanId) await listMembers();
    });
  }

  async function listMembers() {
    if (!workspace.clanId) {
      notify({ message: '请先输入宗族ID' }, true);
      return;
    }
    const res = await apiClient.get(`/clans/${workspace.clanId}/members`);
    setMembers(toRecordList(res) as MemberRow[]);
  }

  async function create() {
    await run(async () => {
      if (!workspace.clanId) throw new Error('请先输入宗族ID');
      if (!userId) throw new Error('请选择用户');
      if (!roleCode) throw new Error('请选择角色');
      const selectedUser = users.find(user => String(user.id) === userId);
      const res: any = await apiClient.post(`/clans/${workspace.clanId}/members`, {
        userId: Number(userId),
        roleCode,
        memberName: memberName.trim() || selectedUser?.displayName || selectedUser?.username || `用户${userId}`,
        scopeType,
        scopeId: scopeId ? Number(scopeId) : Number(workspace.clanId),
        branchId: branchId ? Number(branchId) : null
      });
      notify({ message: '成员授权成功', id: res?.id });
      await listMembers();
    });
  }

  async function updateRole(member: MemberRow, nextRoleCode: string) {
    await run(async () => {
      await apiClient.put(`/clans/${workspace.clanId}/members/${member.id}`, {
        roleCode: nextRoleCode,
        memberStatus: member.memberStatus || 'active',
        scopeType: member.scopeType || 'clan',
        scopeId: member.scopeId || Number(workspace.clanId),
        branchId: member.branchId || null
      });
      notify({ message: '成员角色已更新', id: member.id });
      await listMembers();
    });
  }

  useEffect(() => { void loadBase(); }, []);

  function onUserChange(nextUserId: string) {
    setUserId(nextUserId);
    const user = users.find(item => String(item.id) === nextUserId);
    if (user) setMemberName(user.displayName || user.username);
  }

  return (
    <div className="member-role-page">
      <Alert
        type="info"
        showIcon
        className="member-role-tip"
        message="用户与角色说明"
        description="管理角色可以维护宗族数据、人物、关系、来源或审核；查看角色仅用于查看族谱、人物档案、世系图谱和来源资料。"
      />
      <div className="page-grid two">
        <Panel title="新增用户授权">
          <Field label="宗族ID"><input value={workspace.clanId} onChange={e => workspace.setClanId(e.target.value)} placeholder="请输入宗族ID" /></Field>
          <Field label="选择用户">
            <select value={userId} onChange={e => onUserChange(e.target.value)}>
              <option value="">请选择用户</option>
              {users.map(user => <option key={user.id} value={user.id}>{user.displayName || user.username} · {user.username}</option>)}
            </select>
          </Field>
          <Field label="成员姓名"><input value={memberName} onChange={e => setMemberName(e.target.value)} placeholder="默认使用用户显示名" /></Field>
          <Field label="选择角色">
            <select value={roleCode} onChange={e => setRoleCode(e.target.value)}>
              <option value="">请选择角色</option>
              {manageRoles.length ? <optgroup label="管理角色">{manageRoles.map(role => <option key={role.roleCode} value={role.roleCode}>{role.roleName} · {role.roleCode}</option>)}</optgroup> : null}
              {viewRoles.length ? <optgroup label="查看角色">{viewRoles.map(role => <option key={role.roleCode} value={role.roleCode}>{role.roleName} · {role.roleCode}</option>)}</optgroup> : null}
            </select>
          </Field>
          <Field label="授权范围"><select value={scopeType} onChange={e => setScopeType(e.target.value)}><option value="clan">宗族范围</option><option value="branch">支派范围</option></select></Field>
          <Field label="范围ID"><input value={scopeId} onChange={e => setScopeId(e.target.value)} placeholder="不填默认当前宗族ID" /></Field>
          <Field label="支派ID"><input value={branchId} onChange={e => setBranchId(e.target.value)} placeholder="支派管理员可填写" /></Field>
          {selectedRole ? <Tag color={roleTypeColor(selectedRole.roleType)}>{selectedRole.roleName}：{roleTypeText(selectedRole.roleType)}</Tag> : null}
          <Actions><button disabled={loading} onClick={create}>新增授权</button><button className="secondary" disabled={loading} onClick={listMembers}>刷新成员</button></Actions>
        </Panel>

        <Panel title="角色清单">
          <div className="role-card-grid">
            {roles.map(role => (
              <Card key={role.roleCode} size="small" title={<Space><span>{role.roleName}</span><Tag color={roleTypeColor(role.roleType)}>{roleTypeText(role.roleType)}</Tag></Space>}>
                <Typography.Text code>{role.roleCode}</Typography.Text>
                <Typography.Paragraph type="secondary">{role.description || '-'}</Typography.Paragraph>
              </Card>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="成员与角色列表">
        <DataTable
          data={members}
          empty="暂无成员，请先选择宗族并刷新成员列表。"
          columns={[
            { key: 'id', title: '成员ID' },
            { key: 'displayName', title: '用户', render: row => `${row.displayName || row.memberName || '-'}（${row.username || row.userId}）` },
            { key: 'roleName', title: '角色', render: row => <Space><Tag color={roleTypeColor(row.roleType)}>{roleTypeText(row.roleType)}</Tag><span>{row.roleName || row.roleCode}</span></Space> },
            { key: 'scopeType', title: '范围', render: row => row.scopeType === 'branch' ? '支派范围' : '宗族范围' },
            { key: 'scopeId', title: '范围ID' },
            { key: 'memberStatus', title: '状态' },
            { key: 'actions', title: '操作', render: row => <div className="archive-row-actions"><button className="secondary" onClick={event => { event.stopPropagation(); void updateRole(row, 'clan_admin'); }}>设为管理员</button><button className="secondary" onClick={event => { event.stopPropagation(); void updateRole(row, 'editor'); }}>设为编辑</button><button className="secondary" onClick={event => { event.stopPropagation(); void updateRole(row, 'viewer'); }}>设为查看</button></div> }
          ]}
        />
      </Panel>
    </div>
  );
}
