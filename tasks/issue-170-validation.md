# Issue #170 全链路验证

- 业务 Head：`050950e88de8c4ab8830e52cbe9fd225664b7981`
- PR：#214
- 结论：全部必需门禁通过，可进入合并检查。

## 后端与数据库

- Backend CI：success，run `29383230895`。
- Culture Unit and Regression Tests：success，run `29383230871`。
- Culture PostgreSQL and Flyway：success，run `29383230871`。
- Database Migration Governance：success，run `29383230908`。
- `mvn test package`：success。
- PostgreSQL 文化集成测试：success。
- PostgreSQL 启动与 Flyway：success。

## 契约与前端

- API Contract：success，run `29383230875`。
- Frontend CI：success，run `29383230874`。
- Culture Library UI CI：success，run `29383230861`。
- TypeScript：success。
- Tracking 深链测试：success。
- 生产构建：success。
- Playwright：success。

## 浏览器覆盖

- 文化资料库原有主路径无回归。
- 迁徙关键词和选中事件从 URL 恢复。
- 迁出地、迁入地筛选写回 URL。
- 真实时间轴、详情、来源证据和 Trace 可查看。
- 缺失信息只展示完整度提示，不补造迁徙路线。
- 390px 移动宽度可使用新增入口和迁徙列表。
- 403 迁徙列表不泄露受限路线身份。

## 合并检查

- 与最新 `main`：`ahead`，`behind=0`。
- GitHub：`mergeable=true`。
- 提交 Review：无。
- 未解决 Review 线程：无。
- 临时诊断、Playwright 报告、测试运行状态、重复迁移占位和意外锁文件：已清理。
