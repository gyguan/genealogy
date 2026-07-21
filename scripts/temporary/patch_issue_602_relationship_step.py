from pathlib import Path

path = Path("frontend/genealogy-web/src/features/mvp1/steps/relationship/RelationshipStep.tsx")
text = path.read_text(encoding="utf-8")

replacements = [
    (
        "import { ResultListCard } from '../../../../shared/ui/ResultListCard';\n",
        "import { ResultListCard } from '../../../../shared/ui/ResultListCard';\nimport { DraftDeleteButton } from '../../../../shared/ui/DraftDeleteButton';\n",
    ),
    (
        "import { createRelationshipApi, loadRelationships as queryRelationships, type RelationshipLike } from '../../services/relationshipService';\n",
        "import { createRelationshipApi, deleteRelationshipApi, loadRelationships as queryRelationships, type RelationshipLike } from '../../services/relationshipService';\n",
    ),
    (
        "  function selectRelationship(row: RelationshipLike) {\n",
        "  async function afterDeleteRelationship(row: RelationshipLike) {\n"
        "    const relationshipId = String(row.id || '');\n"
        "    setSelectedRelationshipRowKeys(prev => prev.filter(key => String(key) !== relationshipId));\n"
        "    if (workspace.relationshipId === relationshipId) workspace.setRelationshipId('');\n"
        "    await loadRelationships(centerPersonId || workspace.personId);\n"
        "  }\n\n"
        "  function selectRelationship(row: RelationshipLike) {\n",
    ),
    (
        "              {\n"
        "                key: 'tracking',\n"
        "                title: '操作',\n"
        "                width: 100,\n"
        "                render: (_value, row) => (\n"
        "                  <TrackingLinkButton size=\"small\" type=\"link\" clanId={workspace.clanId} targetType=\"relationship\" targetId={row.id} />\n"
        "                )\n"
        "              }\n",
        "              {\n"
        "                key: 'actions',\n"
        "                title: '操作',\n"
        "                width: 220,\n"
        "                render: (_value, row) => (\n"
        "                  <Space size={4} wrap>\n"
        "                    <TrackingLinkButton size=\"small\" type=\"link\" clanId={workspace.clanId} targetType=\"relationship\" targetId={row.id} />\n"
        "                    {row.id ? (\n"
        "                      <DraftDeleteButton\n"
        "                        object={row}\n"
        "                        objectName={relativeName(row, centerPersonId || workspace.personId)}\n"
        "                        objectType=\"关系\"\n"
        "                        onDelete={() => deleteRelationshipApi(row.id!)}\n"
        "                        onDeleted={() => afterDeleteRelationship(row)}\n"
        "                        label=\"删除草稿\"\n"
        "                        buttonProps={{ size: 'small', type: 'link' }}\n"
        "                      />\n"
        "                    ) : null}\n"
        "                  </Space>\n"
        "                )\n"
        "              }\n",
    ),
]

for old, new in replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one anchor, found {count}: {old[:100]!r}")
    text = text.replace(old, new, 1)

path.write_text(text, encoding="utf-8")
