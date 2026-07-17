# Issue #538 执行看板

## 基本信息

- Issue：#538 `[来源资料库 P1-01] 按查询页规范重构来源资料库列表`
- 分支：`agent/issue-538-source-library-query-page`
- Pull Request：#539
- Issue 类型：单页面前端调整
- 流程强度：轻量
- 契约强度：不涉及
- 验证强度：最简自动门禁 + diff 检查
- 拆分判断：未命中拆分信号

## 目标与边界

### 目标

- 按 `docs/22-frontend-query-page-pattern-spec.md` 和用户确认原型重构来源资料库列表页。
- 保留现有 URL 查询状态、分页、排序、详情返回现场、附件与引用能力。

### 非目标

- 不修改 API、后端、数据库、权限、隐私或审核规则。
- 不改变来源详情、附件上传和引用审核的业务语义。

## 原子任务

- [x] 读取仓库规则、查询页规范、现有页面实现和确认原型。
- [x] 重构查询 Card、更多筛选和结果 Card 操作层级。
- [x] 补充桌面端、窄屏和移动端响应式行为。
- [x] 复用现有来源资料导入入口，不新增接口。
- [x] 保留来源详情、附件、引用、权限和异常状态逻辑。
- [x] 执行前端自动门禁并检查 diff。
- [x] 更新 Issue、PR 与执行看板。

## 完成内容

- 查询 Card 基础条件：宗族、关键词、来源类型、资料状态。
- 更多筛选：可见范围、附件情况、引用情况；收起时不清空条件。
- 查询操作顺序：更多筛选、重置、查询，查询为唯一主按钮。
- 结果 Card 标题固定为“查询结果”，总数移入结果说明和分页。
- 页面级操作：创建来源、导入资料、刷新；来源导入复用 `view=imports&tab=create&type=source`。
- 表格保留来源资料、类型、状态、可信度、可见范围、引用、附件、最近更新和固定操作列。
- 移动端使用来源资料 Card List，并保留详情入口与分页。
- 查询、分页、排序、详情 ID 和返回滚动位置继续通过 URL/history 恢复。

## 风险与回滚

- 宗族字段继续通过 `WorkspaceContext` 驱动现有请求上下文，切换宗族后页码恢复为第 1 页。
- 本次仅新增前端页面、专用样式并替换 App 页面入口；回滚 PR 即可恢复原页面。

## 验证记录

- 本地静态语法检查：TypeScript `transpileModule`，0 条语法诊断。
- Frontend CI #933：通过。
- CI 覆盖仓库配置的 TypeScript 类型检查、前端构建和 API 检查。
- PR diff 范围：
  - `frontend/genealogy-web/src/app/App.tsx`
  - `frontend/genealogy-web/src/features/sources/SourceLibraryQueryPage.tsx`
  - `frontend/genealogy-web/src/features/sources/source-library-query-page.css`
  - `tasks/issue-538-execution.md`
- 未修改后端、OpenAPI、数据库和既有来源服务契约。

## 耗时口径

- 活跃耗时与外部等待分离记录。
- 当前未形成可验证的分钟级累计值，不事后补造。
