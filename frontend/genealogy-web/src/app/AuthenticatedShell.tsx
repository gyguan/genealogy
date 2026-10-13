import { useState } from 'react';
import type { ReactNode } from 'react';
import { ApartmentOutlined, MenuOutlined } from '@ant-design/icons';
import { Button, Drawer, Layout, Menu, Space, Tag, Typography } from 'antd';
import { CurrentUserMenu } from '../features/auth/CurrentUserMenu';
import { useWorkspace } from '../shared/context/WorkspaceContext';
import { getModule, moduleRegistry } from './moduleRegistry';
import type { ModuleGroup, ModuleKey } from './moduleRegistry';

const { Sider, Content, Header } = Layout;
const groupOrder: ModuleGroup[] = ['总览', '建谱', '资料', '协作', '管理', '文化'];

type AuthenticatedShellProps = {
  active: ModuleKey;
  pageKey: string;
  page: ReactNode;
  onNavigate: (key: ModuleKey) => void;
  onLogout: () => void;
};

export function AuthenticatedShell({ active, pageKey, page, onNavigate, onLogout }: AuthenticatedShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const activeModule = getModule(active);
  const { clanId } = useWorkspace();
  const menuItems = groupOrder.map(group => ({
    type: 'group' as const,
    label: group,
    children: moduleRegistry
      .filter(module => module.group === group)
      .sort((left, right) => left.order - right.order)
      .map(module => ({
        key: module.key,
        label: module.label,
        icon: <span aria-hidden="true">{module.icon}</span>
      }))
  })).filter(group => group.children.length > 0);

  const handleNavigate = (key: ModuleKey) => {
    setMobileMenuOpen(false);
    onNavigate(key);
  };

  return (
    <Layout className="admin-layout antd-admin-layout">
      <Sider className="sidebar antd-sidebar" width={248} breakpoint="lg" collapsedWidth={0} trigger={null}>
        <div className="brand antd-brand"><Typography.Title level={4}>Genealogy</Typography.Title><Typography.Text type="secondary">族谱管理平台</Typography.Text></div>
        <Menu mode="inline" theme="light" selectedKeys={[active]} onClick={info => handleNavigate(info.key as ModuleKey)} items={menuItems} />
      </Sider>
      <Layout className="antd-main-layout">
        <Header className="github-like-header">
          <div className="github-like-header-main">
            <Button
              className="mobile-nav-trigger"
              type="text"
              icon={<MenuOutlined />}
              aria-label="打开导航菜单"
              onClick={() => setMobileMenuOpen(true)}
            />
            <Space className="github-like-header-context" size={16}>
              <div className="github-like-header-title"><Typography.Text type="secondary">当前模块</Typography.Text><Typography.Text strong>{activeModule.label}</Typography.Text></div>
              <Tag className="github-like-clan-tag" icon={<ApartmentOutlined />} color={clanId ? 'processing' : 'default'}>{clanId ? '已选择当前宗族' : '尚未选择宗族'}</Tag>
            </Space>
          </div>
          <CurrentUserMenu onLogout={onLogout} />
        </Header>
        <Content className="content content--compact antd-content"><div className={`business-page business-page--${active}`} key={pageKey}>{page}</div></Content>
      </Layout>
      <Drawer
        className="mobile-nav-drawer"
        title="族谱管理平台"
        placement="left"
        width="min(320px, 88vw)"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        styles={{ body: { padding: 8 } }}
      >
        <Menu mode="inline" theme="light" selectedKeys={[active]} onClick={info => handleNavigate(info.key as ModuleKey)} items={menuItems} />
      </Drawer>
    </Layout>
  );
}
