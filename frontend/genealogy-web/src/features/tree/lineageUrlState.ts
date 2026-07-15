import type { TreeDirection, TreeRelationScope } from '../../shared/api/generated/tree-types';

export type LineageMode = 'person' | 'branch';

export type LineageUrlState = {
  clanId: string;
  branchId: string;
  personId: string;
  mode: LineageMode;
  personDepth: string;
  branchDepth: string;
  direction: TreeDirection;
  relationScopes: TreeRelationScope[];
  includeSubBranches: boolean;
};

const DIRECTIONS = new Set<TreeDirection>(['family', 'ancestors', 'descendants', 'both']);
const RELATION_SCOPES = new Set<TreeRelationScope>(['blood', 'ritual', 'marriage', 'status']);
const PERSON_DEPTHS = new Set(['2', '3', '5', '8']);
const BRANCH_DEPTHS = new Set(['3', '5', '8', '12']);
const DEFAULT_RELATIONS: TreeRelationScope[] = ['blood', 'ritual', 'marriage'];

function valueOrDefault<T extends string>(value: string | null, allowed: ReadonlySet<T>, fallback: T): T {
  return value && allowed.has(value as T) ? value as T : fallback;
}

export function readLineageUrlState(input: string | URL): LineageUrlState {
  const url = typeof input === 'string' ? new URL(input, 'http://localhost') : input;
  const relationScopes = (url.searchParams.get('relations') || '')
    .split(',')
    .map(value => value.trim())
    .filter((value): value is TreeRelationScope => RELATION_SCOPES.has(value as TreeRelationScope));
  return {
    clanId: url.searchParams.get('clanId') || '',
    branchId: url.searchParams.get('branchId') || '',
    personId: url.searchParams.get('personId') || '',
    mode: url.searchParams.get('mode') === 'branch' ? 'branch' : 'person',
    personDepth: valueOrDefault(url.searchParams.get('personDepth'), PERSON_DEPTHS, '3'),
    branchDepth: valueOrDefault(url.searchParams.get('branchDepth'), BRANCH_DEPTHS, '8'),
    direction: valueOrDefault(url.searchParams.get('direction'), DIRECTIONS, 'both'),
    relationScopes: relationScopes.length ? relationScopes : DEFAULT_RELATIONS,
    includeSubBranches: url.searchParams.get('includeSubBranches') !== 'false'
  };
}

export function withLineageUrlState(input: string | URL, state: LineageUrlState) {
  const url = typeof input === 'string' ? new URL(input, 'http://localhost') : new URL(input.toString());
  const values: Record<string, string> = {
    clanId: state.clanId,
    branchId: state.branchId,
    personId: state.personId,
    mode: state.mode,
    personDepth: state.personDepth,
    branchDepth: state.branchDepth,
    direction: state.direction,
    relations: state.relationScopes.join(','),
    includeSubBranches: String(state.includeSubBranches)
  };
  Object.entries(values).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  });
  url.searchParams.delete('dataView');
  url.searchParams.delete('searchScope');
  return `${url.pathname}${url.search}${url.hash}`;
}
