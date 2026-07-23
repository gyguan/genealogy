import { useEffect, useState } from 'react';
import { Avatar, Button, Descriptions, Dropdown, List, Modal, Space, Tag, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { apiClient } from '../../shared/api/client';
import { ConfirmAction, EmptyState, PageFeedback } from '../../shared/ui/Feedback';
import { feedback } from '../../shared/ui/OperationFeedback';

 type CurrentUser = {
  id?: number;
  username?: string;
  phone?: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  status?: string;
  lastLoginAt?: string;
  createdAt?: string;
};

type AuthSession = {
  sessionId: number;
  current: boolean;
  issuedAt?: string;
  lastAccessAt?: string;
  expiresAt?: string;
  clientIp?: string;
  device?: string;
};

function avatarText(user?: CurrentUser | null) {
  return (user?.displayName || user?.username || '族').slice(0, 1).toUpperCase();
}

function display(value: unknown, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function dateTime(value?: string) {
  return value ? value.replace('T', ' ').slice(0, 16) : '-';
}

export function CurrentUserMenu({ onLogout }: { onLogout: () => void }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [sessions, setSessions] = useState<AuthSession[]>([]);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [revokingSessionId, setRevokingSessionId] = useState<number>();
  const [revokingOthers, setRevokingOthers] = useState(false);

  async function loadCurrentUser() {
    try {
      const data = await apiClient.get('/auth/me');
      setCurrentUser(data as CurrentUser);
    } catch {
      setCurrentUser(null);
    }
  }

  async function loadSessions() {
    setSessionLoading(true);
    setSessionError('');
    try {
      const data = await apiClient.get('/auth/sessions');
      setSessions(Array.isArray(data) ? data as AuthSession[] : []);
    } catch (error) {
      setSessions([]);
      setSessionError((error as Error).message || '登录设备加载失败');
    } finally {
      setSessionLoading(false);
    }
  }

  useEffect(() => { void loadCurrentUser(); }, []);

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile-summary',
      disabled: true,
      label: (
        <div className="github-user-menu-summary">
          <strong>{display(currentUser?.displayName || currentUser?.username, '当前用户')}</strong>
          <span>{display(currentUser?.username)}</span>
        </div>
      )
    },
    { type: 'divider' },
    { key: 'profile', label: '个人中心' },
    { key: 'sessions', label: '登录设备' },
    { type: 'divider' },
    { key: 'logout', danger: true, label: '退出登录' }
  ];

  function onUserMenuClick(info: { key: string }) {
    if (info.key === 'profile') {
      setProfileOpen(true);
      return;
    }
    if (info.key === 'sessions') {
      setSessionsOpen(true);
      void loadSessions();
      return;
    }
    if (info.key === 'logout') onLogout();
  }

  async function revokeSession(sessionId: number) {
    setRevokingSessionId(sessionId);
    try {
      await apiClient.delete(`/auth/sessions/${sessionId}`);
      await loadSessions();
      feedback.success('该设备已退出登录');
    } catch (error) {
      feedback.error((error as Error).message || '退出该设备失败');
    } finally {
      setRevokingSessionId(undefined);
    }
  }

  async function revokeOthers() {
    setRevokingOthers(true);
    try {
      await apiClient.post('/auth/sessions/revoke-others');
      await loadSessions();
      feedback.success('其他设备已全部退出登录');
    } catch (error) {
      feedback.error((error as Error).message || '退出其他设备失败');
    } finally {
      setRevokingOthers(false);
    }
  }

  return (
    <>
      <Dropdown menu={{ items: userMenuItems, onClick: onUserMenuClick }} trigger={['click']} placement="bottomRight" overlayClassName="github-user-dropdown">
        <button className="github-user-trigger" type="button">
          <Avatar size={32} src={currentUser?.avatarUrl}>{avatarText(currentUser)}</Avatar>
          <span className="github-user-name">{currentUser?.displayName || currentUser?.username || '个人中心'}</span>
          <em>⌄</em>
        </button>
      </Dropdown>
      <Modal
        title="个人中心"
        open={profileOpen}
        onCancel={() => setProfileOpen(false)}
        footer={<Button type="primary" onClick={() => setProfileOpen(false)}>知道了</Button>}
      >
        <div className="profile-center-card">
          <Space size={12} align="center">
            <Avatar size={48} src={currentUser?.avatarUrl}>{avatarText(currentUser)}</Avatar>
            <div>
              <Typography.Title level={5}>{display(currentUser?.displayName || currentUser?.username, '当前用户')}</Typography.Title>
              <Typography.Text type="secondary">{display(currentUser?.username)}</Typography.Text>
            </div>
          </Space>
          <Descriptions size="small" bordered column={1} className="profile-center-descriptions">
            <Descriptions.Item label="用户ID">{display(currentUser?.id)}</Descriptions.Item>
            <Descriptions.Item label="用户名">{display(currentUser?.username)}</Descriptions.Item>
            <Descriptions.Item label="显示名">{display(currentUser?.displayName)}</Descriptions.Item>
            <Descriptions.Item label="邮箱">{display(currentUser?.email)}</Descriptions.Item>
            <Descriptions.Item label="手机号">{display(currentUser?.phone)}</Descriptions.Item>
            <Descriptions.Item label="状态">{display(currentUser?.status)}</Descriptions.Item>
            <Descriptions.Item label="最近登录">{dateTime(currentUser?.lastLoginAt)}</Descriptions.Item>
          </Descriptions>
        </div>
      </Modal>
      <Modal
        title="登录设备"
        open={sessionsOpen}
        onCancel={() => setSessionsOpen(false)}
        width={680}
        footer={(
          <Space>
            <ConfirmAction
              title="确认退出其他设备？"
              description="除当前设备外的所有有效登录会话都将失效。"
              danger
              onConfirm={() => revokeOthers()}
            >
              <Button loading={revokingOthers} disabled={!sessions.some(item => !item.current)}>退出其他设备</Button>
            </ConfirmAction>
            <Button type="primary" onClick={() => setSessionsOpen(false)}>完成</Button>
          </Space>
        )}
      >
        <Typography.Paragraph type="secondary">
          可查看和撤销当前账号的有效登录会话。IP 地址已脱敏展示。
        </Typography.Paragraph>
        {sessionError ? (
          <PageFeedback
            tone="error"
            title="登录设备加载失败"
            description={sessionError}
            action={<Button size="small" loading={sessionLoading} onClick={() => void loadSessions()}>重新加载</Button>}
          />
        ) : null}
        <List
          loading={sessionLoading}
          dataSource={sessions}
          locale={{ emptyText: <EmptyState compact title="暂无有效登录会话" description="当前账号没有可展示的有效设备会话。" /> }}
          renderItem={session => (
            <List.Item
              actions={session.current ? [] : [
                <ConfirmAction
                  key="revoke"
                  title="确认退出该设备？"
                  description="该设备上的登录会话将立即失效。"
                  danger
                  onConfirm={() => revokeSession(session.sessionId)}
                >
                  <Button danger type="link" loading={revokingSessionId === session.sessionId}>退出该设备</Button>
                </ConfirmAction>
              ]}
            >
              <List.Item.Meta
                title={<Space>{session.device || '未知设备'}{session.current ? <Tag color="green">当前设备</Tag> : null}</Space>}
                description={`最近活动：${dateTime(session.lastAccessAt)} · IP：${session.clientIp || '-'} · 到期：${dateTime(session.expiresAt)}`}
              />
            </List.Item>
          )}
        />
      </Modal>
    </>
  );
}
