import type { ReactNode } from 'react';
import { Layout, Menu, Space, Typography } from 'antd';
import { CurrentUserMenu } from '../features/auth/CurrentUserMenu';
import { getModule, moduleRegistry } from './moduleRegistry';
import type { ModuleKey } from './moduleRegistry';

const { Sider, Content, Header } = Layout;

type AuthenticatedShellProps = {
  active: ModuleKey;
  pageKey: string;
  page: ReactNode;
  headerActions?: ReactNode;
  onNavigate: (key: ModuleKey) => void;
  onLogout: () => void;
};

export function AuthenticatedShell({ active, pageKey, page, headerActions, onNavigate, onLogout }: AuthenticatedShellProps) {
  const activeModule = getModule(active);
  return (
    <Layout className="admin-layout antd-admin-layout">
      <Sider className="sidebar antd-sidebar" width={248} breakpoint="lg" collapsedWidth={0}>
        <div className="brand antd-brand"><Typography.Title level={4}>Genealogy</Typography.Title><Typography.Text type="secondary">族谱管理平台</Typography.Text></div>
        <Menu mode="inline" theme="light" selectedKeys={[active]} onClick={info => onNavigate(info.key as ModuleKey)} items={moduleRegistry.map(module => ({ key: module.key, label: module.label }))} />
      </Sider>
      <Layout className="antd-main-layout">
        <Header className="github-like-header">
          <div className="github-like-header-title"><Typography.Text type="secondary">当前模块</Typography.Text><Typography.Text strong>{activeModule.label}</Typography.Text></div>
          <Space>{headerActions}<CurrentUserMenu onLogout={onLogout} /></Space>
        </Header>
        <Content className="content content--compact antd-content"><div className={`business-page business-page--${active}`} key={pageKey}>{page}</div></Content>
      </Layout>
    </Layout>
  );
}
