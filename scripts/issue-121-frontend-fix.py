from pathlib import Path

path = Path(__file__).resolve().parents[1] / "frontend/genealogy-web/src/features/logs/LogPage.tsx"
text = path.read_text()
old_header = "{traceCoverage?.title || '未追踪'}"
new_header = "{traceCoverage?.level === 'complete' ? '完整覆盖' : traceCoverage?.level === 'minimal' ? '最小覆盖' : traceCoverage ? '部分覆盖' : '未追踪'}"
old_message = "message={traceCoverage.title}"
new_message = "message={traceCoverage.level === 'complete' ? '完整覆盖' : traceCoverage.level === 'minimal' ? '最小覆盖' : '部分覆盖'}"
if old_header not in text or old_message not in text:
    raise SystemExit('coverage display anchors not found')
path.write_text(text.replace(old_header, new_header, 1).replace(old_message, new_message, 1))
