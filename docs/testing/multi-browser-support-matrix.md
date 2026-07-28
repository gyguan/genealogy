# 多浏览器支持矩阵与发布准出

## 范围

本专项在既有 Chromium + PostgreSQL 真实业务链准出的基础上，增加 Chrome/Chromium、Microsoft Edge、Firefox 和 Safari/WebKit 的 UI 与交互兼容回归，并增加典型桌面分辨率和高 DPI 基线。

## 能力分级

| 能力 | Chrome/Chromium | Microsoft Edge | Firefox | Safari/WebKit |
| --- | --- | --- | --- | --- |
| 登录、会话、菜单、URL 和前进后退 | 必须一致 | 必须一致 | 必须一致 | 必须一致 |
| 建谱、人物、关系、审核表单 | 必须一致 | 必须一致 | 必须一致 | 必须一致 |
| 来源附件上传、预览和下载 | 必须一致 | 必须一致 | 必须一致 | 必须一致 |
| 谱册导出与文件内容 | 必须一致 | 必须一致 | 必须一致 | 必须一致 |
| 世系画布、缩放、滚动和节点交互 | 必须可用 | 必须可用 | 必须可用 | 必须可用 |
| 字体、滚动条和系统控件外观 | 允许平台差异 | 允许平台差异 | 允许平台差异 | 允许平台差异 |
| 原生日期、文件选择器外观 | 允许平台差异 | 允许平台差异 | 允许平台差异 | 允许平台差异 |
| 非标准浏览器私有能力 | 不作为依赖 | 不作为依赖 | 不作为依赖 | 不作为依赖 |

允许差异不得影响信息完整性、操作可达性、键盘焦点、提交结果、下载内容或数据安全。

## 自动化门禁

- `Functional E2E`：Chromium、真实 PostgreSQL、真实 Spring Boot 与完整业务链，继续作为功能真实性基线。
- `Multi-Browser Compatibility`：Chromium、Edge、Firefox、WebKit 四项目执行前端兼容测试。
- `Chromium high-DPI and desktop viewport`：设备缩放 2，执行 1920、1440、1366、1280 桌面视口布局检查。
- 每个浏览器项目独立上传 HTML/JSON 报告、日志、Trace、截图和视频。

## 运行环境记录

每次运行在 Artifact 中记录：

- Git Commit 与 GitHub Actions Run；
- Playwright 版本；
- 浏览器项目和安装目标；
- Runner 操作系统与架构；
- 视口 `1440x900`；
- device scale factor；
- 测试日志和失败证据。

## 发布判定

- **通过**：四浏览器项目、高 DPI 项目以及既有 Functional E2E 全部通过，无 P0/P1 浏览器特有缺陷。
- **有条件通过**：仅存在已记录且不影响核心业务的视觉降级，具备明确提示、规避方案和整改 Issue。
- **不通过**：任一浏览器出现无法登录、无法提交、无法审核、文件内容错误、数据丢失、越权、世系画布不可用或严重布局错乱。

## 已知边界

- Linux Playwright WebKit 是 Safari 引擎自动化基线，不等同于 macOS 实机 Safari；正式 Safari 版本声明仍应结合 macOS 人工抽检。
- Edge 项目使用 Playwright 安装的 Microsoft Edge Stable channel。
- 性能压测、专业安全测试和长期稳定性不由本专项替代。
