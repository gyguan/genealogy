# Issue #169 执行记录：文化资料库列表、详情与编辑体验

- Issue：https://github.com/gyguan/genealogy/issues/169
- 实现 PR：https://github.com/gyguan/genealogy/pull/205
- 实现分支：`agent/issue-169-culture-library-ui`
- 主干 squash commit：`1c96998cd3cd1d9b69fb4047945cf60c2c4edee8`
- Issue 状态：✅ `completed`
- EPIC #165：✅ 已勾选 #169
- 下一顺序任务：#170 `[宗族文化 P1-05] 建设结构化迁徙脉络管理`
- 最后更新时间：2026-07-14 21:16，北京时间

## 完成范围

- 将静态 `CultureProductPage` 拆分为页面编排、严格类型 API 服务、URL 状态、业务字典、总览、搜索、分页列表、详情、表单和高风险操作组件。
- 接入文化总览、分页搜索、详情、草稿新增/修改、正式变更申请、提交审核、归档、删除、来源附件和统一 trace。
- 支持关键词、分类、支派、状态、隐私、来源覆盖、精选、排序和分页；筛选与选中对象同步 URL。
- 总览、列表和详情使用独立 request token，避免宗族、筛选或对象切换后旧响应覆盖新状态。
- 详情展示正文、来源摘录、附件、审核摘要和统一追踪时间线，并支持 `culture_item` Tracking 深链。
- 每条记录按后端 `allowedActions` 渲染操作；正式编辑、归档和删除准确展示审核申请语义。
- 归档强制填写原因，删除使用二次确认；403/404 不展示受限对象标题、来源或附件。
- 删除静态堂号/郡望/家训占位、兼容字段轮询和假迁徙路线。
- 修复公共 API Client 对嵌套标准错误响应的解析，避免错误显示为 `[object Object]`。
- 新增长期 Culture Library UI CI 和 Playwright 主路径/安全路径验证。

## 验证结果

- API Contract：✅ run `29335314793`
- Frontend CI：✅ run `29335314862`
- Culture Library UI CI：✅ run `29335314815`
- TypeScript：✅
- Tracking 深链测试：✅
- 生产构建：✅
- Playwright 主路径：✅ URL 恢复、总览、列表、详情、来源附件、trace、正式变更提示、筛选写回和 390px 响应式
- Playwright 安全路径：✅ 403 显示稳定无权限信息且不泄露受限对象身份
- Review：✅ 无提交 Review、无未解决线程
- 合并：✅ PR #205 已 squash 合入 `main`

## 五轴 Review

- Correctness：文化分页、详情、命令、URL 状态和正式变更语义与生成契约及后端行为一致。
- Readability：页面编排、服务、状态、列表、详情、表单和动作对话框职责分离。
- Architecture：复用文化 API、统一 trace、Tracking 深链和公共 API Client，不复制权限或审核逻辑。
- Security：对象级 `allowedActions`、403/404、sealed/private、来源附件和错误反馈执行最小披露。
- Performance：后端分页、旧响应隔离、详情与 trace 并行加载，无前端全量扫描。

## 已知边界

- “新增资料”入口在选择宗族后展示，最终创建权限由后端强制校验；当前契约未提供页面级 `create` action。
- 浏览器测试使用严格契约形状 mock；真实权限、审核与隐私由 #168 的 PostgreSQL/回归门禁保障。
- 富文本、迁徙专题、文化场所和首页改造由后续 Issue 完成。
