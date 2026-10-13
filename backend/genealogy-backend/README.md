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

当前 Clan、Generation、Person、Member、Review、Source、Branch、Relationship 与 Tree 的目标仓储已通过 Repository Adapter 与专用 QueryMapper 使用 MyBatis-Plus/MyBatis。Branch 递归继续使用带循环保护的 PostgreSQL `WITH RECURSIVE`；Relationship 的类型/分类规则在统一写边界显式执行；Tree 直接映射最小不可变 Snapshot，并保持 500 ID 分批、跨批次边、去重和稳定排序。Import/Export 与其他剩余仓储将在 #1037 迁移并最终移除 JPA/Hibernate。持久化框架不得越过 Repository/QueryRepository 边界，具体规则和迁移清单见 `docs/backend/persistence-framework-migration.md`。

## 本地启动

默认开发数据库连接与 `docker-compose.yml` 保持一致：

```text
URL      jdbc:postgresql://localhost:5432/genealogy
Database genealogy
Username genealogy
Password genealogy_local_only
```

使用项目 Docker PostgreSQL 16：

```bash
cd backend/genealogy-backend
docker compose up -d
mvn spring-boot:run
```

IDEA 可直接运行 `GenealogyApplication`，无需设置 `Active profiles=local`。需要覆盖数据库或本地调试配置时有两种方式：

1. 使用 `DB_URL`、`DB_USERNAME`、`DB_PASSWORD` 环境变量；
2. 将 `config/application-local.example.yml` 复制为 `config/application-local.yml`，该文件已被 Git 忽略并由 `application.yml` 自动导入。

原有 `local` profile 继续保留，用于兼容已有启动配置以及启用本地 DEBUG / 测试 Token 行为；它不再是获得 DataSource 配置的前提。生产环境仍必须显式使用 `prod` profile，并通过 Secret 注入数据库凭据。

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
- Branch/Relationship/Tree 生产代码不得重新引入 JpaRepository、EntityManager、JPQL 或 JPA 生命周期监听器。
- 禁止通过关闭 Flyway、`flyway repair` 或手工修改 history 表掩盖迁移问题。
- 公共 API 变更先更新 `docs/api/openapi.json`。

## 验证

```bash
mvn test
mvn verify
```

涉及数据库、权限、安全或关键用户链路时，还应执行 PostgreSQL Integration、Tree 查询契约、Security、Member Scope 和真实 E2E 门禁。

## README 维护

技术栈、启动命令、配置变量、模块入口、验证命令或文档路径发生变化时，必须同步更新本文件。
