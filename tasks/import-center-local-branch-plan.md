# Implementation Plan: 通用导入中心与页面内目标支派选择

## Overview

按页面容器 → 类型注册 → 人物导入组件解耦 → 任务区域联动 → 定向验证的顺序实施，不改后端和 API 契约。

## Tasks

### Task 1：建立导入类型注册表

- 定义人物、关系、字辈、来源资料四类导入入口。
- 人物类型标记为可用，其余类型标记为规划中。
- 注册表只保存明确的静态产品配置，不模拟业务数据。

验收：页面可以由配置生成导入类型标签，不把类型判断散落在组件内。

### Task 2：升级 ImportPage

- 增加“导入管理”页面标题和能力说明。
- 使用 Ant Design Tabs 展示导入类型，规划中类型禁用并明确标识。
- 根据当前宗族加载 `/clans/{clanId}/branches`。
- 页面内提供目标支派 Select、加载态、空态和错误态。
- 工作区支派仅作为有效默认值；用户可直接在本页选择。
- 页面维护任务刷新键，并在创建批次后刷新统一任务区域。

验收：没有外部支派选择时仍能在当前页面完成支派选择和导入准备。

### Task 3：解耦 PersonImportWorkspace

- 改为通过 props 接收 `clanId`、`branchId` 和 `branchName`。
- 删除对 `WorkspaceContext` 的直接读取。
- 预览和创建批次统一使用 props 中的页面作用域。
- 切换支派时清空文件、预览和重复确认。
- 移除组件内部的导入任务面板，将任务管理上移到通用中心。

验收：人物导入组件可以在任意明确传入宗族、支派的页面中独立使用。

### Task 4：验证与 Review

- 运行 `npm run api:check`，确认未引入契约漂移。
- 对 `ImportPage.tsx`、`PersonImportWorkspace.tsx` 和注册表执行定向 TypeScript 检查。
- 运行前端生产构建。
- 完成 Correctness、Readability、Architecture、Security、Performance 五轴 Review。

## Risks

- 支派列表加载失败时不得回退到未知技术 ID，应展示错误并禁止上传。
- 当前宗族变化后必须清空旧支派选择，避免跨宗族使用旧支派。
- 任务面板仍使用共享 Workspace 过滤；`ImportPage` 需在本页选择变化时同步该上下文，保证任务列表和上传作用域一致。
- 规划中类型只能展示状态，不应提供看似可操作的入口。
