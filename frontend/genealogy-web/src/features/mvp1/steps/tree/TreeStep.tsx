import { useState } from 'react';
import { Button, Empty, Space, Table, message } from 'antd';
import { apiClient } from '../../../../shared/api/client';
import { useWorkspace } from '../../../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../../../shared/ui/Form';
import { Panel } from '../../../../shared/ui/Panel';

type TreeMode = 'family' | 'ancestors' | 'descendants';

type TreeNodeLike = {
  id?: number | string;
  personId?: number | string;
  name?: string;
  generationNo?: number | string;
  generationWord?: string;
};

type TreeEdgeLike = {
  id?: number | string;
  fromPersonId?: number | string;
  toPersonId?: number | string;
  relationLabel?: string;
};

type Props = {
  notify?: (data: unknown, error?: boolean) => void;
};

function toRows<T = any>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.content)) return data.content;
  if (data && typeof data === 'object') return [data];
  return [];
}

export function TreeStep({ notify }: Props) {
  const workspace = useWorkspace();
  const [treeMode, setTreeMode] = useState<TreeMode>('family');
  const [depth, setDepth] = useState('5');
  const [nodes, setNodes] = useState<TreeNodeLike[]>([]);
  const [edges, setEdges] = useState<TreeEdgeLike[]>([]);
  const [loading, setLoading] = useState(false);

  function toast(data: unknown, error = false) {
    notify?.(data, error);
    const text = typeof data === 'string' ? data : (data as any)?.message;
    if (text) {
      if (error) message.error(text);
      else message.success(text);
    }
  }

  async function loadTree() {
    if (!workspace.personId) {
      toast({ message: '请选择已审核通过的中心人物' }, true);
      return;
    }
    const path = treeMode === 'ancestors'
      ? `/tree/ancestors?personId=${workspace.personId}&maxDepth=${depth}`
      : treeMode === 'descendants'
        ? `/tree/descendants?rootPersonId=${workspace.personId}&maxDepth=${depth}`
        : `/tree/person/${workspace.personId}/family`;
    setLoading(true);
    try {
      const data: any = await apiClient.get(path);
      setNodes(toRows<TreeNodeLike>(data?.nodes || []));
      setEdges(toRows<TreeEdgeLike>(data?.edges || []));
      toast({ message: '世系图谱已生成' });
    } catch (error) {
      setNodes([]);
      setEdges([]);
      toast({ message: (error as Error).message || '生成世系图失败' }, true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Panel title="查看世系" description="只允许选择已审核通过的人物查看世系。">
      <div className="wizard-form-grid">
        <Field label="中心人物">
          <input value={workspace.personId ? `人物#${workspace.personId}` : '请先在录入人物或建立关系步骤选中中心人物'} disabled readOnly />
        </Field>
        <Field label="图谱类型">
          <select value={treeMode} onChange={event => setTreeMode(event.target.value as TreeMode)}>
            <option value="family">家庭网络</option>
            <option value="ancestors">祖先链</option>
            <option value="descendants">后代树</option>
          </select>
        </Field>
        <Field label="展开深度">
          <select value={depth} onChange={event => setDepth(event.target.value)}>
            <option value="3">3代</option>
            <option value="5">5代</option>
            <option value="8">8代</option>
          </select>
        </Field>
      </div>
      <Actions>
        <button disabled={loading || !workspace.personId} onClick={() => void loadTree()}>生成世系图</button>
      </Actions>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Table<TreeNodeLike>
          size="small"
          bordered
          loading={loading}
          rowKey={row => String(row.id || row.personId || `${row.name || ''}-${row.generationNo || ''}`)}
          dataSource={nodes}
          pagination={false}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无节点，生成后展示" /> }}
          columns={[
            { key: 'name', title: '人物', render: (_value, row) => row.name || `人物#${row.personId || row.id || '-'}` },
            { key: 'generationNo', title: '代次', width: 100, render: (_value, row) => row.generationNo ? `第${row.generationNo}世` : '-' },
            { key: 'generationWord', title: '字辈', width: 100, render: (_value, row) => row.generationWord || '-' }
          ]}
        />
        <Table<TreeEdgeLike>
          size="small"
          bordered
          loading={loading}
          rowKey={row => String(row.id || `${row.fromPersonId || ''}-${row.toPersonId || ''}-${row.relationLabel || ''}`)}
          dataSource={edges}
          pagination={false}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无关系边" /> }}
          columns={[
            { key: 'fromPersonId', title: '起点', render: (_value, row) => row.fromPersonId || '-' },
            { key: 'toPersonId', title: '终点', render: (_value, row) => row.toPersonId || '-' },
            { key: 'relationLabel', title: '关系', render: (_value, row) => row.relationLabel || '-' }
          ]}
        />
      </Space>
    </Panel>
  );
}
