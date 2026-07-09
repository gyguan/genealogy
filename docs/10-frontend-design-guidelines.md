# 10. 前端统一设计与实现规范（Ant Design 版）

> 本规范用于约束 `frontend/genealogy-web` 后续页面设计、组件实现、样式扩展和整改验收。除族谱图谱画布、关系连线、谱牒文化展示等 Ant Design 组件无法直接覆盖的特殊场景外，正式前端应优先采用 Ant Design 5.x 的设计模式与组件实现。

## 1. 参考依据

- Ant Design 设计体系介绍：https://ant-design.antgroup.com/docs/spec/introduce-cn
- Ant Design 设计价值观：https://ant-design.antgroup.com/docs/spec/values-cn
- Ant Design 色彩规范：https://ant-design.antgroup.com/docs/spec/colors-cn
- Ant Design 布局规范：https://ant-design.antgroup.com/docs/spec/layout-cn
- Ant Design 导航规范：https://ant-design.antgroup.com/docs/spec/navigation-cn
- Ant Design 按钮规范：https://ant-design.antgroup.com/docs/spec/buttons-cn
- 当前项目技术栈：React + TypeScript + Vite + Ant Design 5.x。

## 2. 适用范围

本规范适用于以下正式前端页面与组件：

- 族谱首页 / 统计概览
- MVP1 建谱向导
- 世系图谱
- 人物档案
- 来源资料库 / 来源附件
- 修谱工作台 / 导入管理
- 审核中心
- 成员权限
- 追踪中心 / 操作日志
- 宗族文化

`prototype/` 目录为早期 HTML 原型，可保留作为方案参考，但不得作为正式前端实现规范。

## 3. 设计目标

结合中国式族谱系统的业务特征，前端设计目标定义为：

1. **自然**：围绕“建谱、查谱、修谱、审谱”组织页面，不把接口字段原样暴露给用户；所有 ID、编码、技术标识应默认隐藏或弱化展示。
2. **确定性**：同类页面采用一致的布局、导航、按钮、表单、反馈和状态表达，降低后续多人开发的合作熵。
3. **意义感**：突出宗族、支派、人物、来源、审核、世系之间的业务闭环，让用户清楚每一步的目的与结果。
4. **生长性**：组件、页面模板和业务状态字典可复用、可扩展，支撑后续 H5/小程序端与更多族谱文化能力演进。

## 4. 全局设计规范

### 4.1 页面布局

- 后台管理端统一采用 `Layout + Sider + Header + Content`。
- 左侧导航固定宽度建议 `248px`，用于承载多模块管理型应用。
- 右侧内容区使用 `24px` 外边距，移动或窄屏可收敛为 `12px`。
- 页面主内容按 Ant Design 8px 网格体系组织，间距优先使用 `8 / 12 / 16 / 24 / 32`。
- 复杂表单或详情页使用 `Card` 分区，禁止使用大量裸 `div.panel` 自定义卡片。
- 页面宽度适配应兼容 `1920 / 1440 / 1366 / 1280`，原则上不再新增 `body { min-width: 1180px; }` 这类全局硬限制。

### 4.2 色彩与主题

- 全局主题必须集中在 `ConfigProvider` 中配置，禁止在业务组件中散落硬编码主题色。
- 主色使用 Ant Design 蓝：`#1677ff`。
- 成功、警告、错误沿用 Ant Design 默认语义色：`#52c41a / #faad14 / #ff4d4f`。
- 族谱文化、堂号、迁徙等内容型展示可使用低饱和暖色作为业务强调色，但不得替代全局主色。
- 背景色、边框色、文本色优先使用 Ant Design token 或 `theme.useToken()` 获取。

### 4.3 字体与文案

- 字体栈统一：`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif`。
- 页面标题控制在 4-12 个中文字符；导航标题控制在 2-6 个中文字符。
- 按钮文案使用动宾结构，如“保存草稿”“提交审核”“绑定来源”“查看世系”。
- 不向普通用户展示 `personId / branchId / sourceId / checksum / storagePath` 等技术字段；确需展示时放入“技术信息”折叠区。

## 5. 导航与信息架构

### 5.1 全局导航

当前模块统一收敛到左侧菜单，建议按照用户任务分组：

- 总览：族谱首页
- 建谱：建谱向导、人物档案、世系图谱
- 资料：来源资料库、来源附件
- 协作：修谱工作台、导入管理、审核中心
- 管理：成员权限、追踪中心
- 文化：宗族文化

导航行为要求：

- 侧边导航用于管理型应用，不再自定义一套 button 导航。
- Header 展示当前模块、当前宗族、用户菜单和必要快捷操作。
- 页面内部存在并列分类时使用 `Tabs`，存在流程先后关系时使用 `Steps`。
- 面包屑仅在层级较深且左侧导航不足以表达当前位置时使用，最多展示三级。

### 5.2 建谱向导步骤

MVP1 闭环为：

```text
创建宗族 → 建立支派 → 维护字辈 → 录入人物 → 建立关系 → 绑定来源 → 审核进度 → 查看世系
```

规范要求：

- 因步骤数超过 5 个，优先采用竖向 `Steps` 或左侧步骤导航 + 右侧内容区。
- 每一步必须明确“前置条件、当前操作、完成结果、下一步入口”。
- 禁止通过 `document.querySelector`、`activeStepIndex`、`setInterval` 等 DOM 探测方式判断步骤状态。
- 新增步骤能力必须放在对应 Step 目录内，例如 `features/mvp1/steps/person/`。

## 6. 组件使用规范

### 6.1 表单

- 新页面必须使用 `Form / Form.Item / Input / Select / DatePicker / Radio / Checkbox / Upload / Input.TextArea`。
- 过渡期允许通过共享 `Field` 组件把原生 `input/select/textarea` 转换为 Ant Design 控件，但不允许在新页面继续直接写原生表单控件。
- 日期字段使用 `DatePicker` 或统一日期输入组件，禁止仅靠普通文本框提示“例如：1888-03-15”。
- 必填、格式校验、业务校验必须进入 `Form.Item rules` 或统一校验函数，错误反馈使用 `Form.Item` 错误态或 `message/Alert`。
- 大表单按业务分组拆成多个 `Card`，例如“基础信息 / 世系信息 / 生卒信息 / 文化传记 / 隐私与状态”。

### 6.2 按钮

- 一个按钮区最多一个 `primary` 主按钮。
- 删除、驳回等风险操作使用 `danger`，并配合 `Popconfirm` 或二次确认 `Modal`，禁止新增 `window.confirm`。
- 表格行内操作使用 `Button type="link"` 或 `Dropdown` 收纳，不堆叠多个实心按钮。
- 保存类动作顺序统一为：主操作在左或右侧固定位置，同组次要动作弱化展示；复杂表单可使用底部固定操作区。

### 6.3 数据展示

- 列表优先使用 `Table`，轻量对象集合可使用 `List` 或 `Card`。
- 人物、来源、支派详情使用 `Descriptions + Card + Tag`。
- 状态统一用 `Tag` 表达：草稿、待审核、正式、已驳回、已归档。
- 空态使用 `Empty`，加载使用 `Skeleton` 或组件 `loading`，异常使用 `Alert` 或 `Result`。
- 新增列表不应默认使用泛化 `DataTable`，除非它确实是可复用的共享业务列表。

### 6.4 反馈

- 轻量成功/失败反馈使用 Ant Design `message`。
- 需要用户决策的确认使用 `Modal.confirm` 或 `Popconfirm`。
- 长任务、导入、审核流使用 `Progress / Steps / Timeline` 展示过程。
- 全局异常由 `RuntimeErrorBoundary` 兜底，但业务异常应在页面内就近展示。

### 6.5 图谱与可视化

- 世系图谱、关系连线、谱牒画布属于特殊场景，可自定义 Canvas/SVG/HTML 节点。
- 自定义图谱仍需遵从 Ant Design token：颜色、圆角、阴影、字号、间距不得另起一套体系。
- 图谱工具栏使用 Ant Design `Space / Button / Select / Segmented / Drawer`，节点详情使用 `Drawer` 或右侧 `Card`。

## 7. 工程实现规范

### 7.1 目录约定

```text
frontend/genealogy-web/src/
  app/                    # 应用壳、全局主题、一级导航
  features/               # 业务功能模块
    mvp1/steps/<step>/    # 建谱向导各步骤
    persons/
    tree/
    sources/
    reviews/
  shared/
    api/                  # API 客户端与生成契约
    context/              # 跨页面上下文
    ui/                   # 可复用 UI 组件
  styles/ 或 *.css         # 样式文件，逐步从全局散落样式收敛
```

要求：

- 业务页面不得直接拼装大量 API 路径，优先通过 `features/*/services` 封装。
- UI 组件不得包含业务接口调用；业务组件不得承担通用组件职责。
- API 路径必须与后端契约一致，变更后执行 `npm run api:check`。

### 7.2 样式约定

- 新增样式优先使用 Ant Design token、组件属性和局部 class。
- 禁止新增全局 `button {}`、`.field input {}`、`.data-table {}` 这类会污染 Ant Design 组件的选择器。
- 允许保留当前桥接样式作为迁移期兼容层，但不得继续扩大 `antd-bridge.css` 的职责。
- 自定义 class 必须使用模块前缀，例如 `person-archive-*`、`mvp1-person-*`、`lineage-tree-*`。
- 禁止使用大面积渐变、重阴影、强装饰卡片替代 Ant Design 的标准 `Card / Table / Form` 视觉。

### 7.3 状态与字典

统一维护以下状态映射：

| 状态 | 展示文案 | 建议颜色 |
| --- | --- | --- |
| draft | 草稿 | default |
| pending_review | 待审核 | processing |
| official | 正式 | success |
| rejected | 已驳回 | error |
| archived | 已归档 | default |

性别、在世状态、来源类型、关系类型、隐私级别等字典应集中维护，避免页面内重复定义。

## 8. 各页面落地模板

### 8.1 族谱首页

- 使用 `Card + Statistic` 展示核心指标。
- 使用 `Tabs` 或卡片区分“数据概览 / 文化信息 / 迁徙线索 / 待办”。
- 点击指标后使用 `Drawer` 或 `Modal` 展示明细，不在首页堆叠过多自定义图表。

### 8.2 人物档案

- 搜索区：`Form layout="inline"` 或响应式栅格表单。
- 列表区：`Table`，隐藏技术 ID，突出姓名、谱名、支派、字辈、代次、状态。
- 详情区：`Drawer + Descriptions + Tabs`，包含基础信息、关系、来源、审核记录。

### 8.3 来源资料库

- 来源类型、复核状态使用 `Tag`。
- 附件上传使用 `Upload`。
- 来源绑定对象使用可搜索 `Select` 或 `Transfer`，避免手输对象 ID。

### 8.4 审核中心

- 使用 `Tabs` 区分“待我审核 / 我提交的 / 已处理”。
- 审核流使用 `Timeline` 或 `Steps`。
- 审核通过、驳回放在详情页底部操作区，并保留驳回原因输入。

### 8.5 世系图谱

- 顶部使用标准筛选工具栏。
- 中间为自定义图谱画布。
- 右侧使用 `Drawer/Card` 展示人物详情与操作。
- 缩放、居中、切换视图等操作使用 `Button / Segmented / Tooltip`。

## 9. 后续实现验收清单

提交任何前端页面或组件变更前，至少满足：

- [ ] 是否优先使用 Ant Design 组件，而不是新增原生控件或自定义控件？
- [ ] 是否只有一个主按钮？风险操作是否有二次确认？
- [ ] 是否隐藏技术 ID、编码、存储路径等非用户字段？
- [ ] 是否使用统一状态字典和 `Tag`？
- [ ] 是否避免新增全局污染样式？
- [ ] 是否兼容 1440/1366/1280 常见宽度？
- [ ] 是否具备加载、空态、异常、成功反馈？
- [ ] 是否通过 `npm run typecheck`？
- [ ] API 变更是否通过 `npm run api:check`？

## 10. 整改实施优先级

| 优先级 | 整改方向 | 目标 |
| --- | --- | --- |
| P0 | 主题、导航、表单、按钮、全局样式收敛 | 先解决不统一和会污染 Ant Design 的基础问题 |
| P1 | 建谱向导、人物档案、审核中心 AntD 化 | 优先治理最高频、最核心业务闭环 |
| P2 | 首页、来源、导入、成员、日志页面模板化 | 提升整体一致性和可维护性 |
| P3 | 世系图谱、宗族文化等特色体验优化 | 在遵守 token 的基础上保留族谱特色 |

## 11. 禁止项

- 禁止新增裸 `button/input/select/textarea` 作为正式页面控件。
- 禁止新增全局 HTML 选择器覆盖 Ant Design，例如 `button { ... }`。
- 禁止通过 DOM 查询或定时器推断 React 状态。
- 禁止要求用户手动录入系统 ID。
- 禁止把原型目录的 HTML/CSS 复制到正式前端作为生产实现。
- 禁止在一个操作区放置多个主按钮。
