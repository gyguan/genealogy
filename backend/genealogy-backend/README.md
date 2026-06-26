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

本分支用于触发字辈明细功能的编译检查。

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
