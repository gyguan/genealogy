# Issue #1037 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/1037
- 目标：迁移 Import/Export 与所有剩余持久化代码，删除 Spring Data JPA/Hibernate/jakarta.persistence，最终仅保留 MyBatis-Plus/MyBatis + PostgreSQL + Flyway。
- 工作分支：`agent/issue-1037-remove-jpa-final-migration`
- 依赖：#1032、#1033、#1034、#1036 已完成并合入 `main`。

## 任务看板

| 序号 | 任务 | 状态 | 结果 |
|---|---|---|---|
| 1 | 核对依赖、主干、分支和 Draft PR | ✅ 已完成 | 基于 #1036 合并后的最新 `main` 建立分支 |
| 2 | 生成全仓 JPA/Entity/Repository/测试清单 | ✅ 已完成 | 零 JPA 门禁已生成生产、测试、依赖与配置的完整违规清单 |
| 3 | 迁移 Import/Export 与异步批处理 | ⏳ 待开始 | 明确批次大小、事务、去重、租约和流式读取 |
| 4 | 迁移剩余 Auth/Culture/OperationLog/Attachment 等仓储 | 🔄 进行中 | WorkbenchTaskAction、PersonEvent 与 Culture 已切换为 MyBatis Repository Adapter；下一批处理 Auth、OperationLog |
| 5 | 删除 JPA/Hibernate 依赖与配置 | ⏳ 待开始 | pom、spring.jpa、生产/测试引用归零 |
| 6 | 零 JPA 静态门禁与 PostgreSQL 行为测试 | 🔄 进行中 | `ZeroJpaUsageTest` 已生效；Culture 迁移进入标准 PR CI 验证 |
| 7 | 文档、Review 与 PR 收口 | ⏳ 待开始 | 最终迁移清单、架构、README、AGENTS 与 CI 证据 |

## 固定边界

- 不修改公共 API、数据库 Schema、领域状态机、审核和权限语义。
- 不引入新的 ORM 或重量级数据访问抽象。
- Flyway 继续作为唯一 Schema 入口。
- 复杂 SQL 进入 Mapper XML；禁止为迁移而退化为 Java 内存过滤、循环单条查询或无界装载。
- 最终生产代码和测试代码不得保留业务使用的 `jakarta.persistence`、`org.springframework.data.jpa`、`JpaRepository`、`EntityManager` 或 Hibernate ORM。

## 恢复检查点

- Culture 业务迁移 Head：`82d3c8282663343db7ee77d14aee9b31c9a7ec75`。
- Culture 已完成 4 个实体映射、4 个 Repository Adapter、7 个 Mapper 接口、强类型查询行模型、Mapper XML、显式乐观锁与动态权限分页改造。
- Culture 补丁已通过父提交、允许文件范围、逐分片 Base64、整体 SHA-256 和 `git apply --check` 校验；传输文件与临时分支已清理。
- 下一步：处理 Culture 标准 PR CI 暴露的编译/映射问题，再迁移 Auth 与 OperationLog，最后集中处理 Import/Export 批处理及删除全局 JPA 依赖。
