# Issue #583 执行任务看板

## Issue

- 链接：https://github.com/gyguan/genealogy/issues/583
- 前置：#581 已合入 `e793447249d19f728d187aef808f31497dc830dc`
- 前置：#582 已合入 `a5d0f65cbc8450ee57327460fade906bbf636017`
- 目标：统一管理页面草稿删除入口、确认交互和删除后刷新行为。

## 实现范围

- 新增共享前端草稿删除判定、`allowedActions` 判定和确认文案模型。
- 人物列表和人物详情：草稿人物展示删除入口。
- 人物详情亲属关系：草稿关系展示删除入口。
- 字辈方案：草稿方案展示删除入口并调用 #581 新增 DELETE API。
- 来源资料：打开草稿来源详情时展示删除操作，同时校验状态和后端 `canDelete` 权限。
- 宗族：建谱向导展示当前空草稿宗族删除入口；存在支派时由后端阻止。
- 支派：复核确认现有实现已经只对草稿展示删除入口，继续复用。
- 文化资料、迁徙事件、文化场所：复核确认现有页面严格按后端 `allowedActions` 展示 `delete / request_delete`，继续复用 #582 返回语义。
- 统一 Ant Design 二次确认、提交中保护、真实错误提示和删除成功后的列表/详情刷新。

## 非目标

- 不增加批量删除。
- 不改变页面总体布局。
- 不在 Tree 图谱增加写操作。
- 不在前端替代后端权限与状态校验。
- 不新增数据库或后端接口。

## 交付分级

- Issue 类型：多页面前端联动。
- 流程强度：标准。
- 契约强度：复用 #581 generation 契约和现有 API。
- 验证强度：前端模型测试、TypeScript、生产构建、API Contract、Culture E2E、Tree 边界检查。
- 拆分信号：已由 #580 拆分，本 Issue 为最后接入切片。
- 活跃耗时：约 35 分钟，覆盖页面盘点、共享组件、核心对象接入、来源入口、测试和 diff。
- 外部等待：远程 CI / E2E 单独记录，不计入活跃耗时。

## 原子任务

| 序号 | 任务 | 状态 | 结果 / Commit |
|---:|---|---|---|
| 1 | 盘点现有页面删除入口与 API | ✅ 已完成 | 支派和三类文化对象已有正确入口；人物、关系、字辈、来源、宗族需要补齐 |
| 2 | 新增共享草稿删除模型 | ✅ 已完成 | `draftDeleteModel` + `DraftDeleteButton`；空 `allowedActions` 仍为权威禁止结果 |
| 3 | 核心主数据页面接入 | ✅ 已完成 | 人物列表/详情、关系、字辈、来源、空草稿宗族；支派复用原实现 |
| 4 | 文化页面动作对齐 | ✅ 已完成 | 页面已按 `allowedActions` 工作，复用 #582 后端收敛，无重复改造 |
| 5 | 测试、CI、Review 与合入 | 进行中 | Frontend CI、API Contract 成功；Culture E2E 执行中；无未解决 Review |

## 关键实现

- `DraftDeleteButton`：统一危险按钮、确认弹窗、提交中保护、成功/失败反馈和回调。
- `draftDeleteModel`：有 `allowedActions` 时以后端返回为唯一事实源；无动作字段的旧对象才回退到 `status == draft`。
- 人物列表删除后保持当前查询条件并刷新当前页；人物详情删除后清理 Workspace 人物上下文并返回列表。
- 草稿关系删除后仅刷新亲属关系分区。
- 字辈方案删除后刷新方案列表；若删除的是当前维护方案，同时关闭明细弹窗并清理选中状态。
- 来源删除后清理 URL 和 Workspace 中失效的 `sourceId`，触发来源页面重新加载。
- 空草稿宗族删除后清理宗族、支派、人物、来源、关系和审核上下文。
- 文化资料、迁徙事件、文化场所保持现有治理弹窗：草稿 `delete`，正式对象 `request_delete`。

## 验证结果

- Frontend CI / Frontend Typecheck and Build：✅ success（run #1063）。
  - `Test draft delete model`：✅ success。
  - 现有向导、人物、导入、工作台模型测试：✅ success。
  - TypeScript：✅ success。
  - Production Build：✅ success。
- API Contract：✅ success（run #1463）。
- Culture Page Gate：壳测试、TypeScript、Build、Chromium 安装和前端启动已通过；E2E 执行中。
- Tree 边界：✅ 未修改任何 `features/tree` 文件，CI 检测结果为未触发 Tree 变更，Tree 测试按规则跳过。
- PR diff：✅ 仅前端、CI 和任务看板；无后端、数据库或 Tree 文件。
- 未解决 Review：无。

## 恢复检查点

- 当前 Issue：#583
- 当前分支：`agent/issue-583-draft-delete-ui`
- 当前 Draft PR：#586
- 最后完成任务：全部页面接入和 Frontend/API 门禁
- 当前任务：Culture E2E 与 PR 合入收尾
- 最新业务 Commit：`dc146aac9abc37b1920f953f3e905b6c9de6e3a1`
- CI 状态：Frontend/API 成功，Culture E2E 执行中
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：确认最新提交的远程门禁后标记 Ready 并合入 main
- 最后更新时间：2026-07-21（北京时间）
