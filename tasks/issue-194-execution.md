# Issue #194 执行看板：遍历去重、环防护与容量边界

- Issue：https://github.com/gyguan/genealogy/issues/194
- 所属 EPIC：https://github.com/gyguan/genealogy/issues/191
- 前置实现：Issue #193 / PR #204 / Main Commit `060200eb48db510dfa4da239823e6b9780eef9f7`
- 契约：Issue #192 / `docs/api/openapi.tree.json` / `docs/12-lineage-tree-contract.md`
- 工作分支：`agent/issue-194-tree-guardrails`
- Draft PR：https://github.com/gyguan/genealogy/pull/207
- 目标：为人物中心、家庭、祖先、后代和支派世系建立统一的遍历状态、去重、环检测、深度与容量截断，并按既有契约返回 `meta/warnings`。
- 最后更新时间：2026-07-14 21:06（北京时间）

## 实现范围

- 落地 #192 已定义的 `nodeId/edgeId`、`direction/dataView`、`TreeGraphMeta` 和 `TreeGraphWarning`。
- 人物节点按人物 ID 去重，关系边优先按关系 ID 去重；不同关系 ID 的多父、多承嗣和兼祧路径完整保留。
- 人物遍历维护已访问、已入队和当前路径集合，阻断自环、祖先环、异常回边和队列重复膨胀。
- 家庭一跳、祖先、后代、双向和支派图统一使用安全投影后的节点/边容量规则。
- 统一应用 `maxDepth=5/20`、`maxNodes=500/2000`、`maxEdges=1000/4000`；命中后停止继续扩张并返回截断原因。
- 支派图对安全可见关系执行重复统计、环检测、深度选择和孤立节点聚合告警。
- 根人物被安全占位或过滤时返回无真实人物 ID 的占位图及 `root_filtered`。
- 聚焦测试覆盖普通树、菱形 DAG、环、重复边、深度、节点/边上限和支派图。

## 非目标

- 不优化 SQL 查询次数、N+1 或数据库级权限过滤；由 #195 承接。
- 不修改关系写入、关系环校验、审核流程或正式数据生效规则。
- 不修改数据库 schema、Flyway、前端页面或拓扑布局。
- 不引入图数据库或新增第三方依赖。

## 方案、影响与回滚

- 方案：新增 `TreeGraphAccumulator`，在 #193 安全投影后统一维护节点、边、容量、截断原因和聚合告警。
- 环判定：当前路径命中视为环/回边；已访问但不在当前路径的节点只阻止重复入队，仍保留新的合法关系边。
- 边去重：优先使用 `relationshipId`；无 ID 时使用端点与关系类型复合键。
- 兼容：历史 Tree 路径和旧 `rootPersonId/name/fromPersonId/toPersonId` 字段继续保留，同时补齐目标契约字段。
- 影响：仅后端 Tree Application、Controller、DTO、聚焦测试和执行记录。
- 回滚：恢复 Tree 文件并删除累加器即可；Tree 只读，无数据回滚。

## 执行任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、前置实现和契约，建立分支、看板与 Draft PR | ✅ 已完成 | 约 5 分钟 | 检查点 `4959919`；Draft PR #207 和 Issue 启动评论已建立 |
| 2 | 实现 Tree 响应 DTO、统一参数归一化和兼容字段 | ✅ 已完成 | 约 4 分钟 | 新增 meta/warning，扩展 node/edge/graph DTO，Controller 透传容量参数 |
| 3 | 实现人物遍历去重、路径环检测和安全容量截断 | ✅ 已完成 | 约 7 分钟 | `TreeGraphAccumulator`、visited/queued/path、边去重和三类截断已落地 |
| 4 | 将家庭和支派图接入统一边界策略并补齐告警 | ✅ 已完成 | 约 5 分钟 | 家庭、双向、支派图统一累加；支派图增加环、重复和孤立节点聚合 |
| 5 | 补充聚焦测试，执行 Backend CI、API Contract 和五轴 Review，满足门禁后合入 main | ✅ 已完成 | 约 5 分钟 | Backend CI #2234、API Contract #942 通过；diff 仅 10 个相关文件 |

## 验证结果

- Backend CI #2234：✅ 通过。
- API Contract #942：✅ 通过。
- 聚焦测试：✅ 覆盖安全根节点、部分可见、环、菱形 DAG、重复边、深度、节点/边容量和支派图。
- PR diff：✅ 10 个文件，均属于 Tree 实现、DTO、测试或任务看板。
- 数据库、Flyway、依赖、写入和审核流程：未修改。

## Issue 验收核对

- [x] 环数据不会导致无限遍历或队列持续膨胀。
- [x] 同一人物只输出一次，同一关系边只输出一次。
- [x] 合法多父、多承嗣和多路径的不同关系边完整保留。
- [x] 深度、节点和边上限均返回可验证的截断元数据。
- [x] warnings 区分环、重复边、根过滤、部分可见、孤立节点和三类容量截断。
- [x] 人物中心、家庭、祖先、后代和支派图采用一致边界策略。
- [x] 所有计数和告警均在安全投影后生成，不携带隐藏人物或关系详情。

## 已知边界

- #195 前仍沿用现有逐节点查询和支派候选内存加载；本 Issue 只保证查询不会无界扩张。
- 支派图深度基于安全可见的宗系关系按组件计算；非宗系边仅在两端节点入图后返回。
- 证据、审核和异常摘要仍由 #198 承接。

## 五轴 Review

- Correctness：✅ 节点与边分别去重，多路径边不被节点去重误删。
- Readability：✅ 累加器、可见性、协议适配和遍历职责分离。
- Architecture：✅ Tree 保持只读并复用 #193 安全投影。
- Security：✅ 容量和 warnings 在过滤后计算，告警只返回聚合信息。
- Performance：✅ 深度/节点/边均有硬边界；SQL 批量优化由 #195 承接。

## 当前恢复检查点

- 当前 Issue：#194
- 当前分支：`agent/issue-194-tree-guardrails`
- Draft PR：#207
- 最新 Commit：本次最终执行记录提交
- 最后完成任务：实现、聚焦测试、Backend CI、API Contract 和五轴 Review
- 当前进行中：转 Ready 并 squash 合入 main
- CI 状态：Backend CI #2234、API Contract #942 均通过
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：合入 #207，回写 Issue/EPIC，然后启动 #195
- 最后更新时间：2026-07-14 21:06（北京时间）
