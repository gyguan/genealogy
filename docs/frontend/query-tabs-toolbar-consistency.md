# 查询区、Tabs、结果工具栏与动作词汇规范

> 适用范围：`frontend/genealogy-web` 正式查询列表页、分页工作台和多 Tab 页面。

## 1. 页面层级

标准顺序固定为：

1. 页面头：标题、说明、业务范围和唯一页面级主操作；
2. 页面级 Tabs：同一业务模块下的平级内容导航；
3. 查询 Card：标题统一为“查询条件”；
4. 结果 Card：对象名称、结果数量和结果专属工具；
5. 表格、卡片列表或业务画布。

页面级 Tabs 使用 `StandardPageTabs`，不得放入查询 Card，也不得与详情 Tabs 嵌套。详情 Drawer、Modal 或详情 Card 内的 Tabs 只描述当前对象内部信息。

## 2. 查询 Card

查询 Card 使用 `StandardQueryPanel`，默认标题为“查询条件”，不重复页面标题或模块名称。

常用条件直接展示。低频、专业或仅少数用户使用的条件进入“更多筛选”。展开和收起统一使用 `StandardMoreFiltersButton`：

- 收起时显示“更多筛选”；
- 展开时显示“收起筛选”；
- 使用统一向下 / 向上图标；
- 存在生效的隐藏条件时显示数量，例如“更多筛选（2）”；
- 移动端热区不小于 44px；
- 重置查询时同步收起更多筛选。

查询动作必须通过 `StandardQueryActions` 声明，逻辑顺序为：

```text
更多筛选 → 重置 → 查询
```

“查询”是查询区域唯一主按钮。查询进行中时，更多筛选和重置自动禁用，避免条件与请求状态冲突。

## 3. 结果标题与工具栏

结果标题使用业务对象名称，不使用泛化标题“查询结果”。格式统一为：

```text
人物列表（共 26 条）
来源资料（共 18 条）
审核任务（共 7 条）
```

首次加载尚未成功时不显示“共 0 条”。分页、表格和结果 Card 不重复展示多份总数；保留分页中的可访问性总数说明即可。

结果工具栏只承载与当前结果集合直接相关的动作：

- 排序；
- 刷新；
- 视图切换；
- 导出当前结果；
- 批量处理；
- 当前结果专属的次要动作。

创建、邀请、发起等页面级主操作必须进入页面头。`QueryResultCard` 会把兼容入口中的首个主按钮提升到页面头，并将遗留结果区主按钮降为次要层级。

## 4. 动作词汇

| 场景 | 标准动词 | 示例 |
|---|---|---|
| 创建顶层业务对象 | 创建 | 创建人物、创建来源、创建文化资料 |
| 在现有对象内增加子项 | 新增 | 新增引用、新增附件、新增事件 |
| 邀请协作成员 | 邀请 | 邀请成员 |
| 启动流程或任务 | 发起 | 发起审核、发起导入 |

页面级创建按钮必须：

- 使用主按钮；
- 使用 `PlusOutlined`；
- 使用 2～6 字动宾短语；
- 同一页面只保留一个页面级主操作。

## 5. 共享组件

```tsx
import { StandardMoreFiltersButton, StandardQueryActions } from '@/shared/ui/StandardQueryActions';
import {
  StandardPageTabs,
  StandardQueryPanel,
  StandardResultSection
} from '@/shared/ui/StandardPagePatterns';
import { QueryResultCard } from '@/shared/ui/QueryResultCards';
```

- `StandardPageTabs`：页面头后的平级导航；
- `StandardQueryPanel`：统一查询 Card 标题和操作区；
- `StandardMoreFiltersButton`：展开、图标、数量与热区；
- `StandardQueryActions`：更多、重置、查询的固定顺序及忙碌态；
- `StandardResultSection`：对象名称和总数；
- `QueryResultCard`：兼容存量页面，提升页面主操作并约束结果工具栏。

## 6. 治理门禁

`InteractionConsistencyGovernance.test.mjs` 检查：

- 查询动作顺序、更多筛选图标 / 数量 / 热区；
- 查询 Card 默认标题；
- 页面级 Tabs 与查询区的层级；
- 结果标题、总数与工具栏语义；
- 页面主操作提升和创建动作词汇；
- 宗族文化与风险审计代表页的真实迁移。

不得通过运行时 DOM Patch、全局 Ant Design 内部选择器或伪造统计数据完成统一。
