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
  personBranchId?: string;
  personRelationScopes?: TreeRelationScope[];
  branchRelationScopes?: TreeRelationScope[];
};

const DIRECTIONS = new Set<TreeDirection>(['family', 'ancestors', 'descendants', 'both']);
const RELATION_SCOPES = new Set<TreeRelationScope>(['blood', 'ritual', 'marriage', 'status']);
const PERSON_DEPTHS = new Set(['1', '2', '3']);
const BRANCH_DEPTHS = new Set(['3', '5', '8', '12']);
const DEFAULT_RELATIONS: TreeRelationScope[] = ['blood', 'ritual', 'marriage'];
const DEFAULT_PERSON_DEPTH = '1';
const DEFAULT_BRANCH_DEPTH = '8';
const DEFAULT_DIRECTION: TreeDirection = 'both';

function valueOrDefault<T extends string>(value: string | null, allowed: ReadonlySet<T>, fallback: T): T {
  return value && allowed.has(value as T) ? value as T : fallback;
}

function parseRelationScopes(value: string | null) {
  return (value || '')
    .split(',')
    .map(item => item.trim())
    .filter((item): item is TreeRelationScope => RELATION_SCOPES.has(item as TreeRelationScope));
}

function relationScopesOrDefault(value: string | null, fallback: TreeRelationScope[] = DEFAULT_RELATIONS) {
  const parsed = parseRelationScopes(value);
  return parsed.length ? parsed : [...fallback];
}

function sameRelations(left: TreeRelationScope[], right: TreeRelationScope[]) {
  return left.join(',') === right.join(',');
}

export function readLineageUrlState(input: string | URL): LineageUrlState {
  const url = typeof input === 'string' ? new URL(input, 'http://localhost') : input;
  const mode: LineageMode = url.searchParams.get('mode') === 'branch' ? 'branch' : 'person';
  const legacyBranchId = url.searchParams.get('branchId') || '';
  const legacyRelations = relationScopesOrDefault(url.searchParams.get('relations'));
  const personRelationScopes = relationScopesOrDefault(
    url.searchParams.get('personRelations'),
    legacyRelations
  );
  const branchRelationScopes = relationScopesOrDefault(
    url.searchParams.get('branchRelations'),
    legacyRelations
  );

  return {
    clanId: url.searchParams.get('clanId') || '',
    branchId: legacyBranchId || url.searchParams.get('personBranchId') || '',
    personBranchId: url.searchParams.get('personBranchId') || legacyBranchId,
    personId: url.searchParams.get('personId') || '',
    mode,
    personDepth: valueOrDefault(url.searchParams.get('personDepth'), PERSON_DEPTHS, DEFAULT_PERSON_DEPTH),
    branchDepth: valueOrDefault(url.searchParams.get('branchDepth'), BRANCH_DEPTHS, DEFAULT_BRANCH_DEPTH),
    direction: valueOrDefault(url.searchParams.get('direction'), DIRECTIONS, DEFAULT_DIRECTION),
    relationScopes: mode === 'branch' ? branchRelationScopes : personRelationScopes,
    personRelationScopes,
    branchRelationScopes,
    includeSubBranches: url.searchParams.get('includeSubBranches') !== 'false'
  };
}

export function withLineageUrlState(input: string | URL, state: LineageUrlState) {
  const current = typeof input === 'string' ? new URL(input, 'http://localhost') : new URL(input.toString());
  const url = new URL('/', current.origin);
  const personBranchId = state.personBranchId ?? state.branchId;
  const personRelationScopes = state.personRelationScopes ?? state.relationScopes;
  const branchRelationScopes = state.branchRelationScopes ?? state.relationScopes;

  url.searchParams.set('view', 'treeProduct');

  if (state.clanId) url.searchParams.set('clanId', state.clanId);
  if (state.branchId) url.searchParams.set('branchId', state.branchId);
  if (personBranchId && personBranchId !== state.branchId) {
    url.searchParams.set('personBranchId', personBranchId);
  }
  if (state.personId) url.searchParams.set('personId', state.personId);
  if (state.mode !== 'person') url.searchParams.set('mode', state.mode);
  if (state.personDepth !== DEFAULT_PERSON_DEPTH) url.searchParams.set('personDepth', state.personDepth);
  if (state.branchDepth !== DEFAULT_BRANCH_DEPTH) url.searchParams.set('branchDepth', state.branchDepth);
  if (state.direction !== DEFAULT_DIRECTION) url.searchParams.set('direction', state.direction);
  if (!sameRelations(personRelationScopes, DEFAULT_RELATIONS)) {
    url.searchParams.set('personRelations', personRelationScopes.join(','));
  }
  if (!sameRelations(branchRelationScopes, DEFAULT_RELATIONS)) {
    url.searchParams.set('branchRelations', branchRelationScopes.join(','));
  }
  if (!state.includeSubBranches) url.searchParams.set('includeSubBranches', 'false');

  return `${url.pathname}${url.search}${url.hash}`;
}
