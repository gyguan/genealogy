# Ant Design 视觉准出与截图基线

## 覆盖范围

1280、1366、1440、1920 四档桌面视口覆盖以下八类代表页面：

1. 首页 Dashboard
2. 建谱向导复杂表单
3. 人物档案列表与查询
4. 修谱工作台主从布局
5. 世系图谱及 Drawer 容器
6. 来源资料库卡片列表
7. 数据导入与进度区域
8. 成员与权限配置

每个页面验证：

- 页面和文档无横向溢出；
- Header、内容区和关键操作保持在视口内；
- Form、Table、Card、Upload、Drawer 容器不越界；
- Header 用户入口可见且可键盘聚焦；
- 每个视口和页面输出全页截图证据。

## Chromium 严格局部截图基线

1440px 下，以下五类稳定区域使用 Playwright `toHaveScreenshot()` 做真实像素差异门禁：

- Header
- QueryBar
- Form
- Table
- Statistic Card

严格差异仅由 Chromium 执行；Edge、Firefox 和 WebKit 继续承担结构与兼容性检查。全页截图仍作为人工审视证据，不做脆弱的全页像素比较。

当前差异策略：

- `threshold: 0.15`，约束单像素颜色差异；
- `maxDiffPixelRatio: 0.001`，最多允许 0.1% 像素差异；
- 禁用动画、过渡和光标闪烁；
- 固定为浅色模式、1440 × 900 视口和 `deviceScaleFactor = 1`；
- 固定系统字体栈、时间和随机数；
- 动态图谱、实时进度、宗族文化内容及商业认证品牌展示区不进入严格局部基线。

未更新基线的颜色、间距、圆角、阴影、字号或组件密度变化会直接导致 Visual Release Gate 失败。

## 基线更新命令

在 `frontend/genealogy-web` 下启动前端后执行：

```bash
npx playwright test e2e/css-desktop-viewport-matrix.spec.ts \
  --project=chromium \
  --grep "approved Chromium visual baselines" \
  --update-snapshots
```

基线文件位于：

```text
e2e/css-desktop-viewport-matrix.spec.ts-snapshots/
```

禁止在没有预期视觉变更的情况下执行并提交 `--update-snapshots`。

## PR 更新和审批流程

视觉基线发生变化时，PR 描述必须包含：

1. 变化原因；
2. 影响页面和组件；
3. 预期变化类型，例如 Token、间距、圆角、阴影或组件密度；
4. 更新的基线文件清单；
5. 对四档全页截图的人工审视结论。

评审人必须确认：

- 变化符合 Ant Design Token 和组件语义；
- 不属于意外 CSS 级联、加载顺序或响应式回归；
- 新旧截图差异与 PR 描述一致；
- 未通过扩大阈值、增加 mask 或缩小截图区域掩盖问题。

未说明的视觉差异必须修复，不能直接接受新基线。

## Artifact

`Visual Release Gate` 始终上传：

- Playwright HTML 报告；
- 实际图、期望图和差异图；
- 四档全页截图；
- 已批准局部基线；
- 前端启动日志。

Artifact 名称为 `visual-release-gate-evidence`，保留至少 14 天。

## 准出门禁

- DOM/CSS Governance
- TypeScript Typecheck
- Production Build
- Chromium 四档结构回归
- Chromium 五类局部截图差异门禁
- 多浏览器结构兼容验证
- 可下载的截图、差异图和测试报告 Artifact
