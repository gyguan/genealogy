# Issue #178 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/178
- 目标：全量精简页面提示信息，统一 Tooltip / Popover / Alert / Empty 的使用边界，删除面向用户的研发实现话术。
- 工作分支：`agent/issue-178-streamline-ui-guidance`
- 执行方式：前端纯展示与交互优化，不修改后端契约、审核状态机、权限边界和数据语义。

## 实现范围

1. 公共 `Panel` 支持标题旁帮助提示，减少常驻 description。
2. 精简建谱向导 Steps、步骤页重复标题和审核规则说明。
3. 精简数据导入页及人物/关系/来源导入说明，将模板规则收进可展开帮助。
4. 精简世系图谱、修谱工作台、族谱首页、宗族文化的介绍与研发话术。
5. 精简审核中心、来源资料库、成员权限、人物档案等页面提示。
6. 执行前端类型检查、构建和 API 契约检查；无法本地执行时以 CI 结果为准并明确记录。

## 非目标

- 不新增或修改后端 API。
- 不修改审核、权限、隐私和导入生效逻辑。
- 不重构业务数据模型。
- 不删除高风险操作确认、权限限制、错误和阻塞提示。

## 任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 读取规则、Issue 与现有实现现场 | ✅ 已完成 | 约 6 分钟 | 已确认无既有分支、PR 和任务文件 |
| 2 | 建立执行看板、分支和 Draft PR | 🔄 进行中 | 已累计约 2 分钟 | 当前提交为启动检查点 |
| 3 | 改造公共提示组件与建谱向导 | ⏳ 待处理 | — |  |
| 4 | 精简数据导入全流程提示 | ⏳ 待处理 | — |  |
| 5 | 精简首页、文化、图谱和修谱工作台 | ⏳ 待处理 | — |  |
| 6 | 精简审核、来源、成员和人物档案页面 | ⏳ 待处理 | — |  |
| 7 | 检查禁止话术、diff 与响应式影响 | ⏳ 待处理 | — |  |
| 8 | 执行验证并修复问题 | ⏳ 待处理 | — |  |
| 9 | 更新 PR、Issue 和最终恢复检查点 | ⏳ 待处理 | — |  |

## 影响模块

- `frontend/genealogy-web/src/shared/ui`
- `frontend/genealogy-web/src/features/mvp1`
- `frontend/genealogy-web/src/features/imports`
- `frontend/genealogy-web/src/features/home`
- `frontend/genealogy-web/src/features/lineage`
- `frontend/genealogy-web/src/features/workbench`
- `frontend/genealogy-web/src/features/review`
- `frontend/genealogy-web/src/features/sources`
- `frontend/genealogy-web/src/features/members`
- `frontend/genealogy-web/src/features/person`

## 验证方案

```bash
cd frontend/genealogy-web
npm run typecheck
npm run build
npm run api:check
```

补充检查：

- 搜索 Issue 禁止话术是否仍出现在面向用户页面。
- 检查同一页面是否存在重复标题、连续静态 Alert 和重复空态说明。
- 检查高风险、权限、错误和阻塞提示未被弱化。

## 已知风险

- Issue 涉及页面较多，需要控制公共组件改造的兼容性。
- 当前执行环境没有本地 `gh`，通过 GitHub Connector 写入分支和 PR；本地 npm 验证能力可能受限。
- 部分页面仍处于原生控件向 Ant Design 迁移期，本 Issue 不扩大到完整 UI 框架迁移。

## 当前恢复检查点

- 当前 Issue：#178
- 当前分支：`agent/issue-178-streamline-ui-guidance`
- 当前 Draft PR：待创建
- 最后完成任务：读取规则、Issue 与现有现场
- 当前进行中任务：建立执行看板、分支和 Draft PR
- 最新 Commit：本文件启动检查点
- CI 状态：尚未运行
- 未解决 Review：无
- 已知阻塞：本地无 `gh`，改用 GitHub Connector
- 下一步最小任务：创建 Draft PR 并回写 Issue
- 最后更新时间：2026-07-14 17:29（北京时间）
