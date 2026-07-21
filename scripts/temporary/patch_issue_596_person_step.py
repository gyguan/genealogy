from pathlib import Path

path = Path("frontend/genealogy-web/src/features/mvp1/steps/person/PersonStep.tsx")
text = path.read_text(encoding="utf-8")

replacements = [
    (
        "import { ResultListCard } from '../../../../shared/ui/ResultListCard';\n",
        "import { ResultListCard } from '../../../../shared/ui/ResultListCard';\nimport { DraftDeleteButton } from '../../../../shared/ui/DraftDeleteButton';\n",
    ),
    (
        "import { createPersonApi, loadPersons as queryPersons, type CreatePersonPayload, type PersonLike } from '../../services/personService';\n",
        "import { createPersonApi, deletePersonApi, loadPersons as queryPersons, type CreatePersonPayload, type PersonLike } from '../../services/personService';\n",
    ),
    (
        "  function selectPerson(row: PersonLike) {\n",
        "  async function afterDeletePerson(row: PersonLike) {\n"
        "    const personId = String(row.id || '');\n"
        "    setSelectedPersonRowKeys(prev => prev.filter(key => String(key) !== personId));\n"
        "    if (workspace.personId === personId) workspace.setPersonId('');\n"
        "    await loadPersons();\n"
        "  }\n\n"
        "  function selectPerson(row: PersonLike) {\n",
    ),
    (
        "              { key: 'dataStatus', title: '状态', width: 110, render: (_value, row) => <Tag color={statusColor(row)}>{statusText(row)}</Tag> }\n",
        "              { key: 'dataStatus', title: '状态', width: 110, render: (_value, row) => <Tag color={statusColor(row)}>{statusText(row)}</Tag> },\n"
        "              {\n"
        "                key: 'actions',\n"
        "                title: '操作',\n"
        "                width: 120,\n"
        "                render: (_value, row) => row.id ? (\n"
        "                  <DraftDeleteButton\n"
        "                    object={row}\n"
        "                    objectName={row.name}\n"
        "                    objectType=\"人物\"\n"
        "                    onDelete={() => deletePersonApi(row.id!)}\n"
        "                    onDeleted={() => afterDeletePerson(row)}\n"
        "                    label=\"删除草稿\"\n"
        "                    buttonProps={{ size: 'small' }}\n"
        "                  />\n"
        "                ) : null\n"
        "              }\n",
    ),
]

for old, new in replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one anchor, found {count}: {old[:80]!r}")
    text = text.replace(old, new, 1)

path.write_text(text, encoding="utf-8")
