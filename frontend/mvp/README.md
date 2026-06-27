# MVP1 Frontend

这是 MVP1 最小可演示前端，采用纯静态 HTML/CSS/JavaScript 实现，不引入构建链，适合作为本地验收和产品流程演示入口。

## 一、启动方式

先启动后端：

```bash
cd backend/genealogy-backend
docker compose up -d
mvn spring-boot:run
```

再启动前端静态服务：

```bash
cd frontend/mvp
python3 -m http.server 5173
```

浏览器访问：

```text
http://localhost:5173
```

默认 API 地址：

```text
http://localhost:8080/api/v1
```

页面右上角可以修改 API 地址，并会保存到浏览器 localStorage。

## 二、跨域说明

后端已允许本地前端调试来源：

```text
http://localhost:*
http://127.0.0.1:*
```

因此本地使用 `python3 -m http.server 5173` 打开前端时，可以直接调用后端 API。

## 三、覆盖页面

- 登录/注册
- 宗族创建与列表
- 成员权限管理
- 支派维护
- 字辈维护
- 人物录入、查询和隐私脱敏验证
- 关系维护、关系冲突预检、关系查询和删除
- 来源创建、来源绑定、附件上传和附件下载
- 审核提交、待审核查询、审核详情 before/after diff、通过/驳回
- 世系查看：家庭图、下延、上溯
- 人物/关系 CSV 模板下载、预校验、导入、导出
- 操作日志查询、统计和 CSV 导出

## 四、建议演示顺序

```text
1. 注册/登录
2. 创建宗族
3. 创建支派
4. 创建字辈方案和字辈明细
5. 创建人物
6. 创建关系前先做冲突预检
7. 创建关系
8. 创建资料来源并绑定人物
9. 上传附件并下载验证
10. 提交人物审核
11. 查看审核详情 before/after diff
12. 审核通过
13. 查看世系图
14. 查询操作日志、统计并导出 CSV
15. 下载人物/关系模板，进行导入预校验和导出
```

## 五、注意事项

- 宗族创建者会自动成为 `clan_admin`。
- 成员权限页面中的 `roleId` 需要结合系统预置角色 ID 使用。
- 附件下载、写操作、审核操作需要登录 token。
- 当前仍是静态 MVP 前端，不包含正式路由、组件化、权限菜单控制和生产级构建链。
