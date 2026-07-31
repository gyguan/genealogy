# Issue #1036 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/1036
- 目标：迁移 Branch 递归查询、Relationship 写模型和 Tree 专用读模型至 MyBatis-Plus/MyBatis，保持排序、去重、截断、权限和性能语义不变。
- 工作分支：`agent/issue-1036-branch-relationship-tree-mybatis`
- 依赖：#1033、#1034 已完成并合入 `main`。

## 任务看板

| 序号 | 任务 | 状态 | 结果 |
|---|---|---|---|
| 1 | 核对依赖、主干、分支和 Draft PR | ✅ 已完成 | 基于最新 `main` 建立独立分支与 Draft PR #1062 |
| 2 | 盘点 Branch/Relationship/Tree 持久化与调用面 | ✅ 已完成 | 已识别递归 CTE、JPA 生命周期、EntityManager、批次和排序契约 |
| 3 | 迁移 Branch CRUD 与递归查询 | ✅ 已完成 | Repository Adapter + Mapper/XML；循环保护、clan 隔离、多根去重、500 ID 分批 |
| 4 | 迁移 Relationship 写模型与统一规则 | ✅ 已完成 | 移除 JPA Listener；所有 `save/saveAll` 统一执行 `RelationshipWritePolicy` 和显式全字段更新 |
| 5 | 迁移 Tree 最小只读模型 | ✅ 已完成 | Person/Relationship 专用 QueryMapper/XML；最小 Record 投影、500 分批、跨批次边、全局去重排序 |
| 6 | PostgreSQL 契约/性能测试与全量 CI | ✅ 已完成 | 499/500/501、循环保护、Nullable、跨批次边；Backend/PostgreSQL/Security/Member/E2E 已通过 |
| 7 | 文档、Review 与 PR 收口 | 🔄 进行中 | 正在更新迁移清单、README 与最终验收 Head |

## 已验证语义

- Branch 递归继续使用 PostgreSQL `WITH RECURSIVE`，通过访问路径数组阻断脏循环。
- 空集合不生成非法 `IN ()`；大 ID 集合按 500 分批，最终按 ID 去重并稳定排序。
- Relationship 类型别名、分类兼容和不匹配拒绝统一在持久化写边界执行。
- Tree Person/Relationship 直接映射最小不可变 Snapshot，不装载完整持久化实体。
- 人物排序保持 `generation_no, person_code, id`；关系排序保持端点组合后 `id` 收口。
- 集合内关系使用 from/to 双批次组合，501 条边界不会遗漏跨批次边。
- 分批查询先全局去重、排序，再执行 Pageable 切片，保持 `maxNodes/maxEdges + 1` 截断判断语义。

## 风险与回滚

- 未修改公共 API、数据库 Schema、权限、隐私和图谱输出结构。
- 未引入图数据库或 Java 无界递归。
- 未删除全局 JPA Starter；剩余栈清理由 #1037 完成。
- 本 Issue 无 Flyway 变更，可通过回滚 PR 恢复原 Repository 实现。
- PR 不包含临时诊断文件或自动化 Workflow。

## 最终门禁

- 当前代码 Head 已通过 Backend CI、Security Penetration、Member Branch Scope E2E、PostgreSQL Integration 和真实 Playwright。
- 最终文档 Head 将重新执行受影响门禁；全部成功且无 Review Thread 后标记 Ready 并合入 `main`。
