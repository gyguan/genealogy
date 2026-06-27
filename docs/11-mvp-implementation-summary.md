# 11. MVP 实现内容总结

本文用于沉淀当前 Genealogy MVP 已实现内容，作为后续新会话继续开发、部署、联调和验收的交接材料。

## 一、当前总体状态

当前仓库已经完成族谱系统 MVP 的后端主链路建设，并完成 P0 / P1 / P2 级别的一版可运行实现。

当前状态：

```text
后端 API：已完成主流程能力，并已完成本地 API 验证
数据库脚本：已具备 Flyway 自动建表和系统数据预置能力
前端页面：已有静态 MVP 演示页面
本地部署：已支持 docker compose + mvn spring-boot:run 启动
CI 验证：多轮 Backend CI 已通过
```

核心目录：

```text
backend/genealogy-backend                                      后端工程
backend/genealogy-backend/src/main/resources/db/migration      Flyway 自动建表脚本
backend/genealogy-backend/src/main/resources/db/seed           手动演示数据脚本
frontend/mvp                                                   静态 MVP 前端页面
docs                                                           设计与交付文档
```

## 二、后端已实现能力

### 1. 认证登录

已实现轻量登录认证能力：

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/auth/me
POST /api/v1/auth/logout
```

能力包括：

```text
用户注册
用户登录
PBKDF2 密码哈希
不透明 token 会话
服务端 token hash 存储
Authorization: Bearer {token} 识别当前用户
登出撤销 session
```

当前认证表：

```text
app_user
app_auth_session
```

### 2. 权限与成员体系

已完成 MVP 级权限体系：

```text
clan_admin    宗族管理员
branch_admin  支派管理员
editor        编辑人员
viewer        只读成员
```

已实现：

```text
登录态校验
宗族成员校验
clan_admin 管理成员和审核
宗族创建后自动把创建者设为 clan_admin
核心写接口禁止匿名访问
```

相关服务：

```text
AuthorizationApplicationService
RequestContextApplicationService
RequestUserContext
```

### 3. 宗族管理

已实现：

```text
创建宗族
查询宗族
宗族列表
更新宗族
删除宗族
```

接口：

```text
POST   /api/v1/clans
GET    /api/v1/clans
GET    /api/v1/clans/{id}
PUT    /api/v1/clans/{id}
DELETE /api/v1/clans/{id}
```

宗族创建后会自动完成权限自举：

```text
创建者 -> clan_member -> clan_admin
```

### 4. 支派管理

已实现：

```text
创建支派
查询支派
支派列表
更新支派
删除支派
父子支派校验
支派归属宗族校验
```

接口：

```text
POST   /api/v1/clans/{clanId}/branches
GET    /api/v1/clans/{clanId}/branches
GET    /api/v1/branches/{id}
PUT    /api/v1/branches/{id}
DELETE /api/v1/branches/{id}
```

### 5. 字辈管理

已实现：

```text
创建字辈方案
查询宗族字辈方案
全量替换字辈明细
追加单个字辈
查询字辈明细
按代次查询字辈
```

接口：

```text
POST /api/v1/clans/{clanId}/generation-schemes
GET  /api/v1/clans/{clanId}/generation-schemes
PUT  /api/v1/generation-schemes/{schemeId}/items
POST /api/v1/generation-schemes/{schemeId}/items
GET  /api/v1/generation-schemes/{schemeId}/items
GET  /api/v1/generation-schemes/{schemeId}/items/{generationNo}
```

人物录入时已接入字辈校验：

```text
优先使用支派字辈方案
其次使用宗族默认字辈方案
strictMode=true 时严格拦截
validationEnabled=false 时跳过校验
```

### 6. 人物档案

已实现：

```text
新增人物
编辑人物
查询人物
宗族下人物分页
支派下人物分页
软删除人物
人物编码唯一校验
生卒日期校验
字辈校验
在世人员敏感字段脱敏
```

接口：

```text
POST   /api/v1/clans/{clanId}/persons
GET    /api/v1/persons/{id}
GET    /api/v1/clans/{clanId}/persons
GET    /api/v1/clans/{clanId}/branches/{branchId}/persons
PUT    /api/v1/persons/{id}
DELETE /api/v1/persons/{id}
```

隐私规则：

```text
未登录或非宗族成员查看在世人员：隐藏 birthDate、birthPlace、residencePlace、biography、tombPlace、epitaph 等敏感字段
宗族有效成员查看：返回完整信息
```

### 7. 关系管理

已实现基础关系 CRUD，并增强族谱业务规则。

接口：

```text
POST   /api/v1/clans/{clanId}/relationships
GET    /api/v1/relationships/{id}
GET    /api/v1/persons/{personId}/relationships
PUT    /api/v1/relationships/{id}
DELETE /api/v1/relationships/{id}
```

已实现规则：

```text
fromPersonId 不能等于 toPersonId
人物必须属于同一宗族
重复关系拦截
父亲/母亲唯一性约束
配偶关系双向自动补齐
亲子/养育关系世次校验
```

当前关系语义约定：

```text
parent_child：fromPersonId = 父/母，toPersonId = 子女
spouse：配偶关系，自动生成反向关系
adoptive：养育/收养关系，参与世次校验
```

### 8. 世系图查询

已实现后端世系查询：

```text
GET /api/v1/tree/person/{personId}/family
GET /api/v1/tree/descendants?rootPersonId=&maxDepth=
GET /api/v1/tree/ancestors?personId=&maxDepth=
```

能力包括：

```text
家庭图
下延世系
上溯世系
最大深度控制
```

前端已有简单节点/边可视化展示。

### 9. 来源资料与证据链

已实现：

```text
创建资料来源
查询来源
来源列表
来源绑定目标
查询目标绑定来源
查询来源绑定列表
解绑来源
```

接口：

```text
POST   /api/v1/clans/{clanId}/sources
GET    /api/v1/sources/{id}
GET    /api/v1/clans/{clanId}/sources

POST   /api/v1/source-bindings
GET    /api/v1/source-bindings?targetType=person&targetId={id}
GET    /api/v1/sources/{sourceId}/bindings
DELETE /api/v1/source-bindings/{bindingId}
```

支持绑定目标：

```text
person
relationship
branch
clan
```

已补充来源审计：

```text
source_create
source_binding_create
source_binding_delete
```

### 10. 附件上传下载

已实现真实文件上传能力：

```text
POST /api/v1/clans/{clanId}/attachments/upload
GET  /api/v1/attachments/{attachmentId}/download
```

能力包括：

```text
multipart 文件上传
本地文件存储
文件大小限制：20MB
文件类型白名单
checksum 计算
附件元数据登记
附件下载
下载权限校验
附件操作日志
```

配置项：

```yaml
genealogy:
  attachment:
    storage-root: ./data/attachments
```

### 11. 审核中心

已支持审核对象：

```text
人物
关系
资料来源
支派
字辈方案
```

接口：

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

审核通过/驳回状态回写：

```text
person / relationship：draft / pending_review / official
source：unverified / pending_review / verified
branch / generation_scheme：draft / pending_review / active
```

审核通过/驳回要求：

```text
clan_admin
```

### 12. 导入导出

已实现：

```text
人物 CSV 模板
人物 CSV 预校验
人物 CSV 导入
人物 CSV 导出
按支派导出人物 CSV

关系 CSV 模板
关系 CSV 预校验
关系 CSV 导入
关系 CSV 导出
```

接口：

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

说明：

```text
当前采用 Excel 可直接打开的 UTF-8 BOM CSV
没有引入 Apache POI
真实 .xlsx 导入可作为后续增强项
```

### 13. 操作日志

已实现关键操作日志落库。

接口：

```text
GET /api/v1/logs/operations
```

支持筛选：

```text
clanId
actorId
actionType
targetType
targetId
startTime
endTime
keyword
pageNo
pageSize
```

已记录动作包括：

```text
person_create
person_update
person_delete
relationship_create
relationship_update
relationship_delete
source_create
source_binding_create
source_binding_delete
attachment_create
review_submit
review_approve
review_reject
person_csv_import
relationship_csv_import
```

最近已修复：

```text
/api/v1/logs/operations?clanId=1 报 lower(bytea) 不存在
```

修复方式：

```text
OperationLogRepository 改为 JpaSpecificationExecutor
OperationLogApplicationService 改为动态拼接查询条件
不传 keyword 时不再生成 lower(...)
新增 V15__fix_operation_log_detail_type.sql 兼容旧库 detail bytea 问题
```

## 三、数据库脚本已实现内容

数据库自动迁移目录：

```text
backend/genealogy-backend/src/main/resources/db/migration
```

能力：

```text
主业务表建表
来源/附件/审核表建表
字辈表建表
成员权限表建表
认证用户表建表
登录会话表建表
操作日志表建表
系统角色预置
系统权限预置
角色权限绑定预置
成员外键对齐 app_user
常用索引补充
operation_log.detail 类型兼容修复
```

重点脚本：

```text
V1__init_schema.sql
V2__add_support_tables.sql
V3__add_generation_tables.sql
V4__align_member_entity.sql
V5__add_app_role_table.sql
V6__add_operation_log_table.sql
V7__add_permission_tables.sql
V8__add_app_user_table.sql
V9__add_auth_session_table.sql
V100__align_auth_member_and_seed_system_data.sql
V15__fix_operation_log_detail_type.sql
```

手动演示数据目录：

```text
backend/genealogy-backend/src/main/resources/db/seed/demo-data.sql
```

演示数据包含：

```text
demo_admin 演示账号
演示张氏宗族
长沙支派
演示字辈方案
演示人物
演示亲子关系
演示来源资料
来源绑定
```

演示账号：

```text
用户名：demo_admin
密码：Demo@123456
```

## 四、前端 MVP 已实现内容

前端目录：

```text
frontend/mvp
```

文件：

```text
index.html
styles.css
app.js
README.md
```

当前是无构建依赖的静态页面，适合本地演示。

已覆盖页面：

```text
登录/注册
宗族创建与列表
支派维护
字辈维护
人物录入与列表
关系维护
来源绑定与附件上传
审核提交与处理
世系查看
CSV 导入导出
操作日志查看
```

前端增强：

```text
关系 CSV 模板/预校验/导入/导出
按支派导出人物
世系图简单节点/边可视化
日志筛选字段
```

## 五、CI 与本地验证情况

已多轮执行 Backend CI，覆盖：

```text
Maven 编译
Maven test
PostgreSQL 16 启动
Flyway 全量迁移
Hibernate/JPA schema validate
Spring Boot 启动
/api/v1/health 健康检查
```

本地已完成 API 验证，后端 API 当前无阻塞问题。

## 六、本地启动方式

进入后端目录：

```bash
cd backend/genealogy-backend
```

如果是第一次或需要清理旧数据：

```bash
docker compose down -v
docker compose up -d
```

启动后端：

```bash
mvn spring-boot:run
```

健康检查：

```text
http://localhost:8080/api/v1/health
```

Swagger：

```text
http://localhost:8080/swagger-ui.html
```

可选导入演示数据：

```bash
psql -h localhost -p 5432 -U genealogy -d genealogy -f src/main/resources/db/seed/demo-data.sql
```

## 七、当前待后续增强项

MVP 已完整可验证，后续可继续增强：

```text
1. 正式前端工程化：React/Vue + 路由 + 状态管理
2. branch_admin 支派范围细粒度权限
3. 审核 before/after diff payload 结构化
4. 复杂族谱规则引擎：继嗣、出嗣、过继、族内婚配等
5. 附件存储从本地切换到 OSS
6. 操作日志导出和审计看板
7. API 自动化集成测试
8. SAE / RDS / OSS 云端部署联调
9. 数据库脚本进一步整理，避免迁移版本历史混乱
10. 正式产品级世系图布局和交互
```

## 八、一句话总结

当前系统已经从“后端数据底座”推进到了可本地启动、可登录、可建宗族、可录人物、可建关系、可绑定来源、可上传附件、可审核、可导入导出、可查看世系、可审计追踪的 MVP 闭环版本。
