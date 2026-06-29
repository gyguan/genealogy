import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { DataTable } from '../../shared/ui/DataTable';
import { Panel } from '../../shared/ui/Panel';

export function TreePage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const workspace = useWorkspace();
  const [depth, setDepth] = useState('5');
  const [data, setData] = useState<any>();
  const rootPersonId = data?.rootPersonId ?? (workspace.personId || '-');

  async function family() {
    const res = await apiClient.get(`/tree/person/${workspace.personId}/family`);
    setData(res);
    notify({ message: '家庭图查询完成' });
  }

  async function descendants() {
    const res = await apiClient.get(`/tree/descendants?rootPersonId=${workspace.personId}&maxDepth=${depth || 5}`);
    setData(res);
    notify({ message: '下延世系查询完成' });
  }

  async function ancestors() {
    const res = await apiClient.get(`/tree/ancestors?personId=${workspace.personId}&maxDepth=${depth || 5}`);
    setData(res);
    notify({ message: '上溯世系查询完成' });
  }

  return (
    <div className="page-grid two">
      <Panel title="世系查询" description="查询家庭图、下延世系和上溯世系。">
        <Field label="人物ID"><input value={workspace.personId} onChange={e => workspace.setPersonId(e.target.value)} /></Field>
        <Field label="深度"><input value={depth} onChange={e => setDepth(e.target.value)} /></Field>
        <Actions><button onClick={family}>家庭图</button><button onClick={descendants}>下延</button><button onClick={ancestors}>上溯</button></Actions>
        <div className="summary-card">
          <div><span>节点数</span><strong>{data?.nodes?.length ?? '-'}</strong></div>
          <div><span>关系边</span><strong>{data?.edges?.length ?? '-'}</strong></div>
          <div><span>根人物</span><strong>{rootPersonId}</strong></div>
        </div>
      </Panel>
      <Panel title="世系节点与关系">
        <div className="tree-preview">
          {(data?.nodes || []).slice(0, 8).map((node: any) => <span key={node.personId || node.id}>{node.name || node.personId}</span>)}
        </div>
        <DataTable
          data={data?.edges || []}
          columns={[
            { key: 'fromPersonId', title: 'From' },
            { key: 'toPersonId', title: 'To' },
            { key: 'relationType', title: '关系类型' },
            { key: 'relationLabel', title: '标签' }
          ]}
        />
      </Panel>
    </div>
  );
}
