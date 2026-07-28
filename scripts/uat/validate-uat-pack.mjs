import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const scenarioPath = path.join(root, 'docs/testing/uat/issue-874-scenarios.json');
const outputDir = path.join(root, 'uat-results');
fs.mkdirSync(outputDir, { recursive: true });

const data = JSON.parse(fs.readFileSync(scenarioPath, 'utf8'));
const errors = [];
const roleIds = new Set();
const taskIds = new Set();
let p0Count = 0;

if (data.issue !== 874) errors.push('issue must be 874');
if (!Array.isArray(data.roles) || data.roles.length !== 5) errors.push('exactly five business roles are required');

for (const role of data.roles || []) {
  if (!role.id || !role.name) errors.push('every role needs id and name');
  if (roleIds.has(role.id)) errors.push(`duplicate role id: ${role.id}`);
  roleIds.add(role.id);
  if (!Array.isArray(role.tasks) || role.tasks.length === 0) errors.push(`role ${role.id} has no tasks`);
  for (const task of role.tasks || []) {
    if (!task.id || !task.name || !task.expected) errors.push(`incomplete task under ${role.id}`);
    if (taskIds.has(task.id)) errors.push(`duplicate task id: ${task.id}`);
    taskIds.add(task.id);
    if (task.priority === 'P0') p0Count += 1;
    if (!Number.isFinite(task.targetMinutes) || task.targetMinutes <= 0) errors.push(`invalid targetMinutes: ${task.id}`);
  }
}

const expectedRoles = ['clan-admin', 'editor', 'reviewer', 'viewer', 'business-owner'];
for (const id of expectedRoles) if (!roleIds.has(id)) errors.push(`missing role: ${id}`);
if (p0Count < 8) errors.push('at least eight P0 tasks are required');

const rules = data.releaseRules || {};
if (rules.p0CompletionRate !== 1) errors.push('P0 completion rate must be 100%');
if (rules.blockerCount !== 0 || rules.dataErrorCount !== 0 || rules.permissionErrorCount !== 0) {
  errors.push('release rules must block on blocker/data/permission errors');
}
if (rules.requiresBusinessSignature !== true) errors.push('business signature must be mandatory');

const evidence = new Set(data.requiredEvidence || []);
for (const item of ['participant-register.csv','task-results.csv','feedback-register.csv','booklet-sample.pdf','screenshots-or-video','uat-signoff.md']) {
  if (!evidence.has(item)) errors.push(`missing evidence requirement: ${item}`);
}

const result = {
  issue: 874,
  readyForBusinessUat: errors.length === 0,
  automatedSignoff: false,
  roles: roleIds.size,
  p0Tasks: p0Count,
  requiredEvidence: evidence.size,
  errors
};
fs.writeFileSync(path.join(outputDir, 'uat-readiness.json'), JSON.stringify(result, null, 2));
fs.writeFileSync(path.join(outputDir, 'uat-readiness-report.md'), [
  '# Issue #874 UAT Readiness Report',
  '',
  `- Roles: ${result.roles}`,
  `- P0 tasks: ${result.p0Tasks}`,
  `- Required evidence items: ${result.requiredEvidence}`,
  `- Ready for formal business UAT: ${result.readyForBusinessUat ? 'YES' : 'NO'}`,
  '- Automated business sign-off: NO',
  '',
  'This validator proves the UAT package is complete and internally consistent. It does not represent a real business participant or business-owner signature.',
  '',
  errors.length ? `Errors:\n${errors.map((e) => `- ${e}`).join('\n')}` : 'Validation errors: 0'
].join('\n'));

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`UAT readiness passed: roles=${roleIds.size}, p0Tasks=${p0Count}`);
