# Issue #1037 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/1037
- 目标：迁移 Import/Export 与所有剩余持久化代码，删除 Spring Data JPA/Hibernate/jakarta.persistence，最终仅保留 MyBatis-Plus/MyBatis + PostgreSQL + Flyway。
- 工作分支：`agent/issue-1037-remove-jpa-final-migration`
- Draft PR：#1066
- 依赖：#1032、#1033、#1034、#1036 已完成并合入 `main`。

## 任务看板

| 序号 | 任务 | 状态 | 结果 |
|---|---|---|---|
| 1 | 核对依赖、主干、分支和 Draft PR | ✅ 已完成 | 基于 #1036 合并后的 `main` 建立分支，持续在 PR #1066 收口 |
| 2 | 生成全仓 JPA/Entity/Repository/测试清单 | ✅ 已完成 | 零 JPA 门禁已生成生产、测试、依赖与配置的完整违规清单 |
| 3 | 迁移 Import/Export 与异步批处理 | ⏳ 待开始 | 下一阶段处理批次大小、事务、去重、租约、错误恢复、稳定排序和流式读取 |
| 4 | 迁移剩余 Auth/Culture/OperationLog/Attachment 等仓储 | 🔄 进行中 | WorkbenchTaskAction、PersonEvent、Culture、OperationLog 已切换为 MyBatis Repository Adapter；下一批处理 Auth 与剩余 Attachment/遗漏仓储 |
| 5 | 删除 JPA/Hibernate 依赖与配置 | ⏳ 待开始 | 在 Import/Export 与剩余仓储迁移完成后集中删除 pom、spring.jpa、生产/测试引用 |
| 6 | 零 JPA 静态门禁与 PostgreSQL 行为测试 | 🔄 进行中 | `ZeroJpaUsageTest` 已生效；OperationLog 新 Head 的标准验证当前处于 GitHub Actions `action_required`，尚未创建执行 Job |
| 7 | 文档、Review 与 PR 收口 | ⏳ 待开始 | 最终迁移清单、架构、README、AGENTS、CI 证据及临时工作流清理 |

## 固定边界

- 不修改公共 API、数据库 Schema、领域状态机、审核和权限语义。
- 不引入新的 ORM 或重量级数据访问抽象。
- Flyway 继续作为唯一 Schema 入口。
- 复杂 SQL 进入 Mapper XML；禁止为迁移而退化为 Java 内存过滤、循环单条查询或无界装载。
- 最终生产代码和测试代码不得保留业务使用的 `jakarta.persistence`、`org.springframework.data.jpa`、`JpaRepository`、`EntityManager` 或 Hibernate ORM。

## 恢复检查点

- 当前业务 Head：`f5410eff18d2df63a5d6e2f21a6b6b231784d73b`。
- OperationLog 已完成实体去 JPA、Repository Adapter、Mapper 接口、强类型查询条件/聚合行模型、Mapper XML、事件发布迁移及相关测试适配。
- OperationLog 补丁已通过父提交、允许文件范围、完整载荷 SHA-256、gzip/Base64 解码、`git apply --check`、业务提交和远端 Head 持久化校验；所有 `.agent` 传输文件已从业务提交清理。
- PR #1066 当前为 Draft，Head 可合并；变更 84 个文件，新增约 3151 行、删除约 1253 行。
- 新 Head 的 Backend CI、Functional E2E、Member Branch Scope E2E、Security Penetration 均返回 `action_required`，且没有创建 Job；该状态需要先解除 GitHub Actions 审批，再依据真实编译/测试日志修复。
- 下一步：验证 OperationLog 编译与 Mapper 装载；随后迁移 Auth 和剩余 Attachment/遗漏仓储，再处理 Import/Export，最后删除全局 JPA/Hibernate 依赖与配置。
