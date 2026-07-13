# Plan: 导入业务类型与文件格式拆分

## Step 1：数据模型与兼容解析

- 新增 Flyway 迁移 `file_format`。
- 将历史组合值拆分。
- 增加 `ImportJobDescriptor` 兼容解析器。
- 扩展实体与 DTO。

## Step 2：Contract First

- OpenAPI 增加 `fileFormat` 和 `legacyImportType`。
- 列表增加 `fileFormat` 查询参数。
- `importType` 改为业务类型枚举。
- 保留旧组合查询值的兼容说明。

## Step 3：后端创建与查询

- 新人物任务保存 `person + csv/xlsx`。
- 列表支持业务类型、文件格式独立筛选。
- 旧组合查询值自动拆分。
- 详情与列表统一输出规范化字段。

## Step 4：导入类型注册机制

- 增加后端导入类型定义和注册表。
- 人物类型注册支持 CSV/XLSX。
- 定义模板、解析、校验、修正、草稿、审核生效扩展点命名。
- 输出扩展文档。

## Step 5：前端

- 类型筛选改为 `person/relationship/generation/source`。
- 新增文件格式筛选。
- 列表分别展示业务类型和格式。
- 保留历史任务显示兼容。

## Step 6：测试与 Review

- 新任务拆分保存测试。
- 旧组合值解析测试。
- 独立筛选测试。
- DTO 输出兼容字段测试。
- 前端契约、类型检查和构建。
- 完成五轴 Review。
