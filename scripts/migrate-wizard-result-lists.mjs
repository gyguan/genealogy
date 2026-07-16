import fs from 'node:fs';

// One-time source migration for issue #372. This file is deleted after the branch is transformed.
const files = [
  'frontend/genealogy-web/src/features/mvp1/steps/branch/BranchStep.tsx',
  'frontend/genealogy-web/src/features/mvp1/steps/generation/GenerationStep.tsx',
  'frontend/genealogy-web/src/features/mvp1/steps/person/PersonStep.tsx',
  'frontend/genealogy-web/src/features/mvp1/steps/relationship/RelationshipStep.tsx',
  'frontend/genealogy-web/src/features/mvp1/steps/source/SourceStageStep.tsx'
];

for (const file of files) {
  let source = fs.readFileSync(file, 'utf8');
  source = source.replace(/import \{([^}]+)\} from 'antd';/, (_match, imports) => {
    const next = imports
      .split(',')
      .map(item => item.trim())
      .filter(item => item && item !== 'Table')
      .join(', ');
    return `import { ${next} } from 'antd';`;
  });

  if (!source.includes("shared/ui/ResultListCard")) {
    const panelImport = "import { Panel } from '../../../../shared/ui/Panel';";
    if (!source.includes(panelImport)) throw new Error(`Panel import not found in ${file}`);
    source = source.replace(panelImport, `${panelImport}\nimport { ResultListCard } from '../../../../shared/ui/ResultListCard';`);
  }

  source = source.replace(/<Table</g, '<ResultListCard');
  fs.writeFileSync(file, source);
}
