# Issue #720 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/720
- 目标：人物创建与编辑支持 0~N 条关键事件维护，并纳入人物审核快照与一致性生效链路。
- 当前分支：`agent/issue-720-person-events`
- Draft PR：#726
- 最后更新时间：2026-07-23（北京时间）

## 实现范围

1. 扩展人物事件 API 契约，提供批量替换能力；
2. 后端实现事件校验、批量替换、稳定排序及事务一致性；
3. 人物创建、编辑和提交审核链路联动关键事件；
4. 人物审核快照、差异和通过/驳回流程包含关键事件；
5. 前端创建页、编辑页支持事件新增、编辑、删除、排序；
6. 增加后端、前端与接口级回归测试。

## 非目标

- 不调整 `person_event` 表结构；
- 不改变世系图谱模块职责；
- 不新增第三方依赖；
- 不重构人物档案无关页面。

## 流程与验证强度

- Issue 类型：跨前后端功能增强、审核状态链路变更；
- 流程强度：重型；
- 契约强度：Contract First；
- 验证强度：后端单元/集成测试、前端组件测试、OpenAPI 契约检查、相关构建与 CI；
- 拆分结论：需求跨模块但属于同一事务闭环，暂不拆分多个 Issue，按垂直切片形成独立 Commit。

## 原子任务看板

| 任务 | 状态 | 验收条件 | Commit | 活跃耗时 |
|---|---|---|---|---|
| T1 读取规则、现有模型与审核链路 | 已完成 | 已定位人物事件实体、查询/写入服务、人物 Revision 提交与通用快照序列化入口 | `ed0d196` | 已记录 |
| T2 更新 OpenAPI 与契约模型 | 进行中 | 已新增 `openapi.person-events.json` Overlay，覆盖事件列表/替换和复合 Revision；等待生成文件与 API Contract 收口 | `b672d91` | 记录中 |
| T3 后端事件批量替换与校验 | 已完成 | 事务替换、权限校验、正式数据审核边界、字段校验和聚焦测试均已通过 Backend CI | `fa5bcf3`、`7ba675c`、`d034342`、`25bd914`、`1b1c99b` | 已记录 |
| T4 审核快照与应用链路联动 | 已完成 | 人物 before/after 复合快照、复合更新 API、旧快照兼容、审核通过事件原子替换和聚焦测试均已通过 Backend CI | `1815a59`、`8817907`、`ca01b00`、`eb789e1`、`bd78182`、`13481d0` | 已记录 |
| T5 前端事件编辑器与保存联动 | 已完成 | 编辑页支持草稿直存与正式 Revision；创建页支持事件编辑、创建后保存、可选提交审核和重置 | `1de80a9`、`ac9634e`、`4ae21a3`、`c1886d4` | 已记录 |
| T6 回归测试与 CI 验证 | 进行中 | 创建页契约测试已纳入 Frontend CI；最新 Frontend/Backend/API/Culture 四项门禁运行中 | `990fdc4` | 记录中 |

## 当前修改

- 新增 `ReplacePersonEventsRequest`，支持 0~N 条事件及字段级校验；
- 新增 `GET /api/v1/persons/{personId}/events` 和 `PUT /api/v1/persons/{personId}/events`；
- 新增 `PUT /api/v1/persons/{id}/revision`，一次提交人物资料与关键事件；
- 读取和替换接口均要求登录，并在服务层校验人物支派权限；
- 正式人物事件禁止通过独立接口直接覆盖，必须随人物资料进入审核链路；
- 在单事务内软删除旧事件并保存新事件；
- 人物 Revision before/after 快照升级为 `PersonRevisionSnapshot(person, events)`；
- 旧 `PersonEntity` 快照继续兼容，不影响历史待审核任务；
- 审核通过时人物资料与事件在同一审批事务中生效；
- 审核驳回仅调整人物状态，不修改正式事件集合；
- 新增 `PersonEventEditor`，支持新增、删除、上移、下移、类型、标题、日期、地点和描述维护；
- 草稿人物依次保存人物与事件，正式或驳回人物提交复合 Revision；
- 待审核人物禁止重复提交，审批前不覆盖现有正式事件；
- 事件校验保持用户当前编辑顺序，错误序号与页面顺序一致；
- 新增 `createPersonWithEvents`，固化“创建人物 → 保存事件 → 可选提交审核”的顺序；
- 创建事件保存失败时不提交审核，事件校验失败时不创建人物；
- `PersonStep` 已渲染关键事件编辑器，并在继续录入、切换宗族和重置时清空事件草稿；
- 创建页源码契约测试已进入 Frontend CI；
- 新增 OpenAPI Overlay，描述人物事件和复合 Revision 路径、请求及响应结构。

## 影响模块

- `docs/api/openapi.person-events.json`
- `backend/genealogy-backend`
- `frontend/genealogy-web`
- 人物审核 revision / review_task / apply 链路

## 测试复用策略

优先复用现有人物创建、编辑、审核测试 fixture、API helper 与前端表单测试工具；事件服务测试采用仓库现有 JUnit 5 + Mockito + AssertJ 模式，前端事件模型、保存编排和页面接入沿用 Node + TypeScript 独立编译/静态契约测试模式。

## 已知风险

- OpenAPI Overlay 已提交，但生成文件尚需根据 API Contract 差异同步；
- 日期精度和空日期语义需与现有只读时间轴保持一致；
- 最终合入前需确认 PR diff 中无临时诊断文件与构建产物。

## 验证方案

- OpenAPI JSON 校验与前端契约生成检查；
- 后端人物事件服务、人物保存事务、审核快照与应用测试；
- 前端事件编辑器交互、校验、创建/编辑提交测试；
- 检查 diff，确认无锁文件、临时脚本和构建产物。

## 外部等待

- 最新 Frontend CI、Backend CI、API Contract 和 Culture Page Gate：运行中。

## 恢复检查点

人物创建、编辑、正式审核和审批生效链路已贯通；创建页接入与页面契约门禁已完成。下一步最小任务：处理 OpenAPI Overlay 触发的生成文件差异，确认四项 CI 全绿，更新 PR 描述并进行最终 diff 审查。
