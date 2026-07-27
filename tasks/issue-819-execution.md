# Issue #819 执行记录

## 目标

根据 #818 首轮失败归因修复测试体系问题，重新执行完整功能测试，并将后续失败继续分类为测试或业务缺陷。

## 第一轮整改

- [x] 修复 `PostgreSqlCoreIT.savePerson` 缺少数据库必填默认值；
- [x] 显式设置 `lineageStatus = normal`；
- [x] 显式设置 `hasDescendant = false`；
- [x] 保留 `FT-PERM-001` 与 `FT-REL-002` 原断言；
- [x] 未降低数据库非空约束；
- [x] 未跳过测试或增加 `continue-on-error`。

## 第二轮回归

- 提交：`a74074f9f274d11c319fab6faccaf1323455a770`；
- Functional E2E Run：`30236090099`，Run #2；
- PostgreSQL 集成测试：通过；
- 后端启动：通过；
- 临时账号注册和受限宗族种子：通过；
- 前端和 Chromium 启动：通过；
- Playwright：失败。

### FR-002：登录账号选择器 strict mode 冲突

`getByLabel('账号')` 同时匹配认证区域、账号输入框和“记住账号”复选框。该问题属于测试脚本选择器缺陷，未执行到登录业务断言。

## 第二轮整改

- [x] 账号定位改为稳定的 `input#username`；
- [x] 密码定位改为稳定的 `input#password`；
- [x] 登录按钮和菜单项使用 exact role/name；
- [x] 保留真实 UI 登录流程，不改为 API 绕过；
- [x] 保留失败重试、Trace、截图和视频。

## 后续

当前提交将触发第三轮完整 Functional E2E。若出现新的真实失败，继续分类并整改；P0 测试不得跳过。
