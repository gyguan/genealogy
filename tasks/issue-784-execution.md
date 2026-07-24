# Issue #784 执行看板

## 任务

- Issue：#784 `[审核中心重构 P0-01] 统一审核列表与详情操作布局`
- 分支：`agent/issue-784-review-center-layout`
- Draft PR：#789
- 状态：进行中
- 流程强度：标准
- 契约强度：不涉及
- 验证强度：聚焦测试 + TypeScript + 前端构建

## DEFINE

### 目标

按前端页面规范收敛审核中心列表与详情操作布局：详情审核动作统一放在 Drawer Header 右上角，移除底部重复操作；质量检查入口仅在列表工具栏预留，不进入详情。

### 范围

- 修改审核中心页面布局与动作位置；
- 保留现有 Tab、查询、分页、单条/批量审核、冲突刷新和 URL 状态；
- 增加或更新必要的前端聚焦测试。

### 非目标

- 不新增质量检查 API；
- 不修改后端审核流程、权限或正式数据生效路径；
- 不修改 OpenAPI 和数据库。

## PLAN

- [x] 读取根规则、前端规则、页面规范和 Issue 现场
- [x] 创建远程分支和执行文件
- [x] 创建 Draft PR 并回写 Issue
- [x] 定位 Drawer Header、Footer 和列表工具栏实现
- [x] 建立统一详情 Header 操作组件
- [x] 将审核中心 Drawer 统一为桌面端 720px、移动端全屏
- [ ] 将页面接入统一 Header 操作组件
- [ ] 在列表工具栏预留质量检查入口位置（禁用并说明后续 Issue）
- [ ] 补充或更新聚焦测试
- [ ] 执行 typecheck、聚焦测试、build、api:check
- [ ] Review diff 并同步结果

## 风险与假设

- 当前页面组件较大，本 Issue 只做最小布局切片，不扩大为全面组件拆分。
- 质量检查真实交互依赖后续 #786、#787、#788，本 Issue 不提供伪 API 行为。
- 详情操作是否可用继续以后端返回状态和现有前端判断为准。

## 检查点

### 启动检查点

- 已读取 `AGENTS.md`、`frontend/genealogy-web/AGENTS.md`、`docs/21-frontend-page-pattern-spec.md`。
- 已确认本 Issue 不涉及公共 API、数据库、权限和审核正式生效路径。
- 已创建 Draft PR #789 后开始业务代码修改。

### 第一实现检查点

- 新增 `ReviewDetailHeaderActions.tsx`，将追踪、驳回整改、审核通过收敛为 Drawer Header 专用操作组件。
- 组件明确禁止承载质量检查入口，避免列表级检查动作进入详情。

### 第二实现检查点

- `ReviewCenterPage` 在挂载期间增加审核中心专属 body class，卸载时清理，避免样式泄漏到其他模块。
- 新增 `reviewCenterLayout.css`：桌面端审核详情 Drawer 统一为 720px，移动端保持 100vw。
- 当前分支尚未出现 GitHub 状态检查结果；在完成组件接入后统一执行前端验证。
