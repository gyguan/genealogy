# Issue #194 执行看板：遍历去重、环防护与容量边界

- Issue：https://github.com/gyguan/genealogy/issues/194
- 所属 EPIC：https://github.com/gyguan/genealogy/issues/191
- 前置实现：Issue #193 / PR #204 / Main Commit `060200eb48db510dfa4da239823e6b9780eef9f7`
- 契约：Issue #192 / `docs/api/openapi.tree.json` / `docs/12-lineage-tree-contract.md`
- 工作分支：`agent/issue-194-tree-guardrails`
- Draft PR：待创建
- 目标：为人物中心、家庭、祖先、后代和支派世系建立统一的遍历状态、去重、环检测、深度与容量截断，并按既有契约返回 `meta/warnings`。
- 最后更新时间：2026-07-14 20:46（北京时间）

## 实现范围

- 新增契约已定义的 Tree 图响应 DTO：图内 `nodeId/edgeId`、`direction/dataView`、`TreeGraphMeta`、`TreeGraphWarning`。
- 保持可见人物按人物去重，同一关系按关系 ID 去重；合法多父、多承嗣和多路径边不得因节点已存在而被删除。
- 人物祖先、后代和双向遍历维护已访问人物、已入队人物、当前路径和已返回边集合，阻断自环、祖先环、异常回边和队列重复膨胀。
- 家庭一跳和支派全局图使用同一节点/边容量规则、重复边统计和聚合告警。
- 统一归一化 `maxDepth=5/20`、`maxNodes=500/2000`、`maxEdges=1000/4000`；达到上限后停止继续扩张并返回截断原因。
- 所有计数、环和重复边告警均基于 #193 安全投影后的可见数据，不返回人物 ID、关系 ID或敏感详情。
- 根人物被安全占位、被过滤或图完全裁剪时返回契约允许的安全空图/占位图和 `root_filtered` 告警。
- 增加普通树、菱形 DAG、多父/多承嗣、环、自环、重复边、深度边界、节点上限、边上限和支派图测试。

## 非目标

- 不优化 SQL 查询次数、N+1 或数据库级权限过滤；由 #195 承接。
- 不修改关系写入、关系环校验、审核流程或正式数据生效规则。
- 不修改数据库 schema、Flyway、前端页面或拓扑布局。
- 不引入图数据库或新增第三方依赖。
- 不实现证据、审核和异常聚合摘要；由后续 Issue 承接。

## 方案、影响与回滚

- 方案：新增内部 `TraversalContext/GraphAccumulator`，在安全投影之后统一维护节点、边、队列、路径、容量和告警；人物查询与支派查询复用同一响应构建逻辑。
- 环判定：当前路径命中视为环/回边；已访问或已入队但不在当前路径中的节点视为合法多路径，仅阻止重复入队，仍保留新的合法关系边。
- 边去重：优先使用 `relationshipId`；历史异常无 ID 时使用不含敏感内容的内部端点与关系类型复合键。重复仅计数和告警，不输出第二次。
- 容量：节点和边在加入安全投影结果前检查上限；命中后记录 `max_nodes/max_edges`，停止该方向继续扩张。深度边界记录 `max_depth`，不越界查询下一层。
- 兼容：实现 #192 已定义响应结构；旧 Tree 前端仍可从扩展响应中的人物和关系兼容字段读取。历史查询路径全部保留。
- 影响：后端 Tree DTO、Controller、Application Service 和聚焦测试；不涉及数据迁移。
- 回滚：恢复 Tree DTO、Controller 和 Application Service，并删除新增 DTO/测试即可；Tree 只读，无数据回滚。

## 执行任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、前置实现和契约，建立分支、看板与 Draft PR | 🔄 进行中 | 已累计约 3 分钟 | 已确认首次启动并创建分支、检查点文件 |
| 2 | 实现 Tree 响应 DTO、统一参数归一化和兼容字段 | ⏳ 待处理 | — |  |
| 3 | 实现人物遍历去重、路径环检测和安全容量截断 | ⏳ 待处理 | — |  |
| 4 | 将家庭和支派图接入统一边界策略并补齐告警 | ⏳ 待处理 | — |  |
| 5 | 补充聚焦测试，执行 Backend CI、API Contract 和五轴 Review，满足门禁后合入 main | ⏳ 待处理 | — |  |

## 影响模块

- 后端：`tree/dto`、`tree/controller`、`tree/application`。
- API：实现 #192 已存在的响应 DTO、查询参数和硬上限，不新增路径或枚举。
- 测试：Tree Application Service、Controller 参数和响应正确性。
- Person/Relationship、数据库、Flyway、前端页面：不修改。

## 验证方案

- 聚焦测试：普通树、菱形 DAG、多父/承嗣、环、自环、重复边、深度、节点/边上限、支派图和安全根节点。
- `cd backend/genealogy-backend && mvn test`
- API Contract：确认运行时 DTO、Controller 与 `openapi.tree.json` 一致。
- GitHub Actions：Backend CI、API Contract。
- 五轴 Review：重点检查 Correctness、Security、Performance，同时检查 Readability、Architecture。

## 已知风险与边界

- 同一人物可由多条合法关系边到达，节点去重不能等同于边去重；必须保留每条不同关系 ID 的安全可见边。
- 双向查询可能从祖先和后代两个方向重复遇到同一边；需共享边集合和告警计数。
- `maxDepth` 告警只表达存在可见的下一层候选时命中，避免对不可见关系产生数量侧信道。
- 支派图不是从单根 BFS 生成，环检测基于过滤后的可见有向边执行，孤立节点和多组件仅做聚合告警。
- #195 前仍沿用现有逐节点查询和内存候选加载；本 Issue 只确保边界可控，不声称性能已优化。

## 当前恢复检查点

- 当前 Issue：#194
- 当前分支：`agent/issue-194-tree-guardrails`
- Draft PR：待创建
- 最新 Commit：首次执行看板检查点提交
- 最后完成任务：刷新最新规则、Issue、前置 #193、#192 契约和现有 Tree 实现
- 当前进行中：创建 Draft PR 并回写 Issue
- 当前任务累计耗时：已累计约 3 分钟
- CI 状态：未运行
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：创建 Draft PR，并将真实分支、PR 和看板位置回写 Issue #194
- 最后更新时间：2026-07-14 20:46（北京时间）
