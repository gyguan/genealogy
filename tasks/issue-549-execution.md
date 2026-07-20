# Issue #549 执行看板

- Issue：#549 `[人物档案] 默认分页调整为每页 10 条`
- 目标：将人物档案查询结果默认分页大小从 20 调整为 10，并同步聚焦测试。
- 分支：`agent/issue-549-default-person-page-size-10`
- 最后更新时间：2026-07-20 09:35（北京时间）

## 范围

- 修改人物档案 URL 状态中的默认分页常量。
- 更新默认分页聚焦测试断言及描述。
- 检查差异，确认不影响其他列表页、后端接口和分页可选项。

## 非目标

- 不修改后端查询接口。
- 不修改其他页面的默认分页设置。
- 不调整分页组件样式、排序或筛选逻辑。

## 交付分级

- Issue 类型：单页面前端调整
- 流程强度：轻量
- 契约强度：不涉及
- 验证强度：聚焦测试 + diff 检查
- 拆分信号：未命中，无需拆分
- 复用资产：复用现有 `personArchiveUrlState.test.mjs` 聚焦测试

## 任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 读取规则、需求与人物档案分页实现 | ✅ 已完成 | 约 5 分钟 | 已定位默认值和对应测试 |
| 2 | 将人物档案默认每页条数调整为 10 并同步测试 | ✅ 已完成 | 约 2 分钟 | `00ece8d`、`f41bccb`：默认值和测试已同步 |
| 3 | 检查 diff 与验证结果并完成收尾 | 🔄 进行中 | 已累计约 1 分钟 | diff 范围符合预期；Frontend CI 排队中 |

## 影响模块

- `frontend/genealogy-web/src/features/persons/personArchiveUrlState.ts`
- `frontend/genealogy-web/src/features/persons/personArchiveUrlState.test.mjs`

## 验证结果

- 默认常量已调整为 10。
- 合法分页选项仍为 10、20、50、100。
- URL 未指定 `pageSize` 时仍通过 `DEFAULT_PERSON_PAGE_SIZE` 回退。
- URL 显式指定合法 `pageSize` 的解析逻辑未修改。
- 默认分页测试名称与断言已同步为 10。
- `main...agent/issue-549-default-person-page-size-10` diff 仅包含 2 个目标前端文件和本执行看板。
- Frontend CI Run #967 当前为 queued / pending；等待时间不计入活跃耗时。

## 已知风险与回滚

- 风险较低，仅改变人物档案页首次查询和无显式分页参数时的默认值。
- 回滚：将默认常量和测试断言恢复为 20。

## 耗时口径

- 活跃耗时：规则与代码阅读、修改、diff 检查、验证结果读取、任务文件与 PR 更新。
- 外部等待：GitHub API、CI 排队和运行时间不计入活跃耗时。

## 恢复检查点

- Issue #549、分支和 Draft PR #550 已建立。
- 业务代码和聚焦测试已修改并提交。
- diff 已检查，无其他页面、后端接口或分页选项改动。
- 当前阻塞项：Frontend CI 尚未完成。
- 下一步最小任务：读取 CI 结果；通过后更新 PR 看板、标记 Ready 并按仓库门禁合入。
