# Issue #460 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/460
- 目标：治理前端跨页面查询参数污染，确保页面切换仅保留目标页面允许的 URL 状态，并省略默认参数。
- 实现范围：统一 URL 状态工具、主导航切换、世系图谱 URL 序列化、人物详情/编辑跳转及聚焦测试。
- 非目标：本次不引入 React Router，不迁移 `/clans/:clanId/...` 语义化路径，不修改后端或 OpenAPI。
- Issue 类型：前端页面状态治理。
- 流程强度：标准轻量流程。
- 契约强度：无 API 契约变更。
- 验证强度：前端 CI、受影响 URL 状态单元测试、diff 范围检查。
- 拆分结论：改动集中在同一前端导航状态边界，无后端、数据库、权限或契约扩散，本次不拆分 Issue。
- 耗时口径：仅记录实际活跃执行耗时；CI 排队、运行和外部等待单独记录。
- 测试复用：复用现有 `lineageUrlState.test.mjs`，新增共享 URL 状态聚焦测试。
- 影响模块：`src/app`、`src/shared/navigation`、`src/features/tree`、`src/features/persons`。

## 任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 读取规则、Issue 与导航现场并建立执行检查点 | ✅ 已完成 | 约 8 分钟 | `dea7799` |
| 2 | 建立统一页面参数白名单与 URL 构造工具 | ✅ 已完成 | 约 7 分钟 | `60e7830`、`ddfd27f`、`23073c3` |
| 3 | 接入主导航、世系图谱及人物详情/编辑跳转 | ✅ 已完成 | 约 11 分钟 | `f0ddc88`～`269ea6f` |
| 4 | 执行聚焦验证、检查 diff 并完成 PR 收尾 | 🔄 进行中 | 已累计约 4 分钟 | Frontend CI、API Contract 已通过；等待 Culture Page Gate |

## 验证结果

- Frontend CI：通过。
- API Contract：通过。
- Culture Page Gate：运行中，外部等待不计入活跃耗时。
- PR diff：仅涉及 9 个前端导航/测试文件及执行看板，无后端、数据库、OpenAPI、依赖版本或敏感信息变更。
- PR 可合并状态：GitHub 判定 `mergeable=true`。

## 已知风险

- 当前仍有少量业务页面直接操作 `window.history`；公共菜单切换、世系图谱和人物详情/编辑已统一收口。后续新增页面 URL 参数必须同步维护白名单。
- URL 清理后，依赖上一页面残留参数的隐式行为将消失，这是预期修复。

## 恢复检查点

- 当前 Issue：#460
- 当前分支：`agent/issue-460-url-state-cleanup`
- 当前 Draft PR：#461
- 最后完成任务：公共导航、世系图谱和人物详情/编辑接入
- 当前进行中任务：等待最后一个 CI 门禁并完成合入
- 最新 Commit：`269ea6fae779743bec56f2f141913d57ad594f96`
- CI 状态：Frontend CI、API Contract 通过；Culture Page Gate 运行中
- 未解决 Review：无
- 已知阻塞：无代码阻塞；仅 CI 外部等待
- 下一步最小任务：Culture Page Gate 通过后将 PR 标记 Ready 并合入 main
- 最后更新时间：2026-07-16 14:58（北京时间）
