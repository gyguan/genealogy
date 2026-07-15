# Issue #170 执行看板：结构化迁徙脉络管理

- Issue：https://github.com/gyguan/genealogy/issues/170
- 工作分支：`agent/issue-170-migration-timeline`
- PR：https://github.com/gyguan/genealogy/pull/214
- 目标：建设基于 `migration_event` 的多支派、多节点迁徙管理，形成后端分页、审核发布、权限隐私、来源追踪与前端时间轴闭环。
- 最后更新时间：2026-07-15 10:10，北京时间

## 完成范围

- 补全迁徙 OpenAPI：地点、时期、始迁祖、状态、隐私、来源覆盖、分页、排序、详情、归档和稳定响应语义。
- 实现迁徙事件分页列表、详情、新增、编辑、软删除、正式删除申请、归档和提交审核。
- 权限、支派子树、隐私与来源覆盖过滤在数据库分页和总数统计前完成。
- 校验宗族、支派和始迁祖归属；拒绝空起止地、同地迁徙、顺序冲突、版本冲突和跨宗族关联。
- 正式事件修改、归档和删除统一使用 `revision → review_task → approve/reject → apply`，审批 apply 时再次校验数据漂移。
- 迁徙对象复用来源绑定审核、来源反查保护、日志脱敏、Tracking 搜索和 Trace 变更链。
- 宗族文化页新增真实迁徙专题：时间轴、全量筛选、分页列表、详情、编辑、提交审核及高风险确认。
- 缺失时期、始迁祖、原因或来源只显示完整度提示，不拼接或推断路线。
- 旧 `branch.migrationFrom/migrationTo` 保持只读，不双写、不自动迁移，并记录退出条件。
- 新增迁徙时间轴和版本历史索引；不修改任何历史 Flyway。

## 非目标

- 不接入地图 SDK、路径规划、GIS、历史地名转换或复杂动画。
- 不使用 AI 生成迁徙结论。
- 不实现 #171 文化场所和 #172 首页统一摘要。
- 不自动把旧支派字段转换为迁徙事实。

## 执行任务看板

| 序号 | 任务 | 状态 | 活跃耗时 | 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、前置实现和迁徙模型/契约 | ✅ 已完成 | 约 12 分钟 | 已确认 #169 完成，#170 无重复现场；原实体/仓储/契约仅为骨架 |
| 2 | 建立分支、执行看板、Draft PR 和 Issue 回写 | ✅ 已完成 | 约 5 分钟 | 分支、看板、Draft PR #214 和启动评论完成 |
| 3 | Contract First 补全迁徙 API、生成类型与兼容说明 | ✅ 已完成 | 约 20 分钟 | 新增 migration runtime overlay，生成类型/操作清单与兼容退出文档一致 |
| 4 | 实现领域校验、数据库分页/索引与基础 CRUD | ✅ 已完成 | 约 35 分钟 | 领域不变量、Specification 分页、聚合详情、前向索引和回滚脚本完成 |
| 5 | 接入来源、审核、权限隐私、日志和 Tracking | ✅ 已完成 | 约 45 分钟 | 统一 revision/review/apply、来源审核、反查保护、日志脱敏、Tracking 搜索/Trace 完成 |
| 6 | 实现迁徙时间轴、列表、详情、表单和高风险交互 | ✅ 已完成 | 约 35 分钟 | URL 恢复、全量筛选、真实时间轴、编辑、审核/归档/删除语义与移动端完成 |
| 7 | 补充后端、PostgreSQL、契约、前端和浏览器测试 | ✅ 已完成 | 约 30 分钟 | 领域测试、全量回归、PostgreSQL/Flyway、API、TypeScript、构建和 Playwright 通过 |
| 8 | 五轴 Review、清理产物、更新记录并合入 main | 🔄 进行中 | 已累计约 15 分钟 | 已清理报告、测试状态、重复迁移和锁文件；无 Review 线程，准备转 Ready 合入 |

## 核心不变量

1. `branchId` 必须属于请求宗族；始迁祖非空时必须属于同宗族，并位于事件支派或其下级支派。
2. 同一宗族、同一支派的有效事件 `sequenceNo` 唯一；更新排除自身，软删除后可复用。
3. `fromLocation`、`toLocation` 均必填，规范化空白和大小写后不得相同。
4. 权限、支派子树和隐私过滤在数据库分页与 `totalElements` 统计之前执行。
5. 历史时期保持来源文本，不自动推断或换算年代。
6. 草稿/驳回可直接维护；正式事件修改、归档和删除必须审核通过后生效。
7. 前端动作由对象自身 `allowedActions` 驱动，后端每次写操作再次鉴权。
8. 来源、日志和 Tracking 只返回授权内容，不从日志或 Diff 恢复封存信息。

## 数据库变更

- 新增迁移：`V20260715091000__add_migration_event_runtime_indexes.sql`。
- 新增索引：
  - `idx_migration_event__clan_branch_status_sequence`
  - `idx_revision__migration_event_history`
- #166 已有的部分唯一顺序索引继续作为并发最终约束，本 Issue 不重复创建。
- 风险：创建普通/部分索引会占用短时 DDL 锁和额外存储；不改写业务数据。
- 回滚：`database/rollback/20260715_issue-170_drop_migration_runtime_indexes.sql`，只删除本次索引，不删除迁徙数据。

## 验证结果

- Backend CI：✅ `29383230895`。
- Culture Governance 聚焦测试与全量回归：✅ `29383230871`。
- Culture PostgreSQL 集成、打包与 Flyway 启动：✅ `29383230871`。
- API Contract：✅ `29383230875`。
- Database Migration Governance：✅ `29383230908`。
- Frontend CI：✅ `29383230874`。
- Culture Library UI CI：✅ `29383230861`。
- Playwright：✅ 文化资料库回归、迁徙 URL 恢复、地点筛选写回、真实详情/来源/Trace、390px 响应式和 403 最小披露。
- 主干同步：✅ 与最新 `main` 比较为 `ahead`，`behind=0`。
- Review：✅ 无提交 Review、无未解决线程。

## 五轴 Review

- Correctness：✅ 列表、详情、顺序/版本校验及正式变更审核语义与契约一致。
- Readability：✅ controller、application、domain、governance、tracking 和前端时间轴职责分离。
- Architecture：✅ 复用文化权限、来源、审核、日志和 Tracking，不建设第二套治理基础设施。
- Security：✅ 对象级权限、支派子树、敏感事件、来源反查、日志和 Trace 均执行最小披露。
- Performance：✅ 数据库分页、批量聚合、稳定排序、受限 Trace 每段上限 100，无前端全量扫描。

## 已知边界

- 起止地为来源文本，不提供 GIS 路径或历史地名标准化。
- 浏览器测试使用严格契约形状 mock；真实权限、审核、数据库和 Flyway 由后端/PostgreSQL 门禁覆盖。
- 并发顺序冲突最终由 #166 部分唯一索引兜底；前置检查用于稳定业务提示。
- 旧字段退出需满足人工核对迁移、一个发布周期无读取和专项扫描三个条件。

## 当前恢复检查点

- 当前 Issue：#170
- 当前分支：`agent/issue-170-migration-timeline`
- PR：#214
- 最新业务 Head：`050950e88de8c4ab8830e52cbe9fd225664b7981`
- CI 状态：全部通过
- 未解决 Review：无
- 主干状态：`behind=0`，GitHub `mergeable=true`
- 当前进行中：更新 PR 验收记录，转 Ready 后复核并 squash 合入
- 下一顺序任务：#171 建设祠堂与文化场所管理
- 最后更新时间：2026-07-15 10:10，北京时间
