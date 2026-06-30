import { useState } from 'react';
import { Alert, Button, Card, Divider, Form, Input, Space, Typography } from 'antd';
import { apiClient } from '../../shared/api/client';

type Props = { onChanged: () => void; notify: (data: unknown, error?: boolean) => void; standalone?: boolean };

const demoAccounts = [
  { username: 'demo_admin', password: 'Admin@123456', label: '演示管理员', desc: '拥有两个演示宗族的宗族管理员权限' },
  { username: 'demo_editor', password: 'Demo@123456', label: '演示编辑', desc: '拥有两个演示宗族的编辑权限' }
];

export function AuthPage({ onChanged, notify, standalone = false }: Props) {
  const [username, setUsername] = useState('demo_admin');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('Mvp1@123456');
  const [loginName, setLoginName] = useState('demo_admin');
  const [loginPassword, setLoginPassword] = useState('Admin@123456');
  const [result, setResult] = useState<unknown>();
  const [loading, setLoading] = useState(false);

  async function register() {
    setLoading(true);
    try {
      const data: any = await apiClient.post('/auth/register', { username, displayName, password });
      const notice = { message: '账号注册成功', id: data?.id };
      setResult(notice);
      notify(notice);
    } catch (error) {
      notify({ message: (error as Error).message || '注册失败' }, true);
    } finally {
      setLoading(false);
    }
  }

  async function login() {
    setLoading(true);
    try {
      const data: any = await apiClient.post('/auth/login', { username: loginName, password: loginPassword });
      apiClient.setToken(data.accessToken);
      onChanged();
      const notice = { message: `登录成功：${data.user?.displayName || loginName}` };
      setResult(notice);
      notify(notice);
    } catch (error) {
      notify({ message: (error as Error).message || '登录失败' }, true);
    } finally {
      setLoading(false);
    }
  }

  function useDemo(account: typeof demoAccounts[number]) {
    setLoginName(account.username);
    setLoginPassword(account.password);
  }

  const content = (
    <div className="auth-layout">
      <div className="auth-hero-card">
        <Typography.Text type="secondary">Genealogy</Typography.Text>
        <Typography.Title level={2}>族谱管理平台</Typography.Title>
        <Typography.Paragraph type="secondary">
          登录后可维护宗族、人物档案、世系关系、来源证据、审核任务和关键事件时间轴。
        </Typography.Paragraph>
        <div className="auth-demo-list">
          {demoAccounts.map(account => (
            <button key={account.username} onClick={() => useDemo(account)}>
              <strong>{account.label}</strong>
              <span>{account.username} / {account.password}</span>
              <em>{account.desc}</em>
            </button>
          ))}
        </div>
      </div>

      <Card className="auth-card" title="账号登录">
        <Form layout="vertical">
          <Form.Item label="用户名">
            <Input value={loginName} onChange={e => setLoginName(e.target.value)} placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item label="密码">
            <Input.Password value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="请输入密码" onPressEnter={login} />
          </Form.Item>
          <Button type="primary" block loading={loading} onClick={login}>登录系统</Button>
        </Form>
        <Alert
          className="auth-tip"
          type="info"
          showIcon
          message="测试账号"
          description="推荐使用 demo_admin / Admin@123456 登录，可直接维护两个预置演示宗族。"
        />
        {result ? <Alert className="auth-result" type="success" showIcon message={(result as any)?.message || '操作成功'} /> : null}
      </Card>

      <Card className="auth-card auth-register-card" title="注册账号">
        <Form layout="vertical">
          <Form.Item label="用户名">
            <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="如 zhang_admin" />
          </Form.Item>
          <Form.Item label="显示名">
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="如 张氏修谱管理员" />
          </Form.Item>
          <Form.Item label="密码">
            <Input.Password value={password} onChange={e => setPassword(e.target.value)} placeholder="不少于 8 位" />
          </Form.Item>
          <Space>
            <Button loading={loading} onClick={register}>注册</Button>
            <Typography.Text type="secondary">注册后可创建新宗族并成为管理员</Typography.Text>
          </Space>
        </Form>
      </Card>
    </div>
  );

  if (standalone) {
    return (
      <div className="auth-page-shell">
        <div className="auth-page-inner">
          {content}
        </div>
      </div>
    );
  }

  return (
    <>
      <Space direction="vertical" size={4} className="auth-inline-title">
        <Typography.Title level={4}>登录认证</Typography.Title>
        <Typography.Text type="secondary">可使用演示账号登录，也可注册新账号。</Typography.Text>
      </Space>
      <Divider />
      {content}
    </>
  );
}
