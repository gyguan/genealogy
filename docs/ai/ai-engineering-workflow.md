# AI 工程流程适配方案

本文档用于把高适配度能力落到 `gyguan/genealogy` 项目研发流程中：

- **工程流程适配度：8.5 / 10**：引入面向 AI Coding Agent 的结构化工程流程，避免大范围无序生成。
- **AI 辅助研发价值：9 / 10**：通过上下文治理、任务拆解、契约优先、测试验证和 Review 门禁，提升 AI 产出稳定性。

---

## 1. 引入原则

本项目不把 `agent-skills` 当业务依赖或运行时框架，而是吸收其工程方法，沉淀为项目内规则：

```text
AGENTS.md                 项目级 AI Agent 总规则
docs/ai/                  AI 研发流程、Skill 映射和质量门禁
tasks/                    临时 Spec / Plan / Todo 承载目录
.github/pull_request_template.md  PR 门禁模板
```

核心目标：

1. 让 AI 先理解业务边界，再写代码。
2. 让 AI 按小任务推进，而不是一次性生成大模块。
3. 让 API、前端、后端、文档保持一致。
4. 让权限、隐私、审核、证据链等高风险能力有强约束。
5. 让 PR 可以被人和 AI 一起 Review。

---

## 2. 标准工作流

```text
需求输入
  ↓
DEFINE：澄清需求与成功标准
  ↓
PLAN：拆分任务与依赖顺序
  ↓
BUILD：按垂直切片实现
  ↓
VERIFY：执行测试、构建、契约检查
  ↓
REVIEW：五轴质量检查
  ↓
MERGE：合入并同步文档
```

---

## 3. DEFINE：需求定义

### 触发条件

出现以下任意情况，必须先 DEFINE：

- 新增或修改业务流程
- 涉及两个以上模块
- 修改 API 契约
- 修改数据库结构
- 修改权限、隐私、审核、导入导出、附件上传
- 修改世系图谱或关系推导逻辑

### 输出要求

```markdown
## 目标
说明本次要解决什么问题，面向哪个角色。

## 业务场景
说明用户如何触发、如何使用、如何完成闭环。

## 成功标准
列出可验证条件，避免“优化一下”“改好看点”这类模糊描述。

## 影响范围
列出涉及模块、接口、页面、表结构、测试。

## 假设与待确认
明确 AI 做出的假设，避免静默补全。
```

### Genealogy 示例

```markdown
## 目标
人物录入页面中，支派字段由支派 ID 改为支派名称选择器，降低采集员误填概率。

## 成功标准
- 页面不再要求用户手工输入 branchId。
- 支派选择器展示支派名称和层级。
- 提交给后端时仍使用 branchId。
- 没有支派时给出明确空态和引导。
```

---

## 4. PLAN：任务拆解

### 拆解原则

优先使用垂直切片：

```text
数据 / 接口契约 → 后端实现 → 前端调用 → 页面交互 → 测试验证
```

不要采用横向铺开：

```text
一次性建所有表 → 一次性写所有接口 → 一次性写所有页面
```

### 任务模板

```markdown
## Task N：任务名称

**Description**
本任务完成什么业务闭环。

**Acceptance Criteria**
- [ ] 条件 1
- [ ] 条件 2
- [ ] 条件 3

**Verification**
- [ ] 后端测试：`cd backend/genealogy-backend && mvn test`
- [ ] 前端类型检查：`cd frontend/genealogy-web && npm run typecheck`
- [ ] 前端构建：`cd frontend/genealogy-web && npm run build`
- [ ] API 契约检查：`cd frontend/genealogy-web && npm run api:check`

**Files likely touched**
- `docs/api/openapi.json`
- `backend/genealogy-backend/...`
- `frontend/genealogy-web/...`

**Risk**
说明权限、隐私、审核、数据一致性、性能等风险。
```

---

## 5. BUILD：垂直切片实现

### 推荐顺序

| 类型 | 实现顺序 |
|---|---|
| 新业务页面 | 页面草图 → API 契约 → 后端实现 → 前端接入 → 状态处理 |
| 新领域规则 | 规则说明 → 单元测试 → Domain Service → Application Service → Controller |
| 新接口 | OpenAPI → DTO → Controller → Service → 前端生成类型 → 前端调用 |
| 新权限能力 | 权限矩阵 → 后端鉴权 → 审计日志 → 前端权限态展示 |
| 新导入能力 | 文件校验 → 预览 → 草稿批次 → 错误明细 → 提交审核 |

### 实现约束

1. 每次只实现一个可验证闭环。
2. 修改 API 时不能只改前端兼容逻辑。
3. 修改正式数据必须经过审核模型。
4. 修改权限时必须补后端鉴权，不得仅前端隐藏按钮。
5. 修改世系图谱时必须考虑数据量、递归深度和节点裁剪。

---

## 6. VERIFY：验证策略

### 后端验证

```bash
cd backend/genealogy-backend
mvn test
```

重点覆盖：

- 关系重复校验
- 父母 / 配偶 / 继嗣 / 出嗣 / 兼祧等关系类型
- 审核流状态变更
- 支派范围权限
- 在世人员脱敏
- 导入校验
- 来源绑定

### 前端验证

```bash
cd frontend/genealogy-web
npm run typecheck
npm run build
npm run api:check
```

重点覆盖：

- 表单必填与错误态
- 支派选择器
- 人物录入草稿态
- 审核中心操作
- 来源绑定
- 世系图谱空态 / 加载态 / 错误态

### API 契约验证

如果修改 `docs/api/openapi.json`，必须执行：

```bash
cd frontend/genealogy-web
npm run api:generate
npm run api:check
```

---

## 7. REVIEW：五轴质量门禁

### 7.1 Correctness 正确性

- 是否满足 Spec 和验收标准？
- 是否覆盖异常路径？
- 是否处理空值、重复、越权、状态不匹配？
- 是否保留正式数据审核约束？

### 7.2 Readability 可读性

- 命名是否使用业务语言？
- 是否避免 `temp`、`data`、`result` 等弱语义变量？
- 是否把复杂判断抽成领域方法？
- 是否避免大文件继续膨胀？

### 7.3 Architecture 架构一致性

- Controller 是否过重？
- Application Service / Domain Service / Repository 职责是否清晰？
- 前端页面是否复用 Ant Design 和 `shared/ui`？
- API、OpenAPI、前端生成类型、后端实现是否一致？

### 7.4 Security 安全与隐私

- 后端是否做权限校验？
- 在世人员、来源附件、导出数据是否受控？
- 文件上传是否限制类型、大小和权限？
- 是否避免敏感信息进入日志？

### 7.5 Performance 性能

- 列表是否分页？
- 是否存在 N+1 查询？
- 世系查询是否有深度或数量边界？
- 前端是否存在不必要重复请求或大对象渲染？

---

## 8. PR 交付要求

每个 PR 至少说明：

1. 本次变更对应哪个需求或任务。
2. 影响哪些模块。
3. 是否修改 API 契约。
4. 是否涉及权限、隐私、导入导出、附件、审核。
5. 执行了哪些验证命令。
6. 是否更新了相关文档。

PR 模板见：`.github/pull_request_template.md`。

---

## 9. 推荐日常用法

### 场景一：新功能开发

```text
读 docs/01 + 相关领域文档
  ↓
写 tasks/spec.md
  ↓
写 tasks/plan.md + tasks/todo.md
  ↓
按任务逐个实现
  ↓
执行验证命令
  ↓
按 PR 模板提交
```

### 场景二：Bug 修复

```text
复现问题
  ↓
定位影响模块
  ↓
补回归测试或最小验证用例
  ↓
修复代码
  ↓
验证失败路径和正常路径
  ↓
Review 是否引入结构性复杂度
```

### 场景三：页面改造

```text
读 docs/10 前端规范
  ↓
确认 Ant Design 组件方案
  ↓
确认 API 契约
  ↓
实现页面状态：加载态 / 空态 / 错误态 / 成功态
  ↓
执行 typecheck + build
```

### 场景四：API 改造

```text
更新 docs/api/openapi.json
  ↓
运行 npm run api:generate
  ↓
实现后端接口
  ↓
更新前端调用
  ↓
运行 npm run api:check
```

---

## 10. 后续增强方向

短期优先：

- 补齐 `tasks/spec.md`、`tasks/plan.md`、`tasks/todo.md` 模板。
- 为权限、审核、关系校验补充后端测试模板。
- 为 API 契约增加 CI 检查。
- 为 PR 增加 AI Review Prompt。

中期增强：

- 将关键业务不变量固化为测试用例。
- 将 OpenAPI 生成结果纳入 CI。
- 对世系图谱增加性能基准样例。
- 对导入导出增加敏感字段脱敏测试。
