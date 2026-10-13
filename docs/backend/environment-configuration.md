# 后端环境配置与数据库迁移

## 配置原则

后端不在默认配置中保存生产数据库密码、生产密钥或其他生产敏感凭据。本地开发使用与 `docker-compose.yml` 一致的专用默认连接（`genealogy / genealogy_local_only`），并允许通过环境变量或 Git 忽略的本地配置文件覆盖。当前持久化层使用 MyBatis/MyBatis-Plus，所有环境均由 Flyway 管理数据库结构，禁止由 ORM 或运行时代码自动建表。

## Profile 职责

| Profile | 用途 | 数据库来源 | Flyway | 日志与安全 |
| --- | --- | --- | --- | --- |
| 未指定 | 默认本地开发 / IDEA 直接运行 | `application.yml` 本地默认值，可被环境变量或 `config/application-local.yml` 覆盖 | 启用 | 保守默认；不主动暴露测试 Token |
| `local` | 兼容已有本地启动配置 / 本地调试 | 与默认本地连接一致，也可通过环境变量覆盖 | 启用 | DEBUG；允许显式开启测试 Token；Cookie 非 Secure |
| `test` | 自动化测试 | `TEST_DB_*` 或 `DB_*` 注入的隔离数据库 | 启用 | INFO；测试 Token 仅限测试环境 |
| `prod`（兼容别名 `production`） | 生产部署 | 必须通过 Secret 注入 `DB_URL`、`DB_USERNAME`、`DB_PASSWORD` | 启用 | INFO；Secure Cookie；禁止暴露 Bearer/Reset Token |

本地默认连接只在 Spring 的 `default` 或 `local` profile 下生效，并在该本地配置段中可选导入 `./config/application-local.yml`。该文件用于开发机私有覆盖，不提交 Git；仓库提供 `config/application-local.example.yml` 作为模板。显式激活 `prod` 或兼容别名 `production` 时，不会加载本地默认连接；`application-prod.yml` 只接受注入的数据库参数，并由 `ProductionEnvironmentValidator` 强制检查三个数据库 Secret。

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
- `GENEALOGY_AUTH_BOOTSTRAP_ADMIN_ENABLED`
- `GENEALOGY_AUTH_BOOTSTRAP_ADMIN_USERNAME`
- `GENEALOGY_AUTH_BOOTSTRAP_ADMIN_PASSWORD`
- `GENEALOGY_AUTH_BOOTSTRAP_ADMIN_DISPLAY_NAME`
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

默认配置与项目 `docker-compose.yml` 对齐，可直接启动：

```bash
cd backend/genealogy-backend
mvn spring-boot:run
```

IDEA 中直接运行 `GenealogyApplication` 即可，无需配置 Active profiles。

覆盖本地数据库可使用环境变量：

```bash
export DB_URL='jdbc:postgresql://localhost:5432/genealogy'
export DB_USERNAME='genealogy'
export DB_PASSWORD='local-secret'
mvn spring-boot:run
```

也可以复制本地模板：

```bash
cp config/application-local.example.yml config/application-local.yml
```

需要沿用原有 DEBUG / 测试 Token 本地行为时，仍可显式激活 `local` profile；这不是数据库连接的必要条件。

### 生产部署

```bash
export SPRING_PROFILES_ACTIVE=prod
export DB_URL='jdbc:postgresql://postgres.internal:5432/genealogy'
export DB_USERNAME='genealogy_app'
export DB_PASSWORD='<injected-by-secret-manager>'
java -jar genealogy-backend-0.1.0-SNAPSHOT.jar
```

### 全新数据库的首账号

V2 不预置 Demo 用户或固定管理员密码。生产环境公共注册保持关闭，因此第一次部署空数据库时，需要显式提供一次性 bootstrap 账号：

```bash
export GENEALOGY_AUTH_BOOTSTRAP_ADMIN_ENABLED=true
export GENEALOGY_AUTH_BOOTSTRAP_ADMIN_USERNAME='<initial-login>'
export GENEALOGY_AUTH_BOOTSTRAP_ADMIN_PASSWORD='<12-to-64-character-secret>'
export GENEALOGY_AUTH_BOOTSTRAP_ADMIN_DISPLAY_NAME='<display-name>'
```

该机制仅在 `app_user` 为空时创建账号，密码使用正常密码哈希流程保存。已有任意用户时会跳过。首账号登录后通过正常流程创建第一个宗族，系统会自动授予该宗族的 `clan_admin`。创建完成后应关闭 `GENEALOGY_AUTH_BOOTSTRAP_ADMIN_ENABLED`。


## Flyway 策略

- 本地：启动时执行 Flyway，确保开发库与代码同步。
- 测试与 CI：使用隔离 PostgreSQL，验证 fresh baseline、活动迁移链以及 Java/MyBatis 与数据库契约。
- 生产：启动时执行 Flyway 校验与迁移，不使用 Hibernate/JPA 自动 DDL。
- 当前 V1/V2 是 fresh-install 基线；合入 main 后不可修改、删除或重命名。
- 后续数据库变化只新增时间戳版本迁移；`clean` 始终禁用。
- `database/archive/legacy-flyway` 只用于审计和基线重现，不属于受支持的生产升级路径。

CI 的 `Backend Configuration Governance` 工作流自动验证：

1. 生产 Profile 缺少 Secret 时启动失败。
2. 空数据库可从 V1/V2 完成初始化并启动应用。
3. 活动迁移链可从当前前一版本升级到最新版本（当前即 V1 → V2），不承诺 archive 中旧数据库升级。
4. 数据库初始化后应用可正常启动并通过后端配置校验。

另由 `Fresh Database Baseline Check` 验证 V1/V2 可重复生成、byte-for-byte 一致，以及 Java/MyBatis 表、字段、类型、主键、枚举值域和 RBAC 种子契约。
