import { readFileSync, writeFileSync, rmSync } from 'node:fs';

const file = 'frontend/genealogy-web/src/features/logs/LogPage.tsx';
let source = readFileSync(file, 'utf8');
if (!source.includes("import { StandardQueryActions } from '../../shared/ui/StandardQueryActions';")) {
  source = source.replace("import { EmptyState } from '../../shared/ui/Feedback';\n", "import { EmptyState } from '../../shared/ui/Feedback';\nimport { StandardQueryActions } from '../../shared/ui/StandardQueryActions';\n");
}
source = source.replace(
  `      <Button type="link" className="tracking-more-button" icon={isExpanded ? <UpOutlined /> : <DownOutlined />} iconPosition="end" onClick={() => setExpanded(previous => ({ ...previous, [activeTab]: !isExpanded }))}>`,
  `      <Button data-query-action="more" type="link" className="tracking-more-button" icon={isExpanded ? <UpOutlined /> : <DownOutlined />} iconPosition="end" onClick={() => setExpanded(previous => ({ ...previous, [activeTab]: !isExpanded }))}>`
);
const before = `    return <div className="tracking-query-actions"><Space wrap>{moreButton()}<Button disabled={loading} onClick={reset}>重置</Button><Button type="primary" loading={loading} onClick={query}>查询</Button></Space></div>;`;
const after = `    return <div className="tracking-query-actions"><StandardQueryActions wrap>{moreButton()}<Button data-query-action="reset" disabled={loading} onClick={reset}>重置</Button><Button data-query-action="submit" type="primary" loading={loading} onClick={query}>查询</Button></StandardQueryActions></div>;`;
if (!source.includes(before)) throw new Error('Expected LogPage queryActions helper was not found');
source = source.replace(before, after);
writeFileSync(file, source);
rmSync('.github/workflows/issue-943-log-query-actions.yml', { force: true });
rmSync('scripts/issue-943-log-query-actions.mjs', { force: true });
