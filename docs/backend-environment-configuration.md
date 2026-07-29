# 后端环境配置与数据库迁移

## 配置原则

后端不在默认配置中保存数据库密码、生产密钥或可直接使用的弱凭据。所有环境均使用 Flyway 管理数据库版本，并保持 Hibernate `ddl-auto=validate`，禁止以自动建表替代迁移。

## Profile 职责

| Profile | 用途 | 数据库来源 | Flyway | 日志与安全 |
| --- | --- | --- | --- | --- |
| `local` | 本地开发 | 可使用本地默认值，也可通过环境变量覆盖 | 启用 | DEBUG；允许显式开启测试 Token；Cookie 非 Secure |
| `test` | 自动化测试 | `TEST_DB_*` 或 `DB_*` 注入的隔离数据库 | 启用 | INFO；测试 Token 仅限测试环境 |
| `prod` | 生产部署 | 必须通过 Secret 注入 `DB_URL`、`DB_USERNAME`、`DB_PASSWORD` | 启用 | INFO；Secure Cookie；禁止暴露 Bearer/Reset Token |

未指定 Profile 时，基础配置不会提供数据库凭据，应用不能依赖隐式本地数据库启动。

## 环境变量

### 必需生产 Secret

- `DB_URL`：PostgreSQL JDBC URL，例如 `jdbc:postgresql://db.example.internal:5432/genealogy`
- `DB_USERNAME`：应用数据库账号
- `DB_PASSWORD`：由 Secret 管理系统注入的密码

生产 Profile 缺少任一变量时，应用会在创建 DataSource 前快速失败，并列出缺失变量。

### 常用可选变量

- `SERVER_PORT`
- `GENEALOGY_ATTACHMENT_STORAGE_ROOT`
- `GENEALOGY_AUTH_PUBLIC_REGISTRATION_ENABLED`
- `GENEALOGY_AUTH_COOKIE_SAME_SITE`
- `GENEALOGY_AUTH_SESSION_HOURS`
- `GENEALOGY_AUTH_REMEMBER_ME_HOURS`
- `GENEALOGY_AUTH_RESET_BASE_URL`
- `GENEALOGY_AUTH_RESET_DELIVERY_URL`
- `GENEALOGY_TREE_QUERY_DEFAULT_DEPTH`
- `GENEALOGY_TREE_QUERY_MAX_DEPTH`
- `GENEALOGY_TREE_QUERY_DEFAULT_NODES`
- `GENEALOGY_TREE_QUERY_MAX_NODES`
- `GENEALOGY_TREE_QUERY_DEFAULT_EDGES`
- `GENEALOGY_TREE_QUERY_MAX_EDGES`

生产环境中的 `cookie-secure`、`expose-bearer-token`、`expose-reset-token` 和 `demo-mode-enabled` 由 `application-prod.yml` 强制设置，不能通过普通环境变量降低安全级别。

## 启动示例

### 本地开发

```bash
cd backend/genealogy-backend
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

覆盖本地数据库：

```bash
export DB_URL='jdbc:postgresql://localhost:5432/genealogy'
export DB_USERNAME='genealogy'
export DB_PASSWORD='local-secret'
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

### 生产部署

```bash
export SPRING_PROFILES_ACTIVE=prod
export DB_URL='jdbc:postgresql://postgres.internal:5432/genealogy'
export DB_USERNAME='genealogy_app'
export DB_PASSWORD='<injected-by-secret-manager>'
java -jar genealogy-backend-0.1.0-SNAPSHOT.jar
```

## Flyway 策略

- 本地：启动时执行迁移，确保开发库与代码同步。
- 测试与 CI：使用隔离 PostgreSQL，执行全量迁移和历史版本升级验证。
- 生产：启动时先执行 Flyway 校验与迁移，随后执行 Hibernate Schema Validate。
- 所有环境：`clean` 禁用，迁移文件必须追加，已合入的版本化迁移不可修改。

CI 的 `Backend Configuration Governance` 工作流自动验证：

1. 生产 Profile 缺少 Secret 时启动失败。
2. 空数据库可从零执行全部迁移。
3. 数据库可从受支持的前一 Flyway 版本升级到最新版本。
4. 迁移完成后 Hibernate Schema Validate 通过。
