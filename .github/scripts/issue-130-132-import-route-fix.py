from pathlib import Path

path = Path('backend/genealogy-backend/src/main/java/com/genealogy/importexport/controller/CsvImportController.java')
text = path.read_text()
old_preview = '''    @PostMapping(value = {
            "/clans/{clanId}/imports/relationships/preview",
            "/clans/{clanId}/imports/relations/preview",
            "/clans/{clanId}/imports/relations.csv/preview"
    }, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
'''
new_preview = '''    @PostMapping(value = {
            "/clans/{clanId}/imports/relations/preview",
            "/clans/{clanId}/imports/relations.csv/preview"
    }, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
'''
old_import = '''    @PostMapping(value = {
            "/clans/{clanId}/imports/relationships",
            "/clans/{clanId}/imports/relations",
            "/clans/{clanId}/imports/relations.csv"
    }, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
'''
new_import = '''    @PostMapping(value = {
            "/clans/{clanId}/imports/relations",
            "/clans/{clanId}/imports/relations.csv"
    }, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
'''
if old_preview not in text or old_import not in text:
    raise SystemExit('expected import route fragments not found')
path.write_text(text.replace(old_preview, new_preview, 1).replace(old_import, new_import, 1))
