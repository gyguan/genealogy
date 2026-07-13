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
tasks/                         AI 任务拆解、执行看板与恢复检查点
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
| 聊天式长任务 / GitHub 远程开发 | `docs/ai/chat-driven-github-workflow.md` |
| Issue 实现 / 中断恢复 | `docs/ai/issue-execution-governance.md` |
| 时间展示 / 时区转换 | `docs/ai/time-display-standard.md` |

源码读取规则：

1. 修改文件前必须先读取目标文件。
2. 新增实现前必须查找同类模块模式。
3. 修改接口前必须检查前端调用、OpenAPI 契约和后端实现是否一致。
4. 修改领域规则前必须补充或调整测试。
5. 实现或继续 Issue 时，必须重新读取 `main` 最新版 `AGENTS.md`，不得沿用会话早期缓存规则。

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
- 实现 Issue 时只创建分支或写启动评论，却不创建 Draft PR
- 在 Draft PR 和 Issue 关联建立前修改业务代码
- 会话中断后仅凭聊天记忆继续编码

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

---

## 11. 聊天式 GitHub 开发、任务看板与进度反馈

通过聊天连接 GitHub 执行分析、编码、PR Review 或 CI 修复时，必须遵循 `docs/ai/chat-driven-github-workflow.md`。实现或继续 Issue 时，还必须遵循 `docs/ai/issue-execution-governance.md`；后者对 Issue 启动、持久化和恢复具有更高优先级。

### 11.1 短指令默认语义

用户无需重复仓库、分支、技术栈和验证命令。以下短指令默认解释为：

| 用户输入 | 默认行为 |
|---|---|
| `分析：<问题>` | 只分析，不修改代码，不创建 PR |
| `实现：<需求>` | 定位范围、建立看板、创建分支和 Draft PR、分批实现与验证 |
| `实现 Issue #N` | 刷新最新规则，检查既有现场，完成 Issue 启动门禁后再修改业务代码 |
| `继续 Issue #N` | 从 Issue、关联 PR、任务文件、Commit、CI 和 Review 恢复 |
| `继续 PR #N` | 从 PR、diff、Commit、CI、Review 和待办恢复，不重复全仓分析 |
| `修复 PR #N 的 CI` | 只聚焦失败日志、本批提交和直接相关代码 |
| `检视 PR #N` | 按五轴 Review，默认不修改代码 |
| `收尾 PR #N` | 对照验收标准、任务看板、测试、CI、文档和风险完成交付检查 |
| `汇报进度` | 立即输出完整任务看板 |
| `只看未完成` | 只显示进行中、阻塞、失败和待处理任务 |

能从仓库、Issue、PR 或已有上下文确定的信息，不得再次要求用户填写。

### 11.2 长任务必须建立任务看板

满足以下任一条件时视为长任务：

- 需要读取多个目录或文件；
- 包含 3 个以上执行步骤；
- 需要修改、提交或验证代码；
- 需要综合 Issue、PR、CI 或 Review；
- 执行过程中存在失败、阻塞或范围变化。

任务开始时必须先建立动态看板，状态统一使用：

- ✅ 已完成：结果已生成并完成必要验证；
- 🔄 进行中：当前执行中，或已修改但尚未验证；
- ⏳ 待处理：尚未开始；
- ⚠️ 阻塞：因权限、信息、依赖、CI 或技术问题无法继续；
- ❌ 失败：执行失败且尚未修复；
- ⏭️ 已跳过：确认无需执行，并说明原因。

同一时间原则上只保留一个主要任务为“🔄 进行中”。代码已修改但未验证时不得标记完成。

### 11.3 反馈节奏

默认使用“标准模式”：

1. 开始时输出首次任务看板；
2. 每完成 2～3 个关键任务更新一次；
3. 出现高风险、CI 失败、测试失败、权限阻塞、范围扩大或关键决策时立即反馈；
4. 完成时输出最终看板、修改文件、Commit / PR、验证结果、风险和未完成项。

用户可以切换：

- `安静模式`：只反馈首次看板、阻塞和最终结果；
- `标准模式`：每完成 2～3 个关键任务反馈；
- `密集模式`：每完成一个关键任务反馈；
- `暂停反馈`：继续执行但暂停过程消息。

禁止虚构进度、剩余时间或无依据的完成百分比。

### 11.4 任务拆解与范围控制

任务必须可独立验证，优先使用具体业务动作，例如“增加来源资料分页查询接口”，不要只写“修改后端”。

执行过程中新增任务时，必须说明新增原因、范围变化和风险，不得静默扩大范围。取消的任务应标记为“⏭️ 已跳过”，不得直接从看板删除。

### 11.5 Issue 实现强制启动门禁

收到 `实现 Issue #N` 时，必须依次完成以下步骤：

1. 重新读取 `main` 最新版 `AGENTS.md` 和 `docs/ai/issue-execution-governance.md`；
2. 读取 Issue 正文、全部评论，并搜索已有 PR、分支、Commit、CI 和 Review；
3. 建立 `tasks/issue-<N>-execution.md`，写入任务看板、验证方案、风险和恢复检查点；
4. 从最新 `main` 创建或恢复 `agent/issue-<N>-<slug>` 远程分支；
5. 在修改业务代码前，先提交任务执行文件；
6. 立即创建 Draft PR，关联 Issue，并填写任务看板、当前进行中、验证结果和恢复检查点；
7. Draft PR 创建成功后，将真实分支和 PR 链接评论回 Issue。

Gate 1～7 未全部完成前，禁止修改业务代码。不得只在 Issue 评论中声明“计划创建”的分支或 PR。

默认一个 Issue 对应一个 Draft PR。拆分多个切片时，每个 PR 使用 `Refs #N`，最终完整交付 PR 使用 `Closes/Fixes/Resolves #N`。

详细启动顺序、历史任务补救和合入门禁见 `docs/ai/issue-execution-governance.md`。

### 11.6 Draft PR、Issue 回写与恢复检查点

每完成一个原子任务，必须形成独立 Commit，并同步更新：

- `tasks/issue-<N>-execution.md`；
- Draft PR 当前任务看板；
- 验证与 CI 结果；
- 已知风险；
- 下一步最小任务；
- 页面中断后的恢复检查点；
- 北京时间的最后更新时间。

Issue 在开始实现、发生阻塞、完成重要阶段和最终合入时回写评论，不承载每个文件级细节。

页面中断或新开会话后，按以下顺序恢复：

1. `main/AGENTS.md` 和 Issue 执行规范；
2. 关联 Issue 及评论；
3. Draft PR 描述；
4. `tasks/issue-<N>-execution.md`；
5. 当前 diff 与 Commit；
6. CI 状态；
7. Review 意见；
8. 下一步最小任务。

已经开始但缺少 Draft PR 或任务看板的历史 Issue，必须先暂停业务代码，反向补齐任务文件、Draft PR、Issue 关联和恢复检查点，再继续实现。

恢复时以 GitHub 实际状态为准，禁止重复执行已完成的修改。

### 11.7 自动治理检查

分支名符合以下格式的 PR：

```text
agent/issue-<N>-*
feature/issue-<N>-*
fix/issue-<N>-*
```

由 `.github/workflows/issue-delivery-governance.yml` 检查：

- 是否关联同一 Issue；
- 是否包含有效任务看板；
- 是否包含当前进行中、恢复检查点和验证结果；
- 是否仍保留未替换的模板占位内容。

自动检查只验证结构，不能替代代码 Review 和验收。建议将该检查配置为 `main` 分支保护的必需状态检查。

### 11.8 时间展示规则

所有面向用户的时间统一使用北京时间：

- 标准时区：`Asia/Shanghai`；
- UTC 偏移：`UTC+8`；
- 展示时明确标注“北京时间”；
- GitHub、CI、日志或第三方接口返回 UTC 或其他时区时，先转换为北京时间再汇报；
- 排查问题需要保留原始时间时，可同时展示原始时间，但必须明确标注各自时区；
- 日期存在歧义时使用完整年月日，不只使用“今天、明天、昨天”等相对表达。

详细规则见：`docs/ai/time-display-standard.md`。