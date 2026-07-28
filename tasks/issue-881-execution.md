# Issue #881 执行看板

- Issue：#881 `[前端样式治理 P1-03] 将修谱工作台迁移到 Ant Design 页面模式`
- 分支：`agent/issue-881-workbench-antd`
- 前置：#880 已完成并合入 main
- 目标：启用正式 Ant Design 修谱工作台，退出 Prototype 页面与样式入口，并补齐独立验收门禁。
- 非目标：不修改工作台 API、领域规则或世系图谱画布。
- 类型：单页面前端重构
- 流程强度：标准
- 验证强度：工作台聚焦测试、DOM/CSS 治理、TypeScript、生产构建

## 原子任务

| 任务 | 状态 | 验收 |
|---|---|---|
| T1 识别正式页面与旧 Prototype 入口 | 已完成 | 明确可复用实现和退出文件 |
| T2 切换模块注册到正式页面 | 已完成 | `editingWorkspace` 渲染 `EditingWorkspacePage` |
| T3 删除 Prototype 页面与样式 | 已完成 | 正式代码不再引用 prototype/proto 类名 |
| T4 更新工作台聚焦测试 | 已完成 | Ant Design、状态和响应式契约可自动验证 |
| T5 CI、Review 与合入 | 进行中 | `test:workbench`、`test:dom-governance`、typecheck、build 通过 |

## 恢复检查点

- 最后完成：正式入口切换、旧文件删除、治理测试更新
- 当前任务：等待 CI 验证
- 阻塞：无
- 下一步：检查失败日志；全部通过后将 PR 标记 Ready 并合入
- 最后更新时间：2026-07-28
