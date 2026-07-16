# Issue #441 执行看板

- Issue：[#441 完成“数据导入”页面规范收尾整改](https://github.com/gyguan/genealogy/issues/441)
- Draft PR：[#443 完成数据导入规范收尾整改](https://github.com/gyguan/genealogy/pull/443)
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
- 契约强度：复用现有接口，并以可选 `validationStatus`、`warningCount`、`templateVersion` 字段兼容明确语义；本次未修改公共 OpenAPI。
- 验证强度：最简门禁，执行导入聚焦测试、TypeScript、生产构建和 API 契约检查。
- 拆分结论：改动集中于导入特性目录和既有契约，采用单 PR 三个垂直任务推进；未扩大到审核或数据库治理。

## 原子任务

| 任务 | 状态 | 产物 | 验证 | 活跃耗时 |
|---|---|---|---|---|
| T1 预检状态、模板信息与重复确认 | 已完成 | 统一导入工作区、显式预检状态模型 | 聚焦测试、类型检查通过 | 未形成可验证累计值 |
| T2 URL 恢复与 Steps 状态 | 已完成 | Tab/类型/支派/记录筛选分页 URL 状态、Steps 重置 | URL 状态测试、类型检查通过 | 未形成可验证累计值 |
| T3 移动端与任务详情适配 | 已完成 | 预检/执行/记录 Card List、移动端全屏 Drawer | 生产构建通过 | 未形成可验证累计值 |
| T4 验证、Review 与收尾 | 已完成 | CI、diff、PR/Issue 回写 | 最简门禁通过 | 未形成可验证累计值 |

## 测试复用

复用 `import-workspace-progress.ts` 的纯函数测试模式，新增：

- `import-preview-model.test.mjs`
- `import-page-state.test.mjs`
- `import-history-state.test.mjs`

未引入新的测试框架。

## 完成内容

- 三类导入统一复用 `StandardImportWorkspace`，错误阻断和重复确认规则一致。
- 预检不再通过总数差额或 `rawData` 推算警告；仅使用明确状态，兼容旧字段时只映射重复和错误。
- 人物、关系、来源均支持显式重复确认，文件、宗族、支派、类型和重新预检会清空确认状态。
- 页面显示模板版本 `2026.07`、更新时间、格式、编码和大小限制；预检响应包含版本时执行不兼容阻断。
- 主 Tab、导入类型和支派写入 URL，并支持刷新与浏览器前进/后退恢复。
- 导入记录概览的状态、类型、格式、分页和页大小写入 URL。
- 批次创建后重置新建导入流程并跳转执行任务，不再出现 Steps 完成态与上传步骤矛盾。
- 移动端预检、执行任务和导入记录使用 Card List，任务 Drawer 占满视口。
- 原失败修正、重试和提交审核能力保留在高级批次处理区。

## 验证结果

- `npm run test:imports`：通过。
- `npm run typecheck`：通过。
- `npm run build`：通过。
- `npm run api:check`：通过。
- Frontend CI：通过。
- API Contract Check：通过。
- diff 范围：仅导入特性目录、前端测试脚本和本任务看板，无数据库、审核生效或无关页面变更。

## 已知风险与降级

- 当前公共契约未声明 `validationStatus`、`warningCount` 和 `templateVersion`；前端支持这些可选字段，但后端未返回时警告显示为 0，不再通过不可靠规则推算。
- 模板版本不兼容的前端阻断依赖预检响应返回 `templateVersion`；现有接口未返回时仍通过服务端原有表头/字段校验兜底。
- 未执行真实移动设备和真实导入文件联调；已完成响应式代码适配、状态测试、类型检查和生产构建。

## 恢复检查点

- 当前阶段：实现、验证和 Review 完成，准备合入。
- 已完成：T1～T4。
- 最新业务提交：`0910666098083d909fd7ae81fb47535ac1562921`。
- CI：Frontend CI 与 API Contract Check 通过。
- Review：无已知未解决评论。
- 阻塞：无。
- 下一步最小任务：更新 PR 描述、转为 Ready 并合入 `main`。