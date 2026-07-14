# Issue #195 执行看板：批量查询、数据库过滤与大族谱性能

- Issue：https://github.com/gyguan/genealogy/issues/195
- 所属 EPIC：https://github.com/gyguan/genealogy/issues/191
- 前置实现：#194 / PR #207 / `b32beea4055ddb609a5264ab6d5e434f55929ea1`
- 工作分支：`agent/issue-195-tree-batch-query`
- Draft PR：https://github.com/gyguan/genealogy/pull/208
- 目标：按层批量加载世系数据，并将宗族、支派、状态、软删除和关系范围下推数据库，消除 Tree 查询的逐节点/逐边 N+1 与支派全宗族加载。
- 最后更新时间：2026-07-14 21:35（北京时间）

## 主要交付

- Person Repository：按人物 ID 集合、支派 ID 集合和数据状态批量查询。
- Relationship Repository：按前沿人物集合、方向、状态、关系范围、宗系标识及可见人物集合批量查询。
- 祖先/后代：每层一次关系批量查询和一次人物批量查询；安全深度判断最多增加一次下一层探测。
- 支派图：使用递归支派 ID 查询和候选人物 ID 关系查询，不再读取全宗族人物/关系。
- 可见性会话：复用批量实体并缓存“支派+权限”判断，消除 Person/Relationship 二次单对象读取。
- CI：Backend CI 从跳过测试改为 `mvn verify`，失败时保留短期 Surefire 诊断报告。

## 非目标

- 不新增 API、依赖、缓存、数据库 schema 或 Flyway。
- 不改变人物、关系和审核写入规则。
- 不实现前端虚拟化。

## 执行任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、前置实现和 Repository 现场，建立分支、看板与 Draft PR | ✅ 已完成 | 约 5 分钟 | 分支、检查点、PR #208 与 Issue 回写已建立 |
| 2 | 增加人物与关系数据库过滤批量查询 | ✅ 已完成 | 约 5 分钟 | JPQL 下推 clan、IDs、statuses、deleted、category 和 lineage 条件 |
| 3 | 将人物祖先/后代改造为分层批量加载 | ✅ 已完成 | 约 8 分钟 | 查询次数由节点级降为层级；保留安全投影和 #194 防护 |
| 4 | 将支派世系改造为支派/人物范围数据库过滤 | ✅ 已完成 | 约 5 分钟 | 使用 `findSubtreeIds`、分页候选人物和人物集合关系查询 |
| 5 | 增加查询次数测试、性能基线和 Review，验证后合入 main | ✅ 已完成 | 约 9 分钟 | 全量 `mvn verify` 通过；8 个 Tree 批量测试、15 个可见性测试通过 |

## 性能基线

- 宽层：每层 1 次关系查询 + 最多 1 次人物批量查询，不随同层节点数线性增加。
- 深链：`depth` 次层查询，边界判断最多增加 1 次安全探测。
- 支派图：1 次支派子树 ID 查询、1 次候选人物查询、1 次候选关系查询；不调用全宗族人物/关系方法。
- `IN` 参数受 #194 的节点/边硬上限约束。

## 索引评估

候选方向为 `person(clan_id, branch_id, data_status, deleted_at)`、`relationship(clan_id, from_person_id/to_person_id, data_status, deleted_at)`。当前无真实 PostgreSQL 大数据量 `EXPLAIN ANALYZE` 证据，因此本 Issue 不新增索引或迁移，避免盲目写放大；由具备代表性数据的专项验证决定。

## 验证结果

- Backend CI #2251 / Backend Verify：✅ `mvn verify` 通过。
- Tree 批量与边界测试：✅ 8 个。
- Tree 可见性与预加载会话测试：✅ 15 个。
- JPQL Repository 初始化与全量测试：✅。
- PR diff：✅ 8 个相关文件，无 API、数据库或前端改动。

## 五轴 Review

- Correctness：✅ 批量化未改变节点/边去重、环、深度和容量语义。
- Readability：✅ Repository、可见性会话和层级遍历职责清晰。
- Architecture：✅ 继续使用模块化单体和 Spring Data JPA，无新技术栈。
- Security：✅ 数据库预过滤后仍执行后端安全投影；权限结果按请求缓存而非放宽。
- Performance：✅ 消除实体二次读取、逐节点关系查询和全宗族加载。

## 当前恢复检查点

- 当前 Issue：#195
- 当前分支：`agent/issue-195-tree-batch-query`
- Draft PR：#208
- 最新 Commit：本次最终执行记录
- 最后完成任务：实现、全量真实测试和 Review
- 当前进行中：转 Ready 并 squash 合入 main
- CI 状态：Backend Verify 通过
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：合入 #208，回写 Issue/EPIC，然后启动 #196
- 最后更新时间：2026-07-14 21:35（北京时间）
