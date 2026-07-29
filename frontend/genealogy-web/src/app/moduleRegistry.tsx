import type { ReactNode } from 'react';
import {
  ApartmentOutlined,
  AuditOutlined,
  BookOutlined,
  CloudUploadOutlined,
  DashboardOutlined,
  FolderOpenOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  ToolOutlined,
  UserOutlined
} from '@ant-design/icons';
import { BookletActions } from '../features/booklets/BookletActions';
import { CultureProductPage } from '../features/culture/CultureProductPage';
import { ImportPage } from '../features/imports/ImportPage';
import { StatisticsHomePage } from '../features/home/StatisticsHomePage';
import { LogPage } from '../features/logs/LogPage';
import { MemberManagementPage } from '../features/members/MemberManagementPage';
import { Mvp1WizardPage } from '../features/mvp1/Mvp1WizardPage';
import { PersonArchiveSearchPage } from '../features/persons/PersonArchiveSearchPage';
import { ReviewCenterPage } from '../features/reviews/ReviewCenterPage';
import { SourceDraftDeleteAction } from '../features/sources/SourceDraftDeleteAction';
import { SourceLibraryFocusBridge } from '../features/sources/SourceLibraryFocusBridge';
import { SourceLibraryQueryPage } from '../features/sources/SourceLibraryQueryPage';
import { LineageTreeProductPage } from '../features/tree/LineageTreeProductPagePortal';
import { EditingWorkspacePage } from '../features/workbench/EditingWorkspacePage';
import { StandardPage } from '../shared/ui/StandardPagePatterns';

export type ModuleKey = 'home' | 'mvp1Wizard' | 'personArchive' | 'treeProduct' | 'sourceLibrary' | 'culture' | 'imports' | 'editingWorkspace' | 'reviewCenter' | 'memberManage' | 'auditTrace';
export type ModuleNavigate = (key: ModuleKey) => void;
export type ModuleGroup = '总览' | '建谱' | '资料' | '协作' | '管理' | '文化';

export type ModuleDefinition = {
  key: ModuleKey;
  label: string;
  description: string;
  group: ModuleGroup;
  order: number;
  icon: ReactNode;
  render: (navigate: ModuleNavigate) => ReactNode;
  renderHeaderActions?: () => ReactNode;
};

function standardModulePage(key: ModuleKey, title: string, description: string, content: ReactNode) {
  return <StandardPage pageKey={key} title={title} description={description}>{content}</StandardPage>;
}

export const moduleRegistry: readonly ModuleDefinition[] = [
  { key: 'home', label: '族谱首页', description: '统计概览', group: '总览', order: 10, icon: <DashboardOutlined />, render: () => <StatisticsHomePage /> },
  { key: 'mvp1Wizard', label: '建谱向导', description: '创建宗族、支派、字辈、人物、关系、来源和审核', group: '建谱', order: 20, icon: <ApartmentOutlined />, render: () => <Mvp1WizardPage /> },
  { key: 'personArchive', label: '人物档案', description: '按姓名、字辈、性别、支派检索人物并查看档案', group: '建谱', order: 30, icon: <UserOutlined />, render: () => standardModulePage('personArchive', '人物档案', '按姓名、字辈、性别、支派检索人物并查看档案', <PersonArchiveSearchPage />) },
  { key: 'treeProduct', label: '世系图谱', description: '按上溯祖先、中心人物、下延后代查看世系', group: '建谱', order: 40, icon: <ApartmentOutlined />, render: navigate => <LineageTreeProductPage onNavigate={navigate} />, renderHeaderActions: () => <BookletActions /> },
  { key: 'sourceLibrary', label: '来源资料库', description: '族谱原文、地方志、照片和口述记录', group: '资料', order: 50, icon: <FolderOpenOutlined />, render: () => standardModulePage('sourceLibrary', '来源资料库', '统一管理族谱原文、地方志、照片、口述记录及其引用关系', <><SourceLibraryFocusBridge /><SourceDraftDeleteAction /><SourceLibraryQueryPage /></>) },
  { key: 'imports', label: '数据导入', description: '族谱数据批量导入、结果和异常处理', group: '协作', order: 60, icon: <CloudUploadOutlined />, render: () => <ImportPage /> },
  { key: 'editingWorkspace', label: '修谱工作台', description: '修谱问题任务池、风险检查和审核前处理', group: '协作', order: 70, icon: <ToolOutlined />, render: navigate => standardModulePage('editingWorkspace', '修谱工作台', '集中处理修谱任务、数据风险和审核前准备', <EditingWorkspacePage onNavigate={navigate} />) },
  { key: 'reviewCenter', label: '审核中心', description: '入谱变更、资料复核和批量审核', group: '协作', order: 80, icon: <SafetyCertificateOutlined />, render: () => standardModulePage('reviewCenter', '审核中心', '处理入谱变更、资料复核和批量审核任务', <ReviewCenterPage />) },
  { key: 'memberManage', label: '成员与权限', description: '宗族成员、角色和权限配置', group: '管理', order: 90, icon: <TeamOutlined />, render: () => standardModulePage('memberManage', '成员与权限', '管理宗族成员、角色分配和权限配置', <MemberManagementPage />) },
  { key: 'auditTrace', label: '审计追踪', description: '操作日志、审核流和字段 Diff 完整追踪', group: '管理', order: 100, icon: <AuditOutlined />, render: () => standardModulePage('auditTrace', '审计追踪', '追踪操作日志、审核流转和字段变更记录', <LogPage />) },
  { key: 'culture', label: '宗族文化', description: '姓氏源流、堂号、家训、迁徙和祠堂', group: '文化', order: 110, icon: <BookOutlined />, render: () => <CultureProductPage /> }
] as const;

const moduleMap = new Map(moduleRegistry.map(module => [module.key, module]));

export function isModuleKey(value: string | null): value is ModuleKey {
  return Boolean(value && moduleMap.has(value as ModuleKey));
}

export function getModule(key: ModuleKey) {
  return moduleMap.get(key) || moduleRegistry[0];
}
