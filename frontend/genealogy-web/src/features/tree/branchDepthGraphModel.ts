import type {
  TreeEdgeResponse,
  TreeGraphResponse,
  TreeGraphWarning,
  TreeNodeResponse,
  TreeTruncationReason
} from '../../shared/api/generated/tree-types';

const PARENT_RELATION_TYPES = new Set<TreeEdgeResponse['relationType']>([
  'parent_child',
  'adoptive',
  'successor',
  'out_adoption',
  'in_adoption',
  'dual_successor',
  'heir_son'
]);

function isLineageEdge(edge: TreeEdgeResponse) {
  if (edge.relationCategory === 'marriage' || edge.relationCategory === 'status') return false;
  return Boolean(edge.isLineageRelation || PARENT_RELATION_TYPES.has(edge.relationType));
}

function normalizedDepth(value: number | string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(20, Math.max(1, Math.trunc(parsed)));
}

function nodeCompare(left: TreeNodeResponse, right: TreeNodeResponse) {
  const generation = (left.generationNo ?? Number.MAX_SAFE_INTEGER)
    - (right.generationNo ?? Number.MAX_SAFE_INTEGER);
  if (generation) return generation;
  const name = left.displayName.localeCompare(right.displayName, 'zh-CN');
  return name || left.nodeId.localeCompare(right.nodeId);
}

function uniqueGraph(graph: TreeGraphResponse) {
  const nodeMap = new Map<string, TreeNodeResponse>();
  graph.nodes.forEach(node => {
    if (node.nodeId && !nodeMap.has(node.nodeId)) nodeMap.set(node.nodeId, node);
  });
  const edgeMap = new Map<string, TreeEdgeResponse>();
  graph.edges.forEach(edge => {
    if (!edge.edgeId || edgeMap.has(edge.edgeId)) return;
    if (!nodeMap.has(edge.fromNodeId) || !nodeMap.has(edge.toNodeId)) return;
    edgeMap.set(edge.edgeId, edge);
  });
  return { nodeMap, edges: [...edgeMap.values()] };
}

function connectedComponents(nodeIds: string[], edges: TreeEdgeResponse[]) {
  const adjacency = new Map(nodeIds.map(id => [id, [] as string[]]));
  edges.forEach(edge => {
    adjacency.get(edge.fromNodeId)?.push(edge.toNodeId);
    adjacency.get(edge.toNodeId)?.push(edge.fromNodeId);
  });

  const visited = new Set<string>();
  const components: string[][] = [];
  nodeIds.forEach(start => {
    if (visited.has(start)) return;
    const queue = [start];
    const component: string[] = [];
    visited.add(start);
    while (queue.length) {
      const current = queue.shift() as string;
      component.push(current);
      for (const next of adjacency.get(current) || []) {
        if (visited.has(next)) continue;
        visited.add(next);
        queue.push(next);
      }
    }
    components.push(component);
  });
  return components;
}

/**
 * 支派全局图谱按“代（含本代）”进行客户端兜底裁剪。
 *
 * 后端支派查询可能将每代配偶等无父级入边人物作为新的遍历根，导致较小深度
 * 仍覆盖深代后裔。这里把婚配/状态关系视为同代（权重 0），父子/宗法承嗣关系
 * 视为下一代（权重 1），从每个完整关系连通分量的真实根人物计算最短世代距离。
 */
export function buildBranchDepthGraph(
  graph: TreeGraphResponse,
  requestedDepth: number | string
): TreeGraphResponse {
  const depth = normalizedDepth(requestedDepth);
  const maximumDistance = depth - 1;
  const { nodeMap, edges } = uniqueGraph(graph);
  if (!nodeMap.size) {
    return {
      ...graph,
      nodes: [],
      edges: [],
      rootNodeId: null,
      meta: {
        ...graph.meta,
        requestedDepth: depth,
        appliedDepth: depth,
        nodeCount: 0,
        edgeCount: 0
      }
    };
  }

  const incomingLineage = new Map([...nodeMap.keys()].map(id => [id, 0]));
  const weighted = new Map([...nodeMap.keys()].map(id => [id, [] as Array<{ id: string; cost: 0 | 1 }>]));
  edges.forEach(edge => {
    if (isLineageEdge(edge)) {
      incomingLineage.set(edge.toNodeId, (incomingLineage.get(edge.toNodeId) || 0) + 1);
      weighted.get(edge.fromNodeId)?.push({ id: edge.toNodeId, cost: 1 });
      return;
    }
    weighted.get(edge.fromNodeId)?.push({ id: edge.toNodeId, cost: 0 });
    weighted.get(edge.toNodeId)?.push({ id: edge.fromNodeId, cost: 0 });
  });

  const components = connectedComponents([...nodeMap.keys()], edges);
  const distances = new Map<string, number>();
  const queue: Array<{ id: string; distance: number }> = [];
  components.forEach(component => {
    const preferredRoot = graph.rootNodeId && component.includes(graph.rootNodeId)
      ? graph.rootNodeId
      : '';
    const rootCandidates = component
      .filter(id => (incomingLineage.get(id) || 0) === 0)
      .map(id => nodeMap.get(id) as TreeNodeResponse)
      .sort(nodeCompare);
    const seed = preferredRoot || rootCandidates[0]?.nodeId
      || component.map(id => nodeMap.get(id) as TreeNodeResponse).sort(nodeCompare)[0]?.nodeId;
    if (!seed) return;
    distances.set(seed, 0);
    queue.push({ id: seed, distance: 0 });
  });

  while (queue.length) {
    const current = queue.shift() as { id: string; distance: number };
    if (current.distance !== distances.get(current.id)) continue;
    for (const next of weighted.get(current.id) || []) {
      const nextDistance = current.distance + next.cost;
      const known = distances.get(next.id);
      if (known !== undefined && known <= nextDistance) continue;
      distances.set(next.id, nextDistance);
      const item = { id: next.id, distance: nextDistance };
      if (next.cost === 0) queue.unshift(item);
      else queue.push(item);
    }
  }

  const visibleNodeIds = new Set(
    [...nodeMap.keys()].filter(id => (distances.get(id) ?? Number.MAX_SAFE_INTEGER) <= maximumDistance)
  );
  const nodes = graph.nodes.filter(node => visibleNodeIds.has(node.nodeId));
  const visibleEdges = edges.filter(edge => visibleNodeIds.has(edge.fromNodeId) && visibleNodeIds.has(edge.toNodeId));
  const omittedCount = nodeMap.size - visibleNodeIds.size;
  const warnings: TreeGraphWarning[] = (graph.warnings || [])
    .filter(warning => warning.code !== 'depth_limit_reached');
  const truncationReasons = new Set<TreeTruncationReason>(
    graph.meta.truncationReasons.filter(reason => reason !== 'max_depth')
  );

  if (omittedCount > 0) {
    truncationReasons.add('max_depth');
    warnings.push({
      code: 'depth_limit_reached',
      message: `支派全局图谱已按 ${depth} 代（含本代）展示，另有 ${omittedCount} 个人物超出深度范围`,
      count: omittedCount
    });
  }

  const rootNodeId = graph.rootNodeId && visibleNodeIds.has(graph.rootNodeId)
    ? graph.rootNodeId
    : nodes[0]?.nodeId || null;

  return {
    ...graph,
    rootNodeId,
    nodes,
    edges: visibleEdges,
    warnings,
    meta: {
      ...graph.meta,
      requestedDepth: depth,
      appliedDepth: depth,
      nodeCount: nodes.length,
      edgeCount: visibleEdges.length,
      truncated: graph.meta.truncated || omittedCount > 0,
      truncationReasons: [...truncationReasons]
    }
  };
}
