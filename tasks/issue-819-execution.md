# Issue #819 执行记录

## 目标

根据 #818 首轮失败归因修复测试体系问题，重新执行完整功能测试，并将后续失败继续分类为测试或业务缺陷。

## 一、基础测试体系整改

### FR-001：PostgreSQL 人物 Fixture 缺少必填默认值

- 影响：`FT-PERM-001`、`FT-REL-002`；
- 原因：测试直接构造 `PersonEntity` 时未设置 `lineage_status`；
- 整改：显式设置 `lineageStatus=normal`、`hasDescendant=false`；
- 原则：未降低数据库非空约束，未跳过用例。

### FR-002：登录账号选择器 strict mode 冲突

- 原因：`getByLabel('账号')` 同时命中账号输入框、认证区域和“记住账号”；
- 整改：使用 `input#username`、`input#password` 和 exact role/name；
- 原则：继续通过真实 UI 登录，不改为 API 绕过。

### FR-003：建谱页面可访问性锚点错误

- 原因：测试假设存在 `heading "建谱向导"`，实际使用步骤 `region`；
- 整改：使用 `region "宗族步骤内容"`、`region "支派步骤内容"` 及 `1/6`、`2/6` 步骤状态。

### FR-004：审核 PostgreSQL 测试缺少提交人外键

- 原因：Revision Fixture 的 `submitter_id` 未创建对应 `app_user`；
- 整改：在隔离 PostgreSQL 中创建真实提交人，再创建 Revision 和 Review Task。

### FR-005：自动人物编码超过数据库长度

- 原因：测试 Run 标识参与自动 `person_code` 生成后超过 `varchar(64)`；
- 整改：为三代世系人物显式提供短、唯一编码。

### FR-006：关系类型使用旧设计表达

- 原因：Fixture 使用 `father_of`，当前写接口正式契约为 `parent_child/father`；
- 整改：按运行时代码枚举创建父子关系，不修改业务规则。

### FR-007：草稿人物不能建立正式关系

- 结果：关系 API 正确返回 `RELATIONSHIP_PERSON_NOT_OFFICIAL`；
- 归类：测试数据顺序问题，同时证明业务门禁有效；
- 整改：先将世系 Fixture 人物转为正式，再通过真实 API 创建关系。

### FR-008：有状态用例重试造成数据污染

- 表现：审核首次提交已成功，断言失败后的自动重试触发重复审核；
- 整改：对建谱和审核等有状态 `serial` 场景设置 `retries: 0`；
- 原则：失败保留原始证据，不通过重复提交掩盖问题。

### FR-009：审核状态响应字段理解偏差

- 真实响应同时提供：
  - `taskStatus=pending`：审核任务状态；
  - `reviewStatus/status=pending_review`：目标对象审核状态；
- 整改：分别断言工作流状态和业务对象状态。

## 二、发现并修复的业务缺陷

### #828：提交人可审核自己的变更

静态审查和真实测试设计发现 `ApprovalApplicationService.approve/reject` 只校验审核权限，缺少提交人与审核人分离的后端强制约束。

已完成：

- [x] 在审核服务边界增加不可绕过的自审隔离；
- [x] approve/reject 共用稳定错误码 `REVIEW_SELF_DECISION_FORBIDDEN`；
- [x] 单元测试验证提交人被拒绝、独立审核员可继续；
- [x] 真实 PostgreSQL 测试验证自审失败后 Task、Revision 仍为 pending；
- [x] 真实浏览器验证“编辑者提交 → 自审拒绝 → 独立审核员通过 → 宗族正式生效”。

## 三、关键回归记录

### 基础闭环通过

- 提交：`3738be4e4ba6df47aeb65da47c9815c263776250`；
- Functional E2E Run：`30236552256`；
- PostgreSQL Integration：通过；
- 真实 Playwright：4/4 通过。

### 扩展闭环最终通过

- 提交：`678a1d72bb67266d17a4b2b33b6cb478cecbae6f`；
- Functional E2E Run：`30239097030`；
- PostgreSQL 集成测试：通过；
- 空库 Flyway 与 Hibernate Schema 校验：通过；
- 审核自审状态不变集成测试：通过；
- 后端、临时账号、受限宗族、审核与三代世系种子：通过；
- 前端、Chromium 和真实 Playwright：通过；
- 真实 Playwright：7/7 通过；
- 失败 Artifact、成功 Artifact 和服务清理：通过。

## 四、最终覆盖

### PostgreSQL Integration

- `FT-FAIL-003`：空库 Flyway 与核心 Schema；
- `FT-PERM-001`：宗族数据隔离；
- `FT-REL-002`：自关系数据库约束；
- `FT-STATE-004`：并发唯一性；
- 事务回滚专项；
- `FT-PERM-004`：自审拒绝后 Task/Revision 状态不变。

### Real Playwright

- `FT-AUTH-001`：真实登录；
- `FT-CLAN-001`：创建宗族、自动进入支派步骤、刷新持久化；
- `FT-NAV-001`：深链接刷新恢复；
- `FT-PERM-001`：已归属其他宗族的账号不能创建第二宗族；
- `FT-PERM-004`：提交人不能自审；
- `FT-REVIEW-002`：独立审核员审批并正式生效；
- `FT-TREE-001`：真实三代世系查询；
- `FT-PERM-007`：其他宗族账号不能读取核心宗族支派。

## 五、整改原则确认

- [x] 未跳过 P0 用例；
- [x] 未删除关键断言；
- [x] 未降低权限、审核或数据库约束；
- [x] 未使用 `continue-on-error` 制造假通过；
- [x] 业务缺陷单独登记为 #828；
- [x] 最终完整流水线已通过。
