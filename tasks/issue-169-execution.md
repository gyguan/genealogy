# Issue #169 执行看板：文化资料库列表、详情与编辑体验

- Issue：https://github.com/gyguan/genealogy/issues/169
- 工作分支：`agent/issue-169-culture-library-ui`
- PR：https://github.com/gyguan/genealogy/pull/205
- 目标：将静态宗族文化页面重构为基于真实文化接口、OpenAPI 生成类型和后端 `allowedActions` 的可搜索、可查看、可维护文化资料库。
- 最后更新时间：2026-07-14 21:12，北京时间

## 实现范围

- 将 `CultureProductPage` 拆分为页面编排、类型服务、URL 状态、业务字典、总览、搜索、列表、详情、表单和高风险操作组件。
- 消费 #166～#168 已落地的文化总览、分页列表、详情、草稿维护、提交审核、归档、删除和统一 trace 接口。
- 列表支持关键词、分类、支派、状态、隐私、来源覆盖、精选、分页和排序。
- 筛选、分页、排序和选中对象同步 URL；列表、总览和详情请求使用序列号隔离旧响应。
- 详情展示基本信息、正文、来源、附件、审核摘要和统一追踪时间线。
- 新增/编辑支持保存草稿、驳回后修改和正式变更申请；提交审核、归档和删除展示真实影响与后端限制。
- 完整处理加载、空、错误、无权限、提交中和重复提交状态。
- 删除静态堂号/家训占位、兼容字段轮询和假迁徙路线。
- 修复公共 API Client 对嵌套标准错误响应的解析，避免显示 `[object Object]`。
- 使用 Ant Design、OpenAPI 生成类型和业务中文映射，不展示技术 ID。

## 非目标

- 不实现迁徙专题和文化场所专题页面，由 #170、#171 完成。
- 不改造族谱首页，由 #172 完成。
- 不新增数据库迁移、后端权限规则或第三方富文本编辑器。
- 不通过前端推断审核状态、权限范围或 sealed 对象存在性。

## 执行任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、前置实现和现有文化页面 | ✅ 已完成 | 约 12 分钟 | 已读取根/前端规则、执行治理、设计规范、#169、生成契约、API Client 和静态页面；确认无分支/PR |
| 2 | 建立分支、执行看板、Draft PR 和 Issue 回写 | ✅ 已完成 | 约 5 分钟 | 分支、看板、Draft PR #205 和 Issue 启动评论已建立 |
| 3 | 建立文化 API 服务、业务字典与 URL 状态模型 | ✅ 已完成 | 约 18 分钟 | 生成类型驱动服务、中文字典和模块前缀 URL 状态完成 |
| 4 | 实现总览、筛选分页列表与旧响应隔离 | ✅ 已完成 | 约 30 分钟 | 真实总览、后端分页、筛选、排序和 request token 完成 |
| 5 | 实现详情抽屉、来源附件和审核/追踪摘要 | ✅ 已完成 | 约 25 分钟 | 来源、附件、审核、trace 详情和 culture tracking 深链完成 |
| 6 | 实现新增编辑、提交审核和高风险操作流程 | ✅ 已完成 | 约 25 分钟 | 草稿保存、正式变更提示、审核、归档原因和删除确认完成 |
| 7 | 补充前端测试、响应式样式和浏览器关键路径验证 | ✅ 已完成 | 约 35 分钟 | Playwright 覆盖主路径、390px 响应式和 403 最小披露；修复 Drawer 标题语义、测试作用域及公共错误解析 |
| 8 | 执行 typecheck/build/api:check、五轴 Review 并合入 main | 🔄 进行中 | 已累计约 10 分钟 | 全部门禁通过、无 Review 线程、GitHub `mergeable=true`；准备转 Ready 并 squash 合入 |

## 影响模块

- 前端：`features/culture`、公共 API Client、Tracking 深链、Playwright 用例、前端脚本与专项 CI。
- API：只消费现有 `culture-api-contract.ts`、`culture-types.ts` 和 `tracking-types.ts`，未新增手写后端 DTO。
- 后端/数据库：无修改。
- 权限/隐私：只消费后端 `allowedActions` 和脱敏响应，不替代后端鉴权。

## 关键设计

1. **严格契约服务**：文化分页按 `items + page` 解析，详情、命令和 trace 全部使用生成类型。
2. **可恢复 URL**：使用 `cultureKeyword/category/branch/status/privacy/hasSource/featured/sort/page/pageSize/item` 前缀参数，刷新和浏览器返回可恢复。
3. **旧响应隔离**：总览、列表和详情各自使用递增 request token；宗族、筛选和对象变化后，旧响应不能回写新状态。
4. **对象级动作**：每行和详情均读取该对象的 `allowedActions`，不使用页面级通用权限猜测。
5. **审核语义明确**：正式资料表单显示“提交变更申请”，归档和删除区分立即操作与审核申请。
6. **隐私最小披露**：403/404 不展示对象标题、来源或附件；详情只渲染后端已返回的可见字段。
7. **统一追踪**：详情读取统一 trace 时间线，并扩展 Tracking 深链白名单支持 `culture_item`。
8. **稳定错误反馈**：公共 API Client 同时解析顶层和嵌套 `code/message/errorMessage/detail`，保留后端稳定错误语义。
9. **长期门禁**：专项 CI 覆盖 TypeScript、API Contract、Tracking 测试、生产构建和浏览器关键路径。

## 验证结果

- API Contract：✅ 通过，run `29335314793`。
- Frontend CI：✅ 通过，run `29335314862`。
- Culture Library UI CI：✅ 通过，run `29335314815`。
- TypeScript：✅ 通过。
- Tracking 深链测试：✅ 通过。
- 生产构建：✅ 通过。
- Playwright 主路径：✅ URL 恢复、总览、列表、详情、来源附件、trace、正式变更提示、筛选写回和 390px 响应式通过。
- Playwright 安全路径：✅ 403 显示稳定无权限信息，不泄露受限对象身份。
- Review：✅ 无提交 Review、无未解决线程。
- 合并检查：✅ GitHub `mergeable=true`；分支落后主干 5 个并行提交，当前无文件冲突。

## 五轴 Review

- Correctness：✅ 文化分页、详情、命令、URL 状态和正式变更语义均与生成契约及后端行为一致。
- Readability：✅ 页面编排、服务、状态、列表、详情、表单和动作对话框职责分离。
- Architecture：✅ 不新增第二套权限/审核逻辑；复用文化 API、统一 trace、Tracking 深链和公共 API Client。
- Security：✅ 操作由对象级 `allowedActions` 驱动；403/404、sealed/private、来源附件和错误消息均按最小披露处理。
- Performance：✅ 后端分页；请求参数稳定；旧响应隔离；详情与 trace 并行加载，不进行前端全量扫描。

## 已知边界

- “新增资料”入口在选择宗族后展示，最终创建权限仍由后端强制校验；当前契约未提供页面级 `create` action。
- 浏览器测试使用严格契约形状 mock，不替代 #168 已有真实 PostgreSQL 权限、审核与隐私验证。
- 富文本、迁徙专题、文化场所和首页精选消费由后续 Issue 完成。

## 当前恢复检查点

- 当前 Issue：#169
- 当前分支：`agent/issue-169-culture-library-ui`
- PR：#205
- 最新业务 Head：`246d24f77f883fb3ba2f9c9becd3c76d74899aa3`
- 当前进行中：转 Ready 并 squash 合入 `main`
- CI 状态：全部通过
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：更新 PR 验收记录，转 Ready，复核 Head 后合入
- 最后更新时间：2026-07-14 21:12，北京时间
