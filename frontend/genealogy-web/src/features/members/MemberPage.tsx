import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { DataTable } from '../../shared/ui/DataTable';
import { Panel } from '../../shared/ui/Panel';
import { ResultNotice } from '../../shared/ui/ResultNotice';

export function MemberPage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const workspace = useWorkspace();
  const [userId, setUserId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [memberName, setMemberName] = useState('');
  const [scopeType, setScopeType] = useState('clan');
  const [scopeId, setScopeId] = useState('');
  const [members, setMembers] = useState<unknown>();
  const [result, setResult] = useState<unknown>();

  async function create() {
    const res: any = await apiClient.post(`/clans/${workspace.clanId}/members`, {
      userId: Number(userId),
      roleId: Number(roleId),
      memberName,
      scopeType,
      scopeId: scopeId ? Number(scopeId) : null
    });
    setResult({ message: '成员创建成功', id: res?.id });
    notify({ message: '成员创建成功', id: res?.id });
  }

  async function list() {
    const res = await apiClient.get(`/clans/${workspace.clanId}/members`);
    setMembers(res);
    notify({ message: '成员列表查询完成' });
  }

  return (
    <div className="page-grid two">
      <Panel title="成员授权" description="用于维护 clan_admin、branch_admin、editor、viewer 等角色。">
        <Field label="当前宗族ID"><input value={workspace.clanId} onChange={e => workspace.setClanId(e.target.value)} /></Field>
        <Field label="用户ID"><input value={userId} onChange={e => setUserId(e.target.value)} /></Field>
        <Field label="角色ID"><input value={roleId} onChange={e => setRoleId(e.target.value)} /></Field>
        <Field label="成员姓名"><input value={memberName} onChange={e => setMemberName(e.target.value)} /></Field>
        <Field label="授权范围"><select value={scopeType} onChange={e => setScopeType(e.target.value)}><option value="clan">宗族</option><option value="branch">支派</option></select></Field>
        <Field label="范围ID"><input value={scopeId} onChange={e => setScopeId(e.target.value)} /></Field>
        <Actions><button onClick={create}>新增成员</button><button className="secondary" onClick={list}>查询成员</button></Actions>
        <ResultNotice result={result} />
      </Panel>
      <Panel title="成员列表">
        <DataTable
          data={members}
          columns={[
            { key: 'id', title: 'ID' },
            { key: 'memberName', title: '成员姓名' },
            { key: 'userId', title: '用户ID' },
            { key: 'roleCode', title: '角色' },
            { key: 'scopeType', title: '范围' },
            { key: 'scopeId', title: '范围ID' }
          ]}
        />
      </Panel>
    </div>
  );
}
