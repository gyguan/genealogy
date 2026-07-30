# 10. 数据库建表与数据预置说明

本文说明 Genealogy MVP 后端数据库脚本的执行方式、脚本职责和数据预置范围。

## 一、自动执行脚本目录

Flyway 自动执行脚本位于：

```text
backend/genealogy-backend/src/main/resources/db/migration
```

后端启动时会自动执行，当前包含：

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
V11__align_auth_member_and_seed_system_data.sql    认证/成员结构修正与基础种子兜底
V12__add_schema_comments.sql                       数据库表与字段注释，第一部分
V13__seed_system_reference_data.sql                系统基础数据预置
V14__add_schema_comments_part2.sql                 数据库表与字段注释，第二部分
```

## 二、建表脚本覆盖范围

当前建表脚本已覆盖 MVP 后端运行所需的核心表：

```text
clan                    宗族主表
branch                  支派表
person                  人物表
relationship            人物关系表
source                  资料来源表
attachment              附件元数据表
source_binding          来源绑定表
revision                审核记录表
review_task             审核任务表
generation_scheme       字辈方案表
generation_word         字辈明细表
app_user                当前认证用户表
app_auth_session        登录会话表
clan_member             宗族成员表
app_role                当前角色表
app_permission          权限表
app_role_permission     角色权限关系表
operation_log           操作日志表
```

`V12__add_schema_comments.sql` 和 `V14__add_schema_comments_part2.sql` 已对主要表和字段补充 `COMMENT ON TABLE/COLUMN` 注释，便于数据库工具中直接查看表含义和字段用途。

## 三、系统数据预置

系统级预置数据由 Flyway 自动执行：

```text
V13__seed_system_reference_data.sql
```

当前会预置以下数据。

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

说明：`V11` 保留了结构修正和基础种子兜底，`V13` 是更明确的系统基础数据预置脚本。两者均使用 `on conflict` 幂等写法，不会重复插入脏数据。

## 四、结构修正脚本

`V11__align_auth_member_and_seed_system_data.sql` 修正历史脚本中的兼容问题：

```text
clan_member.user_id 外键从旧 user_account 对齐到当前 app_user
member_status 默认值从 ACTIVE 对齐为 active
scope_type 默认值从 CLAN 对齐为 clan
role_id 移除无效默认值 0
补充成员、角色、权限、日志、关系、附件等常用索引
```

## 五、演示数据脚本

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

## 六、本地初始化流程

### 1. 确认数据库

```text
数据库名：genealogy
用户名：genealogy
密码：123456
```

### 2. 启动后端并自动执行 Flyway

```bash
cd backend/genealogy-backend
mvn spring-boot:run
```

### 3. 可选：导入演示数据

```bash
psql -h localhost -p 5432 -U genealogy -d genealogy -f src/main/resources/db/seed/demo-data.sql
```

### 4. 验证健康检查

```text
GET http://localhost:8080/api/v1/health
```

## 七、注意事项

- `db/migration` 下的脚本会自动执行，适合放结构变更、注释和系统基础数据。
- `db/seed` 下的脚本不会自动执行，适合放演示数据或一次性手工数据。
- 已执行过的 Flyway 版本脚本不要修改历史文件，应新增新的 `Vxx__*.sql`。
- 当前 MVP 使用 PostgreSQL，脚本中包含 `jsonb`、`bigserial`、`on conflict`、`comment on` 等 PostgreSQL 特性。
