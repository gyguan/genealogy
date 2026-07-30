# Genealogy Backend

中国式族谱系统后端，采用 Java 17、Spring Boot 3、PostgreSQL、Spring Data JPA + MyBatis-Plus 分阶段迁移与 Flyway，按模块化单体组织。

## 阅读顺序

1. 根 `AGENTS.md`
2. `backend/genealogy-backend/AGENTS.md`
3. `docs/standards/README.md`
4. `backend/genealogy-backend/src/main/java/com/genealogy/README.md`
5. 当前模块 README、Issue 与 Spec

专项规范：

- `docs/backend/database-and-flyway.md`
- `docs/backend/environment-configuration.md`
- `docs/backend/persistence-framework-migration.md`
- `docs/backend/repository-query-performance.md`
- `docs/backend/observability-and-audit.md`
- `docs/experience/backend-code-maintainability.md`

## 技术栈

```text
Java 17
Spring Boot 3.x
PostgreSQL 16
Spring Data JPA + MyBatis-Plus / MyBatis（分阶段迁移）
Flyway
OpenAPI / Swagger UI
Actuator / Micrometer / Prometheus
Maven
```

当前 Clan、Generation Scheme、Generation Word 已通过 Repository Adapter 使用 MyBatis-Plus/MyBatis；其他模块暂时保留 Spring Data JPA。持久化框架不得越过 Repository/QueryRepository 边界，具体规则和迁移清单见 `docs/backend/persistence-framework-migration.md`。

## 本地启动

```bash
cd backend/genealogy-backend
docker compose up -d

export SPRING_PROFILES_ACTIVE=local
export DB_URL=jdbc:postgresql://localhost:5432/genealogy
export DB_USERNAME=genealogy
export DB_PASSWORD='<local-password>'

mvn spring-boot:run
```

数据库连接和凭据通过环境变量或本地安全配置注入，不在默认配置或 README 中提交固定密码。

健康检查与 OpenAPI：

```text
GET http://localhost:8080/api/v1/health
http://localhost:8080/swagger-ui.html
http://localhost:8080/api-docs
```

## 标准调用链

```text
Controller
  → Application Service
  → Domain Policy / State Machine
  → Repository / QueryRepository
  → Assembler / DTO
```

模块职责和关键不变量见 `src/main/java/com/genealogy/README.md`。

## 数据库与契约

- Schema 通过 Flyway 前向迁移。
- 双栈阶段 Hibernate 使用 `ddl-auto=validate` 校验仍由 JPA 管理的实体；MyBatis 映射通过 PostgreSQL 集成测试和 Mapper/XML 加载验证。
- 禁止通过关闭 Flyway、`flyway repair` 或手工修改 history 表掩盖迁移问题。
- 公共 API 变更先更新 `docs/api/openapi.json`。

## 验证

```bash
mvn test
mvn verify
```

涉及数据库、权限、安全或关键用户链路时，还应执行相应 PostgreSQL Integration、Security 和 E2E 门禁。

## README 维护

技术栈、启动命令、配置变量、模块入口、验证命令或文档路径发生变化时，必须同步更新本文件。
