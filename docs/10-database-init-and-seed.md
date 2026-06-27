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