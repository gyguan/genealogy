# Spec: 导入任务管理第一阶段

## Objective

将人物文件导入统一纳入 `import_job` 任务链路，并提供可分页、可筛选、按需查看错误明细的导入管理体验。同时收口支派选择边界，避免文件中的技术 ID 绕过工作区权限。

## User / Role

- 修谱主编
- 宗族管理员
- 支派管理员 / 支派编辑

## Scope

- 人物导入确认操作统一调用任务型 `/clans/{clanId}/imports/persons.csv`。
- 导入任务列表支持按状态、导入类型、当前支派筛选并服务端分页。
- 单个导入任务详情按需加载错误明细。
- 列表和详情接口执行登录、宗族及支派写范围校验。
- 人物导入前必须在工作区选择目标支派。
- 人物模板只提供姓名、性别、代次、字辈、出生日期、是否在世等业务字段。
- 后端拒绝包含 `branchId`、支派 ID 或支派列的导入文件，所有人物统一归入工作区所选支派。
- 切换支派时清空已选文件、预览结果和重复确认。
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
- 未选择支派或文件包含支派技术列时，后端明确拒绝导入。
- 下载模板不包含 `branchId`、人物 ID、支派 ID 等技术字段。
- OpenAPI、后端实现、前端调用保持一致。

## Affected Modules

- `docs/api/openapi.imports.json`
- `docs/api/README.md`
- `scripts/api/generate-frontend-client.mjs`
- `backend/genealogy-backend/src/main/java/com/genealogy/imports/**`
- `backend/genealogy-backend/src/main/java/com/genealogy/importexport/controller/CsvImportController.java`
- `frontend/genealogy-web/src/features/imports/**`
- `frontend/genealogy-web/src/shared/api/generated/api-contract.ts`

## API / Data Model Impact

新增或明确以下契约：

- `GET /api/v1/imports/templates/persons.csv`
- `POST /api/v1/clans/{clanId}/imports/persons/preview`
- `POST /api/v1/clans/{clanId}/imports/persons.csv`
- `GET /api/v1/clans/{clanId}/imports`
- `GET /api/v1/clans/{clanId}/imports/{jobId}`

旧 `/api/v1/clans/{clanId}/imports/persons` 仅作为兼容接口保留并标记为 deprecated。沿用 `import_job` 和 `import_job_error`，不新增迁移。

API 契约采用基础文件加领域分片的方式维护：`openapi.json` 提供基础契约，`openapi.imports.json` 覆盖导入领域路径和 Schema。

## Security / Privacy Impact

导入错误明细可能包含人物原始行数据，属于宗族内部批量资料。后端必须校验用户登录、宗族权限和任务所属支派范围，不能仅依靠前端隐藏。

文件中的支派技术 ID 不可信。后端只接受工作区显式选择的支派，并拒绝带支派列的文件，避免支派编辑向授权范围外写入人物。

## Assumptions

- 用户在导入人物前能够通过工作区选择目标支派。
- 全宗族导入任务仅允许具备全宗族人物维护范围的用户查看。
- 旧兼容接口暂不删除，但新页面及新契约不再推荐使用。
