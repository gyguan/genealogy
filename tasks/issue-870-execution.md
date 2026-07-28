# Issue #870 执行看板

## 实现

- [x] 定义并发用户、数据规模和负载模型；
- [x] 新增可重复执行的 k6 容量脚本；
- [x] 新增 PostgreSQL 隔离数据初始化脚本；
- [x] 新增 CI、容量和长稳三档负载配置；
- [x] 采集 P50/P95/P99、吞吐、错误率、JVM 和 PostgreSQL 指标；
- [x] 校验重复数据、部分正式数据、OOM、线程阻塞和死锁；
- [x] 生成容量报告并归档 Artifact；
- [x] 输出扩容触发条件和风险边界。

## 最终验证

- [ ] Capacity Load Test 通过；
- [ ] Backend CI 通过；
- [ ] Frontend CI 通过；
- [ ] Artifact ID 和 SHA-256 已记录；
- [ ] PR 已合并；
- [ ] Issue #870 已关闭；
- [ ] EPIC #869 已同步。
