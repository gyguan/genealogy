import { useEffect, useState } from 'react';
import { Alert, Card, message } from 'antd';
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

export function ClanStep({ notify, onCreated }: Props) {
  const workspace = useWorkspace();
  const [form, setForm] = useState<ClanForm>({ ...defaultClanForm });
  const [loading, setLoading] = useState(false);
  const [currentClan, setCurrentClan] = useState<ClanRecord | null>(null);

  useEffect(() => {
    let active = true;
    if (!workspace.clanId) {
      setCurrentClan(null);
      return () => { active = false; };
    }
    apiClient.get<ClanRecord>(`/clans/${workspace.clanId}`)
      .then(value => { if (active) setCurrentClan(value); })
      .catch(() => { if (active) setCurrentClan(null); });
    return () => { active = false; };
  }, [workspace.clanId]);

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
      setCurrentClan(data || null);
      setForm({ ...defaultClanForm });
      toast({ message: '宗族创建成功。宗族暂不纳入审核流，可继续创建支派。', id: data?.id });
      if (nextClanId) onCreated?.(nextClanId);
    } catch (error) {
      toast({ message: (error as Error).message || '创建宗族失败' }, true);
    } finally {
      setLoading(false);
    }
  }

  async function afterDeleteClan() {
    setCurrentClan(null);
    workspace.patch({ clanId: '', branchId: '', personId: '', sourceId: '', reviewTaskId: '', relationshipId: '' });
    toast({ message: '空草稿宗族已删除，可重新创建。' });
  }

  return (
    <Panel title="创建宗族" description="宗族作为建谱容器暂不进入审核流；创建后继续维护支派。">
      {currentClan ? (
        <Card
          size="small"
          title="当前宗族"
          extra={currentClan.id ? (
            <DraftDeleteButton
              object={currentClan}
              objectName={currentClan.clanName || currentClan.surname}
              objectType="宗族"
              onDelete={() => apiClient.delete(`/clans/${currentClan.id}`)}
              onDeleted={afterDeleteClan}
              label="删除空草稿宗族"
              buttonProps={{ size: 'small' }}
            />
          ) : null}
          style={{ marginBottom: 16 }}
        >
          <Alert
            type="info"
            showIcon
            message={`${currentClan.clanName || currentClan.surname || '当前宗族'} · ${String(currentClan.status || 'draft') === 'draft' ? '草稿' : currentClan.status || '状态待确认'}`}
            description="只有尚未创建支派的草稿宗族可直接删除；存在支派时后端会阻止删除并返回真实原因。"
          />
        </Card>
      ) : null}
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
    </Panel>
  );
}
