import { useMemo, useState } from 'react';
import { Button, Empty, Form, Input, Select, Space, Table, message } from 'antd';
import { apiClient } from '../../../../shared/api/client';
import { useWorkspace } from '../../../../shared/context/WorkspaceContext';
import { Panel } from '../../../../shared/ui/Panel';
import { toRows } from '../../domain/normalize';

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

const treeModeOptions = [
  { value: 'family', label: '家庭网络' },
  { value: 'ancestors', label: '祖先链' },
  { value: 'descendants', label: '后代树' }
];

const depthOptions = [
  { value: '3', label: '3代' },
  { value: '5', label: '5代' },
  { value: '8', label: '8代' }
];

function nodeId(row: TreeNodeLike) {
  return String(row.personId || row.id || '');
}

function relationText(value?: string) {
  const dict: Record<string, string> = {
    father: '父亲',
    mother: '母亲',
    spouse: '配偶',
    parent_child: '亲子',
    child: '子女',
    son: '儿子',
    daughter: '女儿'
  };
  return dict[String(value || '').toLowerCase()] || value || '-';
}

export function TreeStep({ notify }: Props) {
  const workspace = useWorkspace();
  const [treeMode, setTreeMode] = useState<TreeMode>('family');
  const [depth, setDepth] = useState('5');
  const [nodes, setNodes] = useState<TreeNodeLike[]>([]);
  const [edges, setEdges] = useState<TreeEdgeLike[]>([]);
  const [loading, setLoading] = useState(false);

  const personNameMap = useMemo(() => {
    const map = new Map<string, string>();
    nodes.forEach(row => {
      const id = nodeId(row);
      if (id) map.set(id, row.name || '未命名人物');
    });
    return map;
  }, [nodes]);

  function personName(id?: number | string) {
    return personNameMap.get(String(id || '')) || '人物待维护';
  }

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
      <Form layout="vertical" className="tree-step-form">
        <div className="wizard-form-grid">
          <Form.Item label="中心人物">
            <Input value={workspace.personId ? '已选中中心人物，可生成世系图' : '请先在录入人物或建立关系步骤选中中心人物'} disabled readOnly />
          </Form.Item>
          <Form.Item label="图谱类型">
            <Select value={treeMode} onChange={value => setTreeMode(value)} options={treeModeOptions} />
          </Form.Item>
          <Form.Item label="展开深度">
            <Select value={depth} onChange={setDepth} options={depthOptions} />
          </Form.Item>
        </div>
        <Space className="actions antd-actions" wrap>
          <Button type="primary" disabled={loading || !workspace.personId} loading={loading} onClick={() => void loadTree()}>生成世系图</Button>
        </Space>
      </Form>
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
            { key: 'name', title: '人物', render: (_value, row) => row.name || '未命名人物' },
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
            { key: 'fromPersonId', title: '起点人物', render: (_value, row) => personName(row.fromPersonId) },
            { key: 'toPersonId', title: '关联人物', render: (_value, row) => personName(row.toPersonId) },
            { key: 'relationLabel', title: '关系', render: (_value, row) => relationText(row.relationLabel) }
          ]}
        />
      </Space>
    </Panel>
  );
}
