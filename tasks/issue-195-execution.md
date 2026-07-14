# Issue #195 执行看板：批量查询、数据库过滤与大族谱性能

- Issue：https://github.com/gyguan/genealogy/issues/195
- 所属 EPIC：https://github.com/gyguan/genealogy/issues/191
- 前置实现：Issue #194 / PR #207 / Main Commit `b32beea4055ddb609a5264ab6d5e434f55929ea1`
- 工作分支：`agent/issue-195-tree-batch-query`
- Draft PR：待创建
- 目标：将人物世系改造为按层批量加载，将宗族、支派、状态、软删除和关系范围下推数据库，消除逐节点/逐边 N+1 与支派全宗族加载。
- 最后更新时间：2026-07-14 21:12（北京时间）

## 实现范围

- 增加按人物 ID 集合、宗族与支派 ID 集合、数据状态批量查询。
- 增加按前沿人物集合、方向、宗族、状态、关系范围和宗系标识批量查询关系。
- 祖先与后代按 BFS 层批量加载，查询次数随深度而非节点数增长。
- 支派世系直接按授权支派 ID 和可见人物 ID 查询，不再加载整个宗族人物和关系。
- 保持 #193 安全投影与 #194 去重、环、容量和告警语义。
- 增加查询次数测试和典型深链、宽层、多支派基线。

## 非目标

- 不引入图数据库、缓存或新依赖。
- 不改变公共 API、人物/关系领域模型和审核流程。
- 不修改数据库 schema 或 Flyway。
- 不实现前端虚拟化。

## 方案、影响与回滚

- 方案：使用 Spring Data JPA/JPQL 批量查询，数据库条件包含 clan、frontier/branch/person IDs、dataStatus、deletedAt、relationCategory/type 和 lineageOnly。
- 性能：每层最多固定次数关系查询和一次人物批量查询；支派图不再调用全宗族人物/关系查询。
- 安全：数据库预过滤后仍执行 #193 安全投影，性能优化不能扩大可见范围。
- 索引：没有真实 PostgreSQL `EXPLAIN ANALYZE` 证据时不盲目增加 Flyway，仅记录候选索引。
- 回滚：恢复 Repository 和 Tree Application Service 即可，无数据变更。

## 执行任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、前置实现和 Repository 现场，建立分支、看板与 Draft PR | 🔄 进行中 | 已累计约 4 分钟 | 分支和首次检查点已建立，待创建 Draft PR 并回写 Issue |
| 2 | 增加人物与关系数据库过滤批量查询 | ⏳ 待处理 | — |  |
| 3 | 将人物祖先/后代改造为分层批量加载 | ⏳ 待处理 | — |  |
| 4 | 将支派世系改造为支派/人物范围数据库过滤 | ⏳ 待处理 | — |  |
| 5 | 增加查询次数测试、性能基线和 Review，验证后合入 main | ⏳ 待处理 | — |  |

## 验证方案

- 深链、宽层、多支派和状态/关系范围聚焦测试。
- Mockito 验证不再调用逐节点人物查询或全宗族人物/关系查询。
- `cd backend/genealogy-backend && mvn test`
- Backend CI、API Contract、五轴 Review。

## 已知风险与边界

- SQL `IN` 集合受 #194 `maxNodes<=2000` 控制，不形成无界参数。
- 批量结果必须保持稳定排序。
- 权限和隐私仍由后端安全投影最终判断。
- 未连接生产数据，不虚构索引收益或执行计划结论。

## 当前恢复检查点

- 当前 Issue：#195
- 当前分支：`agent/issue-195-tree-batch-query`
- Draft PR：待创建
- 最新 Commit：首次任务看板检查点
- 最后完成任务：规则、Issue、前置实现和 Repository 现场分析
- 当前进行中：创建 Draft PR 并回写 Issue
- 当前任务累计耗时：已累计约 4 分钟
- CI 状态：未运行
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：创建 Draft PR，随后检查 Tree 可见性服务中的隐性 N+1
- 最后更新时间：2026-07-14 21:12（北京时间）
