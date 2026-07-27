# PostgreSQL 集成测试

## 目标

通过 Testcontainers 启动真实 PostgreSQL，执行完整 Flyway 迁移和 Spring Boot JPA 校验，验证数据库特有行为、约束、事务和并发冲突。

## 执行命令

```bash
cd backend/genealogy-backend
mvn -B -DskipITs=false verify
```

常规单元测试和打包仍可使用：

```bash
mvn -B -DskipITs package
```

`package` 阶段不会运行 Failsafe 集成测试；`verify` 阶段会运行以 `*IT` 命名的测试。

## 当前覆盖

| 用例 | 验证内容 |
|---|---|
| FT-FAIL-003 | 空 PostgreSQL 执行完整 Flyway，Hibernate `validate` 成功，核心表存在 |
| FT-PERM-001 | 不同宗族人物查询结果不混合 |
| FT-REL-002 | 数据库拒绝人物自关系 |
| FT-STATE-004 | 两个并发事务写入同一唯一键时仅一个提交成功 |
| 事务回滚 | 业务写入抛错后不保留部分数据 |

## 环境要求

- Java 17；
- Maven；
- 可用 Docker Runtime；
- 能拉取 `postgres:16-alpine` 镜像。

测试不连接共享开发库或生产库，容器销毁后数据自动清理。

## 失败证据

Failsafe 报告位于：

```text
backend/genealogy-backend/target/failsafe-reports/
```

CI 需要同时上传：

- Failsafe 报告；
- Spring Boot 日志；
- Testcontainers 日志；
- Flyway 失败信息。
