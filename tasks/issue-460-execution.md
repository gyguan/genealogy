# Issue #460 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/460
- 目标：治理前端跨页面查询参数污染，确保页面切换仅保留目标页面允许的 URL 状态，并省略默认参数。
- 实现范围：统一 URL 状态工具、主导航切换、首页跳转、世系图谱 URL 序列化、人物详情/编辑跳转及聚焦测试。
- 非目标：本次不引入 React Router，不迁移 `/clans/:clanId/...` 语义化路径，不修改后端或 OpenAPI。
- Issue 类型：前端页面状态治理。
- 流程强度：标准轻量流程。
- 契约强度：无 API 契约变更。
- 验证强度：TypeScript 类型检查、受影响 URL 状态单元测试、diff 范围检查。
- 拆分结论：虽然验收项较多，但改动集中在同一前端导航状态边界，无后端、数据库、权限或契约扩散，本次不拆分 Issue。
- 耗时口径：仅记录实际活跃执行耗时；CI 排队、运行和外部等待单独记录。
- 测试复用：复用现有 `lineageUrlState.test.mjs`，新增共享 URL 状态聚焦测试；不新增重复 E2E fixture。
- 影响模块：`src/app`、`src/shared/navigation`、`src/features/home`、`src/features/tree`、`src/features/persons`。

## 任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 读取规则、Issue 与导航现场并建立执行检查点 | ✅ 已完成 | 约 8 分钟 | 已确认无既有分支、PR 或任务文件 |
| 2 | 建立统一页面参数白名单与 URL 构造工具 | 🔄 进行中 | 已累计 <1 分钟 | 下一步实现共享工具与测试 |
| 3 | 接入主导航、首页、世系图谱及人物详情/编辑跳转 | ⏳ 待处理 | — |  |
| 4 | 执行聚焦验证、检查 diff 并完成 PR 收尾 | ⏳ 待处理 | — |  |

## 验证方案

- `npm run typecheck`
- 扩展 `npm run test:tree` 覆盖世系默认值省略
- 新增共享 URL 状态 Node 单元测试并接入聚焦测试脚本
- 检查 PR diff，确认无后端、API、依赖和无关文件变更

## 已知风险

- 当前项目大量页面直接操作 `window.history`，本次优先覆盖 Issue 明确指出的公共入口；未纳入白名单的页面后续新增 URL 参数时必须同步声明。
- URL 清理后，依赖“误继承上一页面参数”的隐式行为将消失；这属于预期修正，但需要通过前进、后退和刷新测试确认。

## 恢复检查点

- 当前 Issue：#460
- 当前分支：`agent/issue-460-url-state-cleanup`
- 当前 Draft PR：待创建
- 最后完成任务：规则、需求与现场确认
- 当前进行中任务：建立统一页面参数白名单与 URL 构造工具
- 最新 Commit：本执行检查点提交
- CI 状态：尚未触发
- 未解决 Review：无
- 已知阻塞：本地环境无 `gh`，改用 GitHub 内容 API 完成远程实现与提交
- 下一步最小任务：新增 `src/shared/navigation/urlState.ts` 及单元测试
- 最后更新时间：2026-07-16 14:45（北京时间）
