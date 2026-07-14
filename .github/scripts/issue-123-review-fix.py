from pathlib import Path

path = Path('frontend/genealogy-web/src/features/logs/LogPage.tsx')
text = path.read_text(encoding='utf-8')
old = """  useEffect(() => {
    if (!workspace.clanId || initializedClan.current === workspace.clanId) return;
    pendingClanRestore.current = '';
    initializedClan.current = workspace.clanId;
"""
new = """  useEffect(() => {
    if (pendingClanRestore.current && pendingClanRestore.current !== workspace.clanId) return;
    if (!workspace.clanId || initializedClan.current === workspace.clanId) return;
    pendingClanRestore.current = '';
    initializedClan.current = workspace.clanId;
"""
if old not in text:
    raise RuntimeError('clan load guard anchor not found')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
