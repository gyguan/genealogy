# 10. MVP1 会话交接总结

本文用于承接本次 ChatGPT 会话的开发上下文，便于后续在新会话继续推进族谱系统 MVP1。

> 仓库：`gyguan/genealogy`  
> 分支：`main`  
> 当前重点：MVP1 建谱闭环、导入/审核/附件/隐私/正式入谱治理能力补齐。

---

## 1. 本次会话总体结论

本次会话围绕中国式族谱系统 MVP1 做了大量前后端补齐，MVP1 已从“演示型建谱向导”推进到“P0 验收闭环基本完成”的状态。

当前已经具备：

- 登录认证与演示账号。
- 族谱首页统计、族谱概览、图表下钻弹框。
- 建谱向导主流程：宗族、支派、字辈、人物、关系、来源、审核、世系。
- 人物档案检索与详情展示。
- 世系图谱树形展示。
- 用户与角色管理，区分管理角色和查看角色。
- 来源附件上传、下载、删除能力。
- CSV/XLSX 人物导入、模板下载、字段映射、导入前预览、查重确认、导入任务记录。
- 人物新增前重复确认。
- 审核中心内嵌字段级 Diff 弹框。
- 复杂关系快捷入口：养父、养母、养子女、继嗣、出嗣等。
- 在世人员字段级隐私脱敏基础能力。
- 正式入谱准入规则：正式展示类人物搜索默认只展示 `official`。

但当前还有一个重要启动阻断问题未完成修复：

```text
Ambiguous mapping:
GET /api/v1/sources/{sourceId}/attachments
SourceEvidenceController#listAttachmentsBySource(Long)
SourceAttachmentController#list(Long)
```

下一次会话应优先处理这个 Controller 路径冲突。

---

## 2. MVP1 已实现能力清单

### 2.1 登录认证

已实现独立登录页和右上角 GitHub 风格用户菜单。

演示账号：

```text
管理员：demo_admin / Admin@123456
编辑员：demo_editor / Demo@123456
查看者：demo_viewer / Viewer@123456
```

已完成内容：

- 未登录时进入独立登录页。
- 登录后进入主系统。
- 右上角展示当前用户、个人中心、退出登录。
- 基础数据管理中已移除“登录认证”Tab。

### 2.2 族谱首页

族谱首页已从简单统计改造成首页看板。

已实现：

- 族谱概览卡片。
- 宗族名称、姓氏、堂号、郡望、祖籍/发源地、宗族编码、当前宗族 ID。
- 统计卡片：族人、支派、来源、审核、正式入谱、性别、在世/已故、日志等。
- 图表分布：核心数据、人物状态、代次、资料类型。
- 点击卡片或图表项后弹框展示详情。
- 详情条数移动到弹框内容区域，不再显示在右上角。
- 删除首页刷新按钮。

相关文件：

```text
frontend/genealogy-web/src/features/home/StatisticsHomePage.tsx
frontend/genealogy-web/src/compact-ui.css
```

### 2.3 建谱向导

建谱向导已覆盖 MVP1 主流程：

```text
创建宗族 → 创建支派 → 维护字辈 → 录入人物 → 建立关系 → 绑定来源 → 提交审核 → 查看世系/导出
```

已完成 UI 精简：

- 菜单名称从 `MVP1建谱向导` 改为 `建谱向导`。
- 删除顶部“刷新上下文”。
- 创建宗族页隐藏辅助跳转按钮，只保留主操作。

相关文件：

```text
frontend/genealogy-web/src/features/mvp1/Mvp1WizardPage.tsx
frontend/genealogy-web/src/mvp1-wizard.css
```

### 2.4 人物档案

已实现：

- 人物检索。
- 搜索框样式与世系图谱保持一致。
- 删除页码/每页搜索条件。
- 搜索/重置按钮放到搜索条件后面。
- 人物详情抽屉。
- 关键事件时间轴，使用 Ant Design Timeline。
- 编辑与详情分离。

相关文件：

```text
frontend/genealogy-web/src/features/persons/PersonArchiveSearchPage.tsx
frontend/genealogy-web/src/mvp1-wizard.css
```

### 2.5 世系图谱

已实现：

- 删除顶部“刷新世系”。
- 删除“中心人物”搜索条件。
- 搜索人物。
- 树形展示祖先、中心人物、配偶、后代。
- 点击节点弹出人物详情。
- 支持设为中心人物。
- 修复配偶误入祖先链路问题。

后端已修复世系遍历规则：

- 只遍历 `parent_child` 或 `isLineageRelation=true`。
- `spouse` 不再进入祖先/后代链路。

相关文件：

```text
frontend/genealogy-web/src/features/tree/LineageTreeProductPage.tsx
frontend/genealogy-web/src/lineage-tree.css
backend/genealogy-backend/src/main/java/com/genealogy/tree/application/TreeApplicationService.java
```

### 2.6 用户与角色管理

已完成：

- 增加 `viewer` 查看角色。
- 角色分为管理角色和查看角色。
- 新增 `demo_viewer / Viewer@123456`。
- 成员权限页升级为用户与角色管理。
- 管理接口独立命名空间：`/api/v1/member-management/...`。
- 修复与旧 `ClanMemberController` 的 `/clans/{clanId}/members` 路径冲突。

相关文件：

```text
frontend/genealogy-web/src/features/members/MemberPage.tsx
backend/genealogy-backend/src/main/java/com/genealogy/member/controller/MemberManagementController.java
backend/genealogy-backend/src/main/resources/db/migration/V24__user_role_viewer_permissions.sql
```

### 2.7 导入管理

已完成 P0 验收闭环：

前端入口：

```text
基础数据管理 → 导入管理
```

支持：

- CSV 导入。
- XLSX 原生解析，后端使用 Apache POI。
- 导入模板下载。
- 字段映射，列号从 1 开始。
- 导入前预览。
- 每行错误展示。
- 每行疑似重复标识和重复数量。
- 疑似重复未确认时禁止导入。
- 勾选确认后允许导入。
- 导入后人物进入 `draft` 草稿态。
- 导入任务记录和错误明细。

后端接口：

```http
POST /api/v1/clans/{clanId}/imports/persons/preview
POST /api/v1/clans/{clanId}/imports/persons.csv
GET  /api/v1/clans/{clanId}/imports
```

相关文件：

```text
frontend/genealogy-web/src/features/imports/ImportPage.tsx
backend/genealogy-backend/src/main/java/com/genealogy/imports/application/ImportApplicationService.java
backend/genealogy-backend/src/main/java/com/genealogy/imports/controller/ImportController.java
backend/genealogy-backend/src/main/resources/db/migration/V27__mvp1_import_and_source_attachments.sql
backend/genealogy-backend/pom.xml
```

注意：

- 旧版 `PersonCsvApplicationService` 因 `PersonCreateRequest` 新增 `confirmDuplicate` 参数出现编译错误，已修复。
- 修复提交：`da34813 fix: pass duplicate confirmation flag in CSV person import`。

### 2.8 来源附件

已新增一套 `source_attachment` 能力：

- 上传。
- 查询。
- 下载。
- 删除，当前设计为软删除。
- SHA-256 校验。
- 存储路径安全校验。

前端入口：

```text
基础数据管理 → 来源附件
```

相关文件：

```text
frontend/genealogy-web/src/features/sources/SourceAttachmentPage.tsx
backend/genealogy-backend/src/main/java/com/genealogy/source/attachment/controller/SourceAttachmentController.java
backend/genealogy-backend/src/main/java/com/genealogy/source/attachment/application/SourceAttachmentApplicationService.java
backend/genealogy-backend/src/main/java/com/genealogy/source/attachment/entity/SourceAttachmentEntity.java
backend/genealogy-backend/src/main/java/com/genealogy/source/attachment/repository/SourceAttachmentRepository.java
```

当前启动阻断问题也出在这里，详见本文第 5 节。

### 2.9 审核中心与字段级 Diff

已实现：

- 后端字段级 Diff 查询。
- 审核中心页面内嵌 Diff 弹框。
- 在审核任务列表中直接查看 Diff。
- 在弹框内执行通过/驳回。
- 保留单独 `基础数据管理 → 审核Diff` 页面，用于按任务 ID 或修订 ID 手工查询。

后端接口：

```http
GET /api/v1/review-tasks/{reviewTaskId}/diff
GET /api/v1/revisions/{revisionId}/diff
```

前端入口：

```text
审核中心 → 查看Diff
基础数据管理 → 审核Diff
```

相关文件：

```text
frontend/genealogy-web/src/features/reviews/ReviewCenterPage.tsx
frontend/genealogy-web/src/features/reviews/ReviewDiffPage.tsx
backend/genealogy-backend/src/main/java/com/genealogy/review/diff/application/ReviewDiffApplicationService.java
backend/genealogy-backend/src/main/java/com/genealogy/review/diff/controller/ReviewDiffController.java
```

### 2.10 人物新增前查重确认

已实现后端强校验：

- 新增人物时按宗族、姓名、支派、代次、字辈、出生日期检查疑似重复。
- 未携带 `confirmDuplicate=true` 时拒绝创建。

已实现前端全局确认：

- 所有前端调用 `POST /clans/{clanId}/persons` 时，如果后端提示疑似重复，会弹出确认框。
- 用户确认后，前端自动携带 `confirmDuplicate=true` 重试一次。

相关文件：

```text
backend/genealogy-backend/src/main/java/com/genealogy/person/dto/PersonCreateRequest.java
backend/genealogy-backend/src/main/java/com/genealogy/person/controller/PersonController.java
frontend/genealogy-web/src/shared/api/client.ts
```

### 2.11 复杂关系快捷入口

已实现：

前端入口：

```text
基础数据管理 → 关系 → 新建关系
```

快捷模板：

- 亲生父亲。
- 亲生母亲。
- 配偶。
- 养父。
- 养母。
- 养子女。
- 继嗣。
- 出嗣。

每个模板会自动设置：

- 关系类型。
- 关系标签。
- 是否世系关系。
- 是否血缘关系。

仍保留“冲突预检”。

相关文件：

```text
frontend/genealogy-web/src/features/relationships/RelationshipPage.tsx
frontend/genealogy-web/src/antd-bridge.css
```

### 2.12 在世人员隐私脱敏

已实现基础验收版：

- 在世人员。
- `privacyLevel=clan_only/private`。
- 非当前宗族有效成员查看时。

会隐藏：

- 出生日期。
- 出生地。
- 居住地。
- 传记。
- 墓葬信息。
- 墓志铭等敏感字段。

相关文件：

```text
backend/genealogy-backend/src/main/java/com/genealogy/person/application/PersonApplicationService.java
```

### 2.13 正式入谱准入规则

已实现基础验收版：

- `/persons/search` 默认只返回 `official`。
- 族谱首页、人物档案等正式展示类入口默认不展示草稿。
- 建谱向导和基础管理仍可通过宗族人物列表查看草稿，支持编辑和审核前维护。

相关文件：

```text
backend/genealogy-backend/src/main/java/com/genealogy/person/controller/PersonController.java
```

---

## 3. 前端菜单当前结构

主导航：

```text
族谱首页
建谱向导
世系图谱
人物档案
来源资料库
修谱工作台
审核中心
宗族文化
基础数据管理
```

基础数据管理 Tabs：

```text
宗族
成员权限
支派
字辈
关系
导入管理
来源附件
审核Diff
日志
```

相关文件：

```text
frontend/genealogy-web/src/app/App.tsx
```

---

## 4. 重要提交记录

本次会话涉及很多提交，关键提交包括：

```text
P0 导入/附件/查重/审核能力：
5687697 feat: add Apache POI for xlsx imports
830e63d feat: support xlsx person draft imports
6228cf5 feat: add import preview mapping and duplicate confirmation
1075f39 feat: expose import preview and mapping params
6254ddb feat: add import template preview mapping and duplicate confirmation UI

人物新增重复确认：
9589567 feat: add duplicate confirmation flag to person create
37a9923 feat: require duplicate confirmation before person create
f546b8d feat: globally confirm duplicate person creation

附件能力：
7152c2c feat: add safe source attachment file actions
ec8321e feat: expose source attachment download and remove APIs
b0b2cd8 feat: add source attachment download and delete actions

审核 Diff：
6187165 feat: add review diff field DTO
cd30984 feat: add review diff response DTO
f015753 feat: add review field diff service
db9772a feat: expose review diff APIs
e3698f2 feat: add review center with embedded diff modal
4b700fa feat: use embedded diff review center

复杂关系：
5a483aa feat: add complex relationship shortcuts
4bc04fe style: add relationship preset styles

正式入谱准入：
97c38c2 feat: default person search to official records

编译修复：
da34813 fix: pass duplicate confirmation flag in CSV person import

内网前端启动：
4583273 fix: allow intranet vite access and configurable api proxy
b19ef4e chore: align dev server port with intranet login url
```

---

## 5. 当前未修复启动阻断问题

### 5.1 问题现象

后端启动时报错：

```text
Ambiguous mapping. Cannot map 'sourceEvidenceController' method
SourceEvidenceController#listAttachmentsBySource(Long)
to {GET [/api/v1/sources/{sourceId}/attachments]}:
There is already 'sourceAttachmentController' bean method
```

### 5.2 根因

已有 Controller：

```text
backend/genealogy-backend/src/main/java/com/genealogy/source/controller/SourceEvidenceController.java
```

已经定义：

```http
GET /api/v1/sources/{sourceId}/attachments
```

新增 Controller：

```text
backend/genealogy-backend/src/main/java/com/genealogy/source/attachment/controller/SourceAttachmentController.java
```

也定义了同一个路径：

```http
GET /api/v1/sources/{sourceId}/attachments
```

Spring MVC 不允许两个 Controller 映射同一个 HTTP method + path，因此启动失败。

### 5.3 下一步建议修复方案

推荐不改原有 `SourceEvidenceController`，因为它已是既有证据附件体系的一部分。

建议把新增 `SourceAttachmentController` 的查询接口迁到独立命名空间：

```http
GET /api/v1/source-attachments/sources/{sourceId}
```

保留新增下载/删除接口：

```http
GET    /api/v1/source-attachments/{attachmentId}/content
DELETE /api/v1/source-attachments/{attachmentId}
```

同时同步前端：

```text
frontend/genealogy-web/src/features/sources/SourceAttachmentPage.tsx
```

把：

```text
GET /sources/{sourceId}/attachments
```

改为：

```text
GET /source-attachments/sources/{sourceId}
```

或者另一种方案：删除新增 `SourceAttachmentController` 的查询接口，直接复用原有 `SourceEvidenceController#listAttachmentsBySource`。但由于新增附件表为 `source_attachment`，原有接口返回的是旧 `AttachmentResponse`，两套模型不一致，因此更推荐独立命名空间。

---

## 6. 当前待实现 / P1 P2 待办

P0 闭环已基本完成，但仍有一些 P1/P2 增强项：

### P1 建议

- 修复第 5 节的 Controller 路径冲突。
- 对导入字段做自动识别，不只依赖手工列号。
- 在建谱向导中内嵌导入入口，而不只放在基础数据管理。
- 在来源资料库主页面内嵌附件上传，而不只放在基础数据管理。
- 审核中心支持批量 Diff、批量通过、批量驳回。
- 复杂关系在建谱向导中支持“一步式创建亲属 + 创建关系”。
- 来源附件支持在线预览。
- 来源附件支持物理清理策略和版本管理。

### P2 建议

- 简版族谱成册导出。
- 支派世系图。
- 宗族文化后端模型：堂号、家训、迁徙、祠堂、谱序、姓氏源流。
- 迁徙路线图。
- 更细颗粒度的角色字段权限策略。
- 在世人员不同角色可见字段配置化。
- 操作日志和审核流完整追踪页面增强。

---

## 7. 本地启动与验证建议

### 7.1 拉取代码

```bash
git checkout main
git pull origin main
```

### 7.2 后端启动

```bash
cd backend/genealogy-backend
mvn clean spring-boot:run
```

如果 Flyway 有失败记录：

```bash
mvn flyway:repair
mvn spring-boot:run
```

当前如果遇到第 5 节的 `Ambiguous mapping`，请先修复接口路径冲突。

### 7.3 前端启动

```bash
cd frontend/genealogy-web
npm install
npm run dev
```

默认前端端口：

```text
5179
```

访问：

```text
http://localhost:5179
```

内网访问：

```text
http://10.37.255.92:5179
```

如果后端不在前端机器本机 8080，可以设置：

```bash
VITE_API_PROXY_TARGET=http://10.37.255.92:8080 npm run dev
```

Windows PowerShell：

```powershell
$env:VITE_API_PROXY_TARGET="http://10.37.255.92:8080"
npm run dev
```

### 7.4 登录验证

登录接口必须使用 POST，不要直接浏览器地址栏打开：

```bash
curl -i -X POST http://10.37.255.92:5179/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo_admin","password":"Admin@123456"}'
```

---

## 8. 新会话优先处理事项

建议新会话第一句话可以这样说：

```text
请继续 gyguan/genealogy 仓库 MVP1 开发。先阅读 docs/10-mvp1-session-handoff.md，优先修复 SourceEvidenceController 与 SourceAttachmentController 的 /api/v1/sources/{sourceId}/attachments Ambiguous mapping 启动冲突，然后继续做 P1 增强。
```

优先级建议：

1. 修复附件 Controller 路径冲突，确保后端可启动。
2. 执行 `mvn clean compile`，修复剩余编译问题。
3. 执行前端 `npm run typecheck`，修复类型问题。
4. 走一遍 P0 验收流程：登录 → 建谱向导 → 导入预览 → 附件上传下载删除 → 审核 Diff → 世系图谱。
5. 再进入 P1 增强。
