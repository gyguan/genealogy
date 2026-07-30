# 系统架构

本文描述 Genealogy 当前长期有效的系统架构与边界。具体编码规则由根及前后端 `AGENTS.md` 承载，启动和验证命令由工程 README 承载。

## 1. 架构目标

Genealogy 采用模块化单体，优先保证领域模型、审核流程、权限范围、来源证据和数据可信链路清晰稳定，再根据真实业务和运行需求演进部署形态。

```text
React + TypeScript + Ant Design
  → OpenAPI Client
  → Spring Boot 模块化单体
  → PostgreSQL + 文件存储
```

## 2. 关键技术基线

| 层级 | 当前基线 |
|---|---|
| 前端 | React、TypeScript、Vite、Ant Design 5 |
| 后端 | Java 17、Spring Boot 3、Spring Data JPA |
| 数据库 | PostgreSQL 16、Flyway |
| 契约 | OpenAPI |
| 可观测性 | Actuator、Micrometer、Prometheus |
| 验证 | Maven、PostgreSQL Integration、Playwright、CI Governance |

技术栈发生变化时，以工程 README、构建文件和实际代码为准，并同步刷新本文。

## 3. 标准调用链

```text
Controller
  → Application Service
  → Domain Policy / State Machine
  → Repository / QueryRepository
  → PostgreSQL
```

- Controller 负责协议适配、参数校验和鉴权入口。
- Application Service 负责编排用例、事务和跨模块协作。
- Domain Policy / State Machine 承载可独立测试的业务规则和状态迁移。
- Repository 负责领域持久化；复杂查询、Projection 和批次策略进入 QueryRepository。
- Assembler / ViewModel 转换负责跨边界模型适配，不承载业务决策。

## 4. 模块边界

核心模块包括认证、宗族、支派、字辈、人物、关系、来源、审核、世系查询、成员权限、导入导出、文化资料与操作日志。

稳定边界：

1. Review 统一承载正式数据修订、审核和生效路径。
2. Tree 只负责查询，不修改正式数据。
3. Member / Permission 统一承载宗族、支派和对象级授权事实。
4. Source 是证据中心，不是普通附件目录。
5. Import 先进入批次或草稿，不直接进入正式库。

详细模块入口见 `backend/genealogy-backend/src/main/java/com/genealogy/README.md`。

## 5. 数据与存储

- PostgreSQL 是核心事实存储。
- Schema 变更通过 Flyway 前向迁移。
- 文件访问通过存储抽象隔离，业务代码不直接绑定具体本地路径或对象存储实现。
- 图数据库只可作为未来复杂路径查询的加速层，不取代 PostgreSQL 中的权威业务事实。

## 6. 安全与可信边界

权限判断至少结合用户、宗族成员身份、角色能力、支派范围、对象范围、隐私级别和流程状态。

```text
身份有效
  AND 动作被角色允许
  AND 数据范围覆盖目标对象
  AND 隐私规则允许披露
  AND 当前流程状态允许动作
```

后端是权限、审核状态和隐私结果的唯一可信来源。

## 7. 架构演进原则

只有出现明确证据时才拆分服务，例如独立扩缩容、故障隔离、发布节奏、数据所有权或团队边界已经稳定。不得仅因文件数量、模块名称或“微服务更先进”而拆分。
