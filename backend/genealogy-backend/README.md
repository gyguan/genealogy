# Genealogy Backend

中国式族谱系统 MVP 1 后端工程。

## 技术栈

```text
Java 17
Spring Boot 3.x
PostgreSQL 16
Flyway
Spring Data JPA
OpenAPI / Swagger UI
```

## 本地启动

### 1. 环境要求

```text
JDK 17+
Maven 3.8+
Docker / Docker Compose
curl
python3，用于执行 MVP1 API 验收脚本
```

### 2. 数据库配置

默认 PostgreSQL 配置：

```text
数据库名：genealogy
用户名：genealogy
密码：123456
连接串：jdbc:postgresql://localhost:5432/genealogy
```

配置文件：

```text
src/main/resources/application.yml
```

### 3. 启动 PostgreSQL

```bash
cd backend/genealogy-backend
docker compose up -d
```

如果本地旧库和当前 Flyway 脚本不一致，建议清库重建：

```bash
docker compose down -v
docker compose up -d
```

### 4. 启动后端

```bash
mvn spring-boot:run
```

启动时 Flyway 默认自动执行：

```text
src/main/resources/db/migration
```

该目录包含建表、索引、系统角色、系统权限、角色权限绑定等自动迁移脚本。Flyway 完成后，Hibernate 再通过 `ddl-auto=validate` 校验实体与数据库结构；因此正常本地启动不要关闭 Flyway。只有在数据库已由外部流程完成迁移、且明确知道 Schema 与当前代码一致时，才可临时设置：

```text
SPRING_FLYWAY_ENABLED=false
```

### 5. 健康检查与 Swagger

```text
GET http://localhost:8080/api/v1/health
http://localhost:8080/swagger-ui.html
http://localhost:8080/api-docs
```

## 常见启动问题

### 1. Flyway 报 schema 非空但没有 history 表

错误类似：

```text
Found non-empty schema(s) "genealogy" but no schema history table
```

本地验证环境建议直接清库重建：

```bash
docker compose down -v
docker compose up -d
mvn spring-boot:run
```

不建议在本地 MVP 验证阶段开启 `baselineOnMigrate`，否则可能跳过部分迁移脚本，导致表结构与 JPA 实体不一致。

### 2. 数据库密码错误

确认 `docker-compose.yml` 与 `application.yml` 都使用：

```text
username: genealogy
password: 123456
```

### 3. `entityManagerFactory` 或认证 Bean 创建失败

出现以下 Bean 链时：

```text
authCookieBridgeFilter
  -> authApplicationService
  -> appUserRepository
  -> jpaSharedEM_entityManagerFactory
  -> entityManagerFactory
```

不要先修改认证 Filter、Application Service 或 Repository。它们通常只是被底层数据库初始化失败连带影响。请继续查看日志中最深层的 `Caused by`，重点关注：

```text
flywayInitializer
FlywayException
Schema-validation
PSQLException
```

### 4. Flyway 版本冲突

如果日志包含：

```text
Found more than one migration with version ...
```

先执行迁移元数据检查：

```bash
bash ./scripts/check-flyway-migrations.sh
```

脚本会输出重复版本及具体文件名。不要使用 `flyway repair`、手工修改 `flyway_schema_history`、关闭 Flyway 或修改认证依赖链来绕过冲突。应在独立数据库治理 Issue 中，将重复脚本收敛为一个规范基线文件，并用更高版本的前向迁移完整保留被移除脚本的 SQL 职责。

如果当前代码已经修复迁移版本，但本地数据库来自旧分支或旧 Docker volume，执行：

```bash
docker compose down -v
docker compose up -d
mvn spring-boot:run
```

该操作会删除本地容器数据卷，仅适用于可重建的本地开发数据库；有需要保留的数据时先完成备份。

## MVP1 API 验收

仓库内置端到端 API 验收脚本：

```text
scripts/mvp1-api-test.sh
```

执行：

```bash
cd backend/genealogy-backend
chmod +x scripts/mvp1-api-test.sh
./scripts/mvp1-api-test.sh
```

脚本覆盖：

```text
注册、登录、匿名写接口拦截、创建宗族、创建支派、创建字辈、录入人物、隐私脱敏、建立关系、创建来源、绑定来源、上传附件、下载附件、提交审核、审核通过、查看世系、查询日志、下载模板、导出 CSV
```

验收说明：

```text
docs/test/mvp1-api-acceptance.md
```

## 可选：导入演示数据

演示数据脚本不会被 Flyway 自动执行，需手动导入：

```bash
psql -h localhost -p 5432 -U genealogy -d genealogy -f src/main/resources/db/seed/demo-data.sql
```

演示账号：

```text
用户名：demo_admin
密码：Demo@123456
```

## 认证登录接口

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
POST /api/v1/auth/logout
```

当前采用轻量 token 会话机制：密码使用 PBKDF2 哈希存储；登录后生成不透明 token，服务端保存 token hash，调用 `/me` 和 `/logout` 时通过 `Authorization: Bearer {token}` 识别当前用户。

## 审核闭环接口

```text
POST /api/v1/persons/{personId}/submit-review
POST /api/v1/relationships/{relationshipId}/submit-review
POST /api/v1/sources/{sourceId}/submit-review
POST /api/v1/branches/{branchId}/submit-review
POST /api/v1/generation-schemes/{schemeId}/submit-review
GET  /api/v1/clans/{clanId}/review-tasks/pending
GET  /api/v1/review-tasks/{taskId}
POST /api/v1/review-tasks/{taskId}/approve
POST /api/v1/review-tasks/{taskId}/reject
GET  /api/v1/persons/{personId}/review-records
```

审核通过/驳回要求 `clan_admin`。

## 来源证据链与附件接口

```text
POST   /api/v1/clans/{clanId}/sources
POST   /api/v1/source-bindings
GET    /api/v1/source-bindings?targetType=person&targetId={id}
GET    /api/v1/sources/{sourceId}/bindings
DELETE /api/v1/source-bindings/{bindingId}
POST   /api/v1/clans/{clanId}/attachments/upload
GET    /api/v1/attachments/{attachmentId}/download
GET    /api/v1/sources/{sourceId}/attachments
```

附件默认本地存储：

```yaml
genealogy:
  attachment:
    storage-root: ./data/attachments
```

## 字辈接口

```text
POST /api/v1/clans/{clanId}/generation-schemes
GET  /api/v1/clans/{clanId}/generation-schemes
PUT  /api/v1/generation-schemes/{schemeId}/items
POST /api/v1/generation-schemes/{schemeId}/items
GET  /api/v1/generation-schemes/{schemeId}/items
GET  /api/v1/generation-schemes/{schemeId}/items/{generationNo}
```

## 人物与关系导入导出

```text
GET  /api/v1/imports/templates/persons.csv
GET  /api/v1/imports/templates/relations.csv
POST /api/v1/clans/{clanId}/imports/persons.csv/preview
POST /api/v1/clans/{clanId}/imports/persons.csv
POST /api/v1/clans/{clanId}/imports/relations.csv/preview
POST /api/v1/clans/{clanId}/imports/relations.csv
GET  /api/v1/clans/{clanId}/exports/persons.csv
GET  /api/v1/clans/{clanId}/branches/{branchId}/exports/persons.csv
GET  /api/v1/clans/{clanId}/exports/relations.csv
GET  /api/v1/exports/types
```

当前使用 Excel 可直接打开的 UTF-8 BOM CSV。

## 操作日志接口

```text
GET /api/v1/logs/operations
GET /api/v1/logs/operations?clanId={clanId}
GET /api/v1/logs/operations?actionType=person_create
GET /api/v1/logs/operations?targetType=person&targetId={personId}
```

支持按宗族、操作者、动作类型、目标类型、目标 ID、时间范围、关键词分页查询。

## 模块规划

```text
common            公共能力
auth              认证登录
clan              宗族管理
branch            支派管理
generation        字辈管理
person            人物管理
relationship      关系管理
source            资料来源
review            审核中心
tree              世系图查询
member            成员权限
importexport      导入导出
operationlog      操作日志
```
