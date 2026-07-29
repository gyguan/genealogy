import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync('style-debt-exceptions.json', 'utf8'));
if (data.schemaVersion !== 2) throw new Error('style-debt-exceptions.json schemaVersion must be 2');
if (!Array.isArray(data.businessVisualRules)) throw new Error('businessVisualRules must be an array');

for (const rule of data.businessVisualRules) {
  for (const field of ['id', 'owner', 'filePattern', 'selectorPattern', 'featureRoot', 'responsibility']) {
    if (!rule[field]) throw new Error(`B-class rule ${rule.id || '<unknown>'} missing ${field}`);
  }
  new RegExp(rule.filePattern);
  new RegExp(rule.selectorPattern);
  if (/\.ant-/i.test(rule.selectorPattern)) throw new Error(`B-class rule ${rule.id} may not target Ant Design internals`);
}

const temporary = data.temporaryCompatibility;
for (const field of ['id', 'owner', 'reason', 'exitCondition', 'trackingIssue', 'reviewedAt', 'expiresAt']) {
  if (temporary?.[field] === undefined || temporary[field] === '') throw new Error(`C-class compatibility exception missing ${field}`);
}
if (!Number.isInteger(temporary.trackingIssue)) throw new Error('C-class trackingIssue must be an integer');
if (!/^\d{4}-\d{2}-\d{2}$/.test(temporary.reviewedAt)) throw new Error('C-class reviewedAt must be YYYY-MM-DD');
if (!/^\d{4}-\d{2}-\d{2}$/.test(temporary.expiresAt)) throw new Error('C-class expiresAt must be YYYY-MM-DD');
const expiry = new Date(`${temporary.expiresAt}T23:59:59Z`);
if (!Number.isFinite(expiry.getTime())) throw new Error('C-class expiresAt is invalid');
if (expiry < new Date()) throw new Error(`C-class exception ${temporary.id} expired at ${temporary.expiresAt}`);

const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
if (!repository || !token) throw new Error('GITHUB_REPOSITORY and GITHUB_TOKEN are required to verify C-class tracking issues.');

const response = await fetch(`https://api.github.com/repos/${repository}/issues/${temporary.trackingIssue}`, {
  headers: {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28'
  }
});
if (!response.ok) throw new Error(`Unable to verify tracking issue #${temporary.trackingIssue}: HTTP ${response.status}`);
const issue = await response.json();
if (issue.pull_request) throw new Error(`C-class tracking #${temporary.trackingIssue} must be an issue, not a pull request.`);
if (issue.state !== 'open') throw new Error(`C-class tracking issue #${temporary.trackingIssue} is ${issue.state}; remove the exception or reopen the issue.`);
console.log(`Verified B-class rules: ${data.businessVisualRules.length}`);
console.log(`Verified C-class tracking issue #${temporary.trackingIssue}: ${issue.title}`);
console.log(`C-class exception expires at ${temporary.expiresAt}.`);
