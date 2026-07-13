# Review: 人物导入严格模板模式

## Correctness

- CSV 与 XLSX 模板共享唯一表头、固定索引、示例值和业务值域定义。
- 上传文件仅允许 `.csv` 与 `.xlsx`。
- 去除 UTF-8 BOM 和单元格首尾空格后，第一行字段数量、名称和顺序必须与标准模板完全一致。
- 缺列、增列、换序、英文表头、中文别名、空表头、无表头和错误文件类型均在创建批次前拒绝。
- 第一行固定作为模板表头跳过，数据列固定映射，不存在自动检测或位置回退。
- 性别只接受男、女、未知；是否在世只接受是、否；代次只接受空值或正整数；出生日期只接受空值或 yyyy-MM-dd。
- 模板结构错误整文件拒绝；行级值错误仍进入现有失败行修正闭环。
- 目标支派继续由页面明确选择，不允许文件携带支派字段。

## Readability

- `PersonImportTemplateDefinition` 集中表达模板字段、固定位置、示例和值域。
- `PersonImportFilePolicyService` 只负责文件类型和模板结构策略。
- `ImportApplicationService` 只使用固定模板解析业务数据，删除了动态 FieldMapping、别名字典和 fallback 分支。
- Controller 仅保留业务参数，不再暴露技术映射细节。
- 前端流程收敛为下载模板、上传、预览、查重和创建批次。

## Architecture

- 按 Contract First 更新 `openapi.imports.json`，再同步 Controller 与生成操作表。
- 使用 `openapi.zz-removals.json` 在有效契约中明确移除基础契约遗留的无实现 `/imports/persons` 路径，避免生成器重新带回陈旧入口。
- 模板校验下沉到应用服务，绕过 Controller 直接调用也无法使用非标准模板。
- CSV/XLSX 仅是文件载体差异，共用人物导入业务处理、批次、失败行和审核状态机。
- 本次没有修改导入批次、失败行修正或审核中心边界。

## Security / Privacy

- 文件不能控制宗族、支派或人物技术 ID。
- 严格表头减少恶意或误配置字段进入解析链路的机会。
- 文件结构校验在数据库批次创建前执行，不留下无效任务或部分写入。
- 操作日志继续只记录批次摘要，不复制人物原始行。
- 前端移除了用户可操控字段位置的技术入口，后端也不再接受对应参数。

## Performance

- 每个上传文件只在策略校验阶段读取一次表头，随后进入现有解析流程。
- 表头比较为固定六字段的线性操作，成本可忽略。
- XLSX 模板按需在内存生成，文件仅包含两行六列，不存在明显内存压力。
- 未新增逐行数据库查询；人物查重和批次保存行为保持现有实现。

## Verification

临时定向 GitHub Actions 工作流验证通过后已删除：

### Backend

- `mvn -DskipTests package`
- `PersonImportTemplateApplicationServiceTest`
- `PersonImportFilePolicyServiceTest`
- `ImportApplicationServiceRowStateTest#successfulRowsShouldBeLinkedToDraftPersonsAndBecomeReadyForReview`
- `ImportApplicationServiceRowStateTest#invalidRowsShouldRemainTraceableAndRequireCorrection`
- `ImportApplicationServiceRowStateTest#invalidBusinessValuesShouldBecomeCorrectableRows`
- `PersonImportCommandApplicationServiceTest`

### Frontend / Contract

- `npm run api:check`
- `PersonImportWorkspace.tsx` 定向 TypeScript 检查
- `npm run build`

## Compatibility Impact

这是有意的破坏性收口：

- 旧客户端传入的 `autoMapping` 和列号参数不再属于正式契约，后端也不再读取。
- 英文表头、别名表头和英文业务值文件将被拒绝或形成行级错误。
- 用户应重新下载当前 CSV/XLSX 标准模板后填写上传。

## Remaining Risks

- `openapi.json` 中仍保留历史人物导入路径定义，通过最终移除分片从有效契约中屏蔽；后续整理基础契约时可将该历史段物理删除，并移除对应 removal overlay。
- 当前严格模板没有模板版本字段；未来新增列时应引入模板版本或迁移策略，不能静默调整表头。
- CSV 编码当前固定 UTF-8；如需要兼容本地编码，应单独设计，不应重新引入字段映射兜底。
