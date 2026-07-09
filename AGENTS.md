# Genealogy AI Engineering Rules

本文件用于约束 AI Coding Agent 在 `gyguan/genealogy` 仓库中的工作方式。目标是把高适配度能力落成项目内规则：

- **工程流程适配度**：通过 Spec → Plan → Build → Verify → Review 的闭环，减少一次性大改和上下文漂移。
- **AI 辅助研发价值**：让 AI 在明确上下文、边界、验收标准和质量门禁下工作，提高代码生成、联调、Review 的稳定性。

> 本仓库可参考 `addyosmani/agent-skills` 的工程 Skill 思路，但不要把它当运行时依赖；它是 AI 研发流程规范，不是族谱业务组件库。

---

## 1. 项目定位

Genealogy 是面向宗亲会、修谱委员会、支派负责人、采集员和普通族人的中国式族谱系统。

项目不是简单绘制家谱树，而是建设覆盖以下能力的数字化修谱平台：

- 宗族主数据
- 支派 / 房支
- 字辈 / 世次
- 人物档案
- 亲属关系
- 资料来源与证据绑定
- 协作审核
- 世系展示
- 导入导出
- 权限隐私与操作审计

MVP 1 主流程：

```text
创建宗族 → 建立支派 → 维护字辈 → 录入人物 → 建立关系 → 绑定来源 → 提交审核 → 查看世系 → 导出简版族谱
```

---

## 2. 技术栈与目录约束

### 后端

- Java 17
- Spring Boot 3.x
- Spring Data JPA，必要时可补充 MyBatis / MyBatis Plus
- PostgreSQL
- Flyway
- springdoc-openapi
- 模块化单体优先，后续按边界拆服务

### 前端

- React + TypeScript + Vite
- Ant Design 5.x
- 基础 UI 优先使用 Ant Design，不新增自研 Button / Table / Form / Input / Select / Card / Tabs / Alert 等基础组件
- 仅在世系图谱、族谱关系连线、树谱画布等特殊场景允许自定义组件

### 关键目录

```text
backend/genealogy-backend/     后端工程
frontend/genealogy-web/        正式前端工程
docs/                          产品、架构、接口、权限等文档
docs/api/openapi.json          API 契约源文件
prototype/                     早期 HTML 原型，仅作参考
database/                      数据库脚本和迁移草案
scripts/                       生成、启动、检查脚本
tasks/                         AI 任务拆解与临时执行计划
```

---

## 3. AI 工作流总规则

所有非平凡变更必须遵循以下流程：

```text
DEFINE → PLAN → BUILD → VERIFY → REVIEW
```

### DEFINE：先明确要做什么

适用场景：新增功能、修改流程、调整接口、修改数据模型、改权限规则、修改世系图谱。

必须输出：

- 目标用户
- 业务场景
- 成功标准
- 影响模块
- 涉及文档
- 需要确认的假设

### PLAN：先拆任务再写代码

任务必须是小切片，优先垂直切片，不要水平铺开。

推荐任务粒度：

- 一次变更尽量不超过 3～5 个核心文件
- 每个任务必须有验收标准
- 每个任务必须有验证方式
- 数据库迁移、API 契约、前端调用必须按依赖顺序推进

### BUILD：一次只做一个切片

禁止一次性实现完整大模块。优先顺序：

```text
领域规则 / 数据模型 → API 契约 → 后端实现 → 前端调用 → 页面交互 → 测试验证
```

### VERIFY：验证不是可选项

至少执行与变更相关的验证命令。

后端常用命令：

```bash
cd backend/genealogy-backend
mvn test
```

前端常用命令：

```bash
cd frontend/genealogy-web
npm run typecheck
npm run build
npm run api:check
```

### REVIEW：合入前做五轴检查

每个 PR 或较大变更必须检查：

1. Correctness：是否满足需求和验收标准
2. Readability：是否容易理解，命名是否清晰
3. Architecture：是否符合模块边界和项目架构
4. Security：是否引入权限、隐私、注入、泄露风险
5. Performance：是否引入 N+1、无分页、大递归、无边界查询等问题

---

## 4. 必须遵守的业务不变量

AI 生成代码时必须优先遵守以下业务规则：

1. **人物和关系分离**：不能用简单 `parentId` / `spouseId` 替代 `relationship` 模型。
2. **正式数据不能直接修改**：正式人物、关系、来源绑定的关键变更必须走 `revision → review_task → approve/reject → apply`。
3. **支派范围必须受控**：支派负责人只能管理授权支派及下级支派。
4. **在世人员默认保护**：在世人物、近亲、联系方式、住址、照片、证件材料默认脱敏或限制访问。
5. **来源证据必须可追溯**：人物、关系、支派、字辈等关键对象要支持来源绑定。
6. **导入不直接入正式库**：导入数据先进入草稿或导入批次，校验通过后再提交审核。
7. **审核员不能自审**：提交人与审核人不能是同一责任主体。
8. **Tree 模块只做查询**：世系图谱查询不承载修改逻辑。
9. **前端不暴露技术字段**：界面优先展示宗族名称、支派名称、人物姓名，不直接让用户操作技术 ID。
10. **权限判断不能只在前端做**：后端必须执行最终鉴权。

---

## 5. 上下文加载规则

开始任何任务前，先按任务类型选择性读取文档，禁止把全部文档无脑塞入上下文。

| 任务类型 | 必读文档 |
|---|---|
| MVP 主流程 | `docs/01-mvp1-requirements.md` |
| 数据模型 / 领域规则 | `docs/03-domain-model.md` |
| 架构 / 模块边界 | `docs/04-technical-architecture.md`、`docs/08-backend-structure.md` |
| 前端页面 / 组件 | `docs/10-frontend-design-guidelines.md` |
| API 变更 | `docs/07-api-design.md`、`docs/api/openapi.json` |
| 权限 / 隐私 / 审计 | `docs/09-permission-management.md` |
| 导入导出 | `docs/01-mvp1-requirements.md`、`docs/03-domain-model.md` |

源码读取规则：

1. 修改文件前必须先读取目标文件。
2. 新增实现前必须查找同类模块模式。
3. 修改接口前必须检查前端调用、OpenAPI 契约和后端实现是否一致。
4. 修改领域规则前必须补充或调整测试。

---

## 6. API 契约规则

API 相关变更必须遵循 Contract First：

1. 先更新 `docs/api/openapi.json`。
2. 再运行前端契约生成：

```bash
cd frontend/genealogy-web
npm run api:generate
```

3. 再实现后端 Controller / Application Service / Domain Service。
4. 最后更新前端调用。

禁止：

- 只改前端兼容逻辑来掩盖接口不一致。
- 同一业务对象出现多套命名风格。
- 新接口绕过统一响应结构。
- 将权限、隐私、审核状态仅交给前端判断。

---

## 7. 前端规则

1. 页面优先使用 Ant Design 的 Layout、Menu、Tabs、Card、Form、Input、Select、Button、Table、Descriptions、Alert、Empty 等组件。
2. `shared/ui` 只做薄封装，不另起一套 UI 体系。
3. 页面状态优先局部化；跨页面状态放 `shared/context`。
4. 筛选、分页、搜索条件优先进入 URL 或明确状态模型，避免隐藏状态。
5. 人物录入、支派选择、来源绑定、审核中心等页面必须有清晰空态、加载态、错误态。
6. 世系图谱必须考虑大数据量、递归深度、节点裁剪、分页或懒加载。

---

## 8. 后端规则

1. Controller 只负责参数接收、鉴权入口、调用应用服务，不写复杂业务逻辑。
2. Application Service 负责编排业务流程和事务。
3. Domain Service 负责领域规则，例如关系校验、支派范围判断、审核约束。
4. Repository 只负责数据访问。
5. Review 模块统一处理正式数据修改流程。
6. OperationLog 必须记录关键变更、审核、导入、导出、权限调整。
7. 所有列表查询必须考虑分页、过滤条件和权限范围。

---

## 9. Ask First / Never Do

### Ask First

以下变更需要先形成 Spec / Plan，再执行：

- 修改数据库 schema 或 Flyway 迁移
- 新增依赖
- 修改认证、权限、隐私、导出、附件上传逻辑
- 修改 API 命名或统一响应结构
- 修改审核流程
- 修改世系图谱数据结构
- 删除兼容逻辑或历史入口

### Never Do

AI 禁止执行以下行为：

- 不读现有代码直接重写模块
- 删除失败测试来让构建通过
- 提交 `.env`、密钥、Token、真实隐私数据
- 绕过审核直接修改正式数据
- 只在前端实现权限控制
- 用技术 ID 替代业务名称暴露给最终用户
- 一次性生成大面积不可 Review 的代码
- 未更新 OpenAPI 就修改接口调用

---

## 10. 推荐 Skill 使用方式

本项目优先使用以下工程 Skill 思路：

| 场景 | 推荐 Skill |
|---|---|
| 新需求 / 大改动 | spec-driven-development |
| 拆任务 / 排计划 | planning-and-task-breakdown |
| 上下文整理 | context-engineering |
| API / 模块边界 | api-and-interface-design |
| 前端页面 | frontend-ui-engineering |
| 权限 / 隐私 / 导入 / 附件 | security-and-hardening |
| 领域规则 / Bug 修复 | test-driven-development |
| PR 合入前 | code-review-and-quality |

详细映射见：`docs/ai/skill-mapping.md`。