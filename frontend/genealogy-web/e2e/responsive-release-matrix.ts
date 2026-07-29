export type ResponsivePageCase = {
  key: string;
  label: string;
  url: string;
  authenticated: boolean;
  shell: boolean;
  representative: 'dashboard' | 'wizard' | 'table' | 'detail' | 'form' | 'tree' | 'cards' | 'tabs' | 'upload' | 'master-detail' | 'review' | 'permission' | 'audit' | 'auth';
  criticalActions: RegExp[];
};

export const RESPONSIVE_VIEWPORTS = [
  { key: 'mobile', width: 390, height: 844 },
  { key: 'tablet', width: 768, height: 1024 },
  { key: 'compact-desktop', width: 1024, height: 768 }
] as const;

export const FORMAL_RESPONSIVE_PAGES: ResponsivePageCase[] = [
  { key: 'home', label: '族谱首页', url: '/?view=home', authenticated: true, shell: true, representative: 'dashboard', criticalActions: [] },
  { key: 'mvp1Wizard', label: '建谱向导', url: '/?view=mvp1Wizard', authenticated: true, shell: true, representative: 'wizard', criticalActions: [/下一步|继续|保存/] },
  { key: 'personArchive', label: '人物档案', url: '/?view=personArchive', authenticated: true, shell: true, representative: 'table', criticalActions: [/查询/] },
  { key: 'personDetail', label: '人物详情', url: '/persons/1', authenticated: true, shell: true, representative: 'detail', criticalActions: [/返回|编辑/] },
  { key: 'personEdit', label: '人物编辑', url: '/persons/1/edit', authenticated: true, shell: true, representative: 'form', criticalActions: [/保存|取消|返回/] },
  { key: 'treeProduct', label: '世系图谱', url: '/?view=treeProduct', authenticated: true, shell: true, representative: 'tree', criticalActions: [/查询/] },
  { key: 'sourceLibrary', label: '来源资料库', url: '/?view=sourceLibrary', authenticated: true, shell: true, representative: 'cards', criticalActions: [/查询/] },
  { key: 'culture', label: '宗族文化', url: '/?view=culture', authenticated: true, shell: true, representative: 'tabs', criticalActions: [/查询/] },
  { key: 'imports', label: '数据导入', url: '/?view=imports', authenticated: true, shell: true, representative: 'upload', criticalActions: [/上传|导入|选择文件/] },
  { key: 'editingWorkspace', label: '修谱工作台', url: '/?view=editingWorkspace', authenticated: true, shell: true, representative: 'master-detail', criticalActions: [] },
  { key: 'reviewCenter', label: '审核中心', url: '/?view=reviewCenter', authenticated: true, shell: true, representative: 'review', criticalActions: [/查询/] },
  { key: 'memberManage', label: '成员与权限', url: '/?view=memberManage', authenticated: true, shell: true, representative: 'permission', criticalActions: [/查询|邀请成员/] },
  { key: 'auditTrace', label: '审计追踪', url: '/?view=auditTrace', authenticated: true, shell: true, representative: 'audit', criticalActions: [/查询/] },
  { key: 'auth', label: '登录认证', url: '/', authenticated: false, shell: false, representative: 'auth', criticalActions: [/登录|注册/] }
];

export const DESKTOP_REGRESSION_WIDTHS = [1280, 1440, 1920] as const;
