import { useMemo, useState } from 'react';
import { Alert, Button, Form, Input, Modal, Select, Space } from 'antd';
import { apiClient } from '../../shared/api/client';
import { feedback } from '../../shared/ui/OperationFeedback';

type Role = {
  roleCode: string;
  roleName: string;
  allowedScopeTypes?: string[];
  riskLevel?: string;
};

type Branch = { id: number; branchName: string };

type InvitationValues = {
  email?: string;
  roleCode: string;
  scopeType: string;
  scopeId: number;
};

type Props = {
  open: boolean;
  clanId: number;
  roles: Role[];
  branches: Branch[];
  onClose: () => void;
};

function dateTime(value?: string) {
  return value ? value.replace('T', ' ').slice(0, 16) : '-';
}

export function MemberInvitationModal({ open, clanId, roles, branches, onClose }: Props) {
  const [form] = Form.useForm<InvitationValues>();
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const roleCode = Form.useWatch('roleCode', form);
  const scopeType = Form.useWatch('scopeType', form);
  const selectedRole = useMemo(() => roles.find(role => role.roleCode === roleCode), [roles, roleCode]);

  function resetAndClose() {
    form.resetFields();
    setToken('');
    setExpiresAt('');
    onClose();
  }

  function initialize() {
    if (!open || form.getFieldValue('roleCode')) return;
    const role = roles[0];
    const initialScope = role?.allowedScopeTypes?.[0] || 'clan';
    form.setFieldsValue({
      roleCode: role?.roleCode,
      scopeType: initialScope,
      scopeId: initialScope === 'clan' ? clanId : undefined
    });
  }

  async function submit() {
    const values = await form.validateFields();
    setLoading(true);
    try {
      const result: any = await apiClient.post('/auth/invitations', {
        clanId,
        email: values.email?.trim() || undefined,
        roleCode: values.roleCode,
        scopeType: values.scopeType,
        scopeId: Number(values.scopeId)
      });
      setToken(result.invitationToken || '');
      setExpiresAt(result.expiresAt || '');
      feedback.success('成员邀请已生成，请通过安全渠道发送给受邀人');
    } catch (error) {
      feedback.error(error instanceof Error ? error.message : '邀请生成失败');
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    const link = `${window.location.origin}/?auth=invite&invitationToken=${encodeURIComponent(token)}`;
    await navigator.clipboard.writeText(link);
    feedback.success('邀请链接已复制');
  }

  const link = token
    ? `${window.location.origin}/?auth=invite&invitationToken=${encodeURIComponent(token)}`
    : '';

  return (
    <Modal
      title="邀请新成员"
      open={open}
      afterOpenChange={visible => { if (visible) initialize(); }}
      onCancel={resetAndClose}
      onOk={token ? resetAndClose : () => void submit()}
      okText={token ? '完成' : '生成邀请'}
      confirmLoading={loading}
      destroyOnClose
    >
      {token ? (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Alert
            type="success"
            showIcon
            message="一次性邀请已生成"
            description={`有效期至 ${dateTime(expiresAt)}。邀请链接只在当前窗口展示一次，请通过可信渠道发送。`}
          />
          <Input.TextArea readOnly autoSize={{ minRows: 3, maxRows: 5 }} value={link} />
          <Button type="primary" onClick={() => void copyLink()}>复制邀请链接</Button>
        </Space>
      ) : (
        <Form form={form} layout="vertical">
          <Form.Item name="email" label="受邀人邮箱（选填）" rules={[{ type: 'email', message: '请输入有效邮箱' }]}>
            <Input placeholder="填写后，接受邀请时必须使用相同邮箱" />
          </Form.Item>
          <Form.Item name="roleCode" label="预设角色" rules={[{ required: true, message: '请选择角色' }]}>
            <Select
              options={roles.map(role => ({ value: role.roleCode, label: role.roleName }))}
              onChange={value => {
                const role = roles.find(item => item.roleCode === value);
                const nextScope = role?.allowedScopeTypes?.[0] || 'clan';
                form.setFieldsValue({ roleCode: value, scopeType: nextScope, scopeId: nextScope === 'clan' ? clanId : undefined });
              }}
            />
          </Form.Item>
          <Form.Item name="scopeType" label="授权范围" rules={[{ required: true, message: '请选择授权范围' }]}>
            <Select
              options={(selectedRole?.allowedScopeTypes || ['clan']).map(scope => ({
                value: scope,
                label: scope === 'clan' ? '全宗族' : '指定支派及下级支派'
              }))}
              onChange={value => form.setFieldValue('scopeId', value === 'clan' ? clanId : undefined)}
            />
          </Form.Item>
          {scopeType === 'branch_subtree' ? (
            <Form.Item name="scopeId" label="选择支派" rules={[{ required: true, message: '请选择支派' }]}>
              <Select
                showSearch
                optionFilterProp="label"
                options={branches.map(branch => ({ value: branch.id, label: `${branch.branchName}及下级支派` }))}
              />
            </Form.Item>
          ) : <Form.Item name="scopeId" hidden><Input /></Form.Item>}
          <Alert
            type={selectedRole?.riskLevel === 'high' ? 'warning' : 'info'}
            showIcon
            message="接受邀请时会再次校验邀请人的当前权限"
            description="邀请无法绕过角色层级、支派范围和最后管理员等后端安全规则。"
          />
        </Form>
      )}
    </Modal>
  );
}
