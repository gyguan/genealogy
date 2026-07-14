from pathlib import Path

path = Path('frontend/genealogy-web/src/features/logs/LogPage.tsx')
text = path.read_text(encoding='utf-8')

replacements = [
    (
        """  const traceRequestVersion = useRef(0);\n  const initializedClan = useRef('');\n\n  useEffect(() => {\n    if (!initial.clanId || initial.clanId === workspace.clanId) return;\n    initializedClan.current = '';\n    workspace.patch({ clanId: initial.clanId, branchId: '' });\n  }, []);\n\n  useEffect(() => {\n    const search = writeTrackingCenterState({\n""",
        """  const traceRequestVersion = useRef(0);\n  const initializedClan = useRef('');\n  const pendingClanRestore = useRef(initial.clanId);\n\n  useEffect(() => {\n    if (!pendingClanRestore.current || pendingClanRestore.current === workspace.clanId) {\n      pendingClanRestore.current = '';\n      return;\n    }\n    initializedClan.current = '';\n    workspace.patch({ clanId: pendingClanRestore.current, branchId: '' });\n  }, []);\n\n  useEffect(() => {\n    if (pendingClanRestore.current && pendingClanRestore.current !== workspace.clanId) return;\n    const search = writeTrackingCenterState({\n"""
    ),
    (
        """      if (restored.clanId && restored.clanId !== workspace.clanId) {\n        initializedClan.current = '';\n        workspace.patch({ clanId: restored.clanId, branchId: '' });\n        return;\n      }\n""",
        """      if (restored.clanId && restored.clanId !== workspace.clanId) {\n        pendingClanRestore.current = restored.clanId;\n        initializedClan.current = '';\n        workspace.patch({ clanId: restored.clanId, branchId: '' });\n        return;\n      }\n"""
    ),
    (
        """  useEffect(() => {\n    if (!workspace.clanId || initializedClan.current === workspace.clanId) return;\n    initializedClan.current = workspace.clanId;\n""",
        """  useEffect(() => {\n    if (!workspace.clanId || initializedClan.current === workspace.clanId) return;\n    pendingClanRestore.current = '';\n    initializedClan.current = workspace.clanId;\n"""
    )
]

for old, new in replacements:
    if old not in text:
        raise RuntimeError(f'anchor not found: {old[:120]!r}')
    text = text.replace(old, new, 1)

path.write_text(text, encoding='utf-8')
