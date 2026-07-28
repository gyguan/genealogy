# Issue #880 执行看板

- Issue：#880 `[前端样式治理 P0-02] 清理全局 CSS 污染并收缩 antd-bridge`
- 分支：`agent/issue-880-css-governance`
- Draft PR：#887
- 目标：收缩历史全局选择器，减少 Ant Design 迁移桥接，并建立防止新增污染样式的自动门禁。
- 非目标：不迁移具体业务页面结构，不要求完全删除 `antd-bridge.css`。
- 类型：跨模块 CSS 架构治理
- 流程强度：标准
- 契约强度：不涉及
- 验证强度：DOM/CSS 治理、TypeScript、生产构建和聚焦页面回归
- 前置：#879 已完成并合入 main

## 原子任务

| 任务 | 状态 | 验收 |
|---|---|---|
| T1 盘点高风险全局选择器及实际使用范围 | 已完成 | 明确 `.field/.actions/.data-table/.sidebar button` 的迁移边界 |
| T2 收缩历史选择器并减少 bridge 覆盖 | 已完成 | Ant Form 不再依赖宽泛后代规则反向隔离，bridge 只减不增 |
| T3 建立 `!important` 与 `.ant-*` 覆盖登记 | 已完成 | `antd-override-exceptions.json` 记录 owner、原因和退出条件 |
| T4 扩展 Style Governance 自动门禁 | 已完成 | 新增污染选择器、未登记覆盖或提高 important 上限会失败 |
| T5 验证、Review 与合入 | 进行中 | 治理测试、typecheck、build 通过并合入 main |

## 已完成变更

- 删除 `styles.css` 中与 #879 设计基线冲突的根字体、文字色和背景。
- `.field` 改为排除 Ant Form.Item 的直接子级规则。
- `.actions`、侧栏按钮和旧表格改为直接子级、元素类型及结构约束。
- `antd-bridge.css` 删除根级重复规则、`.antd-field span` 反向修复以及多处非必要 `!important`。
- 新增 Ant Design 覆盖例外登记，并将退出条件关联 #881～#883。
- 扩展 Style Governance，固定 bridge 只减不增并拦截新增全局污染。

## 风险

- 具体页面仍可能使用 legacy class，但不再污染 Ant Design 子树；最终退出由 #881～#883 完成。
- 世系与来源选择态仍保留少量 `!important`，已登记并由 #883 负责退出。

## 恢复检查点

- 最后完成：CSS 源头收缩、bridge 缩减、例外登记和治理测试
- 当前任务：T5 CI 验证与 Review
- 最新提交：`cf18b966d117364b84651c0c1e33bc8adc0cde98`
- 阻塞：无
- 下一步最小任务：检查 PR #887 CI；通过后转 Ready 并合入 main
- 外部等待：GitHub Actions
- 最后更新时间：2026-07-28（北京时间）
