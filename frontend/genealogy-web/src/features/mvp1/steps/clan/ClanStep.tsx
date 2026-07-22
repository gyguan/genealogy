import { useEffect, useState } from 'react';
import { Alert, Button, Card, Space, Table, Tag, Typography, message } from 'antd';
import type { TableProps } from 'antd';
import { apiClient } from '../../../../shared/api/client';
import { useWorkspace } from '../../../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../../../shared/ui/Form';
import { Panel } from '../../../../shared/ui/Panel';
import { DraftDeleteButton } from '../../../../shared/ui/DraftDeleteButton';

type ClanForm = {
  clanName: string;
  surname: string;
  hallName: string;
  originPlace: string;
};

type ClanRecord = {
  id?: number | string;
  clanName?: string;
  surname?: string;
  status?: string;
  allowedActions?: string[];
};

type Props = {
  notify?: (data: unknown, error?: boolean) => void;
  onCreated?: (clanId: string) => void;
};

const defaultClanForm: ClanForm = {
  clanName: '',
  surname: '',
  hallName: '',
  originPlace: ''
};

function clanRows(data: unknown): ClanRecord[] {
  if (Array.isArray(data)) return data as ClanRecord[];
  if (!data || typeof data !== 'object') return [];
  const record = data as Record<string, unknown>;
  const rows = [record.records, record.items, record.content].find(Array.isArray);
  return Array.isArray(rows) ? rows as ClanRecord[] : [];
}

function clanDisplayName(clan: ClanRecord) {
  return clan.clanName || clan.surname || '未命名宗族';
}

function clanStatus(status?: string) {
  const value = String(status || 'draft').trim().toLowerCase();
  if (value === 'draft') return { text: '草稿', color: 'default' };
  if (value === 'official' || value === 'approved') return { text: '正式', color: 'success' };
  if (value === 'archived') return { text: '已归档', color: 'warning' };
  return { text: status || '状态待确认', color: 'default' };
}

export function ClanStep({ notify, onCreated }: Props) {
  const workspace = useWorkspace();
  const [form, setForm] = useState<ClanForm>({ ...defaultClanForm });
  const [loading, setLoading] = useState(false);
  const [clans, setClans] = useState<ClanRecord[]>([]);
  const [clanListLoading, setClanListLoading] = useState(false);
  const [clanListError, setClanListError] = useState('');
  const [clanPageNo, setClanPageNo] = useState(1);
  const [clanPageSize, setClanPageSize] = useState(10);

  async function loadClans() {
    setClanListLoading(true);
    setClanListError('');
    try {
      const data = await apiClient.get('/clans');
      setClans(clanRows(data));
      setClanPageNo(1);
    } catch (error) {
      setClanListError((error as Error).message || '宗族列表加载失败');
    } finally {
      setClanListLoading(false);
    }
  }

  useEffect(() => {
    void loadClans();
  }, []);

  function patch(key: keyof ClanForm, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function toast(data: unknown, error = false) {
    notify?.(data, error);
    const text = typeof data === 'string' ? data : (data as any)?.message;
    if (text) {
      if (error) message.error(text);
      else message.success(text);
    }
  }

  function selectClan(clan: ClanRecord) {
    const clanId = String(clan.id || '');
    if (!clanId) return;
    workspace.patch({ clanId, branchId: '', personId: '', sourceId: '', reviewTaskId: '', relationshipId: '' });
    toast({ message: `已选择宗族“${clanDisplayName(clan)}”，继续维护支派。` });
    onCreated?.(clanId);
  }

  async function createClan() {
    if (!form.clanName.trim()) {
      toast({ message: '请填写宗族名称' }, true);
      return;
    }
    if (!form.surname.trim()) {
      toast({ message: '请填写姓氏' }, true);
      return;
    }
    setLoading(true);
    try {
      const data: any = await apiClient.post('/clans', form);
      const nextClanId = String(data?.id || '');
      workspace.patch({ clanId: nextClanId, branchId: '', personId: '', sourceId: '', reviewTaskId: '', relationshipId: '' });
      setForm({ ...defaultClanForm });
      await loadClans();
      toast({ message: '宗族创建成功。宗族暂不纳入审核流，可继续创建支派。', id: data?.id });
      if (nextClanId) onCreated?.(nextClanId);
    } catch (error) {
      toast({ message: (error as Error).message || '创建宗族失败' }, true);
    } finally {
      setLoading(false);
    }
  }

  async function afterDeleteClan(clan: ClanRecord) {
    if (String(clan.id || '') === workspace.clanId) {
      workspace.patch({ clanId: '', branchId: '', personId: '', sourceId: '', reviewTaskId: '', relationshipId: '' });
    }
    await loadClans();
  }

  const columns: TableProps<ClanRecord>['columns'] = [
    {
      title: '宗族名称',
      key: 'clanName',
      render: (_, clan) => (
        <Space size={8} wrap>
          <Typography.Text strong>{clanDisplayName(clan)}</Typography.Text>
          {String(clan.id || '') === workspace.clanId ? <Tag color="blue">当前</Tag> : null}
        </Space>
      )
    },
    {
      title: '姓氏',
      dataIndex: 'surname',
      key: 'surname',
      width: 120,
      render: value => value || '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: value => {
        const status = clanStatus(value);
        return <Tag color={status.color}>{status.text}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      render: (_, clan) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => selectClan(clan)}>
            {String(clan.id || '') === workspace.clanId ? '继续建谱' : '选择并继续'}
          </Button>
          <DraftDeleteButton
            object={clan}
            objectName={clanDisplayName(clan)}
            objectType="宗族"
            onDelete={() => apiClient.delete(`/clans/${clan.id}`)}
            onDeleted={() => afterDeleteClan(clan)}
            label="删除草稿"
            buttonProps={{ type: 'link', size: 'small' }}
          />
        </Space>
      )
    }
  ];

  return (
    <Panel title="创建宗族" description="宗族作为建谱容器暂不进入审核流；创建后继续维护支派。">
      <div className="wizard-form-grid">
        <Field label="宗族名称 *">
          <input value={form.clanName} onChange={event => patch('clanName', event.target.value)} placeholder="例如：江夏堂黄氏宗族" required />
        </Field>
        <Field label="姓氏 *">
          <input value={form.surname} onChange={event => patch('surname', event.target.value)} placeholder="例如：黄" required />
        </Field>
        <Field label="系统生成编码"><input value="保存后自动生成" disabled readOnly /></Field>
        <Field label="堂号"><input value={form.hallName} onChange={event => patch('hallName', event.target.value)} /></Field>
        <Field label="祖籍/发源地"><input value={form.originPlace} onChange={event => patch('originPlace', event.target.value)} /></Field>
      </div>
      <Actions>
        <button disabled={loading} onClick={() => void createClan()}>创建宗族</button>
      </Actions>

      <Card
        size="small"
        title={`我的宗族（共${clans.length}个）`}
        extra={<Button loading={clanListLoading} onClick={() => void loadClans()}>刷新</Button>}
        style={{ marginTop: 16 }}
      >
        {clanListError ? (
          <Alert
            type="error"
            showIcon
            message="宗族列表加载失败"
            description={clanListError}
            action={<Button type="link" onClick={() => void loadClans()}>重新加载</Button>}
            style={{ marginBottom: 12 }}
          />
        ) : null}
        <Table<ClanRecord>
          rowKey={clan => String(clan.id)}
          size="small"
          loading={clanListLoading}
          columns={columns}
          dataSource={clans}
          locale={{ emptyText: '当前账号暂无宗族，可在上方创建' }}
          pagination={{
            current: clanPageNo,
            pageSize: clanPageSize,
            total: clans.length,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
            showTotal: total => `共 ${total} 个宗族`,
            onChange: (pageNo, pageSize) => {
              setClanPageNo(pageNo);
              setClanPageSize(pageSize);
            }
          }}
        />
      </Card>
    </Panel>
  );
}
