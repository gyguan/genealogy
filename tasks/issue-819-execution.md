# Issue #819 执行记录

## 目标

根据 #818 首轮失败归因修复测试体系问题，重新执行完整功能测试，并将后续失败继续分类为测试或业务缺陷。

## 第一轮整改：PostgreSQL Fixture

- [x] 修复 `PostgreSqlCoreIT.savePerson` 缺少数据库必填默认值；
- [x] 显式设置 `lineageStatus = normal`；
- [x] 显式设置 `hasDescendant = false`；
- [x] 保留 `FT-PERM-001` 与 `FT-REL-002` 原断言；
- [x] 未降低数据库非空约束；
- [x] 未跳过测试或增加 `continue-on-error`。

## 第二轮回归：Run #2

- 提交：`a74074f9f274d11c319fab6faccaf1323455a770`；
- Functional E2E Run ID：`30236090099`；
- PostgreSQL 集成测试：通过；
- 后端、账号种子、前端和 Chromium：通过；
- Playwright：失败。

### FR-002：登录账号选择器 strict mode 冲突

`getByLabel('账号')` 同时匹配认证区域、账号输入框和“记住账号”复选框。归类为测试脚本选择器缺陷。

### 整改

- [x] 账号定位改为 `input#username`；
- [x] 密码定位改为 `input#password`；
- [x] 登录按钮和菜单项使用 exact role/name；
- [x] 保留真实 UI 登录流程。

## 第三轮回归：Run #4

- 提交：`38d3e1833c766bbb69f15ca7545bf520aec3346a`；
- Functional E2E Run ID：`30236284141`；
- PostgreSQL、后端、账号、前端、Chromium：通过；
- FT-AUTH-001：通过；
- Playwright 在建谱页面锚点失败。

### FR-003：测试错误假设建谱页面存在 heading

页面已成功进入建谱向导，但正式页面的可访问性结构使用 `region "宗族步骤内容"` 和 `1/6 · 宗族`，没有 `heading "建谱向导"`。归类为测试契约缺陷，不是页面导航或业务缺陷。

### 整改

- [x] 使用 `region "宗族步骤内容"` 验证页面进入；
- [x] 使用 `1/6 · 宗族` 验证当前步骤；
- [x] 登录用例删除吞掉失败的可选断言；
- [x] 建谱、深链接和权限用例统一使用真实页面结构。

## 最终回归：Run #6

- 提交：`3738be4e4ba6df47aeb65da47c9815c263776250`；
- Functional E2E Run ID：`30236552256`；
- PostgreSQL Integration：通过；
- Backend CI：通过；
- Frontend CI：通过；
- API Contract：通过；
- Culture Page Gate：通过；
- 真实 Playwright 4/4：通过；
- Artifact 上传与服务清理：通过。

## 缺陷结论

本轮发现并修复 3 个测试体系问题：

1. 测试人物 Fixture 必填默认值缺失；
2. 登录账号选择器不唯一；
3. 建谱页面可访问性锚点假设错误。

当前执行没有发现可复现的业务缺陷，因此未额外创建业务缺陷 Issue。所有整改均未跳过测试、删除关键断言或降低业务/数据库约束。
