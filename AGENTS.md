# Genealogy AI Engineering Rules

本文件是 `gyguan/genealogy` 仓库的全仓最高级规则入口。开始任务前必须先读取本文件，再按任务范围读取当前目录最近的 `AGENTS.md`、规范目录和模块 README。

## 1. 规则优先级

规则关键词：

- **必须 / MUST**：不满足时不得继续。
- **应当 / SHOULD**：默认遵守；偏离时在 PR 中说明原因、影响和补偿措施。
- **可以 / MAY**：按任务实际情况选择。

优先级：

```text
P0 全仓安全与业务红线
  > 已批准的 Issue 验收标准 / Spec
  > P1 交付与质量门禁
  > 当前目录最近的 AGENTS.md
  > 专项规范中的 P2 工程规则
  > P3 经验、示例和推荐实践
```

目录级规则和专项文档不得覆盖或降低 P0。完整规范权威目录见 `docs/standards/README.md`。

## 2. 规则维护原则

1. 同一强制规则只能有一个权威定义。
2. 上层文件只保留摘要与链接，不复制下层完整规则。
3. `AGENTS.md` 承载强制规则；专项规范承载具体领域规则；经验文档承载原因、阈值和示例；README 承载工程与模块导航。
4. 规则变更应修改权威文件，其他入口只维护链接和必要摘要。
5. 新增规范前先检查 `docs/standards/README.md`，避免建立重复规则体系。

## 3. P0：安全与业务红线

任何任务都必须遵守：

1. **人物和关系分离**：不得用简单 `parentId` / `spouseId` 替代独立 `relationship` 模型。
2. **正式数据不得直接修改**：人物、关系、来源绑定等关键正式数据必须走 `revision → review_task → approve/reject → apply`。
3. **审核员不得自审**：提交人与审核人不能是同一责任主体。
4. **权限以后端为准**：前端控制不能替代后端鉴权和数据范围校验。
5. **支派范围必须受控**：支派负责人只能管理授权支派及允许的下级范围。
6. **在世人员默认保护**：联系方式、住址、照片、证件材料等默认脱敏或限制访问。
7. **来源证据必须可追溯**：人物、关系、支派、字辈等关键对象应支持来源绑定。
8. **导入不得直入正式库**：导入数据先进入草稿或批次，校验后再提交审核。
9. **Tree 模块只做查询**：世系图谱查询不得承载正式数据修改逻辑。
10. **不得泄露敏感信息**：禁止提交 `.env`、密钥、Token、真实隐私数据或生产敏感数据。
11. **不得删除、弱化或跳过测试来通过构建**。
12. **不得直接向 `main` 写入业务变更**。

## 4. P1：交付与质量门禁

### 4.1 标准闭环

非平凡变更遵循：

```text
DEFINE → PLAN → BUILD → VERIFY → REVIEW
```

- DEFINE：明确目标、范围、非目标、成功标准和风险。
- PLAN：拆分为可独立验证的任务或垂直切片。
- BUILD：遵循现有模块边界和同类模式。
- VERIFY：执行与改动相关的测试、构建、契约和静态检查。
- REVIEW：检查 Correctness、Readability、Architecture、Security、Performance。

### 4.2 Issue 创建与实现

- 创建、拆分 Issue：遵循 `docs/ai/issue-creation-standard.md`。
- 判断流程、契约、验证和拆分强度：遵循 `docs/ai/issue-delivery-cost-experience.md`。
- 实现、恢复和收尾 Issue：遵循 `docs/ai/issue-execution-governance.md`。
- 聊天式长任务和任务看板：遵循 `docs/ai/chat-driven-github-workflow.md`、`docs/ai/task-duration-standard.md`。

最低门禁：从 `main` 最新现场开始；使用独立分支和 PR；保留可恢复检查点；完成相关验证；满足门禁后合入 `main`；回写 Issue 和最终结论。

### 4.3 API 契约

API 变更必须 Contract First：先更新 `docs/api/openapi.json`，生成并校验前端契约，再实现后端与前端。不得通过前端兼容逻辑掩盖接口、权限、隐私或审核语义不一致。

### 4.4 完成判定

任务只有同时满足以下条件才可标记完成：

- 目标产物已提交，Diff 无无关修改；
- 必要测试和文档已补充或更新；
- 可执行的相关验证已通过；
- 满足 Issue / Spec 验收标准；
- PR 风险、验证、恢复点和实际耗时已同步；
- 实现型 PR 已合入 `main`，或明确记录真实阻塞。

代码已修改但未验证时，状态仍为“进行中”。

## 5. P2：全仓默认规则

1. 模块化单体优先，新增能力遵守现有模块边界。
2. 修改文件前读取目标文件；新增实现前查找同类模式。
3. 领域规则变化必须同步测试。
4. 列表与大集合查询必须考虑分页、范围、稳定排序、N+1 和硬上限。
5. 正式数据变更、审核、导入、导出和权限调整必须具备操作留痕。
6. 前端不得向普通用户暴露不必要的技术 ID、字段名和敏感数据。
7. 数据库 Schema、依赖、认证权限、审核流程、公共 API、附件或导出变更前，必须形成方案并说明兼容与回滚或补偿策略。
8. 面向用户的时间统一使用 `Asia/Shanghai`（UTC+8）。

详细工程规则：

- 后端：`backend/genealogy-backend/AGENTS.md`
- 前端：`frontend/genealogy-web/AGENTS.md`
- 数据库：`docs/database-development-standard.md`

## 6. 任务路由

按任务选择性读取，禁止无差别加载全部文档：

| 任务类型 | 必读入口 |
|---|---|
| 规范定位 | `docs/standards/README.md` |
| Issue 创建、拆分 | `docs/ai/issue-creation-standard.md` |
| Issue 实现、恢复 | `docs/ai/issue-execution-governance.md` |
| API 变更 | `docs/api/openapi.json`、`docs/07-api-design.md` |
| 数据模型、领域规则 | `docs/03-domain-model.md` |
| 架构、模块边界 | `docs/04-technical-architecture.md`、`docs/08-backend-structure.md` |
| 权限、隐私、审计 | `docs/09-permission-management.md` |
| 后端代码与数据库 | 后端 `AGENTS.md` 与工程 README |
| 前端页面与组件 | 前端 `AGENTS.md`、设计规范与 Feature README |
| 时间与时区 | `docs/ai/time-display-standard.md` |

## 7. Ask First

以下变更必须先说明方案、影响和回滚或补偿方式：

- 数据库 Schema 或 Flyway 迁移；
- 新增或升级依赖；
- 认证、权限、隐私、附件、导入导出逻辑；
- 公共 API、统一响应或兼容窗口；
- 审核流程和正式数据生效路径；
- 世系图谱核心数据结构；
- 删除历史入口、兼容逻辑或数据迁移路径。

## 8. Never Do

禁止：

- 不读现有代码直接重写模块；
- 静默扩大任务范围；
- 未更新 OpenAPI 就修改公共接口；
- 只在前端实现权限控制；
- 绕过审核修改正式数据；
- 创建无统一目标、顺序和依赖关系的零散 Issue；
- 实现型任务缺少分支、PR 或恢复检查点；
- 满足合入门禁后让 PR 长期悬挂；
- 仅凭聊天记忆恢复任务；
- 将未验证修改标记为完成；
- 隐藏失败、阻塞、风险或基线问题；
- 事后猜测或补造任务耗时。

## 9. 验证摘要

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
