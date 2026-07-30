# Ant Design 样式治理二期视觉准出

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

1440px 额外输出以下稳定局部截图：

- Header
- QueryBar
- Form
- Table
- Statistic Card

## 截图更新和审批流程

1. PR 触发 `Visual Release Gate`。
2. 从 `visual-release-gate-evidence` artifact 下载截图和 Playwright 报告。
3. 变更作者逐项审视四档全页截图和五类局部截图。
4. 视觉变化必须在 PR 描述中说明原因、影响页面和预期差异。
5. 评审人确认变化符合 Ant Design Token、组件语义和响应式规范后方可合入。
6. 未说明的间距、颜色、字号、遮挡或溢出变化视为回归，需要修复而不是直接接受。

全页截图用于人工准出证据，不做脆弱的全页像素比较；局部截图聚焦稳定组件区域，便于后续引入审批型基线比较。

## 业务视觉例外

以下区域不执行严格像素一致性，但仍执行结构和溢出检查：

- 宗族文化内容视觉；
- 世系图谱画布、节点和连线；
- 商业认证品牌展示区。

## 准出门禁

- DOM/CSS Governance
- TypeScript Typecheck
- Production Build
- Chromium 四档结构回归
- 多浏览器结构兼容验证
- 可下载的截图和测试报告 artifact
