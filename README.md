# Genealogy · 中国式族谱系统

面向宗亲会、修谱委员会、支派负责人、采集员和普通族人的数字化修谱平台。

Genealogy 不只是绘制家谱树，而是围绕宗族主数据、支派房支、人物档案、亲属关系、来源证据、协作审核、世系展示和族谱导出，建立一套可追溯、可协作、可持续演进的族谱管理系统。

## 核心业务闭环

```text
创建宗族 → 建立支派 → 维护字辈 → 录入人物 → 建立关系
→ 绑定来源 → 提交审核 → 查看世系 → 导出族谱
```

## 核心能力

| 能力域 | 主要内容 |
|---|---|
| 宗族与支派 | 宗族主数据、支派房支、字辈方案和成员范围 |
| 人物与关系 | 人物档案、亲属关系、重复识别和关系校验 |
| 来源与证据 | 来源资料、附件、对象绑定和证据追溯 |
| 审核与协作 | 修订、审核任务、通过/驳回和正式数据生效 |
| 世系图谱 | 祖先、后代、支派和人物中心图谱查询 |
| 导入与导出 | 批次导入、错误恢复、任务状态和族谱导出 |
| 权限与审计 | 宗族、支派、对象级权限，隐私保护和操作留痕 |

## 技术架构

```text
前端：React + TypeScript + Vite + Ant Design 5
后端：Java 17 + Spring Boot 3 + Spring Data JPA / MyBatis-Plus 分阶段迁移
数据库：PostgreSQL 16 + Flyway
接口契约：OpenAPI
验证：Maven、PostgreSQL Integration、Playwright、CI Governance
架构形态：模块化单体
```

标准调用关系：

```text
Web / OpenAPI Client
  → Controller
  → Application Service
  → Domain Policy / State Machine
  → Repository / QueryRepository
  → PostgreSQL
```

## 快速开始

### 环境要求

- Java 17
- Maven
- Node.js 与 npm
- Docker / Docker Compose
- PostgreSQL 16（可通过 Docker Compose 启动）

### 启动后端

```bash
cd backend/genealogy-backend
docker compose up -d

export SPRING_PROFILES_ACTIVE=local
export DB_URL=jdbc:postgresql://localhost:5432/genealogy
export DB_USERNAME=genealogy
export DB_PASSWORD='<local-password>'

mvn spring-boot:run
```

后端默认入口：

```text
健康检查：http://localhost:8080/api/v1/health
Swagger UI：http://localhost:8080/swagger-ui.html
OpenAPI：http://localhost:8080/api-docs
```

### 启动前端

```bash
cd frontend/genealogy-web
npm install
npm run dev
```

前端默认访问：

```text
http://localhost:5174
```

详细配置见：

- [后端工程说明](backend/genealogy-backend/README.md)
- [前端工程说明](frontend/genealogy-web/README.md)
- [后端环境配置](docs/backend/environment-configuration.md)
- [持久化框架分阶段迁移](docs/backend/persistence-framework-migration.md)

## 工程结构

```text
.
├── backend/genealogy-backend/    Java / Spring Boot 后端
├── frontend/genealogy-web/       React / TypeScript 正式前端
├── docs/                          产品、架构、规范和经验文档
├── prototype/                     早期 HTML 原型
├── tasks/                         AI / Issue 执行与恢复记录
├── AGENTS.md                      全仓最高级工程规则
└── README.md                      项目总入口
```

模块与 Feature 导航：

- [后端模块导航](backend/genealogy-backend/src/main/java/com/genealogy/README.md)
- [前端 Feature 导航](frontend/genealogy-web/src/features/README.md)

## 文档导航

| 入口 | 用途 |
|---|---|
| [文档总览](docs/README.md) | 按产品、架构、规范、经验和治理分类查找文档 |
| [规范权威目录](docs/standards/README.md) | 判断某类规则的唯一权威文件和最小阅读集合 |
| [API 契约](docs/api/openapi.json) | 前后端公共接口的权威契约 |
| [MVP 1 范围与验收](docs/product/mvp1-scope-and-acceptance.md) | 核心业务范围和验收目标 |
| [领域模型](docs/product/domain-model.md) | 领域对象、关系和业务不变量 |
| [系统架构](docs/architecture/system-architecture.md) | 系统分层、模块边界和技术演进原则 |
| [API 设计规则](docs/standards/api-design.md) | Contract First、分页、错误和兼容原则 |
| [权限与隐私](docs/standards/authorization-and-privacy.md) | 权限、隐私和数据范围语义 |

## AI / 开发者阅读顺序

```text
根 AGENTS.md
  → docs/standards/README.md
  → 当前工程最近的 AGENTS.md
  → 工程或模块 README
  → 当前 Issue / Spec
```

按任务读取最小充分集合，不无差别加载全部规范。

常用入口：

- [后端工程规则](backend/genealogy-backend/AGENTS.md)
- [前端工程规则](frontend/genealogy-web/AGENTS.md)
- [Issue 创建规范](docs/governance/issue-creation.md)
- [Issue 执行与恢复规范](docs/governance/issue-execution.md)
- [AI 工程流程](docs/ai/engineering-workflow.md)

## 核心业务原则

1. **人物和关系分离**：关系是独立领域对象，不使用简单字段替代。
2. **正式数据审核生效**：人物、关系和来源绑定等关键数据必须经过审核闭环。
3. **提交人与审核人隔离**：审核员不能审核自己提交的变更。
4. **权限以后端为准**：前端控制不能替代后端鉴权和数据范围校验。
5. **支派范围受控**：支派负责人只能管理授权范围内的数据。
6. **在世人员默认保护**：联系方式、住址、照片和证件材料默认最小披露。
7. **来源证据可追溯**：关键对象应支持来源绑定和审计追踪。
8. **导入不直入正式库**：导入数据先进入草稿或批次，经校验和审核后生效。
9. **Tree 模块只做查询**：世系图谱不承载正式数据修改逻辑。
10. **模块化单体优先**：先保证清晰边界，再按真实业务和运行需求演进。

## 基础验证

后端：

```bash
cd backend/genealogy-backend
mvn test
mvn verify
```

前端：

```bash
cd frontend/genealogy-web
npm run typecheck
npm run build
npm run api:check
```

页面、样式、权限、数据库或关键用户链路变化时，还应按范围执行对应的 Playwright、PostgreSQL Integration、安全和治理门禁。

## 贡献与变更流程

- 修改前先阅读根 `AGENTS.md` 和目标目录最近的 `AGENTS.md`。
- 公共 API 变更先更新 `docs/api/openapi.json`。
- 数据库 Schema 变更通过 Flyway 前向迁移交付。
- 非平凡变更使用独立分支和 Pull Request。
- 代码、测试、文档和验证结果应保持同步。
