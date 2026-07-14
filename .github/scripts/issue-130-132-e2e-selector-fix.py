from pathlib import Path

path = Path('frontend/genealogy-web/e2e/auth-commercial.spec.ts')
text = path.read_text()
old = "page.getByLabel('账号')"
new = "page.getByRole('textbox', { name: '账号', exact: true })"
if old not in text:
    raise SystemExit('account selector marker not found')
path.write_text(text.replace(old, new))
