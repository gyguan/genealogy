# Issue #441 执行看板

- Issue：[#441 完成“数据导入”页面规范收尾整改](https://github.com/gyguan/genealogy/issues/441)
- 工作分支：`agent/issue-441-import-compliance`
- 目标：完成数据导入页面剩余的预检语义、重复确认、页面状态恢复、模板版本、Steps 和移动端适配。
- 最后更新时间：2026-07-16（北京时间）

## 实现范围

1. 建立明确的预检行状态模型，消除 warning 推算和 rawData 判断。
2. 补齐关系与来源导入的疑似重复确认。
3. URL 化主 Tab、导入类型、支派及导入记录筛选分页。
4. 修复批次创建后 Steps 状态，并补充模板版本展示。
5. 增加移动端任务、记录和预检 Card List，以及移动端全屏 Drawer。

## 非目标

- 不修改导入业务字段定义。
- 不修改正式数据审核和生效流程。
- 不引入新 UI 或全局状态管理依赖。
- 不持久化用户本地文件内容。

## 交付分级

- Issue 类型：导入页面前端治理，含轻量契约确认。
- 流程强度：标准流程。
- 契约强度：优先复用现有接口；只有确认 OpenAPI 缺少明确预检状态时才进行 Contract First 扩展。
- 验证强度：最简门禁，执行导入聚焦测试、TypeScript、生产构建和 API 契约检查。
- 拆分结论：改动集中于导入特性目录和既有契约，采用单 PR 三个垂直任务推进；不扩大到审核或数据库治理。

## 原子任务

| 任务 | 状态 | 产物 | 验证 | 活跃耗时 |
|---|---|---|---|---|
| T1 预检状态、模板信息与重复确认 | 进行中 | 三类导入工作区、状态 helper/契约 | 聚焦测试、类型检查 | 未形成可验证累计值 |
| T2 URL 恢复与 Steps 状态 | 待开始 | ImportPage、导入记录 URL 状态、测试 | URL/状态测试、类型检查 | 未形成可验证累计值 |
| T3 移动端与任务详情适配 | 待开始 | 执行任务、导入记录、CSS | 构建、响应式代码复核 | 未形成可验证累计值 |
| T4 验证、Review 与收尾 | 待开始 | diff、CI、PR/Issue 回写 | 最简门禁 | 未形成可验证累计值 |

## 测试复用

复用 `src/features/imports/import-workbench-state.ts` 及其 Node 测试模式；新增状态、URL 和预检分类 helper 时保持纯函数，避免引入新的测试框架。

## 已知风险

- 现有后端预检 DTO 可能没有 warning 行级字段；不得继续使用推算逻辑，需确认契约后决定 Contract First 扩展或明确降级。
- 导入记录现有状态较多，URL 同步必须避免与工作区宗族/支派切换产生循环更新。
- 移动端 Card List 应复用同一数据与动作，不复制权限或操作判断。

## 验证方案

```bash
cd frontend/genealogy-web
npm run test:import-workbench
npm run typecheck
npm run build
npm run api:check
```

涉及 OpenAPI 时增加 `npm run api:generate` 并检查生成 diff。

## 恢复检查点

- 当前阶段：启动门禁完成，准备创建 Draft PR。
- 已完成：刷新规则、读取 Issue 与评论、确认无关联 PR/分支、创建工作分支和执行看板。
- 当前任务：T1 预检状态、模板信息与重复确认。
- 最新提交：执行看板检查点。
- CI：尚未运行。
- Review：无。
- 阻塞：无。
- 下一步最小任务：创建 Draft PR 并回写 Issue，然后检查预检 OpenAPI 与三类导入实现。