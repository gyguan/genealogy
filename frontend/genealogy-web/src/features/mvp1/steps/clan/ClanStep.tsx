import { useState } from 'react';
import { Alert, Button, Form, Input, Space, message } from 'antd';
import { apiClient } from '../../../../shared/api/client';
import { useWorkspace } from '../../../../shared/context/WorkspaceContext';
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
  const [form] = Form.useForm<ClanForm>();
  const [values, setValues] = useState<ClanForm>({ ...defaultClanForm });
  const [loading, setLoading] = useState(false);

  function toast(data: unknown, error = false) {
    notify?.(data, error);
    const text = typeof data === 'string' ? data : (data as any)?.message;
    if (text) {
      if (error) message.error(text);
      else message.success(text);
    }
  }

  async function createClan() {
    const nextValues = await form.validateFields();
    setLoading(true);
    try {
      const payload = {
        ...nextValues,
        clanName: nextValues.clanName.trim(),
        surname: nextValues.surname.trim(),
        hallName: nextValues.hallName?.trim() || '',
        originPlace: nextValues.originPlace?.trim() || ''
      };
      const data: any = await apiClient.post('/clans', payload);
      const nextClanId = String(data?.id || '');
      workspace.patch({ clanId: nextClanId, branchId: '', personId: '', sourceId: '', reviewTaskId: '', relationshipId: '' });
      form.resetFields();
      setValues({ ...defaultClanForm });
      toast({ message: '宗族创建成功。宗族暂不纳入审核流，可继续创建支派。' });
      if (nextClanId) onCreated?.(nextClanId);
    } catch (error) {
      if ((error as any)?.errorFields) return;
      toast({ message: (error as Error).message || '创建宗族失败' }, true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Panel title="创建宗族" description="宗族作为建谱容器暂不进入审核流；创建后继续维护支派。">
      <Alert
        type="info"
        showIcon
        message="前置条件"
        description="请录入面向族人的宗族名称、姓氏、堂号和祖籍信息；系统内部标识由后端自动生成，无需用户填写。"
        style={{ marginBottom: 16 }}
      />
      <Form
        form={form}
        layout="vertical"
        className="mvp1-clan-form"
        initialValues={values}
        onValuesChange={(_, nextValues) => setValues(nextValues as ClanForm)}
      >
        <div className="wizard-form-grid">
          <Form.Item label="宗族名称" name="clanName" rules={[{ required: true, whitespace: true, message: '请填写宗族名称' }]}>
            <Input placeholder="例如：江夏堂黄氏宗族" />
          </Form.Item>
          <Form.Item label="姓氏" name="surname" rules={[{ required: true, whitespace: true, message: '请填写姓氏' }]}>
            <Input placeholder="例如：黄" />
          </Form.Item>
          <Form.Item label="堂号" name="hallName">
            <Input placeholder="例如：江夏堂" />
          </Form.Item>
          <Form.Item label="祖籍/发源地" name="originPlace">
            <Input placeholder="例如：湖北江夏" />
          </Form.Item>
        </div>
        <Space className="actions antd-actions" wrap>
          <Button type="primary" loading={loading} onClick={() => void createClan()}>创建宗族</Button>
          <Button disabled={loading} onClick={() => { form.resetFields(); setValues({ ...defaultClanForm }); }}>重置</Button>
        </Space>
      </Form>
    </Panel>
  );
}
