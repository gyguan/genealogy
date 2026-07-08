import { useState } from 'react';
import { message } from 'antd';
import { apiClient } from '../../../../shared/api/client';
import { useWorkspace } from '../../../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../../../shared/ui/Form';
import { Panel } from '../../../../shared/ui/Panel';

type ClanForm = {
  clanName: string;
  surname: string;
  hallName: string;
  originPlace: string;
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
      setForm({ ...defaultClanForm });
      toast({ message: '宗族创建成功。宗族暂不纳入审核流，可继续创建支派。', id: data?.id });
      if (nextClanId) onCreated?.(nextClanId);
    } catch (error) {
      toast({ message: (error as Error).message || '创建宗族失败' }, true);
    } finally {
      setLoading(false);
    }
  }

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
    </Panel>
  );
}
