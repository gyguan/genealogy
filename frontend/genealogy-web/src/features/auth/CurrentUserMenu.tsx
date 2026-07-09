import { useEffect, useState } from 'react';
import { Avatar, Button, Descriptions, Dropdown, Modal, Space, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { apiClient } from '../../shared/api/client';

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

function avatarText(user?: CurrentUser | null) {
  return (user?.displayName || user?.username || '族').slice(0, 1).toUpperCase();
}

function display(value: unknown, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function userStatusText(value?: string) {
  const status = String(value || '').trim().toLowerCase();
  if (!status) return '-';
  if (['active', 'enabled', 'normal'].includes(status)) return '正常';
  if (['disabled', 'inactive', 'locked'].includes(status)) return '不可用';
  return '待确认';
}

export function CurrentUserMenu({ onLogout }: { onLogout: () => void }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  async function loadCurrentUser() {
    if (!apiClient.getToken()) {
      setCurrentUser(null);
      return;
    }
    try {
      const data = await apiClient.get('/auth/me');
      setCurrentUser(data as CurrentUser);
    } catch {
      setCurrentUser(null);
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
    { type: 'divider' },
    { key: 'logout', danger: true, label: '退出登录' }
  ];

  function onUserMenuClick(info: { key: string }) {
    if (info.key === 'profile') {
      setProfileOpen(true);
      return;
    }
    if (info.key === 'logout') onLogout();
  }

  return (
    <>
      <Dropdown menu={{ items: userMenuItems, onClick: onUserMenuClick }} trigger={['click']} placement="bottomRight" overlayClassName="github-user-dropdown">
        <Button className="github-user-trigger" type="text">
          <Avatar size={32} src={currentUser?.avatarUrl}>{avatarText(currentUser)}</Avatar>
          <span className="github-user-name">{currentUser?.displayName || currentUser?.username || '个人中心'}</span>
          <em>⌄</em>
        </Button>
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
            <Descriptions.Item label="用户名">{display(currentUser?.username)}</Descriptions.Item>
            <Descriptions.Item label="显示名">{display(currentUser?.displayName)}</Descriptions.Item>
            <Descriptions.Item label="邮箱">{display(currentUser?.email)}</Descriptions.Item>
            <Descriptions.Item label="手机号">{display(currentUser?.phone)}</Descriptions.Item>
            <Descriptions.Item label="账号状态">{userStatusText(currentUser?.status)}</Descriptions.Item>
            <Descriptions.Item label="最近登录">{display(currentUser?.lastLoginAt)}</Descriptions.Item>
          </Descriptions>
        </div>
      </Modal>
    </>
  );
}
