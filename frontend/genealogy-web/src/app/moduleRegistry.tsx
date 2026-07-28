import type { ReactNode } from 'react';
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
import { EditingWorkspacePrototypePage } from '../features/workbench/EditingWorkspacePrototypePage';

export type ModuleKey = 'home' | 'mvp1Wizard' | 'personArchive' | 'treeProduct' | 'sourceLibrary' | 'culture' | 'imports' | 'editingWorkspace' | 'reviewCenter' | 'memberManage' | 'auditTrace';
export type ModuleNavigate = (key: ModuleKey) => void;

type ModuleDefinition = {
  key: ModuleKey;
  label: string;
  description: string;
  render: (navigate: ModuleNavigate) => ReactNode;
  renderHeaderActions?: () => ReactNode;
};

export const moduleRegistry: readonly ModuleDefinition[] = [
  { key: 'home', label: '族谱首页', description: '统计概览', render: () => <StatisticsHomePage /> },
  { key: 'mvp1Wizard', label: '建谱向导', description: '创建宗族、支派、字辈、人物、关系、来源和审核', render: () => <Mvp1WizardPage /> },
  { key: 'personArchive', label: '人物档案', description: '按姓名、字辈、性别、支派检索人物并查看档案', render: () => <PersonArchiveSearchPage /> },
  { key: 'treeProduct', label: '世系图谱', description: '按上溯祖先、中心人物、下延后代查看世系', render: navigate => <LineageTreeProductPage onNavigate={navigate} />, renderHeaderActions: () => <BookletActions /> },
  { key: 'sourceLibrary', label: '来源资料库', description: '族谱原文、地方志、照片和口述记录', render: () => <><SourceLibraryFocusBridge /><SourceDraftDeleteAction /><SourceLibraryQueryPage /></> },
  { key: 'culture', label: '宗族文化', description: '姓氏源流、堂号、家训、迁徙和祠堂', render: () => <CultureProductPage /> },
  { key: 'imports', label: '数据导入', description: '族谱数据批量导入、结果和异常处理', render: () => <ImportPage /> },
  { key: 'editingWorkspace', label: '修谱工作台', description: '修谱问题任务池、风险检查和审核前处理', render: navigate => <EditingWorkspacePrototypePage onNavigate={navigate} /> },
  { key: 'reviewCenter', label: '审核中心', description: '入谱变更、资料复核和批量审核', render: () => <ReviewCenterPage /> },
  { key: 'memberManage', label: '成员与权限', description: '宗族成员、角色和权限配置', render: () => <MemberManagementPage /> },
  { key: 'auditTrace', label: '审计追踪', description: '操作日志、审核流和字段Diff完整追踪', render: () => <LogPage /> }
] as const;

const moduleMap = new Map(moduleRegistry.map(module => [module.key, module]));

export function isModuleKey(value: string | null): value is ModuleKey {
  return Boolean(value && moduleMap.has(value as ModuleKey));
}

export function getModule(key: ModuleKey) {
  return moduleMap.get(key) || moduleRegistry[0];
}
