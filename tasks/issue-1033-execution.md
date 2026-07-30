# Issue #1033 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/1033
- Draft PR：https://github.com/gyguan/genealogy/pull/1044
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

- Tree 图谱专用 Person Snapshot 查询继续保留独立的只读 JPA QueryRepository 实现。
- 不修改数据库 Schema、OpenAPI、领域模型、权限、隐私级别或审核流程。
- 不移除全局 JPA Starter。

## 任务看板

| 序号 | 任务 | 状态 | 结果 |
|---|---|---|---|
| 1 | 核对 Issue、依赖、分支和现有 PR | ✅ 已完成 | #1032 已合并；从最新 `main` 创建独立分支 |
| 2 | 建立分支、执行看板与 Draft PR | ✅ 已完成 | 分支与 PR #1044 已建立 |
| 3 | 迁移 Person 写模型与 Repository Adapter | ✅ 已完成 | Identity、全字段 Nullable 更新、显式软删除、500 条批量分片和审核行锁已切换到 MyBatis |
| 4 | 迁移动态查询、分页、排序与导出 | ✅ 已完成 | 专用 QueryMapper/XML；数据与 count 共用筛选片段；排序白名单并以 id 收口 |
| 5 | 迁移 Dashboard 强类型聚合 | ✅ 已完成 | Object[] 已替换为强类型 Summary/Bucket/DailyCount/Recent read model |
| 6 | 增加 PostgreSQL 集成测试并修复 CI | 🔄 进行中 | 生产代码编译通过；已修复三处旧 Mockito 方法桩，正在执行最终 Head 全量门禁 |
| 7 | 更新规范、完成 Review 与收口 | 🔄 进行中 | 迁移清单和 README 待随最终验收结论同步 |

## 已处理问题

1. Repository 初版接收 Application 层 `PersonDuplicateQuery`，触发 ArchUnit 分层门禁；已改为基础参数和持久化 Criteria。
2. Tree 图谱仍需要 JPA constructor projection；新增 Tree 专用 `@Immutable` 只读映射，Person 主写模型不再是 JPA Entity。
3. 审核提交的悲观锁改为明确 PostgreSQL `SELECT ... FOR UPDATE`，并在可写事务中执行。
4. 首轮 CI 的生产代码编译通过，但三处测试仍模拟迁移前的单参数重复检测方法；已改为新的强类型参数契约。
5. Person 批量快照更新改为固定 500 条分片，避免无界 `VALUES` SQL；`count()` 同时移除弃用 Wrapper API。
6. 搜索条件仅执行 trim，不再额外改写 gender/dataStatus 大小写，保持迁移前筛选语义。

## 风险控制

- 全字段更新使用明确 XML SQL，避免默认策略跳过 `null`。
- 动态 SQL 的数据查询与 count 查询共享同一筛选片段。
- 排序仅接受后端枚举，所有排序以 `id` 作为唯一稳定键收口。
- 权限校验和隐私脱敏继续在既有 Application Service 边界执行。
- Tree Snapshot 不并入 Person 写 Mapper，避免扩大图谱查询风险。
- 临时补丁和辅助工作流均已自清理，不进入最终 PR 文件范围。

## 恢复检查点

- 当前阶段：正式实现、测试兼容和持久化边界修复完成，最终 Head 全量 CI 验证中。
- 最新代码 Head：`6e685d08094d9b956bbdca2ce36b15bc52133b8e`；本看板提交将形成新的可信 CI Head。
- 首轮失败根因：仅测试编译桩不兼容，生产代码编译成功。
- 已知阻塞：无业务阻塞；本地无 Maven，构建与 PostgreSQL 验证以 PR CI 为准。
- 下一步最小任务：读取 Backend CI、PostgreSQL Integration、Security、Member Scope、Functional E2E 结果，修复剩余问题并完成 PR Review 收口。
