# Issue #1036 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/1036
- 目标：迁移 Branch 递归查询、Relationship 写模型和 Tree 专用读模型至 MyBatis-Plus/MyBatis，保持排序、去重、截断、权限和性能语义不变。
- 工作分支：`agent/issue-1036-branch-relationship-tree-mybatis`
- 依赖：#1033、#1034 已完成并合入 `main`。

## 任务看板

| 序号 | 任务 | 状态 | 结果 |
|---|---|---|---|
| 1 | 核对依赖、主干、分支和 Draft PR | ✅ 已完成 | 基于最新 `main` 建立独立分支 |
| 2 | 盘点 Branch/Relationship/Tree 持久化与调用面 | 🔄 进行中 | 识别递归 CTE、JPA 生命周期、EntityManager、批次和排序契约 |
| 3 | 迁移 Branch CRUD 与递归查询 | ⏳ 待开始 | 保留 PostgreSQL `WITH RECURSIVE`、空集合和稳定排序 |
| 4 | 迁移 Relationship 写模型与统一规则 | ⏳ 待开始 | 移除 JPA Listener/Dirty Checking，统一显式写策略 |
| 5 | 迁移 Tree 最小只读模型 | ⏳ 待开始 | 专用 QueryMapper/XML，保持 500 分批、去重和截断 |
| 6 | PostgreSQL 契约/性能测试与全量 CI | ⏳ 待开始 | 覆盖 499/500/501、上限+1、循环保护与重复执行 |
| 7 | 文档、Review 与 PR 收口 | ⏳ 待开始 | 更新迁移清单、风险、回滚与验收结果 |

## 固定边界

- 不修改世系图谱 OpenAPI、节点/边模型、权限和隐私语义。
- 不引入图数据库或 Java 无界递归。
- Branch、Relationship、Tree 生产代码完成后不得依赖 JpaRepository、EntityManager、JPQL 或 JPA 生命周期监听器。
- 所有排序以既有稳定键收口；人物按 `generation_no, person_code, id`，关系以端点组合后 `id` 收口。
- 临时诊断文件或自动化 Workflow 不得进入最终交付范围。
