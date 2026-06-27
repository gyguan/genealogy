# 10. 数据库建表与数据预置说明

本文说明 Genealogy MVP 后端数据库脚本的执行方式、脚本职责和数据预置范围。

## 一、自动建表脚本

自动建表脚本位于：

```text
backend/genealogy-backend/src/main/resources/db/migration
```

后端启动时由 Flyway 自动执行，当前包含：

```text
V1__init_schema.sql                                宗族、支派、人物、关系主表
V2__add_support_tables.sql                         来源、附件、来源绑定、审核、早期成员/角色表
V3__add_generation_tables.sql                      字辈方案、字辈明细
V4__align_member_entity.sql                        对齐成员实体字段
V5__add_app_role_table.sql                         当前成员角色表 app_role
V6__add_operation_log_table.sql                    操作日志表
V7__add_permission_tables.sql                      权限与角色权限表
V8__add_app_user_table.sql                         当前认证用户表 app_user
V9__add_auth_session_table.sql                     登录会话表
V11__align_auth_member_and_seed_system_data.sql    认证/成员结构修正与系统数据预置
```

## 二、系统数据预置

系统级预置数据由 Flyway 自动执行：

```text
V11__align_auth_member_and_seed_system_data.sql
```

当前会预置以下数据：

### 1. 系统角色

```text
clan_admin    宗族管理员
branch_admin  支派管理员
editor        编辑人员
viewer        只读成员
```

### 2. 系统权限

```text
clan:manage
member:manage
branch:manage
generation:manage
person:write
relationship:write
source:write
attachment:write
review:submit
review:approve
import:execute
export:execute
tree:read
log:read
```

### 3. 角色权限绑定

```text
clan_admin    拥有所有权限
branch_admin  拥有支派、字辈、人物、关系、来源、附件、提交审核、导入导出、世系查看权限
editor        拥有人物、关系、来源、附件、提交审核、导入导出、世系查看权限
viewer        拥有导出和世系查看权限
```

### 4. 结构修正

`V11` 同时修正历史脚本中的兼容问题：

```text
clan_member.user_id 外键从旧 user_account 对齐到当前 app_user
member_status 默认值从 ACTIVE 对齐为 active
scope_type 默认值从 CLAN 对齐为 clan
role_id 移除无效默认值 0
补充成员、角色、权限、日志、关系、附件等常用索引
```

## 三、演示数据脚本

演示数据脚本位于：

```text
backend/genealogy-backend/src/main/resources/db/seed/demo-data.sql
```

该脚本不会被 Flyway 自动执行，避免生产环境默认写入演示数据。

本地演示时，可在数据库初始化完成后手动执行：

```bash
psql -h localhost -p 5432 -U genealogy -d genealogy -f backend/genealogy-backend/src/main/resources/db/seed/demo-data.sql
```

演示账号：

```text
用户名：demo_admin
密码：Demo@123456
```

演示数据包括：

```text
演示张氏宗族
长沙支派
演示字辈方案与字辈明细
三位演示人物
两条亲子关系
一条资料来源
一条来源绑定
```

## 四、本地初始化流程

### 1. 启动数据库

```bash
cd backend/genealogy-backend
docker compose up -d
```

### 2. 启动后端并自动执行 Flyway

```bash
mvn spring-boot:run
```

### 3. 可选：导入演示数据

```bash
psql -h localhost -p 5432 -U genealogy -d genealogy -f src/main/resources/db/seed/demo-data.sql
```

### 4. 验证健康检查

```text
GET /api/v1/health
```

## 五、注意事项

- `db/migration` 下的脚本会自动执行，适合放结构变更和系统基础数据。
- `db/seed` 下的脚本不会自动执行，适合放演示数据或一次性手工数据。
- 已执行过的 Flyway 版本脚本不要修改历史文件，应新增新的 `Vxx__*.sql`。
- 当前 MVP 使用 PostgreSQL，脚本中包含 `jsonb`、`bigserial`、`on conflict` 等 PostgreSQL 特性。
