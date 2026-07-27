# Issue #831 执行记录

## 目标

在现有真实 PostgreSQL、Spring Boot、React/Vite 和 Playwright 基础上，验证建谱主数据从创建到审核发布、查询展示和审计可追溯的完整业务链。

## 业务链

```text
核心宗族/正式支派
→ 字辈方案与字辈明细
→ 人物草稿与关键事件
→ 来源资料
→ 分对象提交审核
→ 独立审核员批准
→ 父子关系
→ 来源绑定 Revision
→ 关系与绑定审核
→ 人物档案/世系/来源查询确认
```

## 用例编号

- FT-GEN-001：字辈方案及明细发布；
- FT-PERSON-001：人物及关键事件发布；
- FT-SOURCE-001：来源及人物绑定发布；
- FT-REL-001：父子关系发布；
- FT-REVIEW-001：待审核对象重复提交阻断；
- FT-REVIEW-002：独立审核员批准并正式生效；
- FT-STATE-005：来源绑定唯一且可追溯；
- FT-AUDIT-001：业务对象与审核记录可追溯；
- FT-PERM-008：reviewer 具备来源绑定审核权限。

## 执行约束

- 不 Mock 核心 `/api/v1/**`；
- 使用 `FUNCTIONAL_TEST_RUN_ID` 生成唯一业务数据；
- 复用 CI 初始化的核心宗族、正式支派、编辑者和审核员；
- 有状态测试关闭自动重试；
- 不通过 SQL 直接把本用例业务对象改为正式状态；
- 正式状态必须由真实审核 API 产生。

## 发现与整改

### 业务缺陷 #840

来源绑定审核接口要求 `source:review`，权限层规范化为 `source.review`，但该权限未映射到任何业务审核角色，导致来源绑定 Revision 可提交却无法由独立审核员处理。

整改：

- 新增向前 Flyway 迁移 `V20260727071000__add_source_review_to_reviewer.sql`；
- 补齐/激活 `source.review` 权限；
- 将权限以 allow/active 映射到 `reviewer` 角色；
- 新增真实 PostgreSQL 回归 `SourceReviewPermissionPostgreSqlIT`；
- 真实 Playwright 验证编辑者提交、审核员批准、绑定正式生效；
- 提交人自审和无权限账号规则保持不变。

### 测试契约问题

- 权限码在业务代码中使用冒号、元数据中使用点号，测试统一按服务端规范化比较；
- 来源详情返回聚合结构，测试按明确 `SourceDetailResponse` 展开；
- 重复绑定稳定错误码为 `SOURCE_BINDING_DUPLICATED`；
- 人物档案查询按钮可访问名称存在 Ant Design 中文字距，测试使用空白兼容的语义角色定位。

## 最终验证

- 最终提交：`e8e9bf3097e44b3a79910cdb7065e6576a7795b4`；
- Functional E2E Run：`30246649890`；
- Database Migration Governance：通过；
- Backend CI：通过；
- Frontend CI：通过；
- PostgreSQL Integration：通过；
- Spring Boot、临时账号、权限/世系种子、Vite、Chromium：通过；
- 真实 Playwright：通过；
- Artifact：`functional-test-evidence-30246649890-1`；
- Artifact digest：`sha256:5ed2c29fbafa0c693f571b768b742ec52aa2091d4392047dc3e764df1ae390fd`。

## 准出结论

#831 建谱主数据到审核发布全链满足验收：字辈、人物事件、来源、关系和来源绑定均通过真实创建、独立审核、正式查询、世系展示和 UI 查询验证；重复提交、重复绑定和权限边界均有反向断言。

## 当前任务

- [x] 核对字辈、人物事件、来源、关系和来源绑定 API；
- [x] 明确统一 Review Task 与来源绑定 Revision 两类审核模型；
- [x] 新增完整业务链 Playwright 用例；
- [x] 将用例接入 Functional E2E；
- [x] 执行 CI 并归因失败；
- [x] 修复测试或业务缺陷；
- [x] 回填最终 Run、Artifact 和准出结论。
