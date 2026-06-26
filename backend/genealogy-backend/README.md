# Genealogy Backend

中国式族谱系统 MVP 1 后端工程。

## 技术栈

```text
Java 17
Spring Boot 3.x
PostgreSQL
Flyway
Spring Data JPA
JWT 预留
OpenAPI 预留
```

## 本阶段目标

当前目录先初始化可运行的后端工程骨架，包含：

- Spring Boot 启动类
- Maven 配置
- application.yml
- Flyway 初始化脚本
- 统一响应 ApiResponse
- 分页响应 PageResponse
- 业务异常 BusinessException
- 全局异常处理 GlobalExceptionHandler
- 健康检查接口
- 各业务模块包结构占位

## 云端编译

后端代码变更会触发 GitHub Actions：

```text
Backend CI → mvn -B clean test
```

本分支用于触发认证登录功能的启动级验证。

## 本地启动

准备 PostgreSQL：

```text
数据库名：genealogy
用户名：genealogy
密码：genealogy
```

启动：

```bash
mvn spring-boot:run
```

健康检查：

```text
GET /api/v1/health
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
GET  /api/v1/clans/{clanId}/review-tasks/pending
GET  /api/v1/review-tasks/{taskId}
POST /api/v1/review-tasks/{taskId}/approve
POST /api/v1/review-tasks/{taskId}/reject
GET  /api/v1/persons/{personId}/review-records
```

当前优先支持人物档案审核：提交后人物状态变为 `pending_review`，审核通过后变为 `official`，审核驳回后回到 `draft`。

## 来源证据链接口

```text
POST   /api/v1/source-bindings
GET    /api/v1/source-bindings?targetType=person&targetId={id}
GET    /api/v1/sources/{sourceId}/bindings
DELETE /api/v1/source-bindings/{bindingId}
POST   /api/v1/attachments
GET    /api/v1/sources/{sourceId}/attachments
```

当前支持将资料来源绑定到 `person`、`relationship`、`branch`、`clan` 等目标对象；附件接口先登记文件元数据，不处理真实文件上传。

## 字辈明细接口

```text
POST /api/v1/clans/{clanId}/generation-schemes
GET  /api/v1/clans/{clanId}/generation-schemes
PUT  /api/v1/generation-schemes/{schemeId}/items
POST /api/v1/generation-schemes/{schemeId}/items
GET  /api/v1/generation-schemes/{schemeId}/items
GET  /api/v1/generation-schemes/{schemeId}/items/{generationNo}
```

支持创建字辈方案、全量替换字辈明细、追加单个字辈、查询方案字辈表，以及按代次查询字辈。

## 人物字辈校验

创建或更新人物时，如果同时填写了 `generationNo` 和 `generationWord`，系统会根据当前宗族有效字辈方案进行校验：

```text
优先使用人物所属支派的字辈方案
其次使用宗族默认字辈方案
严格模式 strictMode=true 时，字辈不匹配会拦截
非严格模式下暂不拦截，用于兼容历史数据
validationEnabled=false 时跳过校验
```

## 人物 CSV 导入导出

```text
GET  /api/v1/imports/templates/persons.csv
POST /api/v1/clans/{clanId}/imports/persons.csv
GET  /api/v1/clans/{clanId}/exports/persons.csv
GET  /api/v1/exports/types
```

人物 CSV 导入复用人物创建逻辑，因此人物编码唯一性、生卒日期、支派归属、字辈校验等规则都会生效。导入接口使用 `multipart/form-data`，文件字段名为 `file`。

## 操作日志接口

```text
GET /api/v1/logs/operations
GET /api/v1/logs/operations?clanId={clanId}
GET /api/v1/logs/operations?targetType=person&targetId={personId}
```

当前会记录人物新增、人物更新、人物删除、人物审核提交、审核通过、审核驳回、人物 CSV 导入等关键动作。

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
