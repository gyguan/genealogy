# Issue #171 执行看板：祠堂与文化场所管理

- Issue：https://github.com/gyguan/genealogy/issues/171
- 工作分支：`agent/issue-171-culture-sites`
- PR：#223
- 主干提交：`1bcba431af55b33880c27534e33e5a61bb4dc47d`
- 目标：基于 `culture_site` 建设有来源、可审核、有权限、可追踪的祠堂、祖居、墓园和纪念设施管理。

## 交付成本判断

- Issue 类型：重型治理闭环，包含 Contract First、Flyway、权限/隐私、审核 apply、来源附件、Tracking 和前端页面。
- 流程强度：重型；保留独立分支、Draft PR、执行看板、正式审核闭环和数据库治理。
- 验证强度：复用现有 Backend、Frontend、API Contract、Database Migration、Culture Governance、Culture Library UI 和 Tree Release Gate 自动门禁；未新增临时 workflow。
- 是否继续拆分：否。#171 已是 EPIC #165 拆分后的独立 P1-06；领域基础由 #166、通用治理由 #168、页面基线由 #169、Tracking 模式由 #170 提供，本次未引入异步状态机、重复附件存储或地图平台。
- 活跃耗时：当前未形成自动可验证累计值，不以会话持续时间补造；仅记录实现、聚焦修复、diff/Review 和收尾动作。
- 外部等待：GitHub Actions 排队和运行独立记录，不计入活跃实施耗时。

## 实施范围

- 后端：场所分页、详情、草稿维护、提交审核、归档/删除、首页精选、来源、权限隐私、日志和追踪。
- 契约：完善场所筛选、DTO、稳定错误码和生成类型。
- 数据库：新增场所筛选/审核历史索引、权限种子与必要关系，不修改历史 Flyway。
- 前端：文化页新增“祠堂与文化场所”专题，支持卡片/列表、详情和编辑。
- 附件：优先复用来源附件；本 Issue 不新增重复的对象附件存储模型。

## 非目标

- 不实现祭祀活动、报名、捐赠、资产或维修工单。
- 不强制接入地图、导航、GIS 或三维展示。
- 不建设公开游客门户。

## 任务看板

| 序号 | 任务 | 状态 | 结果 |
|---|---|---|---|
| 1 | 刷新 Issue、主干、`culture_site` 模型、契约和既有治理模式 | ✅ 已完成 | #170 已合入；确认基础实体/仓储和预留 OpenAPI |
| 2 | 建立分支、执行看板、Draft PR 和 Issue 回写 | ✅ 已完成 | 分支 `agent/issue-171-culture-sites`，PR #223 |
| 3 | 完善数据库、DTO、领域校验和分页查询 | ✅ 已完成 | 关联人物、坐标约束、权限种子、数据库分页及稳定错误码已实现 |
| 4 | 接入来源、审核、权限隐私、日志、Tracking 和首页精选审核 | ✅ 已完成 | 复用通用 revision/review/source/attachment/operation-log/trace；正式更新、删除、归档和精选走审核 |
| 5 | 实现场所卡片/列表、详情和编辑体验 | ✅ 已完成 | 卡片+分页表格、详情抽屉、来源影像、正式变更提示和移动端已实现 |
| 6 | 补充后端、契约、前端和浏览器测试 | ✅ 已完成 | 领域测试、Tracking 深链、文化资料回归、场所主路径和 403 最小披露均通过 |
| 7 | 五轴 Review、修复问题并 squash 合入 main | ✅ 已完成 | PR #223 已 squash 合入，主干提交 `1bcba431af55b33880c27534e33e5a61bb4dc47d` |

## 自动验证证据

- Database Migration Governance：run `29388177963`，成功。
- API Contract：run `29388177992`，成功。
- Backend CI：run `29388177966`，成功。
- Frontend CI：run `29388177961`，成功。
- Culture Library UI CI：run `29388177962`，成功。
- Culture Governance CI：run `29388177986`，成功。
- Tree Release Gate：run `29388177977`，成功。
- Culture Governance 覆盖文化定向测试、全量回归、PostgreSQL 16、Flyway 与 JAR 启动。
- Culture Library UI 覆盖文化资料回归、场所卡片/列表、详情、来源影像、正式变更语义、390px 移动端和 403 最小披露。

## 五轴 Review

- Correctness：场所类型、现实状态、支派/人物归属、坐标、乐观锁和审核状态一致。
- Readability：领域、权限、应用、治理、控制器、查询仓储和前端专题职责分离。
- Architecture：复用通用来源、来源附件、revision/review、RBAC、operation log 与 Tracking，不新增重复附件模型。
- Security：支派子树、private/sealed 地址坐标、来源摘录、附件和精确 ID 查询均执行最小披露。
- Performance：数据库分页后计数，组合索引，来源/附件/人物批量聚合，Trace 单段上限 100。

## 关键约束

1. `siteType` 仅允许 `ancestral_hall / ancestral_home / cemetery / memorial / other`。
2. 场所现实状态与数据审核状态分开建模。
3. 支派与可选关联人物必须属于当前宗族；支派范围在数据库查询前生效。
4. 正式场所关键字段、归档、删除和首页精选不得直接覆盖，必须走 revision → review_task → apply。
5. 地址、坐标、照片和近现代维护信息按隐私最小披露；sealed 对象不可通过列表、详情、来源、附件或追踪旁路推断。
6. 图片优先复用 source_attachment，不新增含义重叠的二次存储。
7. 列表后端分页，详情聚合有上限并避免 N+1。
