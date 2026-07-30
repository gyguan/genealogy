# Issue #1033 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/1033
- 目标：将 Person 写模型、动态检索与 Dashboard 读模型从 Spring Data JPA 迁移到 MyBatis-Plus/MyBatis，保持 API、权限、隐私、审核和统计口径不变。
- 工作分支：`agent/issue-1033-person-mybatis`
- 开始时间：2026-07-30 19:08（北京时间）

## 范围

- Person Entity、Repository、Application Service 持久化调用。
- 专用 Person QueryMapper/XML 动态查询、分页、稳定排序与导出。
- Dashboard 强类型聚合和最近更新人物查询。
- PostgreSQL Identity、Nullable 更新、软删除、事务回滚、筛选与统计测试。
- 迁移清单、README 与性能规范更新。

## 非目标

- Tree 图谱专用 Person Snapshot 查询继续保留现有 QueryRepository 实现。
- 不修改数据库 Schema、OpenAPI、领域模型、权限、隐私级别或审核流程。
- 不移除全局 JPA Starter。

## 任务看板

| 序号 | 任务 | 状态 | 结果 |
|---|---|---|---|
| 1 | 核对 Issue、依赖、分支和现有 PR | ✅ 已完成 | #1032 已合并；无 #1033 分支或 PR |
| 2 | 建立分支、执行看板与 Draft PR | 🔄 进行中 | 分支已创建 |
| 3 | 迁移 Person 写模型与 Repository Adapter | ⏳ 待处理 |  |
| 4 | 迁移动态查询、分页、排序与导出 | ⏳ 待处理 |  |
| 5 | 迁移 Dashboard 强类型聚合 | ⏳ 待处理 |  |
| 6 | 增加 PostgreSQL 集成测试并修复 CI | ⏳ 待处理 |  |
| 7 | 更新规范、完成 Review 与收口 | ⏳ 待处理 |  |

## 风险控制

- 全字段更新使用明确 XML SQL，避免默认策略跳过 `null`。
- 动态 SQL 的数据查询与 count 查询共享同一筛选片段。
- 排序仅接受后端枚举，所有排序以 `id` 作为唯一稳定键收口。
- 权限校验和隐私脱敏继续在既有 Application Service 边界执行。
- Tree Snapshot 不并入本次 Mapper，避免扩大图谱查询风险。

## 恢复检查点

- 当前阶段：建立 Draft PR 后开始 Person 代码迁移。
- 已知阻塞：本地环境不能解析 GitHub 域名；通过 GitHub API 提交，验证以 PR CI 为准。
