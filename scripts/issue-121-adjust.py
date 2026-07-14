from pathlib import Path

path = Path(__file__).resolve().parents[1] / 'backend/genealogy-backend/src/main/java/com/genealogy/tracking/application/TrackingTraceApplicationService.java'
text = path.read_text()
changes = [
    (
        'Segment<ReviewTaskEntity> reviewTaskSegment = loadReviewTasks(clanId, subject, revisionSegment.records());',
        'Segment<ReviewTaskEntity> reviewTaskSegment = loadReviewTasks(clanId, subject, revisionSegment.records(), scope);'
    ),
    (
        '''    private Segment<ReviewTaskEntity> loadReviewTasks(\n            Long clanId,\n            TraceSubject subject,\n            List<RevisionEntity> revisions\n    ) {''',
        '''    private Segment<ReviewTaskEntity> loadReviewTasks(\n            Long clanId,\n            TraceSubject subject,\n            List<RevisionEntity> revisions,\n            PermissionDataScope scope\n    ) {'''
    ),
    (
        '''        Page<ReviewTaskEntity> page = reviewTaskRepository\n                .findByClanIdAndRevisionIdInOrderByCreatedAtDesc(\n                        clanId,\n                        revisionIds,\n                        PageRequest.of(0, FETCH_LIMIT)\n                );''',
        '''        PageRequest pageRequest = PageRequest.of(0, FETCH_LIMIT);\n        Page<ReviewTaskEntity> page = scope.fullClanAccess()\n                ? reviewTaskRepository.findByClanIdAndRevisionIdInOrderByCreatedAtDesc(\n                        clanId, revisionIds, pageRequest)\n                : reviewTaskRepository.findByClanIdAndRevisionIdInAndBranchIdInOrderByCreatedAtDesc(\n                        clanId, revisionIds, scope.queryVisibleBranchIds(), pageRequest);'''
    )
]
for old, new in changes:
    if old not in text:
        raise SystemExit('expected source fragment was not found')
    text = text.replace(old, new, 1)
path.write_text(text)
