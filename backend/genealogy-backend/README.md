# Genealogy Backend

中国式族谱系统后端，采用 Java 17、Spring Boot 3、PostgreSQL、Spring Data JPA 与 Flyway，按模块化单体组织。

## 开始之前

AI 或开发者进入后端目录后，按以下顺序阅读：

1. 仓库根 `AGENTS.md`
2. `backend/genealogy-backend/AGENTS.md`
3. `docs/database-development-standard.md`
4. 与当前任务相关的模块 README、Issue 与 Spec

代码可理解性与维护经验见：

- `docs/ai/code-understanding-and-maintainability-standard.md`
- `docs/backend-repository-performance-governance.md`
- `docs/backend-quality-observability-governance.md`
- `docs/backend-environment-configuration.md`

## 技术栈

```text
Java 17
Spring Boot 3.x
PostgreSQL 16
Spring Data JPA
Flyway
OpenAPI / Swagger UI
Actuator / Micrometer / Prometheus
Maven
```

## 本地启动

### 环境要求

```text
JDK 17+
Maven 3.9+
Docker / Docker Compose
curl
python3（执行部分验收与治理脚本）
```

### 启动 PostgreSQL

```bash
cd backend/genealogy-backend
docker compose up -d
```

### 配置本地环境

本地配置使用 `local` Profile。数据库连接与凭据通过环境变量或本地安全配置注入，不在默认配置中提交固定密码。

常用变量示例：

```bash
export SPRING_PROFILES_ACTIVE=local
export DB_URL=jdbc:postgresql://localhost:5432/genealogy
export DB_USERNAME=genealogy
export DB_PASSWORD='<local-password>'
```

实际变量和生产启动要求以 `docs/backend-environment-configuration.md` 与配置文件为准。

### 启动应用

```bash
mvn spring-boot:run
```

Flyway 默认负责 Schema 演进，Hibernate 使用 `ddl-auto=validate` 校验实体与数据库一致性。不得通过关闭 Flyway、使用 `flyway repair` 或手工修改 `flyway_schema_history` 掩盖迁移问题。

### 健康检查与 OpenAPI

```text
GET http://localhost:8080/api/v1/health
http://localhost:8080/swagger-ui.html
http://localhost:8080/api-docs
```

## 模块导航

详细模块职责与调用边界见：

```text
src/main/java/com/genealogy/README.md
```

主要模块：

| 模块 | 核心职责 |
|---|---|
| `auth` | 登录、会话、ActorContext 与请求身份 |
| `clan` | 宗族主数据 |
| `branch` | 支派及支派范围 |
| `generation` | 字辈方案与字辈项 |
| `person` | 人物档案及重复检测 |
| `relationship` | 关系模型与关系分类 |
| `source` | 来源资料、来源绑定与访问策略 |
| `review` | Revision、审核任务与生效闭环 |
| `tree` | 只读世系图查询、遍历、读模型与组装 |
| `member` | 宗族成员、角色、权限与支派授权 |
| `importexport` | 导入任务、校验、批处理、导出 |
| `attachment` | 附件元数据与存储访问 |
| `operationlog` | 操作日志、审计查询与监控 |
| `common` | 统一响应、异常和跨模块基础能力 |

## 分层约定

```text
Controller
  → Application Service
  → Domain Policy / State Machine
  → Repository / QueryRepository
  → Assembler / Response
```

- Controller 仅做协议适配、鉴权入口和参数转换。
- Application Service 负责用例编排、事务和事实装载。
- Domain Policy/State Machine 负责纯业务决策。
- Repository 负责持久化；复杂读取进入 QueryRepository。
- DTO、Entity、View/Read Model 和 Command/Query 不混用。

强制规则以 `backend/genealogy-backend/AGENTS.md` 为准。

## API 契约

公共 API 变更必须先更新：

```text
docs/api/openapi.json
```

不得手工修改前端类型来掩盖后端契约不一致。

## 数据库与 Flyway

迁移目录：

```text
src/main/resources/db/migration
```

迁移命名、版本、前向补偿、历史数据兼容和索引规则见：

```text
docs/database-development-standard.md
```

常用治理检查：

```bash
bash ./scripts/check-flyway-migrations.sh
```

本地可重建数据库出现历史 Volume 与当前迁移不一致时，可在确认无需保留数据后执行：

```bash
docker compose down -v
docker compose up -d
```

## 验证命令

聚焦测试：

```bash
mvn test
```

交付级验证：

```bash
mvn verify
```

CI 还会根据变更范围执行：

- ArchUnit
- JaCoCo 分模块门禁
- SpotBugs
- Maven Enforcer
- Trivy
- Flyway 空库迁移和历史库升级
- PostgreSQL Integration
- Security Penetration
- Member Branch Scope E2E
- Real Playwright Functional E2E

## MVP1 API 验收

```bash
chmod +x scripts/mvp1-api-test.sh
./scripts/mvp1-api-test.sh
```

说明：

```text
docs/test/mvp1-api-acceptance.md
```

## 常见问题定位

### Bean 创建失败

认证、Repository 或 Controller Bean 失败时，优先查看最深层 `Caused by`。常见根因通常是：

- Flyway 迁移失败
- Schema Validate 失败
- PostgreSQL 连接或凭据错误
- 配置变量缺失

不要先修改被连带影响的上层 Bean。

### Flyway 版本冲突

出现重复版本时执行迁移检查脚本，使用更高版本的前向迁移修复。禁止修改已经执行过的共享迁移或关闭迁移绕过问题。

## README 维护规则

出现以下变化时必须同步刷新 README：

- 新增或调整模块边界
- 主调用链变化
- 权限、审核或状态机不变量变化
- 新增关键 QueryRepository 或批处理策略
- 本地启动、环境变量或验证命令变化
- 新增复杂模块但缺少入口导航
