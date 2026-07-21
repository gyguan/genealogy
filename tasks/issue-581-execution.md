# Issue #581 执行任务看板

## Issue

- 链接：https://github.com/gyguan/genealogy/issues/581
- 目标：统一核心主数据直接删除规则，并补齐字辈方案草稿删除 API。

## 实现范围

- 宗族、支派、人物、人物关系、来源资料：仅 `draft` 可直接删除。
- 人物和关系移除审核权限直删正式数据的旁路。
- 字辈方案新增 DELETE API，仅允许删除草稿方案，并清理方案下字辈明细。
- 同步 generation OpenAPI overlay、独立生成契约与聚焦测试。

## 非目标

- 不新增数据库字段或 Flyway。
- 不统一物理删除与软删除实现方式。
- 不增加前端删除入口。
- 不修改文化资料、迁徙事件、文化场所和 Tree 模块。

## 交付分级

- Issue 类型：后端 CRUD + 基础权限。
- 流程强度：标准。
- 契约强度：轻契约。
- 验证强度：基础编译、聚焦测试、API 契约检查、diff 检查。
- 拆分信号：已命中并拆分；文化对象与前端接入由 #582、#583 承载。
- 活跃耗时：约 26 分钟，覆盖规则检查、实现、测试补充、diff 和收尾。
- 外部等待：远程 CI 约 4 分钟，未计入活跃耗时。

## 复用说明

- 复用各应用服务现有权限校验、删除实现和异常模式。
- 复用现有 Domain/Application Service 单元测试风格。
- 通过 `DraftDeletePolicy` 统一直接删除状态门禁，不扩大公共业务 API。
- generation 契约复用仓库 OpenAPI overlay 与独立生成文件模式。

## 原子任务

| 序号 | 任务 | 状态 | 结果 / Commit |
|---:|---|---|---|
| 1 | 核心对象删除状态收敛 | ✅ 已完成 | 宗族、支派、人物、关系、来源仅草稿可直删；宗族删除清理初始化成员授权 |
| 2 | 字辈方案 DELETE 契约与后端实现 | ✅ 已完成 | `DELETE /api/v1/generation-schemes/{schemeId}`，先删字辈明细再删草稿方案 |
| 3 | 聚焦测试与契约检查 | ✅ 已完成 | DraftDeletePolicy、generation delete、source callback 测试；API Contract 成功 |
| 4 | diff、CI、Review 与合入收尾 | 进行中 | Backend CI、API Contract、Frontend CI 均成功，待合入 |

## 影响模块

- `clan`
- `branch`
- `person`
- `relationship`
- `source`
- `generation`
- `docs/api`
- API 生成脚本与生成契约
- 后端聚焦测试

## 验证结果

- Backend CI / Backend Compile, Unit Tests and Package：✅ success（run #2667）。
- API Contract / API Contract Check：✅ success（run #1447）。
- Frontend CI / Typecheck and Build：✅ success（run #1044）。
- PR diff：✅ 无数据库迁移、无 Tree 写操作、无无关页面修改。

## 关键实现说明

- 宗族仍使用既有物理删除，但删除前清理创建宗族时自动生成的 membership/member_role，避免空草稿宗族无法删除。
- 支派仍保留下级支派保护。
- 人物、关系仍使用既有软删除；配偶反向关系仍在同一事务中软删除。
- 来源继续保留权限和绑定保护，通过 JPA `@PreRemove` 保证所有物理删除路径都执行草稿门禁。
- 字辈方案继续使用既有物理删除方式，并显式先清理 `generation_word`。

## 恢复检查点

- 当前 Issue：#581
- 当前分支：`agent/issue-581-draft-delete-core`
- 当前 Draft PR：#584
- 最后完成任务：三项远程 CI 全部通过
- 当前任务：PR 合入收尾
- 最新业务 Commit：`1fb2db575a581b1121ecc3ae99d22effc1c641a0`
- CI 状态：全部成功
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：标记 Ready 并合入 main
- 最后更新时间：2026-07-21 09:02（北京时间）
