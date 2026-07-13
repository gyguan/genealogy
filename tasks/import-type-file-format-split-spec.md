# Spec: 导入业务类型与文件格式拆分

## Issue

Closes #104.

## Objective

将导入任务中的业务对象类型与文件格式拆分，形成可扩展的导入类型注册规范，并兼容历史 `person_csv/person_xlsx` 任务。

## Target Model

- `importType`: `person`、`relationship`、`generation`、`source`
- `fileFormat`: `csv`、`xlsx`
- `legacyImportType`: 只读兼容字段，例如 `person_csv`，后续移除

## Scope

- 数据库增加 `file_format` 并迁移历史组合类型。
- 新任务独立保存业务类型和文件格式。
- 任务列表支持按业务类型、文件格式分别过滤。
- API DTO/OpenAPI 返回拆分字段，并提供废弃兼容字段。
- 前端筛选和列表分别展示业务类型、文件格式。
- 建立后端导入类型注册表和人物导入注册示例。
- 输出新增导入类型的目录、SPI、契约、测试和审核生效规范。

## Compatibility

- 历史 `person_csv/person_xlsx` 数据由 Flyway 迁移为拆分字段。
- 后端兼容解析未迁移的组合值。
- 查询参数仍接受 `person_csv/person_xlsx`，内部拆分为业务类型和格式。
- API 增加 `legacyImportType` 作为过渡字段；新客户端必须使用 `importType + fileFormat`。

## Out of Scope

- 不实现关系、字辈或来源资料的具体导入。
- 不重构人物行解析、修正和审核生效逻辑。
- 不删除旧执行状态字段。

## Success Criteria

- 新人物任务保存为 `person + csv/xlsx`。
- 历史任务迁移后可正常查询、筛选、展示、修正和审核。
- 前端不再把 `person_csv/person_xlsx` 当作业务类型。
- 新增类型有明确注册项、处理器边界和测试清单。
