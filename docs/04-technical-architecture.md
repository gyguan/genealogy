# 04. 技术架构建议

## 总体架构

MVP 1 建议采用模块化单体架构，先保证领域模型、审核流程、权限模型和数据可信链路稳定，再考虑微服务拆分。

```text
Web / H5
  ↓
REST API
  ↓
Spring Boot 模块化单体
  ↓
PostgreSQL + 文件存储
```

## 推荐技术栈

| 层级 | 技术 |
|---|---|
| 后端 | Java 17 + Spring Boot 3.x |
| 数据库 | PostgreSQL |
| ORM | MyBatis Plus 或 Spring Data JPA |
| 认证 | JWT |
| 数据迁移 | Flyway |
| 文件存储 | 本地存储起步，预留 MinIO |
| API 文档 | springdoc-openapi |
| Excel | EasyExcel |
| 前端 | Vue 3 或 React |

## 后端模块

```text
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

## 数据存储

MVP 1 先使用 PostgreSQL 完成全部核心能力。

后续如果出现复杂亲属路径计算、五服计算、跨支派寻祖推荐，可引入图数据库作为查询加速层。

## 文件存储

MVP 1 可以使用本地文件存储，但业务代码应抽象 `FileStorageService`，后续可切换 MinIO 或对象存储。

## 安全与权限

权限判断需要同时考虑：

```text
userId
clanId
branchId
roleCode
scopeType
scopeId
dataStatus
isLiving
privacyLevel
```

## 关键架构原则

1. Controller 不写复杂业务逻辑。
2. Application Service 负责编排业务流程和事务。
3. Domain Service 集中处理领域规则。
4. Repository 只负责数据访问。
5. Review 模块统一处理正式数据修改流程。
6. Tree 模块只做查询，不承载修改逻辑。
