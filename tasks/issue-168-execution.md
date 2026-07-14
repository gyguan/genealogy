# Issue #168 执行看板：文化资料来源、审核、权限隐私与追踪

- Issue：https://github.com/gyguan/genealogy/issues/168
- 实现分支：`agent/issue-168-culture-governance`
- 实现 PR：https://github.com/gyguan/genealogy/pull/189
- 合入 Commit：`b05d36557679c137d21211e5ba9a66efa23d5ae8`
- 目标：让 `culture_item` 接入来源证据、revision/review apply、文化专属权限与范围、隐私最小披露和统一追踪，形成可信正式数据闭环。
- 最后更新时间：2026-07-14 21:13，北京时间

## 实现范围

- 来源绑定支持 `culture_item`，校验来源、目标同宗族且在调用人可见范围内。
- 实现文化资料提交审核、通过、驳回、revision apply、正式归档和精选变更审核。
- 新增文化资料权限，映射内置角色及 `clan / branch_subtree` 数据范围。
- 后端联合成员、角色、范围、隐私、敏感级别和状态计算 `allowedActions`。
- 对 `private / sealed` 实施正文、摘录、附件元数据、操作日志和对象存在性的最小披露。
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
| 4 | 实现文化 revision/review apply、归档和来源绑定范围校验 | ✅ 已完成 | 约 55 分钟 | 文化 apply 与现有异步导入 apply 组成单一委托链；正式更新、删除、归档和精选变更走审核；文化来源禁止直绑 |
| 5 | 实现文化权限种子、隐私矩阵、allowedActions 和追踪聚合 | ✅ 已完成 | 约 50 分钟 | 新增 9 项文化权限；private/sealed 详情、来源旁路和日志最小披露；tracking 搜索与 trace 有界聚合完成 |
| 6 | 补充单元、权限矩阵、PostgreSQL 与契约测试 | ✅ 已完成 | 约 35 分钟 | 定向测试、全量回归、PostgreSQL 集成、Flyway 和 JAR 启动均通过 |
| 7 | 执行完整验证、五轴 Review、合入 main 并关闭 Issue | ✅ 已完成 | 约 15 分钟 | PR #189 已 Ready 后 squash 合入；Issue #168 自动关闭为 completed |

## 关键设计

1. **通用审核复用**：继续使用 `revision → review_task → approve/reject → apply`。文化 apply 继承异步导入感知 apply，作为唯一 `@Primary`，非文化目标继续委托原实现。
2. **敏感 payload 隔离**：正式更新正文只进入内部 `culture_revision_payload`，通用 revision/trace 仅保存字段摘要和正文长度；审核完成后删除内部 payload。
3. **来源绑定审核化**：文化来源直绑返回 `CULTURE_SOURCE_BINDING_REVIEW_REQUIRED`；新增/替换/删除仍生成标准 `source_binding` revision，且 revision 不保存 excerpt 原文。
4. **权限与隐私**：新增 `culture.view/create/update/delete/submit_review/review/archive/feature/view_sensitive`，复用 `clan / branch_subtree` 数据范围；sealed 和高度敏感对象无权时统一 not-found。
5. **旁路封堵**：source-centric binding 列表和精确目标查询同样执行文化对象可见性校验；受限文化操作日志只保存通用动作，不保存标题和详情。
6. **有界追踪**：搜索在 SQL 层完成范围、隐私、分页和计数；trace 对 revision、review task、source binding、operation log 各取最近 100 条，并返回截断段与覆盖说明。

## 数据库与回滚

- 新增 `culture_revision_payload`，只保存待审核正式更新的内部载荷。
- 新增文化 revision 历史和待审核范围索引。
- 权限种子及内置角色映射采用幂等 upsert。
- 初始迁移版本因 `main` 新增 `V20260714223000` 被重新编号为 `V20260714224500`；未修改任何主干历史迁移。
- 回滚采用更高版本前向补偿：停止文化变更提交、清理待审核 payload、撤销角色映射并删除内部表。

## 验证结果

- Database Migration Governance：✅ 通过，run `29331318073`。
- API Contract：✅ 通过，run `29331318174`。
- Backend CI：✅ 通过，run `29331318050`。
- Culture Unit and Regression Tests：✅ 定向文化测试与全量 `mvn test` 通过。
- Culture PostgreSQL and Flyway：✅ PostgreSQL 16 集成测试、Flyway、打包和 JAR 健康启动通过，run `29331318017`。
- Review：✅ 无提交 Review、无未解决线程。
- 合并结果：✅ PR #189 squash 合入 `main`，Commit `b05d36557679c137d21211e5ba9a66efa23d5ae8`。
- Issue 状态：✅ #168 已关闭，state reason 为 `completed`。

## 五轴 Review

- Correctness：✅ 正式更新、删除、归档和精选变更只经审核 apply 生效；发布驳回恢复 rejected；自审继续由通用审核拒绝。
- Readability：✅ 文化能力通过目标适配器接入，Controller、Policy、Governance、Apply、Source 和 Tracking 职责分离。
- Architecture：✅ 不建立第二套审核表；复用统一 revision、review task、source binding、RBAC、operation log 和 tracking。
- Security：✅ 支派范围、sealed 存在性、正文 payload、来源摘录、source 旁路和操作日志均执行后端最小披露。
- Performance：✅ 搜索数据库分页计数；trace 单段和总时间线限制 100；历史查询有匹配索引。

## 已知边界

- 最终文化资料库 UI 由 #169 完成。
- 文化来源绑定为保护摘录隐私，审核 revision 不保存 excerpt 原文；本 Issue 保留来源关系和可信度，受控摘录补录可在后续专用接口扩展。
- source-centric 分页在过滤不可见文化目标后以当前可见记录重新计算响应总数，优先保证不泄露受限对象数量；后续可增加数据库级联合分页查询优化体验。

## 最终状态

- 当前 Issue：#168，✅ completed
- 实现 PR：#189，✅ merged
- 主干 Commit：`b05d36557679c137d21211e5ba9a66efa23d5ae8`
- EPIC #165：第 3 项 #168 已勾选
- 下一顺序任务：#169 `[宗族文化 P0-04] 重构文化资料库列表、详情与编辑体验`
