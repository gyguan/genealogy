# Issue #919 执行记录

## 目标

为 Header、QueryBar、Form、Table、Statistic Card 建立稳定 Chromium 局部截图差异基线，并形成受控更新和审批流程。

## 完成项

- [x] 使用 `toHaveScreenshot()` 替代仅生成证据的局部截图。
- [x] 严格截图仅由 Chromium 执行，多浏览器保留结构兼容检查。
- [x] 固定 1440 × 900、device scale、浅色模式、字体、时间和随机数。
- [x] 禁用动画、过渡和光标闪烁。
- [x] 使用 `threshold: 0.15` 和 `maxDiffPixelRatio: 0.001`。
- [x] 保留八类页面 × 四档视口的全页截图证据。
- [x] 文档化基线更新命令、PR 说明和评审审批规则。
- [x] Artifact 上传期望图、实际图、差异图、全页截图和日志，保留 14 天。
- [ ] 生成并提交五张初始 Linux Chromium 基线。
- [ ] 移除首次基线引导步骤，确认 CI 只比较、不自动更新。
- [ ] Visual Release Gate、Multi-Browser Compatibility、TypeScript 和 Build 通过。

## 非目标

- 不对全页做严格像素快照。
- 不对世系动态图谱、实时进度、宗族文化内容和商业认证品牌展示区建立脆弱基线。
