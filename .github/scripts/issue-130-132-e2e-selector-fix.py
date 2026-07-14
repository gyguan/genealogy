from pathlib import Path

path = Path('frontend/genealogy-web/e2e/auth-commercial.spec.ts')
text = path.read_text()
replacements = {
    "page.getByLabel('账号')": "page.getByRole('textbox', { name: '账号', exact: true })",
    "await page.getByRole('button', { name: '完成' }).click();": (
        "await page.getByRole('dialog', { name: '登录设备' }).locator('button.ant-modal-close').click();\n"
        "  await expect(page.getByRole('dialog', { name: '登录设备' })).toBeHidden();"
    ),
    "invitedPage.getByLabel('密码', { exact: true })": "invitedPage.getByLabel('设置密码', { exact: true })"
}
for old, new in replacements.items():
    if old not in text:
        raise SystemExit(f'selector marker not found: {old}')
    text = text.replace(old, new)
path.write_text(text)
