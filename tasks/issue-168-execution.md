# Issue #168 执行看板：文化资料来源、审核、权限隐私与追踪

- Issue：https://github.com/gyguan/genealogy/issues/168
- 工作分支：`agent/issue-168-culture-governance`
- Draft PR：https://github.com/gyguan/genealogy/pull/189
- 目标：让 `culture_item` 接入来源证据、revision/review apply、文化专属权限与范围、隐私最小披露和统一追踪，形成可信正式数据闭环。
- 最后更新时间：2026-07-14 19:50，北京时间

## 实现范围

- 来源绑定支持 `culture_item`，校验来源、目标同宗族且在调用人可见范围内。
- 实现文化资料提交审核、通过、驳回、revision apply、正式归档和精选变更审核。
- 新增文化资料权限，映射内置角色及 `clan / branch_subtree` 数据范围。
- 后端联合成员、角色、范围、隐私、敏感级别和状态计算 `allowedActions`。
- 对 `private / sealed` 实施正文、摘录、附件元数据和对象存在性的最小披露。
- 追踪中心搜索和 trace 聚合支持 `culture_item`，聚合 revision、review task、source binding 和 operation log，并设置有界上限。
- 新增、编辑、提交、审核、绑定、归档和精选操作记录安全日志，不写完整敏感正文。

## 非目标

- 不实现最终文化资料库页面，由 #169 完成。
- 不接入迁徙事件和文化场所。
- 不实现双人复核或对象级临时 ACL。
- 不修改已执行的历史 Flyway；数据库调整只通过更高版本前向迁移交付。

## 执行任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、前置实现与现有通用治理框架 | ✅ 已完成 | 约 8 分钟 | 已读取根/后端规则、Issue 治理、#168 和 #167 合入基线；确认无现有分支或 PR |
| 2 | 建立分支、执行看板、Draft PR 和 Issue 回写 | ✅ 已完成 | 约 4 分钟 | 分支、执行看板、Draft PR #189 和 Issue 回写已建立 |
| 3 | 补齐文化来源、审核、权限与追踪 OpenAPI/领域契约 | ✅ 已完成 | 约 15 分钟 | 复用既有文化/Tracking OpenAPI；新增 Java 请求 DTO、受控 revision payload 和稳定错误语义 |
| 4 | 实现文化 revision/review apply、归档和来源绑定范围校验 | ✅ 已完成 | 约 45 分钟 | `@Primary` 适配器接入通用 approve/reject/apply；正式更新、删除、归档和精选变更走审核；文化来源禁止直绑 |
| 5 | 实现文化权限种子、隐私矩阵、allowedActions 和追踪聚合 | ✅ 已完成 | 约 40 分钟 | 新增 9 项文化权限；private/sealed 最小披露；tracking 搜索与 trace 有界聚合完成 |
| 6 | 补充单元、权限矩阵、PostgreSQL 与契约测试 | ✅ 已完成 | 约 20 分钟 | 新增权限/治理测试和长期 Culture Governance CI；Migration、API、Backend 已通过，完整测试/PG 启动正在复跑 |
| 7 | 执行完整验证、五轴 Review、合入 main 并关闭 Issue | 🔄 进行中 | 已累计约 8 分钟 | 检查最新 main、CI 和 Review，满足门禁后转 Ready 并合入 |

## 关键设计

1. **通用审核复用**：继续使用 `revision → review_task → approve/reject → apply`，通过 `@Primary` 文化适配器接入，不修改人物、关系、来源等现有审核行为。
2. **敏感 payload 隔离**：正式更新正文只进入内部 `culture_revision_payload`，通用 revision/trace 仅保存字段摘要和正文长度；审核完成后删除内部 payload。
3. **来源绑定审核化**：文化来源直绑返回 `CULTURE_SOURCE_BINDING_REVIEW_REQUIRED`；新增/替换/删除仍生成标准 `source_binding` revision，且 revision 不保存 excerpt 原文。
4. **权限与隐私**：新增 `culture.view/create/update/delete/submit_review/review/archive/feature/view_sensitive`，复用 `clan / branch_subtree` 数据范围；sealed 和高度敏感对象无权时统一 not-found。
5. **有界追踪**：搜索在 SQL 层完成范围、隐私、分页和计数；trace 对 revision、review task、source binding、operation log 各取最近 100 条，并返回截断段与覆盖说明。

## 数据库与回滚

- 新增 `culture_revision_payload`，只保存待审核正式更新的内部载荷。
- 新增文化 revision 历史和待审核范围索引。
- 权限种子及内置角色映射采用幂等 upsert。
- 初始迁移版本因 `main` 新增 `V20260714223000` 被重新编号为 `V20260714224500`；未修改任何主干历史迁移。
- 回滚采用更高版本前向补偿：停止文化变更提交、清理待审核 payload、撤销角色映射并删除内部表。

## 验证结果

- Database Migration Governance：✅ 通过。
- API Contract：✅ 通过。
- Backend Compile：✅ 通过。
- Culture Governance CI：🔄 最新 Head 正在执行完整 `mvn test`、PostgreSQL 16、Flyway 与健康检查。
- Review：当前无未解决线程。

## 已知边界

- 最终文化资料库 UI 由 #169 完成。
- 文化来源绑定为保护摘录隐私，审核 revision 不保存 excerpt 原文；本 Issue 保留来源关系和可信度，受控摘录补录可在后续专用接口扩展。
- 分支当前落后 `main` 两个并行提交（审核历史查询与追踪中心收尾），本 PR 只新增文化适配器和文件，GitHub 当前判定可合并；最终合入前再次核对。

## 当前恢复检查点

- 当前 Issue：#168
- 当前分支：`agent/issue-168-culture-governance`
- Draft PR：#189
- 最新业务 Commit：`5f77a08a5cf4dc26047ea6834b8826f54857f628`
- 最新 CI Commit：由本次看板更新提交确定
- 当前进行中：完整测试、PostgreSQL 启动、Review 与合入
- CI 状态：Migration 已通过；API/Backend/Culture Governance 正在最新 Head 复跑
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：确认 Culture Governance CI 结果，完成五轴 Review并转 Ready
- 最后更新时间：2026-07-14 19:50，北京时间
