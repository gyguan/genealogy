import { apiClient } from '../../shared/api/client';
import type {
  TreeDataView,
  TreeDirection,
  TreeGraphResponse,
  TreeGraphWarning,
  TreeRelationScope,
  TreeTruncationReason
} from '../../shared/api/generated/tree-types';
import { buildBranchDepthGraph } from './branchDepthGraphModel.js';
import { readSearchPage, toPersonSearchItem, type PersonSearchItem, type SearchPage } from './lineageRequestState';
import { buildPersonCenteredGraph } from './personCenteredGraphModel.js';

export type GenericRow = Record<string, unknown>;
export type BranchRow = GenericRow & { id?: string | number; branchName?: string; parentId?: string | number };
export type ClanRow = GenericRow & { id?: string | number; clanName?: string; surname?: string };
export type LineageClientGraph = TreeGraphResponse & { clientLayoutMode?: 'person-centered' };

type PersonLineageInput = {
  personId: string;
  branchId?: string;
  direction: TreeDirection;
  relationScopes: TreeRelationScope[];
  dataView: TreeDataView;
  depth: string;
};

const MAX_PERSON_CENTER_FETCHES = 36;
const PERSON_CENTER_FETCH_CONCURRENCY = 6;
const MAX_PERSON_CENTER_MERGED_NODES = 240;

function asRecord(value: unknown): GenericRow {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as GenericRow : {};
}

function rows(data: unknown): GenericRow[] {
  if (Array.isArray(data)) return data.map(asRecord);
  const record = asRecord(data);
  for (const key of ['records', 'items', 'content']) {
    if (Array.isArray(record[key])) return (record[key] as unknown[]).map(asRecord);
  }
  return [];
}

function queryString(values: Record<string, string | number | boolean | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  return params.toString();
}

function currentLineageBranchId() {
  if (typeof window === 'undefined') return '';
  return new URL(window.location.href).searchParams.get('branchId') || '';
}

function normalizedPersonDepth(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(3, Math.max(1, Math.trunc(parsed)));
}

function chunks<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function graphPersonIds(graph: TreeGraphResponse) {
  return graph.nodes
    .map(node => node.personId ? String(node.personId) : '')
    .filter(Boolean);
}

function warningKey(warning: TreeGraphWarning) {
  return `${warning.code}:${warning.message}`;
}

function mergePersonGraphs(
  graphs: TreeGraphResponse[],
  requestedDepth: number,
  fetchLimited: boolean,
  failedFetchCount: number
) {
  const seed = graphs[0];
  const nodeMap = new Map<string, TreeGraphResponse['nodes'][number]>();
  const edgeMap = new Map<string, TreeGraphResponse['edges'][number]>();
  const warningMap = new Map<string, TreeGraphWarning>();
  const truncationReasons = new Set<TreeTruncationReason>();
  let nodeLimited = false;
  let cycleDetected = false;
  let duplicateEdgeCount = 0;
  let backendTruncated = false;

  graphs.forEach(graph => {
    backendTruncated ||= graph.meta.truncated;
    cycleDetected ||= graph.meta.cycleDetected;
    duplicateEdgeCount += graph.meta.duplicateEdgeCount;
    graph.meta.truncationReasons.forEach(reason => truncationReasons.add(reason));
    graph.warnings.forEach(warning => {
      const key = warningKey(warning);
      const previous = warningMap.get(key);
      warningMap.set(key, previous ? { ...warning, count: Math.max(previous.count, warning.count) } : warning);
    });
    graph.nodes.forEach(node => {
      if (nodeMap.has(node.nodeId)) return;
      if (nodeMap.size >= MAX_PERSON_CENTER_MERGED_NODES) {
        nodeLimited = true;
        return;
      }
      nodeMap.set(node.nodeId, node);
    });
    graph.edges.forEach(edge => {
      if (edge.edgeId && !edgeMap.has(edge.edgeId)) edgeMap.set(edge.edgeId, edge);
    });
  });

  const nodes = [...nodeMap.values()];
  const edges = [...edgeMap.values()].filter(edge => nodeMap.has(edge.fromNodeId) && nodeMap.has(edge.toNodeId));
  if (fetchLimited || nodeLimited) {
    truncationReasons.add('max_nodes');
    warningMap.set('node_limit_reached:person-center-closure', {
      code: 'node_limit_reached',
      message: `人物中心图谱扩展已受控停止，请缩小关系范围或展开深度（最多补查 ${MAX_PERSON_CENTER_FETCHES} 个人物）`,
      count: nodes.length
    });
  }
  if (failedFetchCount) {
    warningMap.set('partial_visibility:person-center-closure', {
      code: 'partial_visibility',
      message: `有 ${failedFetchCount} 个人物的扩展关系加载失败，当前结果可能不完整`,
      count: failedFetchCount
    });
  }

  return {
    ...seed,
    nodes,
    edges,
    warnings: [...warningMap.values()],
    meta: {
      ...seed.meta,
      requestedDepth,
      appliedDepth: requestedDepth,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      truncated: backendTruncated || fetchLimited || nodeLimited || failedFetchCount > 0,
      truncationReasons: [...truncationReasons],
      cycleDetected,
      duplicateEdgeCount
    }
  } satisfies TreeGraphResponse;
}

async function fetchPersonLineageSlice(input: PersonLineageInput, personId: string) {
  const query = queryString({
    branchId: input.branchId || currentLineageBranchId() || undefined,
    direction: input.direction,
    relationScopes: input.relationScopes.join(','),
    dataView: input.dataView,
    maxDepth: 1,
    maxNodes: 200,
    maxEdges: 400,
    refreshAt: Date.now()
  });
  return apiClient.get<TreeGraphResponse>(`/tree/person/${encodeURIComponent(personId)}?${query}`);
}

async function loadPersonRelationClosure(input: PersonLineageInput) {
  const requestedDepth = normalizedPersonDepth(input.depth);
  const seed = await fetchPersonLineageSlice(input, input.personId);
  if (requestedDepth === 1) return seed;

  const graphs = [seed];
  const fetchedPersonIds = new Set([input.personId]);
  let frontier = [...new Set(graphPersonIds(seed).filter(personId => personId !== input.personId))];
  let fetchLimited = false;
  let failedFetchCount = 0;

  for (let layer = 2; layer <= requestedDepth && frontier.length; layer += 1) {
    const candidates = frontier.filter(personId => !fetchedPersonIds.has(personId));
    const remaining = Math.max(0, MAX_PERSON_CENTER_FETCHES - fetchedPersonIds.size);
    if (candidates.length > remaining) fetchLimited = true;
    const selected = candidates.slice(0, remaining);
    if (!selected.length) break;
    selected.forEach(personId => fetchedPersonIds.add(personId));

    const layerGraphs: TreeGraphResponse[] = [];
    for (const batch of chunks(selected, PERSON_CENTER_FETCH_CONCURRENCY)) {
      const results = await Promise.allSettled(batch.map(personId => fetchPersonLineageSlice(input, personId)));
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          graphs.push(result.value);
          layerGraphs.push(result.value);
        } else {
          failedFetchCount += 1;
        }
      });
    }
    frontier = [...new Set(
      layerGraphs.flatMap(graphPersonIds).filter(personId => !fetchedPersonIds.has(personId))
    )];
  }

  return mergePersonGraphs(graphs, requestedDepth, fetchLimited, failedFetchCount);
}

export async function loadClans() {
  return rows(await apiClient.get('/clans')) as ClanRow[];
}

export async function loadBranches(clanId: string) {
  return rows(await apiClient.get(`/clans/${clanId}/branches`)) as BranchRow[];
}

export async function searchPersons(input: {
  clanId: string;
  branchId?: string;
  keyword: string;
  pageNo: number;
  pageSize?: number;
  branches: BranchRow[];
}): Promise<SearchPage<PersonSearchItem>> {
  const branchNames = new Map(input.branches.map(item => [String(item.id || ''), item.branchName || '未命名支派']));
  const query = queryString({
    clanId: input.clanId,
    branchId: input.branchId || currentLineageBranchId() || undefined,
    keyword: input.keyword.trim() || undefined,
    pageNo: input.pageNo,
    pageSize: input.pageSize || 20
  });
  const payload = await apiClient.get(`/persons/search?${query}`);
  return readSearchPage(payload, value => toPersonSearchItem(value, branchNames));
}

export async function loadPersonLineage(input: PersonLineageInput): Promise<LineageClientGraph> {
  const graph = await loadPersonRelationClosure(input);
  return buildPersonCenteredGraph(graph, input.depth);
}

export async function loadBranchLineage(input: {
  clanId: string;
  branchId: string;
  relationScopes: TreeRelationScope[];
  dataView: TreeDataView;
  includeSubBranches: boolean;
  depth: string;
}) {
  const query = queryString({
    relationScopes: input.relationScopes.join(','),
    dataView: input.dataView,
    includeSubBranches: input.includeSubBranches,
    maxDepth: input.depth,
    maxNodes: 500,
    maxEdges: 1000,
    refreshAt: Date.now()
  });
  const graph = await apiClient.get<TreeGraphResponse>(`/tree/clans/${input.clanId}/branches/${input.branchId}/lineage?${query}`);
  return buildBranchDepthGraph(graph, input.depth);
}
