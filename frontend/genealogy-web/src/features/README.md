# Frontend Feature Navigation

`src/features` 按业务能力组织页面、组件、Hook、请求和模型。进入 Feature 前，先读取根 `AGENTS.md`、前端 `AGENTS.md` 和该 Feature 的局部 README（如存在）。

## 推荐结构

```text
features/<feature>/
├── pages/                 路由页面与页面容器
├── components/            业务展示组件
├── hooks/                 Feature 状态、副作用和交互流程
├── services/ 或 api/      请求封装与错误映射
├── model/                 ViewModel、FormValues、Query、Action、字典
├── tests/                 组件或 Feature 测试
└── README.md              复杂 Feature 导航
```

不要求所有 Feature 机械拥有全部目录；按真实职责创建，避免空目录和提前抽象。

## 主调用链

```text
Route
  → Page Container
  → Feature Hook
  → Service / Generated API Client
  → DTO → ViewModel / FormValues
  → Presentational Component
```

- Page Container 负责编排页面用例。
- Feature Hook 管理可复用状态、副作用与请求竞争。
- Service/API 层统一请求与错误处理。
- 展示组件不直接调用业务 API。
- DTO、ViewModel、FormValues、Submit Command 不混用。

## Feature 索引

| Feature | 主要职责 | 关键边界 |
|---|---|---|
| `auth` | 登录、退出、会话恢复 | 不暴露 Token；认证结果以后端为准 |
| `home` | 首页统计和任务入口 | 统计来自真实接口，不使用固定或随机数据 |
| `clans` | 宗族选择和管理 | 当前宗族进入 URL/Context，不能跨宗族混用数据 |
| `branches` | 支派管理和范围选择 | 展示后端允许范围，不在前端自行扩展子树权限 |
| `generations` | 字辈方案维护 | 顺序、代次和业务文案稳定 |
| `persons` | 人物搜索、详情、编辑 | 在世人员按后端脱敏结果展示；技术 ID 不面向普通用户 |
| `relationships` | 关系维护与冲突提示 | 不在前端推断关系合法性；冲突以接口结果为准 |
| `sources` | 来源资料、附件和对象绑定 | 下载与绑定操作使用对象级 `allowedActions` |
| `reviews` | 待审、已提交、已处理和决策 | 不允许自审；状态与可操作项以后端返回为准 |
| `members` | 成员、角色和支派授权 | 前端只降低误操作，不替代后端数据范围校验 |
| `imports` | 预览、任务、批次、错误与恢复 | 大文件不在浏览器无界解析；状态机以后端任务状态为准 |
| `logs` | 审计追踪与筛选 | 不展示敏感正文；筛选分页由后端执行 |
| `tree` | 世系图谱搜索、画布和详情 | 深度/节点/边有上限；不模拟关系；请求竞争可取消 |
| `culture` | 宗族文化内容 | 后端无数据时展示空态，不补造文化事实 |
| `mvp1` | 建谱向导与跨 Feature 闭环 | 每一步显示前置条件、结果和下一步；不靠 DOM 探测完成状态 |

## 状态归属

每个 Feature README 应明确以下状态由谁管理：

| 状态 | 归属 |
|---|---|
| 接口数据、分页、请求状态 | Feature Hook / 请求层 |
| 可分享筛选、分页、Tab、范围 | URL |
| Drawer、Modal、选中对象 | 页面局部 state |
| 表单字段 | Ant Design Form |
| 可由其他值计算的内容 | 派生状态 |
| 跨页面稳定上下文 | 已有 `shared/context`，不得随意新增全局状态 |

同一业务事实只能有一个权威状态源。

## 权限与隐私

- 使用后端按对象返回的 `allowedActions`。
- 不根据角色名称自行推断对象级权限。
- 无权数据不先加载再隐藏。
- 审核、正式状态、隐私和脱敏结果以后端为准。
- 导出、下载、附件预览必须保留权限与审计语义。

## API 与 ViewModel

推荐转换链：

```text
Generated API DTO
  → Feature ViewModel
  → FormValues（需要编辑时）
  → Submit Command
```

- 页面不散落拼接 API 路径。
- 不复制后端 DTO 或使用 `any` 掩盖差异。
- 错误处理区分业务错误、无权限、网络失败和系统异常。
- OpenAPI 变化后执行 `npm run api:generate` 与 `npm run api:check`。

## 性能边界

- 列表采用后端分页和稳定 `rowKey`。
- 搜索处理防抖和过期请求。
- 不在 render 中发请求或做昂贵转换。
- 图谱和大列表显式记录数量上限与降级方式。
- 大表格列定义、复杂单元格和批量操作拆为可测试组件。

## 何时增加 Feature README

出现以下任一条件时必须增加局部 README：

- 页面、Hook、Service、组件之间存在非平凡调用链
- Feature 含多个页面或多个主要操作模式
- 存在复杂表单、表格、Drawer/Modal 协作
- 存在权限、审核、隐私或状态机语义
- 存在图谱、大列表、上传、导入或长任务
- 修改前必须搜索较多文件才能理解状态源

局部 README 至少包含：

1. 业务目标和路由入口
2. 目录结构和主调用链
3. 状态归属
4. API、DTO、ViewModel 和表单边界
5. 权限与关键不变量
6. 性能边界
7. 关键测试和必跑命令

## 基础验证

```bash
npm run typecheck
npm run build
npm run api:check
```

页面、样式或交互变化还应根据范围执行 Playwright、视觉发布、多浏览器和 DOM/CSS 治理门禁。
