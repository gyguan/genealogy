import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(process.cwd(), 'src');
const args = new Map(process.argv.slice(2).map(arg => {
  const [key, ...rest] = arg.split('=');
  return [key, rest.join('=')];
}));
const jsonPath = args.get('--json');
const markdownPath = args.get('--markdown');
const baselinePath = args.get('--baseline');

const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx']);
const excluded = [
  `${path.sep}generated${path.sep}`,
  '.test.',
  '.spec.',
  `${path.sep}__tests__${path.sep}`
];
const canonicalImplementationFiles = new Set([
  'src/shared/ui/Feedback.tsx'
]);

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    const extension = path.extname(entry.name);
    if (!sourceExtensions.has(extension)) return [];
    if (excluded.some(token => fullPath.includes(token))) return [];
    return [fullPath];
  });
}

const mechanisms = [
  {
    id: 'page_alert',
    name: '页面状态提示',
    target: '统一为 PageFeedback',
    patterns: [/<Alert\b/g]
  },
  {
    id: 'field_help',
    name: '字段辅助/校验提示',
    target: '保留 Field hint/help',
    patterns: [/\bhint\s*=/g, /\bhelp\s*=/g, /\bextra\s*=/g, /\bvalidateStatus\s*=/g]
  },
  {
    id: 'app_notify',
    name: '应用级操作反馈',
    target: '统一为 Feedback API',
    patterns: [/\bnotify\s*\(/g, /\bnotify\s*=\s*\{/g]
  },
  {
    id: 'antd_message',
    name: 'Ant Design Message',
    target: '迁移到 Feedback API',
    patterns: [/\bmessage\.(success|info|warning|error|loading)\s*\(/g, /\bmessageApi\.(success|info|warning|error|loading)\s*\(/g]
  },
  {
    id: 'antd_notification',
    name: 'Ant Design Notification',
    target: '仅保留跨页面重要通知',
    patterns: [/\bnotification\.(success|info|warning|error|open)\s*\(/g, /\bnotificationApi\.(success|info|warning|error|open)\s*\(/g]
  },
  {
    id: 'confirm_modal',
    name: '确认弹窗',
    target: '统一为 ConfirmAction',
    patterns: [/<Popconfirm\b/g, /\bModal\.confirm\s*\(/g, /\bmodal\.confirm\s*\(/g]
  },
  {
    id: 'empty_state',
    name: '空状态提示',
    target: '统一为 EmptyState',
    patterns: [/<Empty\b/g]
  },
  {
    id: 'tooltip_help',
    name: '悬浮帮助',
    target: '仅用于局部术语解释',
    patterns: [/<Tooltip\b/g]
  },
  {
    id: 'inline_semantic_text',
    name: '内联语义文本',
    target: '避免承担页面状态提示',
    patterns: [/<Typography\.Text\b[^>]*\btype\s*=\s*['"](warning|danger|secondary)['"]/g, /<Text\b[^>]*\btype\s*=\s*['"](warning|danger|secondary)['"]/g]
  },
  {
    id: 'custom_notice_class',
    name: '自定义提示条/提示样式',
    target: '迁移到统一组件',
    patterns: [/className\s*=\s*['"`][^'"`]*(notice|hint|tip|warning|alert|feedback|message|help|note|error|empty)[^'"`]*['"`]/gi]
  },
  {
    id: 'result_status',
    name: '结果页状态',
    target: '仅用于整页不可继续状态',
    patterns: [/<Result\b/g]
  }
];

const canonicalPatterns = [
  { id: 'page_feedback', name: 'PageFeedback', pattern: /<PageFeedback\b/g },
  { id: 'inline_feedback', name: 'InlineFeedback', pattern: /<InlineFeedback\b/g },
  { id: 'empty_state_component', name: 'EmptyState', pattern: /<EmptyState\b/g },
  { id: 'full_page_feedback', name: 'FullPageFeedback', pattern: /<FullPageFeedback\b/g },
  { id: 'confirm_action', name: 'ConfirmAction', pattern: /<ConfirmAction\b/g },
  { id: 'toast_stack', name: 'ToastStack', pattern: /<ToastStack\b/g }
];

function countMatches(source, pattern) {
  return [...source.matchAll(new RegExp(pattern.source, pattern.flags))].length;
}

const files = walk(root);
const fileSources = files.map(file => ({
  file,
  relative: path.relative(process.cwd(), file).replaceAll(path.sep, '/'),
  source: readFileSync(file, 'utf8')
}));
const legacySources = fileSources.filter(item => !canonicalImplementationFiles.has(item.relative));

const byMechanism = mechanisms.map(mechanism => {
  const occurrences = [];
  for (const item of legacySources) {
    const count = mechanism.patterns.reduce((total, pattern) => total + countMatches(item.source, pattern), 0);
    if (count > 0) occurrences.push({ file: item.relative, count });
  }
  occurrences.sort((left, right) => right.count - left.count || left.file.localeCompare(right.file));
  return {
    id: mechanism.id,
    name: mechanism.name,
    target: mechanism.target,
    count: occurrences.reduce((total, item) => total + item.count, 0),
    files: occurrences.length,
    topFiles: occurrences.slice(0, 12),
    occurrences
  };
});

const canonicalUsages = canonicalPatterns.map(item => ({
  id: item.id,
  name: item.name,
  count: fileSources.reduce((total, source) => total + countMatches(source.source, item.pattern), 0)
})).filter(item => item.count > 0);

const activeMechanisms = byMechanism.filter(item => item.count > 0);
const totalOccurrences = activeMechanisms.reduce((total, item) => total + item.count, 0);
const touchedFiles = new Set(activeMechanisms.flatMap(item => item.occurrences.map(entry => entry.file)));
const baseline = baselinePath
  ? JSON.parse(readFileSync(path.resolve(process.cwd(), baselinePath), 'utf8'))
  : null;
const regressions = baseline
  ? byMechanism
      .map(item => ({
        id: item.id,
        name: item.name,
        actual: item.count,
        maximum: Number(baseline.maxCounts?.[item.id] ?? 0)
      }))
      .filter(item => item.actual > item.maximum)
  : [];

const result = {
  generatedAt: new Date().toISOString(),
  sourceFiles: files.length,
  mechanismTypes: activeMechanisms.length,
  totalOccurrences,
  touchedFiles: touchedFiles.size,
  canonicalUsages,
  baseline: baseline ? { version: baseline.version, regressions } : null,
  mechanisms: activeMechanisms
};

const markdown = [
  '# 前端提示与反馈审计',
  '',
  `- 扫描源码文件：${result.sourceFiles}`,
  `- 识别历史提示机制：${result.mechanismTypes} 类`,
  `- 历史机制使用点：${result.totalOccurrences} 处`,
  `- 涉及文件：${result.touchedFiles} 个`,
  `- 标准组件使用：${canonicalUsages.map(item => `${item.name} ${item.count}`).join('、') || '0'}`,
  baseline ? `- 基线检查：${regressions.length ? `失败（${regressions.length} 类增加）` : '通过（存量未增加）'}` : '- 基线检查：未启用',
  '',
  '| 类型 | 使用点 | 文件数 | 统一方向 |',
  '|---|---:|---:|---|',
  ...activeMechanisms.map(item => `| ${item.name} | ${item.count} | ${item.files} | ${item.target} |`),
  '',
  ...(regressions.length ? [
    '## 基线回退',
    '',
    ...regressions.map(item => `- ${item.name}：${item.actual}，允许上限 ${item.maximum}`),
    ''
  ] : []),
  ...activeMechanisms.flatMap(item => [
    `## ${item.name}`,
    '',
    ...item.topFiles.map(entry => `- ${entry.count} × \`${entry.file}\``),
    ''
  ])
].join('\n');

console.log(markdown);
if (jsonPath) writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`);
if (markdownPath) writeFileSync(markdownPath, `${markdown}\n`);
if (regressions.length) process.exitCode = 1;
