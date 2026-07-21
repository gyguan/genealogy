# Issue #575 执行看板

## 目标

修复 `demo_admin` 创建第二个宗族时被普通用户单宗族校验拦截的问题。

## 根因

`ClanApplicationService.create` 会调用 `requireSingleClanOrCrossClanAdmin`；`demo_admin` 已有有效宗族成员关系，但初始化数据没有授予 `cross_clan_admin`。

## 任务

| 序号 | 任务 | 状态 | 说明 |
|---|---|---|---|
| 1 | 定位校验路径与角色判断 | ✅ | 保留普通用户单宗族约束 |
| 2 | 为 demo_admin 补充跨宗族角色 | ✅ | 幂等 Flyway 数据迁移 |
| 3 | CI 与迁移治理检查 | 🔄 | 等待远程门禁 |
| 4 | Review 与合入 | ⏳ | CI 通过后处理 |

## 约束

- 不通过用户名硬编码绕过业务校验。
- 不放宽普通账号的单宗族归属规则。
- 不创建重复角色授权。
