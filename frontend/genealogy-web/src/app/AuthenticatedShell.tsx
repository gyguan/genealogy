import type { ReactNode } from 'react';
import { ApartmentOutlined } from '@ant-design/icons';
import { Layout, Menu, Space, Tag, Typography } from 'antd';
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
  headerActions?: ReactNode;
  onNavigate: (key: ModuleKey) => void;
  onLogout: () => void;
};

export function AuthenticatedShell({ active, pageKey, page, headerActions, onNavigate, onLogout }: AuthenticatedShellProps) {
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

  return (
    <Layout className="admin-layout antd-admin-layout">
      <Sider className="sidebar antd-sidebar" width={248} breakpoint="lg" collapsedWidth={0}>
        <div className="brand antd-brand"><Typography.Title level={4}>Genealogy</Typography.Title><Typography.Text type="secondary">族谱管理平台</Typography.Text></div>
        <Menu mode="inline" theme="light" selectedKeys={[active]} onClick={info => onNavigate(info.key as ModuleKey)} items={menuItems} />
      </Sider>
      <Layout className="antd-main-layout">
        <Header className="github-like-header">
          <Space size={16} wrap>
            <div className="github-like-header-title"><Typography.Text type="secondary">当前模块</Typography.Text><Typography.Text strong>{activeModule.label}</Typography.Text></div>
            <Tag icon={<ApartmentOutlined />} color={clanId ? 'processing' : 'default'}>{clanId ? '已选择当前宗族' : '尚未选择宗族'}</Tag>
          </Space>
          <Space>{headerActions}<CurrentUserMenu onLogout={onLogout} /></Space>
        </Header>
        <Content className="content content--compact antd-content"><div className={`business-page business-page--${active}`} key={pageKey}>{page}</div></Content>
      </Layout>
    </Layout>
  );
}
