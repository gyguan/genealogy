import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
          import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../../', import.meta.url));

function files(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

const source = files(root)
  .filter(path => path.endsWith('.tsx'))
  .map(path => readFileSync(path, 'utf8'))
  .join('\n');

test('removes duplicated persistent page guidance', () => {
  [
    '宗族公共主页',
    '公开汇总数据，不包含审核、风险或内部作业状态。',
    '人物档案详情与证据追踪',
    '档案状态由领域动作管理',
    '档案状态未发生变化，可以继续修改或执行合法状态动作。',
    '来源资料库 / 来源详情',
    '管理族规家训、人物传记、堂号郡望、祭祀礼仪等文化资料。',
    '按时间、地点和支派梳理宗族迁徙事件，不拼接或推测缺失路线。',
    '管理祠堂、祖居、墓园、纪念设施等宗族文化空间。',
    '按导入对象、状态、文件或时间筛选导入任务。',
    '共找到 {total} 条修谱任务',
    '分页查看待审任务、我提交的审核进展和本人已处理记录；筛选与权限范围均由服务端执行。',
    '按角色与数据范围查看成员授权，权限变更由后端执行越级、范围和最后管理员校验。',
    '选择宗族后查看审计结果'
  ].forEach(text => assert.equal(source.includes(text), false, text));
});

test('keeps risk, permission and workflow guidance', () => {
  [
    '当前修改尚未保存，返回后将无法恢复。',
    '新增引用提交后需审核通过才会正式生效。',
    '选择范围仅限当前页；批量操作完成后保留当前筛选和分页。',
    '刷新失败，当前仍展示上一次成功结果',
    '成员与权限按角色与数据范围共同生效'
  ].forEach(text => assert.equal(source.includes(text), true, text));
});
