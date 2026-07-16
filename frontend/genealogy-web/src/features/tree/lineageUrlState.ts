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
const DEFAULT_PERSON_DEPTH = '3';
const DEFAULT_BRANCH_DEPTH = '8';
const DEFAULT_DIRECTION: TreeDirection = 'both';

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
    personDepth: valueOrDefault(url.searchParams.get('personDepth'), PERSON_DEPTHS, DEFAULT_PERSON_DEPTH),
    branchDepth: valueOrDefault(url.searchParams.get('branchDepth'), BRANCH_DEPTHS, DEFAULT_BRANCH_DEPTH),
    direction: valueOrDefault(url.searchParams.get('direction'), DIRECTIONS, DEFAULT_DIRECTION),
    relationScopes: relationScopes.length ? relationScopes : DEFAULT_RELATIONS,
    includeSubBranches: url.searchParams.get('includeSubBranches') !== 'false'
  };
}

export function withLineageUrlState(input: string | URL, state: LineageUrlState) {
  const current = typeof input === 'string' ? new URL(input, 'http://localhost') : new URL(input.toString());
  const url = new URL('/', current.origin);
  url.searchParams.set('view', 'treeProduct');

  if (state.clanId) url.searchParams.set('clanId', state.clanId);
  if (state.branchId) url.searchParams.set('branchId', state.branchId);
  if (state.personId) url.searchParams.set('personId', state.personId);
  if (state.mode !== 'person') url.searchParams.set('mode', state.mode);
  if (state.personDepth !== DEFAULT_PERSON_DEPTH) url.searchParams.set('personDepth', state.personDepth);
  if (state.branchDepth !== DEFAULT_BRANCH_DEPTH) url.searchParams.set('branchDepth', state.branchDepth);
  if (state.direction !== DEFAULT_DIRECTION) url.searchParams.set('direction', state.direction);
  if (state.relationScopes.join(',') !== DEFAULT_RELATIONS.join(',')) {
    url.searchParams.set('relations', state.relationScopes.join(','));
  }
  if (!state.includeSubBranches) url.searchParams.set('includeSubBranches', 'false');

  return `${url.pathname}${url.search}${url.hash}`;
}
