# 08. 后端工程结构设计

## 技术栈

```text
Java 17 + Spring Boot 3.x
PostgreSQL
MyBatis Plus / Spring Data JPA
JWT
Flyway
EasyExcel
springdoc-openapi
```

## 架构风格

MVP 1 推荐模块化单体，不建议过早拆分微服务。

```text
Controller → Application Service → Domain Service → Repository → Database
```

## 后端模块

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

## 单模块结构

```text
person/
├── controller
├── application
├── domain
├── repository
├── entity
├── dto
├── mapper
└── enums
```

## 分层职责

| 层级 | 职责 |
|---|---|
| Controller | 接收 HTTP 请求、参数校验、返回 DTO |
| Application Service | 编排业务流程和事务 |
| Domain Service | 处理领域规则、校验和状态流转 |
| Repository | 数据访问 |
| Entity | 数据库实体 |
| DTO | 请求和响应对象 |
| Mapper | Entity 与 DTO 转换 |

## 核心领域服务

| 服务 | 说明 |
|---|---|
| PersonDomainService | 人物创建、修改、状态校验 |
| PersonDuplicateChecker | 重复人物检测 |
| PersonPrivacyPolicy | 在世人员隐私脱敏 |
| RelationshipValidator | 关系合法性校验 |
| RelationshipCycleChecker | 父子、继嗣关系成环检测 |
| ReviewApplicationService | 创建变更、审核通过、审核驳回 |
| RevisionApplyService | 审核通过后应用变更 |
| TreeQueryDomainService | 构建家庭图、上溯图、下延树 |
| PermissionDomainService | 宗族、支派、角色权限判断 |

## 审核流

正式数据修改流程：

```text
正式数据 → 生成 revision → 创建 review_task → 审核通过 → RevisionApplyService.apply → 正式生效
```

## 权限判断维度

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

## 开发顺序建议

1. 工程骨架、统一响应、异常处理、Flyway。
2. 认证、成员、角色、权限。
3. 宗族与支派。
4. 人物基础能力。
5. 关系管理和关系校验。
6. 审核流。
7. 来源证据。
8. 世系图查询。
9. 导入导出。
10. 操作日志和测试。
