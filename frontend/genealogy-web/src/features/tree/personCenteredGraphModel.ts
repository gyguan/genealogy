import type {
  TreeEdgeResponse,
  TreeGraphResponse,
  TreeNodeResponse
} from '../../shared/api/generated/tree-types';
import type { LineageClientEdge } from './lineageClientRelation.js';

export type PersonCenteredClientGraph = TreeGraphResponse & {
  clientLayoutMode: 'person-centered';
};

type InferredSiblingRelation = {
  biological: boolean;
  relationCategory: 'blood' | 'ritual';
};

const MAX_PERSON_CENTER_NODES = 160;
const PARENT_RELATION_TYPES = new Set<TreeEdgeResponse['relationType']>([
  'parent_child',
  'adoptive',
  'successor',
  'out_adoption',
  'in_adoption',
  'dual_successor',
  'heir_son'
]);

function isSpouseEdge(edge: TreeEdgeResponse) {
  return edge.relationCategory === 'marriage' || edge.relationType === 'spouse';
}

function isParentEdge(edge: TreeEdgeResponse) {
  if (isSpouseEdge(edge) || edge.relationCategory === 'status') return false;
  return Boolean(edge.isLineageRelation || PARENT_RELATION_TYPES.has(edge.relationType));
}

function isOrdinaryBiologicalParentEdge(edge: TreeEdgeResponse) {
  return edge.relationType === 'parent_child'
    && edge.relationCategory === 'blood'
    && edge.isBiological !== false;
}

function otherEndpoint(edge: TreeEdgeResponse, centerNodeId: string) {
  if (edge.fromNodeId === centerNodeId) return edge.toNodeId;
  if (edge.toNodeId === centerNodeId) return edge.fromNodeId;
  return '';
}

function parentRole(node?: TreeNodeResponse) {
  if (node?.gender === 'male') return '父亲';
  if (node?.gender === 'female') return '母亲';
  return '父母';
}

function childRole(node?: TreeNodeResponse) {
  if (node?.gender === 'male') return '儿子';
  if (node?.gender === 'female') return '女儿';
  return '子女';
}

function siblingRole(node?: TreeNodeResponse) {
  if (node?.gender === 'male') return '兄弟';
  if (node?.gender === 'female') return '姐妹';
  return '兄弟姐妹';
}

function directRelationLabel(
  edge: TreeEdgeResponse,
  centerNodeId: string,
  nodeMap: ReadonlyMap<string, TreeNodeResponse>
) {
  if (isSpouseEdge(edge)) {
    return edge.relationLabel || (edge.isPrimary === false ? undefined : '配偶');
  }
  if (!isOrdinaryBiologicalParentEdge(edge)) return edge.relationLabel;
  if (edge.toNodeId === centerNodeId) return parentRole(nodeMap.get(edge.fromNodeId));
  if (edge.fromNodeId === centerNodeId) return childRole(nodeMap.get(edge.toNodeId));
  return edge.relationLabel;
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

function inferredSiblingRelation(
  centerParentEdge: TreeEdgeResponse,
  siblingParentEdge: TreeEdgeResponse
): InferredSiblingRelation {
  const biological = centerParentEdge.relationCategory === 'blood'
    && siblingParentEdge.relationCategory === 'blood'
    && centerParentEdge.isBiological !== false
    && siblingParentEdge.isBiological !== false;
  return {
    biological,
    relationCategory: biological ? 'blood' : 'ritual'
  };
}

function normalizedDepth(value: number | string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(3, Math.max(1, Math.trunc(parsed)));
}

function visibleWithinDepth(
  centerNodeId: string,
  edges: TreeEdgeResponse[],
  depth: number
) {
  const neighbors = new Map<string, string[]>();
  edges.forEach(edge => {
    neighbors.set(edge.fromNodeId, [...(neighbors.get(edge.fromNodeId) || []), edge.toNodeId]);
    neighbors.set(edge.toNodeId, [...(neighbors.get(edge.toNodeId) || []), edge.fromNodeId]);
  });

  const distance = new Map<string, number>([[centerNodeId, 0]]);
  const queue = [centerNodeId];
  let limited = false;

  while (queue.length) {
    const current = queue.shift() as string;
    const currentDepth = distance.get(current) || 0;
    if (currentDepth >= depth) continue;
    for (const next of neighbors.get(current) || []) {
      if (distance.has(next)) continue;
      if (distance.size >= MAX_PERSON_CENTER_NODES) {
        limited = true;
        continue;
      }
      distance.set(next, currentDepth + 1);
      queue.push(next);
    }
  }

  return { nodeIds: new Set(distance.keys()), limited };
}

/**
 * 将人物接口返回的图谱裁剪为以中心人物为原点的 1～3 代关系图。
 * 一代额外将共同父母推导出的兄弟姐妹视为中心人物的直接同辈关系。
 */
export function buildPersonCenteredGraph(
  graph: TreeGraphResponse,
  requestedDepth: number | string = 1
): PersonCenteredClientGraph {
  const { nodeMap, edges } = uniqueGraph(graph);
  const center = (graph.rootNodeId && nodeMap.get(graph.rootNodeId)) || nodeMap.values().next().value;
  const depth = normalizedDepth(requestedDepth);
  if (!center) {
    return {
      ...graph,
      rootNodeId: null,
      nodes: [],
      edges: [],
      meta: { ...graph.meta, nodeCount: 0, edgeCount: 0, appliedDepth: 0 },
      clientLayoutMode: 'person-centered'
    };
  }

  const centerNodeId = center.nodeId;
  const directEdges = edges.filter(edge => edge.fromNodeId === centerNodeId || edge.toNodeId === centerNodeId);
  const directEndpointIds = new Set(directEdges.map(edge => otherEndpoint(edge, centerNodeId)).filter(Boolean));
  const parentEdges = edges.filter(isParentEdge);
  const centerParentEdges = parentEdges.filter(edge => edge.toNodeId === centerNodeId);
  const centerParentById = new Map(centerParentEdges.map(edge => [edge.fromNodeId, edge]));

  const siblingRelations = new Map<string, InferredSiblingRelation>();
  parentEdges.forEach(edge => {
    const centerParentEdge = centerParentById.get(edge.fromNodeId);
    if (!centerParentEdge || edge.toNodeId === centerNodeId || directEndpointIds.has(edge.toNodeId)) return;
    const relation = inferredSiblingRelation(centerParentEdge, edge);
    const previous = siblingRelations.get(edge.toNodeId);
    if (!previous || (!previous.biological && relation.biological)) {
      siblingRelations.set(edge.toNodeId, relation);
    }
  });

  const roleAwareEdges = edges.map(edge => {
    if (edge.fromNodeId !== centerNodeId && edge.toNodeId !== centerNodeId) return edge;
    return {
      ...edge,
      relationLabel: directRelationLabel(edge, centerNodeId, nodeMap)
    };
  });
  const syntheticSiblingEdges: LineageClientEdge[] = [...siblingRelations.entries()]
    .filter(([siblingId]) => !directEdges.some(edge => otherEndpoint(edge, centerNodeId) === siblingId))
    .map(([siblingId, relation]) => ({
      edgeId: `client-direct-sibling-${centerNodeId}-${siblingId}`,
      relationshipId: null,
      fromNodeId: centerNodeId,
      toNodeId: siblingId,
      relationType: 'other',
      relationLabel: siblingRole(nodeMap.get(siblingId)),
      relationCategory: relation.relationCategory,
      visibility: 'visible',
      isLineageRelation: false,
      isBiological: relation.biological,
      clientRelationKind: 'sibling',
      clientDerived: true
    }));
  const allEdges: TreeEdgeResponse[] = [...roleAwareEdges, ...syntheticSiblingEdges];
  const visible = visibleWithinDepth(centerNodeId, allEdges, depth);
  const visibleNodes = graph.nodes.filter(node => visible.nodeIds.has(node.nodeId));
  const visibleEdges = allEdges.filter(edge => visible.nodeIds.has(edge.fromNodeId) && visible.nodeIds.has(edge.toNodeId));
  const warnings = (graph.warnings || []).filter(warning => warning.code !== 'isolated_nodes');
  if (visible.limited) {
    warnings.push({
      code: 'client_person_center_limit',
      message: `人物中心图谱已限制为前 ${MAX_PERSON_CENTER_NODES} 个人物，请缩小关系范围或展开深度`,
      count: visibleNodes.length
    });
  }

  return {
    ...graph,
    rootNodeId: centerNodeId,
    nodes: visibleNodes,
    edges: visibleEdges,
    meta: {
      ...graph.meta,
      appliedDepth: Math.min(graph.meta.appliedDepth, depth),
      nodeCount: visibleNodes.length,
      edgeCount: visibleEdges.length,
      truncated: graph.meta.truncated || visible.limited,
      truncationReasons: graph.meta.truncationReasons
    },
    warnings,
    clientLayoutMode: 'person-centered'
  };
}

export function buildDirectPersonGraph(graph: TreeGraphResponse) {
  return buildPersonCenteredGraph(graph, 1);
}
