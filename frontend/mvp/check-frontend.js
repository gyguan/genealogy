const fs = require('fs');
const path = require('path');

const root = __dirname;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

const onclickRegex = /onclick="([a-zA-Z_$][\w$]*)\(/g;
const functionRegex = /function\s+([a-zA-Z_$][\w$]*)\s*\(/g;
const idsRegex = /id="([^"]+)"/g;
const getByIdRegex = /getElementById\('([^']+)'\)/g;
const getByIdDoubleRegex = /getElementById\("([^"]+)"\)/g;

const onclickFunctions = new Set();
let match;
while ((match = onclickRegex.exec(html)) !== null) {
  onclickFunctions.add(match[1]);
}

const declaredFunctions = new Set();
while ((match = functionRegex.exec(app)) !== null) {
  declaredFunctions.add(match[1]);
}

const ids = new Set();
while ((match = idsRegex.exec(html)) !== null) {
  ids.add(match[1]);
}

const referencedIds = new Set();
while ((match = getByIdRegex.exec(app)) !== null) {
  referencedIds.add(match[1]);
}
while ((match = getByIdDoubleRegex.exec(app)) !== null) {
  referencedIds.add(match[1]);
}

const errors = [];
for (const fn of onclickFunctions) {
  if (!declaredFunctions.has(fn)) {
    errors.push(`Missing JS function for onclick: ${fn}`);
  }
}

const dynamicIds = new Set(['view-${button.dataset.view}']);
for (const id of referencedIds) {
  if (dynamicIds.has(id)) continue;
  if (!ids.has(id)) {
    errors.push(`Missing HTML element id referenced by app.js: ${id}`);
  }
}

const requiredApiPaths = [
  '/auth/login',
  '/clans',
  '/members',
  '/relationships/check-conflict',
  '/attachments/upload',
  '/download',
  '/review-tasks/',
  '/logs/operations/stats',
  '/logs/operations/export.csv',
  '/imports/persons.csv/preview',
  '/imports/relations.csv/preview'
];

for (const apiPath of requiredApiPaths) {
  if (!app.includes(apiPath)) {
    errors.push(`Expected frontend API path fragment not found: ${apiPath}`);
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`MVP1 frontend static check passed. onclick=${onclickFunctions.size}, ids=${ids.size}`);
