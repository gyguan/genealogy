# Issue #918 执行记录

## 目标

建立全量样式债精确基线和只减不增门禁，替换历史宽松数量阈值。

## 完成项

- [x] 新增全仓 CSS 审计脚本。
- [x] 建立机器可读基线策略与参考 commit。
- [x] 记录精确 file/context/selector/property/value 条目。
- [x] 覆盖 important、固定系统色、原生控件、无作用域 Ant、全局业务和 Legacy/Prototype。
- [x] 建立 base/HEAD 精确差异门禁，阻止位置偷换。
- [x] 建立具备 owner、原因、tracking issue、review date 和退出条件的例外格式。
- [x] 通过 GitHub API 验证例外 tracking issue 处于 open 状态。
- [x] 新增 PR、Push、每周和手工全量审计工作流。
- [x] 输出 JSON、Markdown、Job Summary 与 30 天 Artifact。
- [x] 编写治理与本地运行文档。

## 验证

- [ ] Style Debt Audit
- [ ] DOM/CSS Governance
- [ ] TypeScript Typecheck
- [ ] Production Build
