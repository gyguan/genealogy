# 统一权限、数据范围与隐私披露决策

## 目标

Person、Tree、Source、Member、Attachment 和 Audit 场景统一使用复合访问决策，不再只返回 boolean，也不允许在 Controller 中分别拼装角色、支派范围和隐私字段规则。

## 决策输入

- `ActorContext`：用户、目标宗族、是否登录、有效成员状态、跨宗族管理员身份。
- `ResourceContext`：资源类型、宗族、支派、所有者、是否在世、是否包含联系方式或附件。
- `AccessAction`：VIEW、LIST、CREATE、UPDATE、DELETE、DOWNLOAD、MANAGE。

## 决策输出

`AccessDecision` 同时返回：

1. `allowed`：是否允许继续执行；
2. `reasonCode`：稳定且不泄露对象存在性的原因码；
3. `dataScope`：必须在 Repository 查询前应用的数据范围；
4. `disclosure`：DTO 映射阶段允许披露的最高隐私等级。

禁止先全量读取再内存过滤。列表查询必须按 `dataScope` 生成数据库条件，然后再执行 count、筛选、排序和分页，因此 `total` 只统计调用者可见数据。

## 决策矩阵

| 场景 | 无登录 | 非有效成员 | 有权限普通成员 | 管理动作/跨宗族管理员 |
|---|---|---|---|---|
| Person/Tree | 拒绝 | 拒绝 | 宗族或支派范围；在世信息脱敏 | 完整披露，仍记录明确范围 |
| Source/Attachment | 拒绝 | 拒绝 | 宗族范围；附件最小披露 | 管理动作可完整披露 |
| Member | 拒绝 | 拒绝 | 宗族范围，禁止平台级用户目录 | 跨宗族管理员为显式全局范围 |
| Audit | 拒绝 | 拒绝 | 按宗族/支派过滤 | 仅授权管理角色完整查看 |

## 稳定原因码

- `ACCESS_AUTHENTICATION_REQUIRED`
- `ACCESS_SCOPE_FORBIDDEN`
- `ACCESS_PERMISSION_FORBIDDEN`

原因码不区分“对象不存在”和“对象存在但无权访问”，避免越权探测。

## 隐私披露

- `NONE`：拒绝访问，无字段披露。
- `MINIMAL`：仅身份所需最小字段。
- `MASKED`：允许访问，但联系方式、在世敏感信息和附件元数据脱敏。
- `FULL`：明确管理权限或高可信范围内完整披露。

## 安全不变量

成员停用、撤销授权、降权及最后管理员保护继续由现有 Member 领域服务负责；统一决策层只负责读取有效身份与授权范围，不绕过这些写操作不变量。
