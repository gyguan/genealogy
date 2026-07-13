# Spec: 导入任务管理第一阶段

## Objective

将人物文件导入统一纳入 `import_job` 任务链路，并提供可分页、可筛选、按需查看错误明细的导入管理体验，避免当前任务列表无界返回和逐任务加载错误明细。

## User / Role

- 修谱主编
- 宗族管理员
- 支派管理员 / 支派编辑

## Scope

- 人物导入确认操作统一调用任务型 `/clans/{clanId}/imports/persons.csv`。
- 导入任务列表支持按状态、导入类型、当前支派筛选并服务端分页。
- 单个导入任务详情按需加载错误明细。
- 列表和详情接口执行登录、宗族及支派写范围校验。
- 页面不展示任务、宗族、支派等技术 ID。

## Out of Scope

- 不新增关系导入 UI。
- 不修改导入批次审核状态机。
- 不增加重试、撤销、删除任务操作。
- 不修改数据库表结构。
- 不增加导出或谱书入口。

## Success Criteria

- 人物导入完成后产生并返回 `ImportJobResponse`。
- 任务列表每次最多返回请求页的数据，不携带错误明细。
- 点击任务后才调用详情接口获取错误行。
- 状态和导入类型筛选由后端执行。
- 非宗族成员或支派范围外用户无法查看任务及原始错误数据。
- OpenAPI、后端实现、前端调用保持一致。

## Affected Modules

- `docs/api/openapi.json`
- `backend/genealogy-backend/src/main/java/com/genealogy/imports/**`
- `frontend/genealogy-web/src/features/imports/**`
- `frontend/genealogy-web/src/shared/api/generated/api-contract.ts`

## API / Data Model Impact

新增或明确以下契约：

- `POST /api/v1/clans/{clanId}/imports/persons.csv`
- `GET /api/v1/clans/{clanId}/imports`
- `GET /api/v1/clans/{clanId}/imports/{jobId}`

沿用 `import_job` 和 `import_job_error`，不新增迁移。

## Security / Privacy Impact

导入错误明细可能包含人物原始行数据，属于宗族内部批量资料。后端必须校验用户登录、宗族权限和任务所属支派范围，不能仅依靠前端隐藏。

## Assumptions

- 当前支派编辑在操作支派导入前已选择工作区支派。
- 全宗族导入任务仅允许具备全宗族人物维护范围的用户查看。
