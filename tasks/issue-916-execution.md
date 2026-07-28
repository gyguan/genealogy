# Issue #916 执行记录

## 目标

退出人物档案与世系查询的 Ant Design Bridge，清零 Bridge `!important` 和失效例外台账。

## 完成项

- [x] 新增 Person Feature-owned `person-query-layout.css`
- [x] 将世系查询布局收口到 `lineage-workbench.css`
- [x] 查询布局不再使用 `!important`
- [x] 全局样式入口移除 `antd-bridge.css`
- [x] Bridge 保留为空文件，禁止重新承载运行时规则
- [x] `antd-override-exceptions.json` 清空快照与例外
- [x] 更新 CSS Architecture
- [x] 更新 Style、Ledger、Bridge Ownership 治理测试

## 验证清单

- [ ] DOM/CSS Governance
- [ ] Person focused tests
- [ ] Tree focused tests
- [ ] TypeScript typecheck
- [ ] Production build
- [ ] Visual Release Gate：1280/1366/1440/1920
- [ ] 人物与世系查询移动端单列布局
