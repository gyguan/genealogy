from pathlib import Path
import re

root = Path('frontend/genealogy-web/src')

# Retire lineage-only five/three-column query CSS; shared query contract owns 4 -> 2 -> 1.
css_path = root / 'features/tree/lineage-tabbed-page.css'
css = css_path.read_text()
for pattern in [
    r'\n\.lineage-tab-query-form \{.*?\n\}',
    r'\n\.lineage-tab-query-grid \{.*?\n\}',
    r'\n\.lineage-tab-query-actions \{.*?\n\}',
]:
    css = re.sub(pattern, '', css, count=1, flags=re.S)
css = re.sub(r'\n@media \(max-width: 1280px\) \{\n  \.lineage-tab-query-form.*?\n\}', '', css, count=1, flags=re.S)
css = css.replace('  .lineage-tab-query-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }\n', '')
css = css.replace('  .lineage-tab-query-grid { grid-template-columns: 1fr; }\n', '')
css = css.replace('  .lineage-tab-query-actions { width: 100%; }\n', '')
css_path.write_text(css)

# Update pre-existing tree layout governance to the new shared query contract.
test_path = root / 'features/tree/LineageResultToolbarLayout.test.mjs'
test = test_path.read_text()
test = test.replace(
    '  assert.match(pageSource, /<Card className="lineage-tabbed-query-card" title="世系图谱"/);',
    '  assert.match(pageSource, /<StandardQueryPanel[\\s\\S]*className="lineage-tabbed-query-card"/);'
)
test = test.replace(
    '  assert.match(pageCss, /\\.lineage-tab-query-grid\\s*\\{[\\s\\S]*?grid-template-columns:\\s*repeat\\(5,/);',
    '  assert.doesNotMatch(pageCss, /lineage-tab-query-grid|repeat\\((3|5),/);'
)
test = test.replace(
    '  assert.match(pageSource, /<Field label="中心人物" hint="仅影响人物中心图谱">/);',
    '  assert.match(pageSource, /<StandardQueryField label="中心人物" hint="仅影响人物中心图谱">/);'
)
test = test.replace(
    "  assert.match(pageCss, /@media \\(max-width: 1280px\\)[\\s\\S]*?grid-template-columns:\\s*repeat\\(3,/);\n  assert.match(pageCss, /@media \\(max-width: 900px\\)[\\s\\S]*?grid-template-columns:\\s*repeat\\(2,/);\n  assert.match(pageCss, /@media \\(max-width: 767px\\)[\\s\\S]*?grid-template-columns:\\s*1fr;/);\n",
    "  assert.doesNotMatch(pageCss, /lineage-tab-query-grid|lineage-tab-query-actions/);\n"
)
test_path.write_text(test)
