from pathlib import Path

path = Path('frontend/genealogy-web/src/features/persons/PersonArchiveSearchPage.tsx')
text = path.read_text(encoding='utf-8')
old = """            <TrackingLinkButton
              clanId={workspace.clanId}
              targetType="person"
              targetId={selected.id || selected.personId}
            />
            {drawerMode === 'view' ? <Button onClick={startEdit}>编辑档案</Button> : <Button onClick={cancelEdit}>取消编辑</Button>}
"""
new = """            {drawerMode === 'view' ? (
              <TrackingLinkButton
                clanId={workspace.clanId}
                targetType="person"
                targetId={selected.id || selected.personId}
              />
            ) : null}
            {drawerMode === 'view' ? <Button onClick={startEdit}>编辑档案</Button> : <Button onClick={cancelEdit}>取消编辑</Button>}
"""
if old not in text:
    raise RuntimeError('person tracking entry anchor not found')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
