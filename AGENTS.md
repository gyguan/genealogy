# Genealogy AI Engineering Rules

本文件是 `gyguan/genealogy` 仓库的**全仓最高级 AI 规则入口**。

Genealogy 是面向宗亲会、修谱委员会、支派负责人、采集员和普通族人的中国式族谱系统。任何 AI Coding Agent 开始任务前，必须先读取本文件，再按任务范围读取目录级 `AGENTS.md` 和专项规范。

---

## 1. 规则语言与优先级

规则关键词：

- **MUST / 必须**：不满足时不得继续执行。
- **SHOULD / 应当**：默认遵守；偏离时必须在 PR 中说明原因、影响和补偿措施。
- **MAY / 可以**：按任务实际情况选择。

| 优先级 | 类型 | 约束 |
|---|---|---|
| **P0** | 安全与业务红线 | 不允许绕过 |
| **P1** | 交付与质量门禁 | 原则上不允许绕过；例外必须显式记录并评审 |
| **P2** | 工程默认规则 | 应当遵守；合理偏离需说明 |
| **P3** | 推荐实践 | 可按任务规模调整 |

规则冲突时按以下顺序处理：

```text
P0 全仓红线
  > 已批准的 Issue 验收标准 / Spec
  > P1 交付门禁
  > 当前目录最近的 AGENTS.md
  > P2 工程默认规则
  > P3 推荐实践与示例
```

Issue、专项文档和目录级规则不得覆盖 P0。目录级 `AGENTS.md` 可以细化根规则，但不得降低根规则约束。

---

## 2. P0：安全与业务红线

以下规则任何任务都必须遵守：

1. **人物和关系分离**：不得用简单 `parentId` / `spouseId` 替代独立 `relationship` 模型。
2. **正式数据不得直接修改**：人物、关系、来源绑定等关键正式数据必须走 `revision → review_task → approve/reject → apply`。
3. **审核员不得自审**：提交人与审核人不能是同一责任主体。
4. **权限以后端为准**：前端控制不能替代后端鉴权和数据范围校验。
5. **支派范围必须受控**：支派负责人只能管理授权支派及其允许的下级范围。
6. **在世人员默认保护**：联系方式、住址、照片、证件材料等默认脱敏或限制访问。
7. **来源证据必须可追溯**：人物、关系、支派、字辈等关键对象应支持来源绑定。
8. **导入不得直入正式库**：导入数据先进入草稿或批次，校验后再提交审核。
9. **Tree 模块只做查询**：世系图谱查询不得承载正式数据修改逻辑。
10. **不得泄露敏感信息**：禁止提交 `.env`、密钥、Token、真实隐私数据或生产敏感数据。
11. **不得删除或弱化测试以通过构建**。
12. **不得直接向 `main` 写入业务变更**。

---

## 3. P1：交付与质量门禁

### 3.1 标准执行闭环

所有非平凡变更必须遵循：

```text
DEFINE → PLAN → BUILD → VERIFY → REVIEW
```

- **DEFINE**：明确目标、范围、非目标、成功标准、风险和假设。
- **PLAN**：拆分为可独立验证的原子任务。
- **BUILD**：一次只推进一个任务或垂直切片。
- **VERIFY**：执行与改动相关的构建、测试、契约或静态检查。
- **REVIEW**：检查 Correctness、Readability、Architecture、Security、Performance。

### 3.2 Issue 实现门禁

执行或恢复 Issue 时，必须遵循 `docs/ai/issue-execution-governance.md`。核心要求：

1. 重新读取 `main` 最新规则和 Issue 全部现场；
2. 创建或恢复 `tasks/issue-<N>-execution.md`；
3. 创建或恢复 `agent/issue-<N>-<slug>` 分支；
4. 在业务代码修改前提交执行检查点；
5. 立即创建并关联 Draft PR；
6. 将真实分支和 PR 回写 Issue；
7. 中断后以 Issue、PR、任务文件、Commit、CI 和 Review 恢复。

以上启动门禁未完成前，不得修改业务代码。历史任务缺少 PR、看板或恢复点时，必须先补齐治理现场。

### 3.3 API 契约门禁

API 变更必须 Contract First：

1. 先更新 `docs/api/openapi.json`；
2. 运行前端契约生成；
3. 再实现后端；
4. 最后更新前端调用。

不得通过前端兼容逻辑掩盖接口不一致，不得绕过统一响应、权限、隐私或审核语义。

### 3.4 验证与完成判定

任务只有同时满足以下条件才可标记完成：

- 目标产物已提交；
- 已检查 diff 且无无关修改；
- 必要测试已补充或更新；
- 可执行的相关验证已通过；
- 满足 Issue / Spec 验收标准；
- PR 看板、风险和恢复检查点已同步。

代码已修改但未验证时，状态仍为“进行中”。

---

## 4. P2：全仓工程默认规则

1. **模块化单体优先**，新增能力先遵守现有模块边界。
2. 修改文件前必须读取目标文件；新增实现前必须查找同类模式。
3. 领域规则变更必须同步测试。
4. 所有列表查询必须考虑分页、过滤、权限范围和 N+1 风险。
5. 正式数据变更、审核、导入、导出和权限调整必须具备操作留痕。
6. 前端不得向最终用户直接暴露不必要的技术 ID，应展示业务名称。
7. 变更数据库 schema、依赖、认证权限、审核流程、公共 API、附件或导出能力前，必须先形成 Spec / Plan 并说明兼容与回滚策略。
8. 面向用户的时间统一使用北京时间：`Asia/Shanghai`（UTC+8）。

后端和前端的详细规则分别由以下目录级文件承载：

- `backend/genealogy-backend/AGENTS.md`
- `frontend/genealogy-web/AGENTS.md`

---

## 5. P3：推荐实践

1. 单个原子任务优先控制在 3～5 个核心文件；超过时重新评估拆分方式。
2. 优先采用可独立 Review 的垂直切片，不一次性生成大面积代码。
3. 每完成一个原子任务，形成独立 Commit 并更新任务看板。
4. 长任务默认每完成 2～3 个关键任务反馈一次；高风险、失败或阻塞立即反馈。
5. 不使用无依据的完成百分比，不虚构剩余时间。

---

## 6. 任务路由与必读文档

按实际任务选择性读取，禁止无差别加载全部文档：

| 任务类型 | 必读规则 / 文档 |
|---|---|
| Issue 实现、恢复 | `docs/ai/issue-execution-governance.md` |
| 聊天式长任务、任务看板 | `docs/ai/chat-driven-github-workflow.md` |
| MVP 主流程 | `docs/01-mvp1-requirements.md` |
| 数据模型、领域规则 | `docs/03-domain-model.md` |
| 架构、模块边界 | `docs/04-technical-architecture.md`、`docs/08-backend-structure.md` |
| API 变更 | `docs/07-api-design.md`、`docs/api/openapi.json` |
| 权限、隐私、审计 | `docs/09-permission-management.md` |
| 前端页面、组件 | `docs/10-frontend-design-guidelines.md`、前端目录级 `AGENTS.md` |
| 后端代码、数据库 | 后端目录级 `AGENTS.md` |
| 时间和时区 | `docs/ai/time-display-standard.md` |

---

## 7. Ask First

以下变更必须先说明方案、影响和回滚方式，再执行：

- 数据库 schema 或 Flyway 迁移；
- 新增或升级依赖；
- 认证、权限、隐私、附件、导入导出逻辑；
- 公共 API、统一响应或兼容窗口；
- 审核流程和正式数据生效路径；
- 世系图谱核心数据结构；
- 删除历史入口、兼容逻辑或数据迁移路径。

---

## 8. Never Do

禁止：

- 不读现有代码直接重写模块；
- 静默扩大任务范围；
- 未更新 OpenAPI 就修改接口调用；
- 只在前端实现权限控制；
- 绕过审核修改正式数据；
- 创建 Issue 分支后不建立 Draft PR 和恢复检查点；
- 会话中断后仅凭聊天记忆继续编码；
- 将未验证的修改标记为完成；
- 隐藏失败、阻塞、遗留风险或基线问题。

---

## 9. 验证命令摘要

后端：

```bash
cd backend/genealogy-backend
mvn test
```

前端：

```bash
cd frontend/genealogy-web
npm run typecheck
npm run build
npm run api:check
```

只执行专项验证时，必须说明未执行全量验证的原因、覆盖范围和已知基线问题。

---

## 10. 专项规范索引

- AI 工程流程：`docs/ai/ai-engineering-workflow.md`
- Issue 实现与恢复：`docs/ai/issue-execution-governance.md`
- 聊天式开发与看板：`docs/ai/chat-driven-github-workflow.md`
- Skill 映射：`docs/ai/skill-mapping.md`
- 提问模板：`docs/ai/prompt-templates.md`
- 时间展示：`docs/ai/time-display-standard.md`
- PR 模板：`.github/pull_request_template.md`
- Issue PR 结构检查：`.github/workflows/issue-delivery-governance.yml`
