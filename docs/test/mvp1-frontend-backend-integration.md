# MVP1 前后端联调说明

本文记录 MVP1 静态前端与 Spring Boot 后端的联调范围、检查方式和验收步骤。

## 一、当前联调结论

当前前端已对齐后端 MVP1 主要 API，覆盖：

```text
登录/注册
宗族创建与列表
成员权限管理
支派维护
字辈维护
人物录入、查询、隐私脱敏
关系冲突预检、创建、查询、删除
来源创建、来源绑定、绑定查询
附件上传、下载
审核提交、审核详情 diff、通过、驳回
世系家庭图、下延、上溯
人物/关系 CSV 模板下载、预校验、导入、导出
操作日志查询、统计、CSV 导出
```

## 二、已修复的联调问题

### 1. 分页响应字段不匹配

后端分页响应字段为：

```text
records
total
pageNo
pageSize
totalPages
```

前端原先只兼容 `items/content`，会导致宗族、人物、来源、日志等分页列表接口成功但页面显示为空。

已修复：

```text
frontend/mvp/app.js
```

现在统一兼容：

```text
records / items / content / data
```

### 2. 世系图中心节点展示不准确

后端世系图响应为：

```text
rootPersonId
nodes
edges
```

前端现在会从 `nodes` 中查找 `rootPersonId` 对应节点作为中心人物，同时展示 `edges` 关系边。

### 3. 本地跨域问题

新增后端 CORS 配置：

```text
backend/genealogy-backend/src/main/java/com/genealogy/common/config/WebMvcConfig.java
```

允许本地前端调试来源：

```text
http://localhost:*
http://127.0.0.1:*
```

因此可以直接用：

```bash
cd frontend/mvp
python3 -m http.server 5173
```

访问：

```text
http://localhost:5173
```

并调用：

```text
http://localhost:8080/api/v1
```

## 三、静态检查

新增前端静态检查脚本：

```text
frontend/mvp/check-frontend.js
```

检查内容：

```text
1. HTML 中 onclick 引用的函数，必须在 app.js 中存在。
2. app.js 中 getElementById 引用的静态 ID，必须在 HTML 中存在。
3. MVP1 关键 API 路径片段必须存在。
4. app.js 可通过 node --check 语法检查。
```

本地执行：

```bash
cd frontend/mvp
node --check app.js
node check-frontend.js
```

CI 已加入：

```text
MVP1 Frontend Static Check
```

## 四、本地完整联调步骤

### 1. 启动后端

```bash
cd backend/genealogy-backend
docker compose up -d
mvn spring-boot:run
```

健康检查：

```text
http://localhost:8080/api/v1/health
```

### 2. 启动前端

```bash
cd frontend/mvp
python3 -m http.server 5173
```

浏览器访问：

```text
http://localhost:5173
```

确认页面右上角 API 地址为：

```text
http://localhost:8080/api/v1
```

### 3. 推荐联调顺序

```text
1. 注册用户
2. 登录并确认 Token 自动填充
3. 创建宗族
4. 查询宗族列表
5. 创建支派
6. 创建字辈方案和字辈明细
7. 创建两个人物，至少一名在世人员
8. 匿名清空 Token 后查看在世人员，确认隐私字段脱敏
9. 重新登录，进行关系冲突预检
10. 创建亲子关系
11. 查询人物关系
12. 创建来源
13. 绑定来源到人物
14. 上传附件
15. 下载附件
16. 提交人物审核
17. 查询待审核任务
18. 查看审核详情 before/after diff
19. 审核通过
20. 查看家庭图、下延、上溯世系
21. 下载人物/关系模板
22. 执行人物/关系 CSV 预校验
23. 导出人物/关系 CSV
24. 查询操作日志
25. 查看日志统计
26. 导出日志 CSV
```

## 五、联调通过标准

```text
1. 所有页面按钮点击后不出现 JS 函数不存在错误。
2. 浏览器 Console 无 CORS 错误。
3. 所有主流程 API 返回成功响应或符合预期的业务错误。
4. 分页列表能正常显示 records 数据。
5. 审核详情能展示 oldPayload/newPayload。
6. 世系图能显示 root 节点和 edges。
7. 附件能上传并下载。
8. CSV 模板、导入预校验、导出均可用。
9. 操作日志查询、统计、导出均可用。
```

## 六、仍需人工实测的内容

当前代码仓已完成静态对齐和检查脚本，但以下内容需要在浏览器中人工确认：

```text
1. 页面交互体验是否符合预期。
2. 附件下载后的文件名和浏览器行为是否符合预期。
3. 大量数据下列表和世系图展示是否易读。
4. 不同浏览器下的兼容性。
```
