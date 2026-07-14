export function businessActorText(value) {
  const text = String(value ?? '').trim();
  return text || '未知操作者';
}

export function businessLogTargetText(log, targetTypeLabel) {
  const type = targetTypeLabel(log?.targetType);
  const name = String(log?.targetDisplayName || log?.targetSummary || log?.summary || '').trim() || '业务信息不可用';
  const branch = String(log?.targetBranchName || '').trim();
  return `${type}：${name}${branch ? `（${branch}）` : ''}`;
}

export function trackingObjectSelection(row, clanId, targetTypeLabel) {
  const parts = [row?.displayName, row?.branchName, row?.secondaryLabel]
    .map(value => String(value ?? '').trim())
    .filter(Boolean);
  const summary = `${targetTypeLabel(row?.objectType)}：${parts.join(' · ') || '业务信息不可用'}`;
  return {
    selection: {
      clanId: String(clanId ?? '').trim(),
      targetType: String(row?.objectType ?? '').trim(),
      targetId: row?.objectId == null ? '' : String(row.objectId),
      targetSummary: summary,
      reviewTaskId: row?.objectType === 'review_task' && row?.objectId != null ? String(row.objectId) : ''
    },
    summary
  };
}
