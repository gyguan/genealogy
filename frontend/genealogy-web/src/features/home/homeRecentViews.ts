export type HomeView = 'treeProduct' | 'personArchive' | 'sourceLibrary' | 'culture' | 'editingWorkspace';
export type RecentView = { key: string; title: string; subtitle: string; kind: string; view: HomeView; visitedAt: string };

export function recentViewStorageKey(userKey: string, clanId: string) {
  return `genealogy.home.recent.${userKey}.${clanId || 'none'}`;
}

export function mergeRecentView(current: RecentView[], entry: Omit<RecentView, 'visitedAt'>, visitedAt = new Date().toISOString()) {
  return [{ ...entry, visitedAt }, ...current.filter(item => item.key !== entry.key)].slice(0, 6);
}

export function readRecentViews(storage: Pick<Storage, 'getItem'>, key: string): RecentView[] {
  try {
    const parsed = JSON.parse(storage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed.slice(0, 6) : [];
  } catch {
    return [];
  }
}

export function writeRecentViews(storage: Pick<Storage, 'setItem'>, key: string, entries: RecentView[]) {
  try { storage.setItem(key, JSON.stringify(entries)); } catch { /* storage is optional */ }
}
