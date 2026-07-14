export type LineageRequestScope = 'clan' | 'search' | 'personGraph' | 'branchGraph';

export type RequestToken = {
  scope: LineageRequestScope;
  version: number;
  clanKey: string;
};

export class LineageRequestGate {
  private versions = new Map<LineageRequestScope, number>();
  private clanKey = '';

  resetClan(clanKey: string) {
    this.clanKey = clanKey;
    this.invalidateAll();
  }

  begin(scope: LineageRequestScope): RequestToken {
    const version = (this.versions.get(scope) || 0) + 1;
    this.versions.set(scope, version);
    return { scope, version, clanKey: this.clanKey };
  }

  isCurrent(token: RequestToken) {
    return token.clanKey === this.clanKey && this.versions.get(token.scope) === token.version;
  }

  invalidate(scope: LineageRequestScope) {
    this.versions.set(scope, (this.versions.get(scope) || 0) + 1);
  }

  invalidateAll() {
    (['clan', 'search', 'personGraph', 'branchGraph'] as LineageRequestScope[])
      .forEach(scope => this.invalidate(scope));
  }
}

export type PersonSearchItem = {
  id: string;
  name: string;
  alias: string;
  generation: string;
  branchId: string;
  branchName: string;
  label: string;
};

function text(value: unknown) {
  return value === null || value === undefined ? '' : String(value).trim();
}

export function toPersonSearchItem(
  value: Record<string, unknown>,
  branchNames: ReadonlyMap<string, string>
): PersonSearchItem {
  const id = text(value.id || value.personId);
  const name = text(value.name || value.personName || value.displayName) || '未命名人物';
  const alias = text(value.courtesyName || value.artName || value.alias || value.personCode);
  const generationNo = Number(value.generationNo || value.generation || value.generationNumber);
  const generation = Number.isFinite(generationNo) && generationNo > 0 ? `${generationNo}世` : '世次未维护';
  const branchId = text(value.branchId || (value.branch && typeof value.branch === 'object' ? (value.branch as Record<string, unknown>).id : ''));
  const branchName = text(value.branchName) || branchNames.get(branchId) || '支派未标注';
  const businessDetails = [alias, generation, branchName].filter(Boolean).join(' · ');
  return { id, name, alias, generation, branchId, branchName, label: `${name}${businessDetails ? ` · ${businessDetails}` : ''}` };
}

export type SearchPage<T> = {
  records: T[];
  total: number;
  pageNo: number;
  pageSize: number;
  totalPages: number;
};

export function readSearchPage<T>(payload: unknown, mapper: (value: Record<string, unknown>) => T): SearchPage<T> {
  const record = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : {};
  const source = Array.isArray(payload)
    ? payload
    : Array.isArray(record.records)
      ? record.records
      : Array.isArray(record.items)
        ? record.items
        : Array.isArray(record.content)
          ? record.content
          : [];
  const records = source
    .filter(value => value && typeof value === 'object' && !Array.isArray(value))
    .map(value => mapper(value as Record<string, unknown>));
  const pageNo = Math.max(1, Number(record.pageNo || record.number || 1));
  const pageSize = Math.max(1, Number(record.pageSize || record.size || records.length || 20));
  const total = Math.max(records.length, Number(record.total || record.totalElements || records.length));
  const totalPages = Math.max(1, Number(record.totalPages || Math.ceil(total / pageSize)));
  return { records, total, pageNo, pageSize, totalPages };
}
