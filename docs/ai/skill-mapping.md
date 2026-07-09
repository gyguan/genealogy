# Genealogy AI Skill 映射表

本文档定义 `gyguan/genealogy` 项目中不同研发任务应该启用的 AI 工程 Skill、必须读取的上下文和交付检查点。

> Skill 是工程流程约束，不是运行时依赖。AI 在执行任务时应按需加载，避免一次性加载全部规则造成上下文浪费。

---

## 1. Skill 总览

| Skill | 用途 | 在 Genealogy 中的价值 |
|---|---|---|
| context-engineering | 上下文治理 | 让 AI 精准读取相关文档和源码，避免幻觉和上下文污染 |
| spec-driven-development | 需求定义 | 把“改一下页面/补个功能”转为可验收 Spec |
| planning-and-task-breakdown | 任务拆解 | 把 MVP 功能拆成小的垂直切片 |
| api-and-interface-design | API / 契约设计 | 保证 OpenAPI、后端、前端生成类型和调用一致 |
| frontend-ui-engineering | 前端工程 | 保证 React + Ant Design 页面质量和交互一致性 |
| security-and-hardening | 安全加固 | 约束权限、隐私、附件、导入导出等高风险能力 |
| test-driven-development | 测试驱动 | 固化关系、审核、权限、脱敏等领域规则 |
| code-review-and-quality | 代码评审 | 按正确性、可读性、架构、安全、性能五轴 Review |
| performance-optimization | 性能优化 | 约束世系图谱、列表、导入、大数据量查询性能 |
| documentation-and-adrs | 文档 / ADR | 记录架构决策、接口变更和领域模型调整 |

---

## 2. 任务类型映射

| 任务类型 | 推荐 Skill | 必读上下文 | 关键检查点 |
|---|---|---|---|
| 新增 MVP 主流程功能 | spec-driven-development → planning-and-task-breakdown → incremental-implementation | `docs/01-mvp1-requirements.md`、`docs/03-domain-model.md`、`docs/04-technical-architecture.md` | 是否形成 Spec、Plan、Todo；是否按垂直切片推进 |
| 新增 / 修改 API | api-and-interface-design → test-driven-development → code-review-and-quality | `docs/07-api-design.md`、`docs/api/openapi.json`、前端 API 调用 | 是否先改 OpenAPI；是否运行 `npm run api:check` |
| 修改前端页面 | frontend-ui-engineering → api-and-interface-design → code-review-and-quality | `docs/10-frontend-design-guidelines.md`、相关 `features/*` 源码、API contract | 是否遵守 Ant Design；是否有加载态 / 空态 / 错误态 |
| 修改人物档案 | spec-driven-development → test-driven-development → security-and-hardening | `docs/03-domain-model.md`、`docs/09-permission-management.md` | 是否保护在世人员；是否走审核；是否支持来源绑定 |
| 修改关系管理 | test-driven-development → api-and-interface-design → code-review-and-quality | `docs/03-domain-model.md` | 是否覆盖父母、配偶、继嗣、出嗣、兼祧等关系规则 |
| 修改支派管理 | spec-driven-development → frontend-ui-engineering → security-and-hardening | `docs/01-mvp1-requirements.md`、`docs/09-permission-management.md` | 是否支持多级支派；是否避免界面暴露技术 ID |
| 修改字辈管理 | spec-driven-development → test-driven-development | `docs/03-domain-model.md` | 是否处理宗族级 / 支派级字辈；是否和人物世次关联 |
| 修改来源资料 | security-and-hardening → api-and-interface-design → code-review-and-quality | `docs/03-domain-model.md`、`docs/09-permission-management.md` | 是否区分来源摘要、附件、敏感材料；是否审计 |
| 修改审核中心 | spec-driven-development → test-driven-development → security-and-hardening | `docs/03-domain-model.md`、`docs/09-permission-management.md` | 是否禁止自审；是否保留变更 Diff；是否写日志 |
| 修改成员权限 | security-and-hardening → test-driven-development | `docs/09-permission-management.md` | 是否符合五层权限模型；后端是否做最终鉴权 |
| 修改世系图谱 | performance-optimization → frontend-ui-engineering → test-driven-development | `docs/03-domain-model.md`、`docs/04-technical-architecture.md` | 是否限制深度和数量；是否考虑大图谱性能 |
| 修改导入导出 | security-and-hardening → test-driven-development → api-and-interface-design | `docs/01-mvp1-requirements.md`、`docs/09-permission-management.md` | 导入是否先进草稿；导出是否授权和审计 |
| Bug 修复 | debugging-and-error-recovery → test-driven-development → code-review-and-quality | 失败日志、相关源码、相关测试 | 是否先复现；是否补回归测试；是否验证异常路径 |
| 重构 / 简化 | code-simplification → code-review-and-quality | 目标文件、调用方、测试 | 是否行为保持一致；是否减少概念数量而非搬家 |
| 发布前检查 | shipping-and-launch → code-review-and-quality → security-and-hardening | PR diff、验证结果、风险清单 | 是否具备回滚方案；是否无敏感数据和权限风险 |

---

## 3. 上下文选择规则

### 3.1 不要一次性加载全部文档

错误做法：

```text
把 docs/ 下所有文件都塞给 AI，让 AI 自己找重点。
```

正确做法：

```text
任务是“人物录入支派 ID 改为支派名称选择器”：
- 读取 docs/01-mvp1-requirements.md 中人物和支派相关内容
- 读取 docs/03-domain-model.md 中 person / branch 关系
- 读取 docs/10-frontend-design-guidelines.md 中 Ant Design 约束
- 读取当前人物录入页面源码和支派 API 调用
```

### 3.2 必须先找已有模式

新增代码前，AI 必须先找同类实现：

| 新增内容 | 先找什么 |
|---|---|
| 新页面 | `frontend/genealogy-web/src/features/*` 下同类页面 |
| 新 API 调用 | `frontend/genealogy-web/src/shared/api/client.ts` 和已存在调用 |
| 新后端接口 | 同模块 Controller / Service / Repository |
| 新领域规则 | 现有 Domain Service 或校验逻辑 |
| 新测试 | 同模块已有测试结构 |

---

## 4. 典型任务执行示例

### 4.1 人物录入页面：支派 ID 改为支派名称选择

推荐 Skill：

```text
context-engineering
→ spec-driven-development
→ planning-and-task-breakdown
→ frontend-ui-engineering
→ api-and-interface-design
→ code-review-and-quality
```

任务拆解：

```text
Task 1：确认支派树接口契约
Task 2：前端封装支派选择器
Task 3：人物录入页面替换 branchId 输入框
Task 4：补充空态、加载态、错误态
Task 5：执行 typecheck / build / api:check
```

验收标准：

- 用户看到的是支派名称和层级，不是技术 ID。
- 前端提交仍使用后端需要的 `branchId`。
- 无支派时提示先创建支派。
- 不破坏现有人物草稿保存和提交审核流程。

---

### 4.2 新增来源绑定能力

推荐 Skill：

```text
api-and-interface-design
→ security-and-hardening
→ test-driven-development
→ code-review-and-quality
```

检查点：

- `docs/api/openapi.json` 是否先更新。
- 前端生成的 `api-contract.ts` 是否同步。
- 后端是否校验当前用户对目标对象有权限。
- 来源附件是否按隐私级别控制访问。
- 绑定操作是否进入 operation_log。

---

### 4.3 修改审核流程

推荐 Skill：

```text
spec-driven-development
→ test-driven-development
→ security-and-hardening
→ code-review-and-quality
```

必须验证：

- 不能自审。
- 驳回必须保留原因。
- 审核通过后才 apply 到正式数据。
- 删除正式人物 / 关系必须审核。
- 审核操作写入 operation_log。

---

### 4.4 世系图谱性能优化

推荐 Skill：

```text
performance-optimization
→ frontend-ui-engineering
→ test-driven-development
→ code-review-and-quality
```

必须关注：

- 查询深度限制。
- 节点数量限制。
- 大支派懒加载。
- 前端节点渲染性能。
- 后端递归查询是否可能爆栈或无边界。

---

## 5. AI 输出格式约束

### 5.1 需求阶段输出

```markdown
# Spec: [功能名称]

## Objective

## User / Role

## Scope

## Success Criteria

## Affected Modules

## API / Data Model Impact

## Security / Privacy Impact

## Open Questions
```

### 5.2 计划阶段输出

```markdown
# Implementation Plan: [功能名称]

## Overview

## Dependency Order

## Tasks

## Verification

## Risks
```

### 5.3 Review 阶段输出

```markdown
# Review Result

## Summary

## Required Changes

## Optional Suggestions

## Verification Checked

## Risk Assessment
```

---

## 6. 高风险触发器

出现以下关键词或变更时，必须启用 `security-and-hardening` 和 `code-review-and-quality`：

```text
auth / login / token / role / permission / privacy / living / attachment / upload / download / export / import / review / approve / reject / operation_log / source / sensitive / clan member / branch scope
```

对应中文触发词：

```text
认证 / 登录 / Token / 角色 / 权限 / 隐私 / 在世人员 / 附件 / 上传 / 下载 / 导出 / 导入 / 审核 / 通过 / 驳回 / 操作日志 / 来源 / 敏感 / 宗族成员 / 支派范围
```

---

## 7. 合入前最小检查清单

每个 PR 至少满足：

- [ ] 有明确需求或任务来源。
- [ ] 修改范围足够小，便于 Review。
- [ ] API 变更已更新 OpenAPI 和前端生成类型。
- [ ] 权限 / 隐私 / 审核 / 导入导出 / 附件变更已说明风险。
- [ ] 执行了相关验证命令。
- [ ] 没有把业务规则只放在前端。
- [ ] 没有绕过正式数据审核流程。
- [ ] 没有新增不可解释的大型抽象。
