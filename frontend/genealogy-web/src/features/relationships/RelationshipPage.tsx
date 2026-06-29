import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { DataTable } from '../../shared/ui/DataTable';
import { Panel } from '../../shared/ui/Panel';
import { ResultNotice } from '../../shared/ui/ResultNotice';

export function RelationshipPage({ notify, mode = 'create' }: { notify: (data: unknown, error?: boolean) => void; mode?: 'create' | 'query' }) {
  const workspace = useWorkspace();
  const [fromPersonId, setFromPersonId] = useState(workspace.personId);
  const [toPersonId, setToPersonId] = useState('');
  const [relationType, setRelationType] = useState('parent_child');
  const [relationLabel, setRelationLabel] = useState('father');
  const [data, setData] = useState<unknown>();
  const [result, setResult] = useState<unknown>();

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
    const res: any = await apiClient.post(`/clans/${workspace.clanId}/relationships/check-conflict`, body());
    setResult({ message: res.conflict ? '存在关系冲突，请检查后再创建' : '预检通过，可以创建关系' });
    notify({ message: res.conflict ? '关系预检发现冲突' : '关系预检通过' });
  }

  async function create() {
    const res: any = await apiClient.post(`/clans/${workspace.clanId}/relationships`, body());
    if (res?.id) workspace.patch({ relationshipId: String(res.id), personId: toPersonId || fromPersonId });
    setResult(res);
    notify({ message: '关系创建成功', id: res?.id });
  }

  async function list() {
    const res = await apiClient.get(`/persons/${workspace.personId}/relationships`);
    setData(res);
    notify({ message: '关系查询完成' });
  }

  if (mode === 'query') {
    return (
      <Panel title="关系查询" description="查询当前人物的关系记录。点击表格行可设置当前关系ID。">
        <Field label="当前人物ID"><input value={workspace.personId} onChange={e => workspace.setPersonId(e.target.value)} /></Field>
        <Actions><button onClick={list}>查询人物关系</button></Actions>
        <DataTable
          data={data}
          columns={[
            { key: 'id', title: 'ID' },
            { key: 'fromPersonId', title: 'From' },
            { key: 'toPersonId', title: 'To' },
            { key: 'relationType', title: '关系类型' },
            { key: 'relationLabel', title: '标签' },
            { key: 'dataStatus', title: '状态' }
          ]}
          onSelect={row => workspace.setRelationshipId(String(row.id))}
        />
      </Panel>
    );
  }

  return (
    <Panel title="关系创建" description="创建前先做冲突预检；创建成功后自动回填关系ID和当前人物ID。">
      <Field label="当前宗族ID"><input value={workspace.clanId} onChange={e => workspace.setClanId(e.target.value)} /></Field>
      <Field label="fromPersonId"><input value={fromPersonId} onChange={e => setFromPersonId(e.target.value)} /></Field>
      <Field label="toPersonId"><input value={toPersonId} onChange={e => setToPersonId(e.target.value)} /></Field>
      <Field label="关系类型"><select value={relationType} onChange={e => setRelationType(e.target.value)}><option value="parent_child">亲子</option><option value="spouse">配偶</option><option value="adoptive">养育/收养</option></select></Field>
      <Field label="关系标签"><input value={relationLabel} onChange={e => setRelationLabel(e.target.value)} /></Field>
      <Actions><button className="secondary" onClick={check}>冲突预检</button><button onClick={create}>创建关系</button></Actions>
      <ResultNotice result={result} />
    </Panel>
  );
}
