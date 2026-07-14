# Issue #166 执行看板：宗族文化领域模型与契约

- Issue：https://github.com/gyguan/genealogy/issues/166
- 已合入 PR：https://github.com/gyguan/genealogy/pull/174
- 恢复分支：`agent/issue-166-culture-contract-repair`
- 恢复 Draft PR：待创建
- 目标：补齐 PR #174 提前合入后遗留的 API 生成一致性、完整验证、Review 和 Issue 收口。
- 最后更新时间：2026-07-14 17:55:00，北京时间

## 已交付基础

PR #174 已将以下内容合入 `main`：

- `culture_item`、`migration_event`、`culture_site` 领域模型和 Flyway；
- 领域枚举、JPA 实体、Repository 和契约测试；
- 宗族文化设计、兼容与回滚文档；
- 文化 OpenAPI、前端生成类型和追踪目标类型预留。

## 恢复原因

PR #174 在最终 API Contract / TypeScript 验证尚未完成时被仓库自动化提前合入。合入时临时二分诊断版本的 `scripts/api/check-api-contract.sh` 进入 `main`，只执行语义检查，缺少：

```text
api:generate → tracking/culture contract checks → generated file diff
```

Issue #166 因 PR 仅使用 `Refs #166` 仍保持打开。本恢复分支遵循历史任务补救规则，使用新的 Draft PR 前向修复，不修改历史迁移或合入提交。

## 恢复任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 核对提前合入现场并建立恢复分支、看板和 Draft PR | 🔄 进行中 | 已累计约 6 分钟 | 已确认 #174 合入、#166 仍打开、主干契约门禁被弱化 |
| 2 | 恢复完整 API 生成与契约漂移门禁 | ⏳ 待处理 | — |  |
| 3 | 修正生成文件或契约语义差异 | ⏳ 待处理 | — |  |
| 4 | 执行 API、前端、后端、PostgreSQL 与迁移治理验证 | ⏳ 待处理 | — |  |
| 5 | 完成五轴 Review、合入恢复 PR并关闭 #166 | ⏳ 待处理 | — |  |

## 非目标

- 不新增 #167 的文化资料 CRUD 或运行时接口。
- 不修改已合入的 Flyway 历史文件。
- 不扩大到来源绑定、审核 apply、权限运行时、追踪聚合或页面实现。

## 验证方案

- `bash scripts/api/check-api-contract.sh`
- `npm run api:generate`、`npm run api:check`
- `npm run typecheck`、`npm run build`
- `mvn test`
- PostgreSQL/Flyway 启动与 schema validate
- Database Migration Governance、API Contract、Frontend CI、Backend CI
- 最终 `main...repair-branch` diff 和五轴 Review

## 当前恢复检查点

- 当前 Issue：#166
- 当前分支：`agent/issue-166-culture-contract-repair`
- 已合入 PR：#174
- 恢复 Draft PR：待创建
- 最后完成任务：核对 #174 合入事实与 `main` 遗留门禁
- 当前进行中：建立恢复现场
- 当前任务累计耗时：已累计约 6 分钟
- CI 状态：#174 的数据库治理、Backend CI 和 Frontend Build 曾通过；API 生成一致性未通过且被提前合入
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：创建恢复 Draft PR，并将真实链接回写 #166
- 最后更新时间：2026-07-14 17:55:00，北京时间
