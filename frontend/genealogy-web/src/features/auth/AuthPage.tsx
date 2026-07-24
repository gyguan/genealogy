import {
  useMemo,
  useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Form,
  Input,
  Modal,
  Space,
  Tag,
  Typography
} from 'antd';
import { apiClient } from '../../shared/api/client';
import {
  AUTH_REMEMBERED_USERNAME_KEY,
  authModeFromLocation,
  invitationTokenFromLocation,
  resetTokenFromLocation,
  type AuthMode
} from './authPageModel.js';

import { feedback } from '../../shared/ui/OperationFeedback';

import { PageFeedback } from '../../shared/ui/Feedback';

const { Paragraph, Text, Title } = Typography;

type Props = {
  onChanged: () => void;

  standalone?: boolean;
};

type LoginValues = {
  username: string;
  password: string;
  rememberUsername?: boolean;
  rememberMe?: boolean;
};

type ForgotValues = { account: string };
type ResetValues = { resetToken: string; newPassword: string; confirmPassword: string };
type InvitationValues = {
  invitationToken: string;
  username: string;
  displayName: string;
  email?: string;
  password: string;
  confirmPassword: string;
};

type AuthNotice = { type: 'success' | 'info'; message: string; description?: string };

const productCapabilities = [
  { icon: '世', title: '世系协同管理', description: '围绕宗族、支派与人物建立清晰可信的世系关系。' },
  { icon: '据', title: '来源证据可追溯', description: '族谱原文、照片和口述材料均可关联、复核与回溯。' },
  { icon: '审', title: '权限与审核内建', description: '按角色和支派范围协作，关键变更全程留痕。' }
];

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function showPolicy(title: string, content: string) {
  Modal.info({ title, content, okText: '我知道了', width: 520 });
}

export function AuthPage({ onChanged, standalone = false }: Props) {
  const initialMode = useMemo(() => authModeFromLocation(window.location.search), []);
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [inlineError, setInlineError] = useState('');
  const [notice, setNotice] = useState<AuthNotice | null>(null);
  const [loginForm] = Form.useForm<LoginValues>();
  const [forgotForm] = Form.useForm<ForgotValues>();
  const [resetForm] = Form.useForm<ResetValues>();
  const [invitationForm] = Form.useForm<InvitationValues>();

  const rememberedUsername = localStorage.getItem(AUTH_REMEMBERED_USERNAME_KEY) || '';

  async function run(action: () => Promise<void>) {
    if (loading) return;
    setLoading(true);
    setInlineError('');
    setNotice(null);
    try {
      await action();
    } catch (error) {
      setInlineError(errorMessage(error, '操作失败，请稍后重试'));
    } finally {
      setLoading(false);
    }
  }

  async function login(values: LoginValues) {
    await run(async () => {
      const username = values.username.trim();
      const data: any = await apiClient.post('/auth/login', {
        username,
        password: values.password,
        rememberMe: Boolean(values.rememberMe)
      });
      apiClient.setToken(data?.accessToken || '');
      apiClient.setCsrfToken(data?.csrfToken || '');
      if (values.rememberUsername) {
        localStorage.setItem(AUTH_REMEMBERED_USERNAME_KEY, username);
      } else {
        localStorage.removeItem(AUTH_REMEMBERED_USERNAME_KEY);
      }
      feedback.from({ message: `欢迎回来，${data?.user?.displayName || username}` });
      onChanged();
    });
  }

  async function requestPasswordReset(values: ForgotValues) {
    await run(async () => {
      const data: any = await apiClient.post('/auth/password/forgot', { account: values.account.trim() });
      setNotice({
        type: 'success',
        message: '重置申请已受理',
        description: data?.message || '若账号信息匹配，我们将发送密码重置指引。请检查邮箱或联系宗族管理员。'
      });
      if (data?.developmentToken) {
        resetForm.setFieldValue('resetToken', data.developmentToken);
        setMode('reset');
      }
    });
  }

  async function resetPassword(values: ResetValues) {
    await run(async () => {
      await apiClient.post('/auth/password/reset', {
        resetToken: values.resetToken.trim(),
        newPassword: values.newPassword
      });
      setMode('login');
      setNotice({ type: 'success', message: '密码已重置', description: '请使用新密码重新登录。' });
      resetForm.resetFields();
    });
  }

  async function acceptInvitation(values: InvitationValues) {
    await run(async () => {
      await apiClient.post('/auth/invitations/accept', {
        invitationToken: values.invitationToken.trim(),
        username: values.username.trim(),
        displayName: values.displayName.trim(),
        email: values.email?.trim() || undefined,
        password: values.password
      });
      invitationForm.resetFields();
      setMode('login');
      setNotice({ type: 'success', message: '账号已开通', description: '您的宗族成员身份和授权已生效，请登录系统。' });
    });
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setInlineError('');
    setNotice(null);
  }

  function renderLogin() {
    return (
      <>
        <div className="commercial-auth-heading">
          <Text className="commercial-auth-eyebrow">安全登录</Text>
          <Title level={2}>欢迎回来</Title>
          <Paragraph type="secondary">登录后继续维护族谱、来源资料和审核任务。</Paragraph>
        </div>
        <Form<LoginValues>
          form={loginForm}
          layout="vertical"
          requiredMark={false}
          initialValues={{ username: rememberedUsername, rememberUsername: Boolean(rememberedUsername), rememberMe: false }}
          onFinish={login}
          autoComplete="on"
        >
          <Form.Item name="username" label="账号" rules={[{ required: true, whitespace: true, message: '请输入账号' }]}>
            <Input prefix={<span className="commercial-auth-input-mark">用</span>} autoComplete="username" placeholder="请输入用户名" size="large" maxLength={100} />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<span className="commercial-auth-input-mark">密</span>} autoComplete="current-password" placeholder="请输入密码" size="large" />
          </Form.Item>
          <div className="commercial-auth-options">
            <Space size={16} wrap>
              <Form.Item name="rememberUsername" valuePropName="checked" noStyle>
                <Checkbox>记住账号</Checkbox>
              </Form.Item>
              <Form.Item name="rememberMe" valuePropName="checked" noStyle>
                <Checkbox>保持登录</Checkbox>
              </Form.Item>
            </Space>
            <Button type="link" onClick={() => switchMode('forgot')}>忘记密码？</Button>
          </div>
          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            登录系统
          </Button>
        </Form>
        <div className="commercial-auth-secondary-action">
          <Text type="secondary">首次使用或受邀加入宗族？</Text>
          <Button type="link" onClick={() => switchMode('invite')}>接受邀请并开通账号</Button>
        </div>
      </>
    );
  }

  function renderForgot() {
    return (
      <>
        <Button type="text" onClick={() => switchMode('login')} className="commercial-auth-back">← 返回登录</Button>
        <div className="commercial-auth-heading">
          <Text className="commercial-auth-eyebrow">账号恢复</Text>
          <Title level={2}>找回密码</Title>
          <Paragraph type="secondary">输入用户名、邮箱或手机号。为保护账号安全，我们不会提示账号是否存在。</Paragraph>
        </div>
        <Form<ForgotValues> form={forgotForm} layout="vertical" requiredMark={false} onFinish={requestPasswordReset}>
          <Form.Item name="account" label="账号信息" rules={[{ required: true, whitespace: true, message: '请输入用户名、邮箱或手机号' }]}>
            <Input prefix={<span className="commercial-auth-input-mark">用</span>} placeholder="用户名 / 邮箱 / 手机号" size="large" maxLength={120} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={loading}>提交重置申请</Button>
        </Form>
        <Button type="link" block onClick={() => switchMode('reset')}>已有重置凭据</Button>
      </>
    );
  }

  function renderReset() {
    return (
      <>
        <Button type="text" onClick={() => switchMode('login')} className="commercial-auth-back">← 返回登录</Button>
        <div className="commercial-auth-heading">
          <Text className="commercial-auth-eyebrow">安全重置</Text>
          <Title level={2}>设置新密码</Title>
          <Paragraph type="secondary">重置完成后，其他设备上的登录会话将失效。</Paragraph>
        </div>
        <Form<ResetValues>
          form={resetForm}
          layout="vertical"
          requiredMark={false}
          initialValues={{ resetToken: resetTokenFromLocation(window.location.search) }}
          onFinish={resetPassword}
        >
          <Form.Item name="resetToken" label="重置凭据" rules={[{ required: true, whitespace: true, message: '请输入重置凭据' }]}>
            <Input.Password placeholder="请输入收到的重置凭据" size="large" autoComplete="one-time-code" />
          </Form.Item>
          <Form.Item name="newPassword" label="新密码" rules={[{ required: true, message: '请输入新密码' }, { min: 8, message: '密码至少 8 位' }, { max: 64, message: '密码不能超过 64 位' }]}>
            <Input.Password placeholder="8–64 位" size="large" autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请再次输入新密码' },
              ({ getFieldValue }) => ({ validator: (_, value) => !value || value === getFieldValue('newPassword') ? Promise.resolve() : Promise.reject(new Error('两次输入的密码不一致')) })
            ]}
          >
            <Input.Password placeholder="再次输入新密码" size="large" autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={loading}>确认重置密码</Button>
        </Form>
      </>
    );
  }

  function renderInvitation() {
    return (
      <>
        <Button type="text" onClick={() => switchMode('login')} className="commercial-auth-back">← 返回登录</Button>
        <div className="commercial-auth-heading">
          <Text className="commercial-auth-eyebrow">受控准入</Text>
          <Title level={2}>接受宗族邀请</Title>
          <Paragraph type="secondary">邀请将绑定指定宗族、角色和管理范围，开通后不可自行扩大权限。</Paragraph>
        </div>
        <Form<InvitationValues>
          form={invitationForm}
          layout="vertical"
          requiredMark={false}
          initialValues={{ invitationToken: invitationTokenFromLocation(window.location.search) }}
          onFinish={acceptInvitation}
        >
          <Form.Item name="invitationToken" label="邀请凭据" rules={[{ required: true, whitespace: true, message: '请输入邀请凭据' }]}>
            <Input.Password placeholder="请输入宗族管理员提供的邀请凭据" size="large" autoComplete="one-time-code" />
          </Form.Item>
          <div className="commercial-auth-form-grid">
            <Form.Item name="username" label="登录账号" rules={[{ required: true, whitespace: true, message: '请输入登录账号' }, { max: 80, message: '账号不能超过 80 个字符' }]}>
              <Input placeholder="如 zhangsan" size="large" autoComplete="username" />
            </Form.Item>
            <Form.Item name="displayName" label="显示名称" rules={[{ required: true, whitespace: true, message: '请输入显示名称' }, { max: 120, message: '显示名称不能超过 120 个字符' }]}>
              <Input placeholder="如 张氏修谱成员" size="large" />
            </Form.Item>
          </div>
          <Form.Item name="email" label="邮箱（选填）" rules={[{ type: 'email', message: '请输入有效邮箱' }, { max: 120, message: '邮箱不能超过 120 个字符' }]}>
            <Input placeholder="用于密码找回和安全通知" size="large" autoComplete="email" />
          </Form.Item>
          <div className="commercial-auth-form-grid">
            <Form.Item name="password" label="设置密码" rules={[{ required: true, message: '请输入密码' }, { min: 8, message: '密码至少 8 位' }, { max: 64, message: '密码不能超过 64 位' }]}>
              <Input.Password placeholder="8–64 位" size="large" autoComplete="new-password" />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label="确认密码"
              dependencies={['password']}
              rules={[
                { required: true, message: '请再次输入密码' },
                ({ getFieldValue }) => ({ validator: (_, value) => !value || value === getFieldValue('password') ? Promise.resolve() : Promise.reject(new Error('两次输入的密码不一致')) })
              ]}
            >
              <Input.Password placeholder="再次输入密码" size="large" autoComplete="new-password" />
            </Form.Item>
          </div>
          <Button type="primary" htmlType="submit" block size="large" loading={loading}>接受邀请并开通账号</Button>
        </Form>
      </>
    );
  }

  const content = (
    <div className="commercial-auth-layout">
      <section className="commercial-auth-brand" aria-label="族谱管理平台介绍">
        <div className="commercial-auth-brand-top">
          <div className="commercial-auth-mark" aria-hidden="true">谱</div>
          <div>
            <Text className="commercial-auth-product-en">GENEALOGY</Text>
            <Title level={3}>族谱管理平台</Title>
          </div>
        </div>
        <div className="commercial-auth-brand-copy">
          <Tag className="commercial-auth-brand-tag">数字修谱 · 可信传承</Tag>
          <Title>让家族历史有据可查<br />让世系传承清晰可信</Title>
          <Paragraph>统一管理人物、世系、来源资料与修谱审核，形成可持续传承的数字族谱。</Paragraph>
        </div>
        <div className="commercial-auth-capabilities">
          {productCapabilities.map(item => (
            <div key={item.title} className="commercial-auth-capability">
              <span>{item.icon}</span>
              <div><strong>{item.title}</strong><p>{item.description}</p></div>
            </div>
          ))}
        </div>
        <div className="commercial-auth-lineage" aria-hidden="true">
          <span /><span /><span /><span /><span />
        </div>
      </section>

      <section className="commercial-auth-panel" aria-label="账号认证">
        <div className="commercial-auth-card">
          {notice ? <PageFeedback tone={notice.type} title={notice.message} description={notice.description} closable onClose={() => setNotice(null)} /> : null}
          {inlineError ? <PageFeedback tone="error" title="操作未完成" description={inlineError} closable onClose={() => setInlineError('')} /> : null}
          {mode === 'login' ? renderLogin() : null}
          {mode === 'forgot' ? renderForgot() : null}
          {mode === 'reset' ? renderReset() : null}
          {mode === 'invite' ? renderInvitation() : null}
          <div className="commercial-auth-security-note"><span aria-hidden="true">✓</span> 使用加密连接和服务端安全会话保护您的账号</div>
        </div>
        <footer className="commercial-auth-footer">
          <Text type="secondary">© 2026 Genealogy</Text>
          <Space split={<Text type="secondary">·</Text>}>
            <Button type="link" onClick={() => showPolicy('隐私政策', '平台仅在履行族谱管理、成员协作和安全审计所必需的范围内处理账号与宗族数据。')}>隐私政策</Button>
            <Button type="link" onClick={() => showPolicy('服务协议', '使用平台前，请确认已获得宗族授权，并遵守在世人员隐私、来源证据和审核规则。')}>服务协议</Button>
          </Space>
        </footer>
      </section>
    </div>
  );

  if (standalone) return <main className="commercial-auth-shell">{content}</main>;
  return content;
}
