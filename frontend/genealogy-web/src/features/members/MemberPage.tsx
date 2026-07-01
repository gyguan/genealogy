import { useEffect, useMemo, useState } from 'react';
import { Alert, Card, Space, Tag, Typography } from 'antd';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { DataTable, toRecordList } from '../../shared/ui/DataTable';
import { Panel } from '../../shared/ui/Panel';

type ClanRow = {
  id: number;
  clanName: string;
  surname?: string;
  clanCode?: string;
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

const manageRoleCodes = ['clan_admin', 'branch_admin', 'editor', 'reviewer'];
const memberManagementBase = '/member-management';

function roleTypeText(roleType?: string) {
  return roleType === 'view' ? '查看角色' : '管理角色';
}

function roleTypeColor(roleType?: string) {
  return roleType === 'view' ? 'blue' : 'green';
}

function defaultRoleCode(roles: RoleRow[]) {
  return roles.find(role => role.roleCode === 'viewer')?.roleCode || roles[0]?.roleCode || '';
}

function display(value: unknown, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

export function MemberPage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const workspace = useWorkspace();
  const [clans, setClans] = useState<ClanRow[]>([]);
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
  const selectedClan = useMemo(() => {
    const targetId = String(workspace.clanId || '');
    return clans.find(clan => String(clan.id) === targetId) || clans[0] || null;
  }, [clans, workspace.clanId]);
  const selectedClanId = String(selectedClan?.id || workspace.clanId || '');

  function effectiveScopeId() {
    if (scopeType === 'branch') return Number(scopeId || branchId || workspace.branchId);
    return Number(selectedClanId);
  }

  function effectiveBranchId() {
    if (scopeType === 'branch') return Number(branchId || scopeId || workspace.branchId);
    return branchId ? Number(branchId) : null;
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
        const memberRes = await apiClient.get(`${memberManagementBase}/clans/${nextClanId}/members`).catch(() => []);
        setMembers(toRecordList(memberRes) as MemberRow[]);
      } else {
        setMembers([]);
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
  }

  async function create() {
    await run(async () => {
      if (!selectedClanId) throw new Error('请先选择宗族');
      if (!userId) throw new Error('请选择用户');
      if (!roleCode) throw new Error('请选择角色');
      if (scopeType === 'branch' && !scopeId && !branchId && !workspace.branchId) throw new Error('支派范围授权必须填写范围ID或支派ID');
      const selectedUser = users.find(user => String(user.id) === userId);
      const res: any = await apiClient.post(`${memberManagementBase}/clans/${selectedClanId}/members`, {
        userId: Number(userId),
        roleCode,
        memberName: memberName.trim() || selectedUser?.displayName || selectedUser?.username || `用户${userId}`,
        scopeType,
        scopeId: effectiveScopeId(),
        branchId: effectiveBranchId()
      });
      notify({ message: '成员授权成功', id: res?.id });
      await listMembers(selectedClanId);
    });
  }

  async function updateRole(member: MemberRow, nextRoleCode: string) {
    await run(async () => {
      if (!selectedClanId) throw new Error('请先选择宗族');
      const nextScopeType = member.scopeType || 'clan';
      const nextScopeId = nextScopeType === 'branch' ? (member.scopeId || member.branchId) : Number(selectedClanId);
      await apiClient.put(`${memberManagementBase}/clans/${selectedClanId}/members/${member.id}`, {
        roleCode: nextRoleCode,
        memberStatus: member.memberStatus || 'active',
        scopeType: nextScopeType,
        scopeId: nextScopeId,
        branchId: member.branchId || (nextScopeType === 'branch' ? nextScopeId : null)
      });
      notify({ message: '成员角色已更新', id: member.id });
      await listMembers(selectedClanId);
    });
  }

  useEffect(() => { void loadBase(); }, []);

  function onClanChange(nextClanId: string) {
    const clanId = String(nextClanId || '').trim();
    workspace.patch({ clanId, branchId: '', personId: '', relationshipId: '', sourceId: '', attachmentId: '', reviewTaskId: '' });
    setScopeId('');
    setBranchId('');
    if (clanId) {
      void run(async () => { await listMembers(clanId); });
    } else {
      setMembers([]);
    }
  }

  function onUserChange(nextUserId: string) {
    setUserId(nextUserId);
    const user = users.find(item => String(item.id) === nextUserId);
    if (user) setMemberName(user.displayName || user.username);
  }

  function onScopeTypeChange(nextScopeType: string) {
    setScopeType(nextScopeType);
    if (nextScopeType === 'branch' && !scopeId && !branchId && workspace.branchId) {
      setScopeId(workspace.branchId);
      setBranchId(workspace.branchId);
    }
  }

  return (
    <div className="member-role-page">
      <Alert
        type="info"
        showIcon
        className="member-role-tip"
        message="用户与角色说明"
        description="管理角色可以维护宗族数据、人物、关系、来源或审核；支派范围授权代表可维护该支派及下级支派数据，查看角色仅用于查看族谱、人物档案、世系图谱和来源资料。"
      />
      <div className="page-grid two">
        <Panel title="新增用户授权">
          <Field label="宗族名称">
            <select value={selectedClanId} onChange={e => onClanChange(e.target.value)} disabled={loading || !clans.length}>
              <option value="">请选择宗族</option>
              {clans.map(clan => <option key={clan.id} value={String(clan.id)}>{display(clan.clanName, `宗族#${clan.id}`)}{clan.clanCode ? ` · ${clan.clanCode}` : ''}</option>)}
            </select>
          </Field>
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
          <Field label="授权范围"><select value={scopeType} onChange={e => onScopeTypeChange(e.target.value)}><option value="clan">宗族范围</option><option value="branch">支派范围（含下级支派）</option></select></Field>
          <Field label="范围ID"><input value={scopeId} onChange={e => setScopeId(e.target.value)} placeholder={scopeType === 'branch' ? '填写支派ID；不填使用当前支派ID' : '宗族范围自动使用当前宗族'} /></Field>
          <Field label="归属支派ID"><input value={branchId} onChange={e => setBranchId(e.target.value)} placeholder="支派负责人/支派管理员建议填写" /></Field>
          {selectedRole ? <Tag color={roleTypeColor(selectedRole.roleType)}>{selectedRole.roleName}：{roleTypeText(selectedRole.roleType)}</Tag> : null}
          <Actions><button disabled={loading} onClick={create}>新增授权</button><button className="secondary" disabled={loading} onClick={() => void listMembers()}>刷新成员</button></Actions>
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
            { key: 'scopeType', title: '范围', render: row => row.scopeType === 'branch' ? '支派范围（含下级）' : '宗族范围' },
            { key: 'scopeId', title: '范围ID' },
            { key: 'branchId', title: '归属支派ID' },
            { key: 'memberStatus', title: '状态' },
            { key: 'actions', title: '操作', render: row => <div className="archive-row-actions"><button className="secondary" onClick={event => { event.stopPropagation(); void updateRole(row, 'clan_admin'); }}>设为管理员</button><button className="secondary" onClick={event => { event.stopPropagation(); void updateRole(row, 'editor'); }}>设为编辑</button><button className="secondary" onClick={event => { event.stopPropagation(); void updateRole(row, 'viewer'); }}>设为查看</button></div> }
          ]}
        />
      </Panel>
    </div>
  );
}
