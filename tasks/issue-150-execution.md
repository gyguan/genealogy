# Issue #150 执行看板

## Issue 与目标

- Issue：#150 `[数据库] 修复重复 Flyway V3 导致后端无法启动`
- 工作分支：`agent/issue-150-fix-duplicate-flyway-v3`
- PR：#151
- 目标：恢复完整 Flyway 迁移链、JPA `entityManagerFactory` 创建和后端健康检查，并提升数据库启动问题的诊断与治理能力。

## 实现范围

- 定位 `authCookieBridgeFilter → authApplicationService → appUserRepository → entityManagerFactory` 连锁异常的最深层数据库原因。
- 治理重复 V3、V4、V5，并用更高版本前向迁移保留原 SQL 职责。
- 兼容历史 V22 权限种子脚本及 `import_job_row` 的迁移顺序依赖。
- 默认启用 Flyway，并对齐 README、本地启动方式与 CI。
- 增强 Flyway 唯一性检查、迁移治理门禁、启动诊断和认证 E2E 安全扫描。
- 与任务执行期间最新 `main` 合并后重新完成全量验证。

## 非目标

- 不通过修改认证 Filter、Application Service 或 Repository 依赖关系绕过问题。
- 不关闭 JPA 或 Hibernate schema validation。
- 不使用 `flyway repair`、不手工修改 `flyway_schema_history`。
- 不改变认证、权限、隐私或审核业务语义。
- 不变更公共 API。

## 影响模块

- `backend/genealogy-backend/src/main/resources/db/migration`
- `backend/genealogy-backend/src/main/resources/application.yml`
- `backend/genealogy-backend/pom.xml`
- `backend/genealogy-backend/scripts/check-flyway-migrations.sh`
- `.github/scripts/backend-startup-check.sh`
- `.github/scripts/validate-flyway-migrations.py`
- `.github/workflows/backend-ci.yml`
- `.github/workflows/auth-commercial-e2e.yml`
- `backend/genealogy-backend/README.md`
- `backend/genealogy-backend/AGENTS.md`

## 执行任务看板

| 序号 | 任务 | 状态 | 活跃耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 读取规则、配置、迁移历史和失败日志并确认根因 | ✅ 已完成 | 约 20 分钟 | 认证 Bean 为连带失败；底层首先是重复 Flyway 版本 |
| 2 | 建立 Issue、分支、执行看板、Draft PR 和启动记录 | ✅ 已完成 | 约 2 分钟 | Issue #150、分支与 PR #151 已建立 |
| 3 | 增加迁移唯一性前置诊断并定位重复文件 | ✅ 已完成 | 约 10 分钟 | 确认 V3 两份、V4 两份、V5 三份 |
| 4 | 修复迁移历史冲突及后续依赖问题 | ✅ 已完成 | 约 35 分钟 | 前向迁移保留 SQL；兼容 V22 权限索引和 import_job_row 顺序 |
| 5 | 对齐默认 Flyway 配置、文档和 CI 诊断 | ✅ 已完成 | 约 15 分钟 | Flyway 默认启用；启动与测试日志可直接显示最深层原因 |
| 6 | 合并最新 main 并执行全量验证 | ✅ 已完成 | 约 15 分钟 | PostgreSQL 16 空库启动、Maven、前端、API、浏览器 E2E 全部通过 |
| 7 | 完成五轴 Review、更新看板并满足合入门禁 | ✅ 已完成 | 约 5 分钟 | 无未解决 Review；所有门禁通过 |

## 最终修复结果

- Flyway 迁移目录中的版本号全局唯一。
- 重复脚本的有效 DDL、数据修复和索引职责已由更高版本迁移保留。
- V22 权限脚本执行前后会受控处理资源动作唯一索引，权限授权不会丢失。
- `import_job_row` 会在历史依赖脚本执行前建立基础结构。
- Flyway 默认先迁移，Hibernate 再执行 `ddl-auto=validate`。
- `entityManagerFactory`、`appUserRepository`、`authApplicationService` 和 `authCookieBridgeFilter` 均可正常创建。
- `/api/v1/health` 在 PostgreSQL 16 空库环境通过。

## 验证结果

- ✅ Flyway migration metadata check
- ✅ Database Migration Governance
- ✅ Issue Delivery Governance
- ✅ API Contract
- ✅ `mvn clean test`
- ✅ PostgreSQL 16 clean-database Startup Check
- ✅ Hibernate schema validation / `entityManagerFactory`
- ✅ Commercial Frontend Build
- ✅ Auth/Member frontend tests and TypeScript typecheck
- ✅ Browser authentication E2E
- ✅ Production auth artifact safety scan

## Review 五轴

### Correctness

空 PostgreSQL 16 数据库执行完整迁移并通过健康检查；后端测试和真实浏览器认证链路通过。

### Readability

迁移回调、前向补偿、锁影响、数据影响、恢复方式和验证方式均有注释；失败日志直接展示最深层 SQL/Flyway 原因。

### Architecture

未修改认证依赖链或绕过 JPA；修复集中在数据迁移、配置和治理层，符合问题归属。

### Security

权限重复合并前复制角色授权，避免授权丢失；生产前端扫描精确拦截持久化认证 token 和演示凭据，消除贪婪正则误报。

### Performance

权限合并只扫描小型授权元数据表；来源与导入迁移会扫描相应历史表一次，已在迁移注释中声明锁与数据量影响。

## 本地升级注意事项

- 对可重建的本地开发库，推荐 `docker compose down -v` 后重新创建数据库。
- `down -v` 会删除本地 Docker 数据卷；存在需要保留的数据时必须先备份。
- 不要用 `flyway repair` 或手工改 history 表处理旧环境。
- 拉取代码后使用 `mvn clean spring-boot:run`，避免旧 `target/classes` 干扰判断。

## 耗时汇总

- 已完成任务活跃耗时：约 102 分钟
- 外部等待：GitHub Actions 排队与运行时间不计入活跃耗时
- 未记录历史任务：0 项

## 最终检查点

- 当前 Issue：#150
- 当前分支：`agent/issue-150-fix-duplicate-flyway-v3`
- 当前 PR：#151
- 验证基线 Commit：`7b6d203a28c513a9646e147d14f684564640e80d`
- CI 状态：数据库治理、API、后端启动、前端构建、认证浏览器 E2E 全部通过
- 未解决 Review：无
- 已知阻塞：无
- 下一步：PR 满足合入门禁后 squash 合入 `main`
- 最后更新时间：2026-07-14 11:35（Asia/Shanghai）
