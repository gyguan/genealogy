# 10. 前端统一设计与实现规范（Ant Design 版）

> 本规范约束 `frontend/genealogy-web` 后续页面设计、组件实现、样式扩展和整改验收。正式前端优先采用 Ant Design 5.x；仅族谱图谱画布、关系连线、谱牒文化展示等 Ant Design 无法覆盖的场景允许自定义扩展。

## 1. 参考依据

- Ant Design 设计体系介绍：https://ant-design.antgroup.com/docs/spec/introduce-cn
- Ant Design 设计价值观：https://ant-design.antgroup.com/docs/spec/values-cn
- Ant Design 色彩规范：https://ant-design.antgroup.com/docs/spec/colors-cn
- Ant Design 布局规范：https://ant-design.antgroup.com/docs/spec/layout-cn
- Ant Design 导航规范：https://ant-design.antgroup.com/docs/spec/navigation-cn
- Ant Design 按钮规范：https://ant-design.antgroup.com/docs/spec/buttons-cn
- 当前项目技术栈：React + TypeScript + Vite + Ant Design 5.x。

## 2. 设计目标

1. **自然**：围绕“建谱、查谱、修谱、审谱”组织页面，不把接口字段原样暴露给用户。
2. **确定性**：同类页面采用一致布局、导航、按钮、表单、反馈和状态表达。
3. **意义感**：突出宗族、支派、人物、来源、审核、世系之间的闭环关系。
4. **生长性**：组件、页面模板、业务状态字典可复用，可支撑 H5/小程序端演进。

## 3. 全局布局与主题

- 后台管理端统一采用 `Layout + Sider + Header + Content`。
- 左侧导航建议宽度 `248px`；右侧内容区默认 `24px`，窄屏收敛为 `12px`。
- 页面空间遵从 8px 网格，常用间距为 `8 / 12 / 16 / 24 / 32`。
- 页面适配至少覆盖 `1920 / 1440 / 1366 / 1280`，原则上不再新增 `body { min-width: 1180px; }`。
- 全局主题集中在 `ConfigProvider` 中配置；业务组件禁止散落硬编码主题色。
- 主色使用 `#1677ff`；成功、警告、错误使用 Ant Design 语义色。
- 族谱文化、堂号、迁徙等内容型展示可使用低饱和暖色，但不得替代全局主色。
- 字体栈统一为 `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif`。

## 4. 导航与信息架构

全局导航收敛为左侧菜单，建议任务分组：

- 总览：族谱首页
- 建谱：建谱向导、人物档案、世系图谱
- 资料：来源资料库、来源附件
- 协作：修谱工作台、导入管理、审核中心
- 管理：成员权限、追踪中心
- 文化：宗族文化

规范要求：

- 管理型页面使用侧边导航，不再自定义一套 button 导航。
- Header 展示当前模块、当前宗族、用户菜单和必要快捷操作。
- 页面内部并列分类使用 `Tabs`；流程先后关系使用 `Steps`。
- 面包屑仅在层级较深时使用，最多展示三级。

## 5. 建谱向导规范

MVP1 闭环为：

```text
创建宗族 → 建立支派 → 维护字辈 → 录入人物 → 建立关系 → 绑定来源 → 审核进度 → 查看世系
```

- 步骤数超过 5 个，优先采用竖向 `Steps` 或左侧步骤导航 + 右侧内容区。
- 每一步必须展示“前置条件、当前操作、完成结果、下一步入口”。
- 新增步骤能力必须放在对应 Step 目录内，例如 `features/mvp1/steps/person/`。
- 禁止通过 `document.querySelector`、`activeStepIndex`、`setInterval` 等 DOM 探测方式判断步骤状态。

## 6. 组件使用规范

### 6.1 表单

- 新页面必须使用 `Form / Form.Item / Input / Select / DatePicker / Radio / Checkbox / Upload / Input.TextArea`。
- 过渡期允许通过共享 `Field` 把原生 `input/select/textarea` 转换为 Ant Design 控件；新页面不得继续直接写原生表单控件。
- 日期字段使用 `DatePicker` 或统一日期输入组件，不使用普通文本框模拟日期。
- 必填、格式、业务校验进入 `Form.Item rules` 或统一校验函数。
- 大表单按“基础信息 / 世系信息 / 生卒信息 / 文化传记 / 隐私与状态”拆分为多个 `Card`。

### 6.2 按钮与反馈

- 一个按钮区最多一个 `primary` 主按钮。
- 删除、驳回等风险操作使用 `danger + Popconfirm/Modal.confirm`，禁止新增 `window.confirm`。
- 表格行内操作使用 `Button type="link"` 或 `Dropdown` 收纳。
- 成功/失败使用 `message`；需用户决策使用 `Modal/Popconfirm`；流程进度使用 `Steps/Timeline/Progress`。

### 6.3 数据展示

- 列表优先使用 `Table`，轻量对象集合可使用 `List/Card`。
- 详情使用 `Descriptions + Card + Tag`；状态统一使用 `Tag`。
- 空态使用 `Empty`，加载使用 `Skeleton` 或组件 `loading`，异常使用 `Alert/Result`。
- 新增列表不默认使用泛化 `DataTable`，除非它确实是共享业务列表。
- 不向普通用户展示 `personId / branchId / sourceId / checksum / storagePath`；确需展示时放入“技术信息”折叠区。

### 6.4 图谱与可视化

- 世系图谱、关系连线、谱牒画布可自定义 Canvas/SVG/HTML 节点。
- 自定义图谱仍需遵从 Ant Design token，颜色、圆角、阴影、字号、间距不得另起体系。
- 图谱工具栏使用 `Space / Button / Select / Segmented / Tooltip`，节点详情使用 `Drawer/Card`。

## 7. 工程实现规范

```text
frontend/genealogy-web/src/
  app/                    # 应用壳、全局主题、一级导航
  features/               # 业务功能模块
    mvp1/steps/<step>/    # 建谱向导各步骤
    persons/ tree/ sources/ reviews/
  shared/
    api/ context/ ui/     # API、上下文、共享 UI
```

- 业务页面不得直接拼装大量 API 路径，优先通过 `features/*/services` 封装。
- UI 组件不得包含业务接口调用；业务组件不得承担通用组件职责。
- API 路径必须与后端契约一致，变更后执行 `npm run api:check`。
- 新增样式优先使用 Ant Design token、组件属性和局部 class。
- 禁止新增全局 `button {}`、`.field input {}`、`.data-table {}` 等污染 Ant Design 的选择器。
- 自定义 class 使用模块前缀，如 `person-archive-*`、`mvp1-person-*`、`lineage-tree-*`。
- `antd-bridge.css` 仅作为迁移期兼容层，不得继续扩大职责。

## 8. 统一状态字典

| 状态 | 展示文案 | 建议颜色 |
| --- | --- | --- |
| draft | 草稿 | default |
| pending_review | 待审核 | processing |
| official | 正式 | success |
| rejected | 已驳回 | error |
| archived | 已归档 | default |

性别、在世状态、来源类型、关系类型、隐私级别等字典应集中维护，避免页面内重复定义。

## 9. 页面模板

- **族谱首页**：`Card + Statistic` 展示核心指标；点击指标用 `Drawer/Modal` 展示明细。
- **人物档案**：搜索区使用响应式表单；列表突出姓名、谱名、支派、字辈、代次、状态；详情用 `Drawer + Descriptions + Tabs`。
- **来源资料库**：来源类型、复核状态用 `Tag`；附件上传用 `Upload`；来源绑定对象使用可搜索 `Select/Transfer`。
- **审核中心**：使用 `Tabs` 区分“待我审核 / 我提交的 / 已处理”；审核流用 `Timeline/Steps`。
- **世系图谱**：顶部标准筛选工具栏，中间自定义图谱画布，右侧 `Drawer/Card` 展示人物详情。

## 10. 提交验收清单

- [ ] 是否优先使用 Ant Design 组件？
- [ ] 是否只有一个主按钮？风险操作是否二次确认？
- [ ] 是否隐藏技术 ID、编码、存储路径等非用户字段？
- [ ] 是否使用统一状态字典和 `Tag`？
- [ ] 是否避免新增全局污染样式？
- [ ] 是否兼容 1440/1366/1280 常见宽度？
- [ ] 是否具备加载、空态、异常、成功反馈？
- [ ] 是否通过 `npm run typecheck`？
- [ ] API 变更是否通过 `npm run api:check`？

## 11. 整改实施优先级

| 优先级 | 整改方向 | 目标 |
| --- | --- | --- |
| P0 | 主题、导航、表单、按钮、全局样式收敛 | 先解决不统一和污染 Ant Design 的基础问题 |
| P1 | 建谱向导、人物档案、审核中心 AntD 化 | 优先治理最高频、最核心业务闭环 |
| P2 | 首页、来源、导入、成员、日志页面模板化 | 提升整体一致性和可维护性 |
| P3 | 世系图谱、宗族文化特色体验优化 | 在遵守 token 的基础上保留族谱特色 |

## 12. 禁止项

- 禁止新增裸 `button/input/select/textarea` 作为正式页面控件。
- 禁止新增全局 HTML 选择器覆盖 Ant Design。
- 禁止通过 DOM 查询或定时器推断 React 状态。
- 禁止要求用户手动录入系统 ID。
- 禁止把 `prototype/` 的 HTML/CSS 复制到正式前端。
- 禁止在一个操作区放置多个主按钮。
