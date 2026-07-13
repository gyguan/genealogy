# Spec: 人物导入严格模板模式

## Objective

人物导入只接受系统下载的标准 CSV/XLSX 模板结构，不再提供自动识别、字段别名、手工列号或默认位置回退。模板结构错误时整文件拒绝；模板结构正确但行数据错误时继续进入现有预览、失败行修正和审核闭环。

## Target Users

- 宗族管理员
- 支派管理员 / 支派编辑
- 批量录入人物的修谱人员

## Business Flow

1. 用户在人物导入页面选择目标支派。
2. 用户下载 CSV 或 XLSX 标准模板。
3. 用户按模板填写，不修改表头名称、数量和顺序。
4. 上传时后端严格校验文件类型和第一行表头。
5. 表头不一致时拒绝文件，不创建导入批次。
6. 表头一致时进入预览、查重和行级数据校验。
7. 行级错误继续进入失败行修正流程。

## Standard Headers

固定顺序：

1. 姓名
2. 性别
3. 代次
4. 字辈
5. 出生日期
6. 是否在世

只允许去除 UTF-8 BOM 和单元格首尾空格后比较；不接受英文表头、同义词、换序、缺列或增列。

## Strict Values

- 性别：`男`、`女`、`未知`
- 是否在世：`是`、`否`
- 代次：空值或正整数
- 出生日期：空值或 `yyyy-MM-dd`

模板示例值使用中文业务值：`张三,男,5,德,1980-01-01,是`。

## API Changes

保留：

- `GET /api/v1/imports/templates/persons.csv`
- `POST /api/v1/clans/{clanId}/imports/persons/preview`
- `POST /api/v1/clans/{clanId}/imports/persons.csv`

新增：

- `GET /api/v1/imports/templates/persons.xlsx`

从人物预览和批次创建接口删除：

- `autoMapping`
- `nameIndex`
- `genderIndex`
- `generationNoIndex`
- `generationWordIndex`
- `branchIdIndex`
- `birthDateIndex`
- `isLivingIndex`

删除 OpenAPI 中已无 Controller 实现的废弃 `/api/v1/clans/{clanId}/imports/persons` 路径。

## Success Criteria

- CSV 与 XLSX 模板由同一字段定义生成。
- CSV/XLSX 标准表头通过。
- 缺列、增列、换序、英文表头、别名表头、空表头和无表头均被拒绝。
- 不存在任何自动映射或列号回退代码和前端交互。
- 正式接口无法通过额外查询参数绕过模板结构。
- 性别和在世状态只接受模板说明的中文业务值。
- 前端分别提供 CSV 和 XLSX 模板下载入口。
- 现有目标支派、预览、查重、失败行修正和批次审核能力保持不变。

## Affected Modules

- 人物导入模板定义和生成
- 上传文件策略校验
- 人物导入解析与行级校验
- 导入 Controller
- 人物导入前端页面
- OpenAPI 导入分片和生成操作表
- 人物导入聚焦测试

## Out of Scope

- 关系导入
- 允许用户自定义模板
- 模板版本兼容与多版本迁移
- 批量修复失败行
- 修改导入批次、审核和正式入谱状态机
