# Issue #564 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/564
- 首次 PR：https://github.com/gyguan/genealogy/pull/568
- 修复 PR：https://github.com/gyguan/genealogy/pull/574
- 本次目标：补齐人物中心关系图的真实兄弟姐妹数据，使现有专用布局能够按原型展示父母、子女、配偶和兄弟姐妹。
- 工作分支：`agent/issue-564-fix-person-centered-layout`
- Issue 类型：Tree 后端查询结果修复
- 流程强度：标准
- 契约强度：无 schema 变更；保持既有 Tree API DTO
- 验证强度：后端完整编译、单元测试与打包 + 现有前端布局测试复核 + diff 检查
- 影响模块：`backend/genealogy-backend/src/main/java/com/genealogy/tree`

## 复核结论

首次交付的前端中心布局函数和人物/支派模式路由已经存在，中心、父母、子女、配偶和共享父母的兄弟姐妹布局测试也已覆盖。真正导致页面看不到兄弟姐妹的运行时缺口位于后端：

- `direction=both` 只遍历中心人物的祖先链和后代链；
- 不会从中心人物的直接父母向下查询“父母的其他子女”；
- 因此响应通常没有兄弟姐妹节点和父母→兄弟姐妹关系边；
- 前端布局无法展示服务端没有返回的数据。

前端使用 `clientLayoutMode` 路由专用布局属于实现方式问题，但已能正确进入 `buildPersonCenteredLayout`，不是本次功能未生效的根因。本次不扩大范围重构前端接口，避免在数据修复中引入无关风险。

## 本次实现

1. 新增 `PersonCenteredTreeApplicationService`，作为 `@Primary` Tree 查询服务接管人物查询。
2. 先调用原 `TreeApplicationService` 构建受权限、隐私、状态、关系范围和容量限制保护的基础图。
3. 对 `family`、`both` 查询，从基础图提取已可见的直接父母。
4. 复用受保护的父母家庭查询，合并父母的其他子女及对应父子关系边。
5. 按节点 ID 和边 ID 去重，并继续遵守 `maxNodes`、`maxEdges`，同步更新 meta 和 warning。
6. `ancestors`、`descendants`、支派全局查询保持原逻辑。
7. 新增后端测试覆盖 `both` 与兼容 `family` 入口真实返回兄弟姐妹。

## 任务看板

| 序号 | 任务 | 状态 | 结果或说明 |
|---|---|---|---|
| 1 | 重新读取 main、Issue 与前后端实现，确认真实根因 | ✅ 已完成 | 确认后端响应缺少兄弟姐妹；前端专用布局路由已存在 |
| 2 | 恢复 Issue、创建修复分支和 Draft PR | ✅ 已完成 | Issue #564、当前分支、Draft PR #574 |
| 3 | 后端补齐人物中心兄弟姐妹查询 | ✅ 已完成 | `15554348`：新增受保护的兄弟姐妹查询增强服务 |
| 4 | 增加聚焦测试并复核前端布局链路 | ✅ 已完成 | `d7549811`：覆盖 both/family；现有前端布局可消费新增节点和边 |
| 5 | 执行 CI、diff Review、合入 main | 🔄 进行中 | Backend CI Run #2640 success；待最终 Review 与合入 |

## 验证结果

- Backend CI Run #2640：通过。
- Java 17 编译：通过。
- 后端完整单元测试：通过。
- 后端 package：通过。
- 新增测试：
  - `bothQueryAddsSiblingThroughVisibleDirectParent`
  - `familyCompatibilityEntryAlsoAddsSibling`
- 前端未修改；首次实现中的 `buildPersonCenteredLayout` 及人物/支派模式隔离测试仍在 `main`，已在 Frontend CI Run #1029 验证通过。
- OpenAPI、DTO、数据库、权限规则和支派全局布局：无修改。

## 风险与补偿

- 多父母可能重复发现同一兄弟姐妹：按节点 ID 和边 ID 去重。
- 隐私或支派范围可能过滤部分亲属：继续复用原 Tree 查询的可见性投影，不在前端补全敏感数据。
- 每位已可见直接父母执行一次受保护家庭查询；直接父母数量受当前图容量约束，避免无边界查询。
- 回滚修复 PR 即可恢复首次实现状态，无数据库或契约迁移。

## 恢复检查点

- 当前 Issue：#564（已重新打开）
- 当前分支：`agent/issue-564-fix-person-centered-layout`
- 当前 Draft PR：#574
- 核心提交：`155543485d3f9bae2fe852b658aaad99ac1abaa9`、`d75498111cef86588d37a7a835d0ca98a26fbebd`
- CI 状态：Backend CI Run #2640 success
- 已知阻塞：无
- 下一步最小任务：更新 PR 完成摘要，标记 Ready 并合入 `main`
- 最后更新时间：2026-07-20（北京时间）
