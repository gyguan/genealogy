# Issue #879 执行看板

- Issue：#879 `[前端样式治理 P0-01] 统一 Ant Design Token 与全局排版基线`
- 分支：`agent/issue-879-design-token-baseline`
- 目标：建立全站唯一的 Ant Design Token、字体、排版和数字展示基线。
- 非目标：全局 CSS 污染清理、具体业务页面迁移、删除 `antd-bridge.css`、暗色主题。
- Issue 类型：跨模块前端样式基线治理
- 流程强度：标准
- 契约强度：不涉及
- 验证强度：自动门禁 + 全量前端构建
- 拆分结论：已从总控 #877 独立拆分，本 Issue 只承担设计基线。

## 任务

- [x] 统一 ConfigProvider 字体、字阶、行高、文字色和组件 Token
- [x] 建立独立 `design-system.css` 全局排版基线
- [x] 为 Statistic、Table 和业务数字启用 `tabular-nums`
- [x] 确保 `:root` 不维护主题颜色和页面背景
- [ ] CI 验证：typecheck、build、dom-governance
- [ ] Review、合入 main 并回写 Issue

## 风险

- 历史样式仍可能覆盖部分基线，相关污染清理由 #880 负责。
- 本 Issue 不扩大到页面级视觉迁移。

## 恢复检查点

- 当前阶段：代码完成，等待 Draft PR 与 CI
- 最新变更：主题 Token、全局排版 CSS、样式入口
- 下一步最小任务：创建 Draft PR，触发并检查 CI
- 外部等待：CI
- 最后更新时间：2026-07-28（北京时间）
