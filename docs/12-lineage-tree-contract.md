# 12. 世系图谱统一查询契约

> 状态：Issue #192 目标契约。本文与 `docs/api/openapi.tree.json` 共同定义世系图谱的目标公共接口；运行时安全投影、遍历治理和性能实现分别由 #193、#194、#195 完成。

## 1. 目标与边界

世系图谱不是简单的 `parentId` 树，而是人物节点和独立关系边组成的有向图。契约必须保留多父关系、入继、出继、承祧、兼祧、多配偶和同一人物多路径可达等中国式谱牒语义。

本契约只定义只读查询：

- 人物中心世系；
- 直接家庭关系；
- 上溯祖先；
- 下延后代；
- 支派及允许下级支派的全局世系。

Tree 模块不得承担人物、关系、来源或审核对象的正式写入和生效逻辑。

## 2. 契约权威来源

- 机器可执行契约：`docs/api/openapi.tree.json`；
- 领域、权限和兼容说明：本文；
- effective OpenAPI：基础 `docs/api/openapi.json` 与所有领域分片合并后的结果；
- 前端生成产物：
  - `frontend/genealogy-web/src/shared/api/generated/tree-api-contract.ts`
  - `frontend/genealogy-web/src/shared/api/generated/tree-types.ts`

`docs/07-api-design.md` 中旧的世系图简表仅作为历史概览。出现差异时，以 `openapi.tree.json` 和本文为准。

## 3. 路径与兼容窗口

| 路径 | 定位 | 状态 |
|---|---|---|
| `GET /api/v1/tree/person/{personId}` | 人物中心统一入口，通过 `direction` 选择直接家庭、祖先、后代或双向图 | 目标主入口 |
| `GET /api/v1/tree/clans/{clanId}/branches/{branchId}/lineage` | 支派及授权下级支派的全局世系 | 主入口 |
| `GET /api/v1/tree/person/{personId}/family` | 直接家庭兼容入口 | `deprecated`，暂保留 |
| `GET /api/v1/tree/ancestors` | 祖先兼容入口 | `deprecated`，暂保留 |
| `GET /api/v1/tree/descendants` | 后代兼容入口 | `deprecated`，暂保留 |

历史文档中的 `GET /api/v1/tree/branches/{branchId}` 缺少宗族上下文，不能可靠执行跨宗族隔离，不再作为有效公共契约。支派查询统一使用包含 `clanId` 的路径。

兼容入口只有在以下条件全部满足后才能删除：

1. 后端统一入口已实现并稳定运行；
2. 正式前端已迁移；
3. API 契约检查和浏览器 E2E 已覆盖；
4. 已明确发布说明、兼容窗口和回滚方式。

Issue #192 不删除任何当前运行时入口。

## 4. 查询参数

### 4.1 direction

人物中心统一入口支持：

- `family`：中心人物及直接父母、配偶、子女等一跳关系；
- `ancestors`：向上遍历；
- `descendants`：向下遍历；
- `both`：同时返回上溯和下延关系，默认值。

### 4.2 relationScopes

关系范围支持多选：

- `blood`：生物血缘；
- `ritual`：入继、出继、承祧、兼祧、嗣子等宗法承嗣；
- `marriage`：配偶、继配、侧室等婚配；
- `status`：无嗣等状态关系。

默认包含 `blood,ritual,marriage`。调用方不得把宗法关系静默折叠为普通血缘。

### 4.3 dataView

- `official`：默认视图，只返回当前用户有权看到的正式数据；
- `editing`：编辑视图，仅对具备明确编辑或审核权限且处于授权支派范围的用户开放，可包含草稿、待审核和驳回数据。

前端不能通过传入 `editing` 自行扩大权限。后端必须重新判断功能权限、支派范围、对象隐私和流程状态。

### 4.4 容量边界

| 参数 | 默认值 | 硬上限 | 说明 |
|---|---:|---:|---|
| `maxDepth` | 5 | 20 | 遍历深度 |
| `maxNodes` | 500 | 2000 | 安全投影后的最大节点数 |
| `maxEdges` | 1000 | 4000 | 安全投影后的最大关系边数 |

达到边界时必须停止继续无界扩张，并通过 `meta.truncated`、`truncationReasons` 和 `warnings` 表达。硬上限不能由客户端绕过。

## 5. 安全可见性投影

Tree 查询必须按以下顺序执行：

```text
认证登录
  → 宗族成员和功能权限
  → 授权支派及下级范围
  → 人物隐私与关系隐私
  → dataView / dataStatus 过滤
  → 图遍历、去重与环防护
  → 节点和边容量截断
  → 生成 nodes / edges / meta / warnings
```

关键规则：

1. 节点数、边数、根节点、告警和错误信息必须在权限与隐私过滤后计算，避免数量侧信道。
2. 关系可见性不得宽于两端人物中更严格的一端。
3. `official` 视图不得返回 `draft`、`pending_review`、`rejected` 或 `archived` 对象。
4. 支派负责人只能读取授权支派及允许的下级支派。
5. 在世人物、`relatives_only`、`private`、`sealed` 等对象按后端策略隐藏或脱敏。
6. 不可见对象不得通过关系标签、证据数量、审核状态、异常摘要或统计结果旁路泄露。

### 5.1 masked 节点

在业务连续性确实需要保留拓扑占位时，可以返回 `visibility=masked` 的节点。此时：

- `nodeId` 必须是当前响应内稳定、不可反推数据库主键的 opaque ID；
- `displayName` 使用通用占位文本；
- 不返回 `personId`、真实姓名、性别、世次、字辈、生卒和支派详情；
- 只返回安全的 `maskReason`；
- 与 masked 节点相关的边也必须经过最小披露处理。

如果占位本身仍会泄露敏感关系，应完全裁剪节点和相关边，而不是强制返回 masked 节点。

## 6. 图模型

### 6.1 节点

`TreeNodeResponse` 使用 `nodeId` 作为图内标识。可见节点可以返回人物业务字段；脱敏节点只返回安全占位信息。证据、审核和异常摘要是后续聚合能力的预留字段，缺失时保持为空，不由前端推断。

### 6.2 关系边

`TreeEdgeResponse` 明确包含：

- `fromNodeId`、`toNodeId`；
- `relationType`、`relationCategory`、`relationLabel`；
- `ritualRelationType`；
- `isLineageRelation`、`isBiological`、`isPrimary`；
- 数据状态、可信度和可选摘要。

节点只去重人物，不得因为同一人物已存在而丢弃合法的第二条父系、承嗣或兼祧关系边。前端布局必须以边为事实来源，不能仅按 `generationNo` 推断亲属关系。

### 6.3 中国式关系语义

基础关系类型包括：

- `parent_child`；
- `spouse`；
- `adoptive`；
- `successor`；
- `out_adoption`；
- `in_adoption`；
- `dual_successor`；
- `heir_son`；
- `no_descendant`；
- `other`。

关系分类与细分类型分开表达，避免“入继”“兼祧”等被降级为笼统的“亲属”。

## 7. 响应元数据与告警

`TreeGraphMeta` 至少表达：

- 请求深度和实际应用深度；
- 过滤后的节点数和边数；
- 是否截断及截断原因；
- 是否检测到环；
- 重复边数量；
- 生成时间。

告警码包括：

- `cycle_detected`；
- `duplicate_edge`；
- `depth_limit_reached`；
- `node_limit_reached`；
- `edge_limit_reached`；
- `root_filtered`；
- `partial_visibility`；
- `isolated_nodes`。

告警只返回聚合信息，不携带不可见人物 ID、关系 ID或敏感详情。

## 8. 证据、审核与异常摘要

为后续 #198、#199 预留：

- `TreeEvidenceSummary`：来源绑定数、正式来源数、综合可信度、是否缺少正式证据；
- `TreeReviewSummary`：无任务、待审核、通过、驳回或混合状态及数量；
- `TreeAnomalySummary`：世次不一致、关系冲突、疑似重复、来源缺失、孤立人物等。

这些摘要必须批量聚合，并遵循与节点、边一致的权限与隐私策略。Tree 模块只是只读投影，不成为来源、审核或工作台的新事实源。

## 9. 错误语义

- `400`：参数、枚举或容量设置不合法；
- `401`：未登录；
- `403`：已登录但无功能、宗族、支派或对象访问权限；
- `404`：目标不存在，或为避免泄露而按“不存在”处理；
- `200`：包括空图、部分可见图和安全截断图，具体状态通过 `meta` 与 `warnings` 表达。

错误响应不得返回堆栈、内部 SQL、不可见对象 ID 或权限策略细节。

## 10. 验证与后续实现

契约变更必须通过：

```bash
cd frontend/genealogy-web
npm run api:generate
npm run api:check
npm run typecheck
```

后续任务：

- #193：实现后端安全可见性投影；
- #194：实现遍历去重、环防护和容量边界；
- #195：优化批量查询和数据库过滤；
- #196：实现关系边驱动的真实拓扑布局。

## 11. 回滚策略

本 Issue 不涉及数据库和运行时切换。需要回滚时：

1. 删除 `openapi.tree.json`；
2. 恢复契约生成脚本；
3. 删除 Tree 生成类型；
4. 恢复本文和 API 维护说明。

当前运行时入口不受影响。