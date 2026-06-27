import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { DataBlock } from '../../shared/ui/DataBlock';
import { Panel } from '../../shared/ui/Panel';

export function TreePage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const workspace = useWorkspace();
  const [depth, setDepth] = useState('5');
  const [data, setData] = useState<any>();

  async function family() {
    const res = await apiClient.get(`/tree/person/${workspace.personId}/family`);
    setData(res);
    notify(res);
  }

  async function descendants() {
    const res = await apiClient.get(`/tree/descendants?rootPersonId=${workspace.personId}&maxDepth=${depth || 5}`);
    setData(res);
    notify(res);
  }

  async function ancestors() {
    const res = await apiClient.get(`/tree/ancestors?personId=${workspace.personId}&maxDepth=${depth || 5}`);
    setData(res);
    notify(res);
  }

  return (
    <div className="page-grid two">
      <Panel title="世系查询" description="后端返回 rootPersonId / nodes / edges，前端展示核心节点和边。人物ID来自工作台上下文。">
        <Field label="当前人物ID"><input value={workspace.personId} onChange={e => workspace.setPersonId(e.target.value)} /></Field>
        <Field label="深度"><input value={depth} onChange={e => setDepth(e.target.value)} /></Field>
        <Actions><button onClick={family}>家庭图</button><button onClick={descendants}>下延</button><button onClick={ancestors}>上溯</button></Actions>
      </Panel>
      <Panel title="世系结果">
        <div className="tree-preview">
          {(data?.nodes || []).slice(0, 8).map((node: any) => <span key={node.personId || node.id}>{node.name || node.personId}</span>)}
        </div>
        <DataBlock data={data} />
      </Panel>
    </div>
  );
}
