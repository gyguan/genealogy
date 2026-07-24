# Issue #784 执行看板

## 任务

- Issue：#784 `[审核中心重构 P0-01] 统一审核列表与详情操作布局`
- 分支：`agent/issue-784-review-center-layout`
- Draft PR：#789
- 状态：实现完成，等待最终门禁收口
- 流程强度：标准
- 契约强度：不涉及
- 验证强度：聚焦测试 + TypeScript + 前端构建

## DEFINE

### 目标

按前端页面规范收敛审核中心列表与详情操作布局：详情审核动作统一位于 Drawer Header 右上角，不设置重复 Footer；质量检查入口仅在列表工具栏预留，不进入详情。

### 范围

- 保留 `待我审核 / 我提交的 / 已处理` 三个 Tab；
- 保留查询、分页、单条/批量审核、冲突刷新和 URL 状态；
- 审核详情统一为桌面端 720px、移动端全屏；
- 列表结果工具栏预留禁用的 `触发质量检查` 入口；
- 增加页面结构聚焦测试。

### 非目标

- 不新增质量检查 API；
- 不修改后端审核流程、权限或正式数据生效路径；
- 不修改 OpenAPI 和数据库；
- 不在详情页提供质量检查触发入口。

## PLAN

- [x] 读取根规则、前端规则、页面规范和 Issue 现场
- [x] 创建远程分支、执行文件和 Draft PR
- [x] 确认现有详情审核动作已位于 Drawer Header `extra`
- [x] 确认 Drawer 不存在重复 Footer
- [x] 将审核中心 Drawer 统一为桌面端 720px、移动端全屏
- [x] 在列表工具栏预留质量检查入口，并明确后续 Issue #786～#788
- [x] 确保详情页不存在质量检查入口
- [x] 补充 `reviewCenterLayout.test.mjs`
- [x] 将聚焦测试纳入 `npm run test:reviews`
- [x] Frontend CI：聚焦测试、TypeScript、生产构建通过
- [x] API Contract 通过
- [x] Review diff，已清除无关 package 脚本变化和未使用代码

## 验证结果

- Frontend CI #1753：成功；覆盖审核中心聚焦测试、TypeScript 和生产构建。
- API Contract #1829：成功。
- Culture Page Gate #445：与本 Issue 无业务耦合，最终状态在合入前确认。

## 最终实现说明

- `ReviewCenterPage.tsx`：页面挂载时注册审核中心作用域，并将禁用的质量检查入口挂载到查询结果工具栏。
- `reviewCenterLayout.css`：限定审核中心 Drawer 为 720px，移动端 100vw，并统一结果工具栏动作间距。
- `reviewCenterLayout.test.mjs`：锁定 Drawer 宽度、详情 Header 操作位置、无重复 Footer、质量检查入口只存在于列表层。
- `ReviewCenterPageContent.tsx` 的原有审核、筛选、分页、批量处理和冲突刷新逻辑未改动。

## 风险与后续

- 当前质量检查按钮为禁用占位，不提供伪交互；真实契约、后端执行和前端接入分别由 #786、#787、#788 完成。
- 本 Issue 未改变审核正式数据生效路径和权限边界。
