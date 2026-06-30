# 04. 技术架构建议

## 总体架构

MVP 1 建议采用模块化单体架构，先保证领域模型、审核流程、权限模型和数据可信链路稳定，再考虑微服务拆分。

```text
React + Ant Design Web
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
| ORM | Spring Data JPA，按模块需要可补充 MyBatis / MyBatis Plus |
| 认证 | JWT |
| 数据迁移 | Flyway |
| 文件存储 | 本地存储起步，预留 MinIO |
| API 文档 | springdoc-openapi |
| Excel | EasyExcel |
| 前端框架 | React + TypeScript + Vite |
| 前端设计体系 | Ant Design 5.x |
| 前端组件原则 | 统一优先使用 Ant Design 的 Layout、Menu、Tabs、Card、Form、Input、Select、Button、Table、Descriptions、Alert、Empty 等组件；除 Ant Design 无法满足的树谱画布、族谱关系可视化、特殊图表交互外，不自研基础 UI 组件 |

## 前端架构原则

1. **Ant Design 优先**：业务页面必须优先使用 Ant Design 组件和官方设计模式，保持中后台产品的一致性、确定性和低学习成本。
2. **共享组件轻封装**：`shared/ui` 只做薄封装，例如统一 `Panel`、`DataTable`、`Field`、`Actions`、`DetailCard`、`ToastStack`，底层仍基于 Ant Design。
3. **自定义组件受控**：仅在 Ant Design 无法直接满足时允许自定义，如世系树节点、树谱画布、族谱关系连线、统计条形图等业务可视化场景。
4. **样式扩展收敛**：页面样式只补充业务布局和可视化表达，不覆盖 Ant Design 基础交互语义；全局兼容样式统一放在 `antd-bridge.css`。
5. **组件风格一致**：统一使用白底容器、弱边框、轻阴影、标准圆角、Ant Design 默认主色和语义色。

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
