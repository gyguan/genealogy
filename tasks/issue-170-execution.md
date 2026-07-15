# Issue #170 执行看板：结构化迁徙脉络管理

- Issue：https://github.com/gyguan/genealogy/issues/170
- 工作分支：`agent/issue-170-migration-timeline`
- Draft PR：待创建
- 目标：建设基于 `migration_event` 的多支派、多节点迁徙管理，形成后端分页、审核发布、权限隐私、来源追踪与前端时间轴闭环。
- 最后更新时间：2026-07-15 08:35，北京时间

## 实现范围

- 补全迁徙事件 OpenAPI：筛选、详情聚合、归档接口、稳定错误语义和生成类型。
- 实现迁徙事件列表、详情、新增、编辑、软删除/正式删除申请、归档和提交审核。
- 在数据库层完成宗族、支派子树、隐私、状态、关键词、迁出地、迁入地、历史时期、始迁祖筛选与分页。
- 校验支派、始迁祖和宗族归属一致；拒绝空起止地、同地迁徙、顺序冲突和跨宗族关联。
- 正式事件修改、归档和删除统一进入 `revision → review_task → approve/reject → apply`，禁止直接覆盖。
- 复用来源绑定、附件可见性、操作日志、Tracking trace 和对象级 `allowedActions`。
- 在宗族文化页面增加“迁徙脉络”专题，提供真实时间轴、分页列表、详情和编辑抽屉。
- 只展示后端返回的真实迁徙数据；缺失时间、地点、来源仅显示完整度提示，不补造路线。
- 保留旧 `branch.migrationFrom/migrationTo` 只读兼容，不写回、不自动迁移，并记录退出条件。
- 新增与实际查询匹配的迁徙索引，使用更高版本 Flyway 前向迁移。

## 非目标

- 不接入地图 SDK、路径规划、GIS、历史地名转换或复杂动画。
- 不使用 AI 生成迁徙结论。
- 不实现 #171 文化场所和 #172 首页统一摘要。
- 不修改已有 Flyway 历史脚本，不进行旧字段双写或无来源自动迁移。

## 执行任务看板

| 序号 | 任务 | 状态 | 活跃耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、前置实现和现有迁徙模型/契约 | ✅ 已完成 | 约 12 分钟 | 已确认 #169 完成，#170 无分支/PR；现有实体/仓储和 OpenAPI 仅为骨架 |
| 2 | 建立分支、执行看板、Draft PR 和 Issue 回写 | 🔄 进行中 | 已累计约 4 分钟 | 分支已创建，本文件为首个检查点 |
| 3 | Contract First 补全迁徙 API、生成类型与兼容说明 | ⏳ 待处理 | — |  |
| 4 | 实现领域校验、数据库分页/索引与基础 CRUD | ⏳ 待处理 | — |  |
| 5 | 接入来源、审核、权限隐私、日志和 Tracking | ⏳ 待处理 | — |  |
| 6 | 实现迁徙时间轴、列表、详情、表单和高风险交互 | ⏳ 待处理 | — |  |
| 7 | 补充后端、PostgreSQL、契约、前端和浏览器测试 | ⏳ 待处理 | — |  |
| 8 | 五轴 Review、处理线程、更新记录并 squash 合入 main | ⏳ 待处理 | — |  |

## 影响模块

- 后端：`culture` 下迁徙 controller/application/domain/dto/repository；复用 `source`、`review`、`tracking`、`operationlog`、`auth`。
- 数据库：`migration_event` 查询和顺序唯一性索引；仅新增前向 Flyway 和对应回滚说明。
- API：`docs/api/openapi.culture.json`、生成脚本、`culture-api-contract.ts`、`culture-types.ts`。
- 前端：`features/culture` 迁徙专题、URL 状态、Tracking 深链和 Playwright。
- 文档：领域/API/兼容退出策略及本执行记录。

## 设计与不变量

1. `branchId` 必须属于请求宗族；`founderPersonId` 为空时允许后补，非空时人物必须属于同一宗族且在支派授权范围内。
2. 同一宗族同一支派的有效事件 `sequenceNo` 唯一；更新时排除自身，软删除后可复用。
3. `fromLocation` 与 `toLocation` 至少各有一个非空值，规范化后不能相同。
4. 列表总数、分页和排序必须在权限/隐私过滤之后计算；禁止内存分页。
5. 默认排序为支派、`sequenceNo`、`updatedAt`，未知历史时间仅作为文本，不参与不可靠推断。
6. 草稿/驳回可直接维护；`official` 修改、归档和删除创建审核申请；审核通过后才更新正式时间轴。
7. 前端动作由每个对象自己的 `allowedActions` 驱动，后端始终再次鉴权。
8. 来源、附件、审核与 Tracking 只展示后端已授权的数据，不从日志或 Diff 推断封存信息。

## 数据库变更方案

- 方案：新增针对 `clan_id + branch_id + sequence_no + deleted_at`、宗族分页/状态/更新时间及始迁祖筛选的索引；顺序唯一性优先使用 PostgreSQL 部分唯一索引 `WHERE deleted_at IS NULL`。
- 影响：索引创建会占用短时 DDL 锁和额外存储；表当前为新模块，风险可控。
- 历史数据：不从旧支派字段自动回填，避免制造无来源迁徙结论。
- 兼容：旧字段保持只读；新写入只进入 `migration_event`。
- 回滚：删除本 Issue 新增索引；业务代码回滚后新表数据保持不丢失。

## 验证方案

- 领域：空起止地、同地迁徙、顺序冲突、版本冲突、跨宗族支派/人物拒绝。
- 查询：关键词、迁出地、迁入地、历史时期、始迁祖、状态、隐私、支派子树和稳定排序。
- 审核：草稿提交、重复提交、自审拒绝、正式修改/归档/删除审核通过后 apply。
- 来源与追踪：来源摘要、审核摘要、日志、trace coverage 和对象名称。
- 数据库：Flyway 治理、PostgreSQL 启动、部分唯一索引和查询计划基础检查。
- 前端：URL 恢复、时间轴顺序、真实详情、完整度提示、动作权限、390px 响应式和 403 最小披露。
- 命令：`mvn test`、`npm run api:generate`、`npm run api:check`、`npm run typecheck`、`npm run build`、迁徙 Playwright。

## 已知风险

- 现有 OpenAPI 已预留迁徙路由，但缺少迁出/迁入/历史时期独立筛选和归档接口，需要 Contract First 前向补全。
- 通用审核/权限服务目前主要围绕 `culture_item`，迁徙对象接入时必须复用而非复制一套流程。
- 人物与支派归属模型可能不是直接外键，需要读取现有 Person/Branch 查询接口后确定最小一致性校验。
- 主干可能并行推进其他 Issue；每个阶段结束前复核 `main` 和冲突。

## 当前恢复检查点

- 当前 Issue：#170
- 当前分支：`agent/issue-170-migration-timeline`
- Draft PR：待创建
- 最后完成任务：规则、需求、现场、实体、仓储和 OpenAPI 基线确认
- 当前进行中：创建 Draft PR 并回写 Issue
- 当前任务累计耗时：已累计约 4 分钟
- 最新 Commit：由本检查点提交确定
- CI 状态：尚未触发业务验证
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：创建 Draft PR，回写 Issue，然后读取同类文化治理实现与迁徙生成类型
- 最后更新时间：2026-07-15 08:35，北京时间
