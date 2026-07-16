# Issue #305 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/305
- 工作分支：`agent/issue-305-culture-release-gate`
- 所属总控：#291
- 串行基线：#300、#304 已合入 `main`

## 实现范围

- 抽取并测试页面 Tab、唯一主操作、独立编辑目标和移动端样式类映射；
- 扩展 `test:culture-shell` 覆盖页面模式模型；
- 更新迁徙与场所 E2E 的短 Tab 名和业务 Drawer 标题断言；
- 增加跨 Tab 主操作、非活动请求隔离和 URL 切换用例；
- 增加 390 × 844 三类响应式记录视图、无横向滚动和 44 px 主操作断言；
- 保留既有文化资料、迁徙、场所编辑、权限最小披露和技术 ID 禁止展示断言；
- 新增独立 `Culture Page Gate` 工作流，实际运行 shell、TypeScript、构建和 Chromium E2E；
- 失败时上传 Playwright、测试结果和 Vite 日志，不删除或跳过断言。

## 已知边界

- #293 文化资料独立编辑页尚未实现，文化资料 E2E 继续验证当前维护入口；本 Issue 不伪造其完成状态，也不关闭 #293；
- 本工作流仅聚焦宗族文化页面，不配置为跨模块全量 E2E Required Check；
- 不修改 API、数据库、权限或审核业务规则。

## 准出命令

- `npm run test:culture-shell`
- `npm run test:culture`
- `npm run typecheck`
- `npm run build`

## 最终证据

等待 PR 自动门禁完成后回填 workflow run、失败修复和合入 Commit。
