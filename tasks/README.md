# AI Task Workspace

`tasks/` 目录用于承载 AI 辅助研发过程中的临时 Spec、计划和任务清单。

这些文件不是产品正式文档的替代品，而是单次需求、单个 PR 或单轮 AI 开发会话的工作上下文。

---

## 推荐文件

```text
tasks/spec.md      本次变更的目标、范围、成功标准、风险和假设
tasks/plan.md      实施计划、依赖顺序、技术决策和风险缓解
tasks/todo.md      可执行任务清单，每个任务包含验收标准和验证方式
```

---

## spec.md 模板

```markdown
# Spec: [功能名称]

## Objective

## User / Role

## Background

## Scope

### In Scope

### Out of Scope

## Success Criteria

## Affected Modules

## API Impact

## Data Model Impact

## Security / Privacy Impact

## Verification Plan

## Assumptions

## Open Questions
```

---

## plan.md 模板

```markdown
# Implementation Plan: [功能名称]

## Overview

## Dependency Order

```text
Data / Contract → Backend → Frontend → Verification
```

## Architecture Decisions

## Tasks

### Phase 1: Foundation

### Phase 2: Core Flow

### Phase 3: Verification and Polish

## Risks and Mitigations

## Checkpoints
```

---

## todo.md 模板

```markdown
# Todo: [功能名称]

## Task 1: [任务名称]

**Description**

**Acceptance Criteria**
- [ ] ...

**Verification**
- [ ] ...

**Files likely touched**
- `...`

**Dependencies**
- None

---
```

---

## 使用规则

1. 非平凡变更先写 `tasks/spec.md`，再写代码。
2. 大于一个文件的变更先写 `tasks/plan.md`。
3. 每个任务必须有验收标准和验证方式。
4. PR 合入前根据需要将关键结论同步到 `docs/` 中。
5. 如果任务文件只是临时上下文，PR 合入前可以清理；如果用于解释实现过程，可以随 PR 保留。
