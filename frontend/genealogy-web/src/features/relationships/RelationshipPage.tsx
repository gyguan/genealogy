import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { DataBlock } from '../../shared/ui/DataBlock';
import { Panel } from '../../shared/ui/Panel';

export function RelationshipPage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const workspace = useWorkspace();
  const [fromPersonId, setFromPersonId] = useState(workspace.personId);
  const [toPersonId, setToPersonId] = useState('');
  const [relationType, setRelationType] = useState('parent_child');
  const [relationLabel, setRelationLabel] = useState('father');
  const [data, setData] = useState<unknown>();

  const body = () => ({
    fromPersonId: Number(fromPersonId),
    toPersonId: Number(toPersonId),
    relationType,
    relationLabel,
    isLineageRelation: relationType !== 'spouse',
    isBiological: relationType === 'parent_child',
    isPrimary: true,
    confidenceLevel: 'high'
  });

  async function check() {
    const res = await apiClient.post(`/clans/${workspace.clanId}/relationships/check-conflict`, body());
    setData(res);
    notify(res);
  }

  async function create() {
    const res = await apiClient.post(`/clans/${workspace.clanId}/relationships`, body());
    setData(res);
    notify(res);
  }

  async function list() {
    const res = await apiClient.get(`/persons/${workspace.personId}/relationships`);
    setData(res);
    notify(res);
  }

  return (
    <div className="page-grid two">
      <Panel title="关系维护" description="创建前先做冲突预检，避免重复关系、父母冲突和祖先循环。宗族ID来自工作台。">
        <Field label="当前宗族ID"><input value={workspace.clanId} onChange={e => workspace.setClanId(e.target.value)} /></Field>
        <Field label="fromPersonId"><input value={fromPersonId} onChange={e => setFromPersonId(e.target.value)} /></Field>
        <Field label="toPersonId"><input value={toPersonId} onChange={e => setToPersonId(e.target.value)} /></Field>
        <Field label="关系类型"><select value={relationType} onChange={e => setRelationType(e.target.value)}><option value="parent_child">亲子</option><option value="spouse">配偶</option><option value="adoptive">养育/收养</option></select></Field>
        <Field label="关系标签"><input value={relationLabel} onChange={e => setRelationLabel(e.target.value)} /></Field>
        <Actions><button onClick={check}>冲突预检</button><button onClick={create}>创建关系</button></Actions>
      </Panel>
      <Panel title="关系查询" description="默认查询工作台中的当前人物ID。">
        <Field label="当前人物ID"><input value={workspace.personId} onChange={e => workspace.setPersonId(e.target.value)} /></Field>
        <Actions><button onClick={list}>查询人物关系</button></Actions>
        <DataBlock data={data} />
      </Panel>
    </div>
  );
}
