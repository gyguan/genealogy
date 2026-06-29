import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { Actions, Field } from '../../shared/ui/Form';
import { Panel } from '../../shared/ui/Panel';
import { ResultNotice } from '../../shared/ui/ResultNotice';

type Props = { onChanged: () => void; notify: (data: unknown, error?: boolean) => void };

export function AuthPage({ onChanged, notify }: Props) {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('Mvp1@123456');
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('Mvp1@123456');
  const [result, setResult] = useState<unknown>();

  async function register() {
    const data: any = await apiClient.post('/auth/register', { username, displayName, password });
    const notice = { message: '账号注册成功', id: data?.id };
    setResult(notice);
    notify(notice);
  }

  async function login() {
    const data: any = await apiClient.post('/auth/login', { username: loginName, password: loginPassword });
    apiClient.setToken(data.accessToken);
    onChanged();
    const notice = { message: '登录成功' };
    setResult(notice);
    notify(notice);
  }

  return (
    <div className="page-grid two">
      <Panel title="注册账号" description="注册后可登录创建宗族，创建者会自动成为宗族管理员。">
        <Field label="用户名"><input value={username} onChange={e => setUsername(e.target.value)} /></Field>
        <Field label="显示名"><input value={displayName} onChange={e => setDisplayName(e.target.value)} /></Field>
        <Field label="密码"><input type="password" value={password} onChange={e => setPassword(e.target.value)} /></Field>
        <Actions><button onClick={register}>注册</button></Actions>
      </Panel>
      <Panel title="账号登录" description="登录后即可访问宗族、人物、审核等业务功能。">
        <Field label="用户名"><input value={loginName} onChange={e => setLoginName(e.target.value)} /></Field>
        <Field label="密码"><input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} /></Field>
        <Actions><button onClick={login}>登录</button></Actions>
        <ResultNotice result={result} />
      </Panel>
    </div>
  );
}
