import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { Actions, Field } from '../../shared/ui/Form';
import { Panel } from '../../shared/ui/Panel';

type Props = { onChanged: () => void; notify: (data: unknown, error?: boolean) => void };

export function AuthPage({ onChanged, notify }: Props) {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('Mvp1@123456');
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('Mvp1@123456');

  async function register() {
    const data = await apiClient.post('/auth/register', { username, displayName, password });
    notify(data);
  }

  async function login() {
    const data: any = await apiClient.post('/auth/login', { username: loginName, password: loginPassword });
    apiClient.setToken(data.accessToken);
    onChanged();
    notify(data);
  }

  async function me() {
    notify(await apiClient.get('/auth/me'));
  }

  return (
    <div className="page-grid two">
      <Panel title="注册账号" description="注册后可登录创建宗族，创建者会自动成为宗族管理员。">
        <Field label="用户名"><input value={username} onChange={e => setUsername(e.target.value)} /></Field>
        <Field label="显示名"><input value={displayName} onChange={e => setDisplayName(e.target.value)} /></Field>
        <Field label="密码"><input type="password" value={password} onChange={e => setPassword(e.target.value)} /></Field>
        <Actions><button onClick={register}>注册</button></Actions>
      </Panel>
      <Panel title="登录会话" description="登录成功后 Token 会自动保存，后续请求自动携带 Authorization。">
        <Field label="用户名"><input value={loginName} onChange={e => setLoginName(e.target.value)} /></Field>
        <Field label="密码"><input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} /></Field>
        <Actions><button onClick={login}>登录</button><button className="secondary" onClick={me}>当前用户</button></Actions>
      </Panel>
    </div>
  );
}
