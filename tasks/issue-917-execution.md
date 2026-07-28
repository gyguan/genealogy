# Issue #917 执行记录

## 目标

清理全局 Legacy 与 Prototype CSS 平行体系，使全局入口仅保留具名 Shell、认证和 Shared UI 责任文件。

## 完成项

- [x] 从 `styles/index.css` 移除 `styles.css`、`experience.css`、`compact-ui.css`
- [x] 将紧凑内容间距迁入 `styles/shell/app-shell.css`
- [x] 退役原生 Sidebar button、legacy field/actions、table、modal、toast 视觉体系
- [x] 退役 prototype / xp 全局演示视觉体系
- [x] 保留空文件作为历史路径防回流标记
- [x] 更新 CSS Architecture
- [x] 新增 Legacy CSS / old class 治理门禁
- [x] 接入 `test:dom-governance`

## 验证

- [ ] DOM/CSS Governance
- [ ] Frontend focused tests
- [ ] TypeScript typecheck
- [ ] Production build
- [ ] Visual Release Gate
- [ ] Multi-Browser Compatibility

## 非目标

不修改业务 API、领域模型、权限逻辑，不重设计宗族文化和世系图谱核心视觉。
