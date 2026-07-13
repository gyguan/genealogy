# Review: 导入业务类型与文件格式拆分

## Correctness

- `import_job` 新增独立 `file_format`，业务类型保存为 `person/relationship/generation/source`。
- Flyway V6 将历史 `person_csv/person_xlsx` 拆分为 `person + csv/xlsx`。
- 文件格式缺失时，迁移和运行时兼容层可根据旧组合值或文件名恢复。
- 新人物任务在实体写入时立即规范化为拆分字段。
- 任务列表支持业务类型和文件格式独立筛选。
- 旧查询值 `person_csv/person_xlsx` 仍可使用，并被拆分为两个过滤条件。
- DTO 同时返回 `importType`、`fileFormat` 和过渡期只读 `legacyImportType`。
- 失败行修正、审核提交和正式生效继续使用任务 ID，不受字段拆分影响。

## Architecture

- 新增 `ImportJobDescriptor`，集中处理组合值拆分、格式推断和兼容值生成。
- 新增 `ImportTypeDefinition` 与 `ImportTypeRegistry`，启动时拒绝重复注册。
- 人物导入通过 `PersonImportTypeDefinition` 注册 CSV/XLSX、模板、解析、校验、修正、草稿和审核生效扩展点。
- 注册表已接入人物模板生成路径，不是未使用的文档占位。
- 前端 `import-type-registry.ts` 使用相同业务类型和扩展元数据。
- `docs/import-type-extension-guide.md` 明确新增类型的目录、契约、测试和审核边界。
- 没有新增任务表、错误表、审核表或重复任务页面。

## API / Compatibility

- OpenAPI 最终覆盖分片定义 `importType + fileFormat`。
- `importType` 新语义是业务类型，`fileFormat` 是物理文件格式。
- `legacyImportType` 标记为 deprecated，仅用于旧客户端迁移。
- Controller 新增可选 `fileFormat` 查询参数。
- `ImportJobApplicationService` 保留旧方法重载，避免内部调用方一次性中断。
- DTO 保留旧简化和完整构造器，兼容已有测试与调用代码。
- 删除 `legacyImportType` 前必须完成客户端调用检查和兼容窗口公告。

## Security / Privacy

- 本次不改变文件内容、失败行、人物隐私字段和权限模型。
- 列表与详情仍执行宗族成员和支派范围校验。
- 业务类型和文件格式仅用于路由、筛选和展示，不接受文件内技术 ID 控制业务范围。
- 审核摘要与原始行数据边界保持不变。

## Performance

- 新增 `(clan_id, import_type, file_format, created_at desc)` 索引，支撑类型/格式筛选。
- 查询兼容期会额外匹配历史组合值；Flyway 完成后主要命中新拆分字段。
- DTO 规范化为内存常量操作，不新增数据库查询。
- 注册表在应用启动时构造为不可变 Map。

## Verification

已通过：

- 后端主代码和测试源码编译。
- `ImportJobDescriptorTest`。
- `ImportTypeRegistryTest`。
- `ImportJobEntityTest`。
- `ImportJobApplicationServiceTest`。
- `ImportApplicationServiceRowStateTest`。
- `PersonImportTemplateApplicationServiceTest`。
- API 生成一致性检查。
- 导入模块定向 TypeScript 检查。
- 前端生产构建。
- PostgreSQL 16 独立迁移验证。
- Flyway V6 唯一性检查。
- 全量 Java 测试诊断未发现导入模块回归。

仓库默认 API Contract 工作流中，生成契约步骤通过；全局 TypeScript 检查仍受其他历史页面错误影响。仓库默认启动检查仍受既有 Flyway 历史问题影响，本次 V6 已通过独立 PostgreSQL 执行验证。

## Remaining Risks

- 兼容字段和组合查询值不能长期保留，否则会形成双语义 API；建议后续设定删除版本。
- 当前人物处理器仍位于既有应用服务中，注册项先建立统一边界；实现第二种导入类型时应按扩展指南拆出实际 Parser/Validator/DraftCreator Bean。
- 基础 OpenAPI 与领域分片存在历史重叠，当前通过最终覆盖分片保证生效契约；后续可单独整理基础契约。

## Conclusion

Issue #104 的数据模型拆分、历史兼容、API、前端筛选、注册机制、扩展规范和验证均已完成。建议 PR 进入评审；合入后由 `Closes #104` 自动关闭 Issue。
