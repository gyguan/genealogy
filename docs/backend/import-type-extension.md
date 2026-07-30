# 导入类型扩展规范

## 1. 目标

所有导入类型共用以下基础设施：

- `import_job`：批次和处理/审核状态；
- `import_job_row`：原始行、标准化数据、修正数据和重试状态；
- 导入任务中心：分页、筛选、失败行入口和审核入口；
- `revision/review_task`：审核历史；
- 操作日志：提交、修正、重试、通过和驳回。

新增业务类型不得复制一套任务表、失败表、审核表或任务页面。

## 2. 统一任务描述

```json
{
  "importType": "person",
  "fileFormat": "xlsx"
}
```

业务类型：

- `person`
- `relationship`
- `generation`
- `source`

文件格式：

- `csv`
- `xlsx`

历史组合值 `person_csv/person_xlsx` 只用于兼容，不得用于新任务。

## 3. 后端注册契约

每个类型实现一个 `ImportTypeDefinition`，注册以下扩展点：

| 扩展点 | 职责 |
|---|---|
| `templateDefinition` | 唯一表头、示例和值域 |
| `parser` | 将 CSV/XLSX 转为统一行对象 |
| `rowValidator` | 字段、权限、引用和重复校验 |
| `correctionSchema` | 失败行修正请求 DTO |
| `draftCreator` | 创建对应业务草稿 |
| `reviewApplyHandler` | 审核通过/驳回后的生效处理 |

人物导入示例：`PersonImportTypeDefinition`。

注册表启动时拒绝重复业务类型；请求使用未注册类型或不支持的文件格式时必须失败。

## 4. 推荐目录

```text
imports/
├─ domain/
│  ├─ ImportJobDescriptor
│  ├─ ImportTypeDefinition
│  └─ ImportTypeRegistry
├─ person/
│  ├─ PersonImportTemplateDefinition
│  ├─ PersonImportParser
│  ├─ PersonImportValidator
│  ├─ PersonImportCorrectionSchema
│  ├─ PersonImportDraftCreator
│  └─ PersonImportReviewApplyHandler
├─ relationship/
├─ generation/
└─ source/
```

现有人物实现可渐进迁移到上述目录，不要求在新增类型前一次性重构。

## 5. API 规范

通用任务查询：

```http
GET /api/v1/clans/{clanId}/imports?importType=person&fileFormat=xlsx
```

响应必须同时返回：

- `importType`
- `fileFormat`
- `legacyImportType`（过渡期只读、已废弃）

模板、预览和批次创建可保留类型专用路径，但返回的任务必须进入通用模型。

## 6. 前端扩展

`import-type-registry.ts` 维护页面入口和扩展元数据。新增类型时：

1. 注册业务类型与支持格式；
2. 增加对应新建导入 Workspace；
3. 增加失败行修正 Renderer；
4. 复用 `ImportJobManagementPanel`；
5. 不新增重复的任务列表和审核页面。

任务中心只展示通用字段。类型专用修正表单按 `importType` 选择；当前人物修正表单不得用于其他类型。

## 7. 数据库迁移与兼容

- 新任务只写拆分字段；
- Flyway 将历史组合值拆分；
- 后端读取时仍兼容未迁移组合值；
- 旧组合查询参数在兼容窗口内可用；
- 新客户端必须改用拆分字段；
- 删除 `legacyImportType` 前需要完成调用方检查。

## 8. 测试门禁

每个新增类型至少包含：

- CSV/XLSX 模板一致性；
- 严格表头校验；
- 正常行、失败行和重复行；
- 修正后成功/失败重试；
- 支派或宗族权限；
- 草稿创建幂等性；
- 批次提交审核；
- 审核通过正式生效；
- 驳回后恢复草稿并可重提；
- 任务类型和格式筛选；
- OpenAPI 生成一致性和前端构建。

## 9. 审核与隐私

- 导入不直接进入正式数据；
- 提交人不能自审；
- 审核摘要不得复制原始行和敏感人物字段；
- 文件中的宗族、支派和技术 ID 不可信，业务范围由页面上下文和后端权限决定；
- 类型处理器不得绕过通用审核和操作日志。
