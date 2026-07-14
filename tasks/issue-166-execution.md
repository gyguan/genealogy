# Issue #166 执行看板：宗族文化领域模型与契约

- Issue：https://github.com/gyguan/genealogy/issues/166
- 基础 PR：https://github.com/gyguan/genealogy/pull/174
- 恢复 PR：https://github.com/gyguan/genealogy/pull/176
- 恢复分支：`agent/issue-166-culture-contract-repair`
- 目标：完成宗族文化领域模型、数据库、OpenAPI、生成类型和最终交付门禁，并补齐 PR #174 提前合入后的验证与 Review 收口。
- 最后更新时间：2026-07-14 18:24:00，北京时间

## 已交付基础

PR #174 已将以下内容合入 `main`：

- `culture_item`、`migration_event`、`culture_site` 领域模型和 Flyway；
- 领域枚举、JPA 实体、Repository 和契约测试；
- 宗族文化设计、兼容与回滚文档；
- 文化 OpenAPI、前端生成类型和追踪目标类型预留。

PR #176 已完成前向恢复：

- 定义共享 `BadRequest / Unauthorized / Forbidden` OpenAPI response；
- 恢复 `generate → Tracking/Culture checks → 四文件 diff → TypeScript` 完整门禁；
- 由 CI 精确再生四个契约文件；
- 处理并解决 PR #174 的两条 P1 Review；
- 不修改已合入的 Flyway 历史文件，不扩大到 #167。

## 执行任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 核对提前合入现场并建立恢复分支、看板和 Draft PR | ✅ 已完成 | 约 7 分钟 | 恢复分支、看板、PR #176 和 Issue 回写已建立 |
| 2 | 恢复完整 API 生成与契约漂移门禁 | ✅ 已完成 | 约 5 分钟 | generator、Tracking/Culture 检查、四文件 diff 和 typecheck 已恢复 |
| 3 | 定位并修复文化契约和生成文件差异 | ✅ 已完成 | 约 38 分钟 | 补充共享 response；CI 精确生成四个文件 |
| 4 | 执行 API、前端、后端、PostgreSQL 与迁移治理验证 | ✅ 已完成 | 约 10 分钟 | API Contract、TypeScript、Frontend Build、Backend、PostgreSQL、Flyway 治理通过 |
| 5 | 完成五轴 Review、合入恢复 PR 并关闭 #166 | 🔄 进行中 | 已累计约 5 分钟 | PR #174 Review 已解决；PR #176 无未解决线程，准备转 Ready 并合入 |

## 验证结果

### PR #176

- API Contract Check：✅ 通过
  - generator 可重复执行；
  - 四个生成文件无 diff；
  - Tracking/Culture 契约语义通过；
  - Culture 路径公共 response 引用可解析；
  - TypeScript typecheck 通过。
- Frontend Build：✅ 通过。
- 临时诊断工作流：✅ 已清理，最终 diff 不包含 workflow 变更。
- Review：✅ PR #176 无未解决线程；PR #174 两条 P1 已修复并解决。

### PR #174

- Database Migration Governance：✅ 通过。
- Backend Java Build/Test：✅ 通过。
- PostgreSQL Startup Check：✅ 通过。
- Commercial Frontend Build：✅ 通过。
- Issue Delivery Governance：✅ 通过。

## Issue 验收核对

- [x] 三类对象字段、状态、范围和关联关系无歧义。
- [x] Flyway 在干净 PostgreSQL 和历史迁移链上通过验证。
- [x] OpenAPI 覆盖文化总览、文化资料、迁徙和场所接口。
- [x] 新目标类型不修改历史数据，并已进入来源、审核与追踪契约。
- [x] `api:generate`、`api:check`、TypeScript 和生产构建通过。
- [x] 文档明确正式数据不得直接覆盖及旧字段兼容退出条件。

## 非目标与后续

- 不新增 #167 的文化资料 CRUD 或运行时接口。
- 不修改已合入的 Flyway 历史文件。
- 来源绑定运行时、审核 apply、权限、追踪聚合、迁徙和场所页面由 #167～#172 完成。

## 五轴 Review

- Correctness：✅ 契约、生成、数据库和验收标准均有验证证据。
- Readability：✅ 领域模块与契约检查职责清晰，诊断代码已清理。
- Architecture：✅ 仅交付领域与契约基础，未提前侵入后续应用服务。
- Security：✅ 默认草稿、隐私与敏感级别、最小披露和正式审核约束保留。
- Performance：✅ 后端分页上限、查询索引和 overview 有界聚合设计明确。

## 耗时汇总

- 恢复阶段已完成任务活跃耗时：约 1 小时
- 当前合入收尾累计耗时：约 5 分钟
- 外部等待：GitHub Actions 排队与运行，不计入活跃耗时
- 未记录历史任务：0 项

## 当前恢复检查点

- 当前 Issue：#166
- 当前分支：`agent/issue-166-culture-contract-repair`
- 基础 PR：#174（已合入）
- 恢复 PR：#176（Draft，待转 Ready）
- 最新 Commit：由本次看板更新提交确定
- 最后完成任务：完整 CI 与 Review 收口
- 当前进行中：转 Ready、合入 #176、确认 #166 自动关闭
- 当前任务累计耗时：已累计约 5 分钟
- CI 状态：API Contract、TypeScript、Frontend Build、Backend、PostgreSQL 和 Flyway 治理通过
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：标记 PR #176 Ready，并以当前 head SHA 合入 `main`
- 最后更新时间：2026-07-14 18:24:00，北京时间
