import fs from 'node:fs/promises';

const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY || 'gyguan/genealogy';
const [owner, repo] = repository.split('/');
const roleIssues = [902, 903, 904, 905, 906];
const dataIssue = 910;
const signoffIssue = 907;
const allIssues = [...roleIssues, dataIssue, signoffIssue];

if (!token) throw new Error('GITHUB_TOKEN is required');

async function api(path) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  if (!response.ok) throw new Error(`${response.status} ${path}: ${await response.text()}`);
  return response.json();
}

function hasValue(text, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|\\n)\\s*[-*]?\\s*${escaped}\\s*[:：]\\s*\\S+`, 'm').test(text);
}

function evaluate(issue, comments) {
  const text = comments.map((comment) => comment.body || '').join('\n');
  const commonFields = ['执行人姓名/业务身份', '执行日期', '实际完成时间', '任务结果'];
  const missing = issue.number === signoffIssue
    ? ['参与人员与业务身份', '验收日期', 'P0 完成数/总数', '发布建议', '业务负责人姓名', '签署日期', '签署证据或受控文档位置'].filter((field) => !hasValue(text, field))
    : issue.number === dataIssue
      ? ['数据准备人及职责', '数据来源和脱敏方式', '数据核验人', '核验日期', '可用于 UAT'].filter((field) => !hasValue(text, field))
      : commonFields.filter((field) => !hasValue(text, field));
  return {
    number: issue.number,
    title: issue.title,
    state: issue.state,
    comments: comments.length,
    evidenceComplete: issue.state === 'closed' && missing.length === 0,
    missing
  };
}

const results = [];
for (const number of allIssues) {
  const [issue, comments] = await Promise.all([
    api(`/repos/${owner}/${repo}/issues/${number}`),
    api(`/repos/${owner}/${repo}/issues/${number}/comments?per_page=100`)
  ]);
  results.push(evaluate(issue, comments));
}

const roles = results.filter((item) => roleIssues.includes(item.number));
const data = results.find((item) => item.number === dataIssue);
const signoff = results.find((item) => item.number === signoffIssue);
const completedRoles = roles.filter((item) => item.evidenceComplete).length;
const signoffAllowed = completedRoles === roleIssues.length && data?.evidenceComplete;
const closureReady = signoffAllowed && signoff?.evidenceComplete;

const summary = {
  generatedAt: new Date().toISOString(),
  repository,
  parentIssue: 874,
  completedRoles,
  totalRoles: roleIssues.length,
  p0CompletionRate: completedRoles / roleIssues.length,
  dataReady: Boolean(data?.evidenceComplete),
  signoffAllowed: Boolean(signoffAllowed),
  signoffComplete: Boolean(signoff?.evidenceComplete),
  closureReady: Boolean(closureReady),
  results
};

await fs.mkdir('uat-results', { recursive: true });
await fs.writeFile('uat-results/issue-874-summary.json', `${JSON.stringify(summary, null, 2)}\n`);

const rows = results.map((item) => `| #${item.number} | ${item.state} | ${item.comments} | ${item.evidenceComplete ? '完整' : '缺失'} | ${item.missing.join('、') || '-'} |`).join('\n');
const report = `# Issue #874 UAT 自动汇总\n\n- 生成时间：${summary.generatedAt}\n- 角色完成：${completedRoles}/${roleIssues.length}\n- P0 完成率：${(summary.p0CompletionRate * 100).toFixed(0)}%\n- 脱敏数据就绪：${summary.dataReady ? '是' : '否'}\n- 允许业务签署：${summary.signoffAllowed ? '是' : '否'}\n- 签署完整：${summary.signoffComplete ? '是' : '否'}\n- 可关闭 #874：${summary.closureReady ? '是' : '否'}\n\n| Issue | 状态 | 评论数 | 证据 | 缺失字段 |\n|---|---|---:|---|---|\n${rows}\n\n> 本报告只校验证据完整性，不验证执行人业务身份，也不能替代真实业务负责人签署。\n`;
await fs.writeFile('uat-results/issue-874-summary.md', report);
console.log(report);

if (process.env.STRICT_CLOSURE === 'true' && !closureReady) process.exitCode = 2;
