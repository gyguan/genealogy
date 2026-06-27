import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { Actions, Field } from '../../shared/ui/Form';
import { DataBlock } from '../../shared/ui/DataBlock';
import { Panel } from '../../shared/ui/Panel';

export function MemberPage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const [clanId, setClanId] = useState('');
  const [userId, setUserId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [memberName, setMemberName] = useState('');
  const [scopeType, setScopeType] = useState('clan');
  const [scopeId, setScopeId] = useState('');
  const [data, setData] = useState<unknown>();

  async function create() {
    const res = await apiClient.post(`/clans/${clanId}/members`, {
      userId: Number(userId),
      roleId: Number(roleId),
      memberName,
      scopeType,
      scopeId: scopeId ? Number(scopeId) : null
    });
    setData(res);
    notify(res);
  }

  async function list() {
    const res = await apiClient.get(`/clans/${clanId}/members`);
    setData(res);
    notify(res);
  }

  return (
    <div className="page-grid two">
      <Panel title="成员授权" description="用于维护 clan_admin、branch_admin、editor、viewer 等角色。">
        <Field label="宗族ID"><input value={clanId} onChange={e => setClanId(e.target.value)} /></Field>
        <Field label="用户ID"><input value={userId} onChange={e => setUserId(e.target.value)} /></Field>
        <Field label="角色ID"><input value={roleId} onChange={e => setRoleId(e.target.value)} /></Field>
        <Field label="成员姓名"><input value={memberName} onChange={e => setMemberName(e.target.value)} /></Field>
        <Field label="授权范围"><select value={scopeType} onChange={e => setScopeType(e.target.value)}><option value="clan">宗族</option><option value="branch">支派</option></select></Field>
        <Field label="范围ID"><input value={scopeId} onChange={e => setScopeId(e.target.value)} /></Field>
        <Actions><button onClick={create}>新增成员</button><button className="secondary" onClick={list}>查询成员</button></Actions>
      </Panel>
      <Panel title="成员数据"><DataBlock data={data} /></Panel>
    </div>
  );
}
