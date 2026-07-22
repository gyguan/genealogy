import type {
  TreeEdgeResponse,
  TreeGraphResponse,
  TreeNodeResponse
} from '../../shared/api/generated/tree-types';

export type PersonCenteredClientGraph = TreeGraphResponse & {
  clientLayoutMode: 'person-centered';
};

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
  if (isSpouseEdge(edge)) return '配偶';
  if (!isParentEdge(edge)) return edge.relationLabel;
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

/**
 * 将人物中心接口返回的多层图收敛为“一跳关系图”：
 * 中心人物 + 父母、配偶、子女、显式直接关系，以及由共同父母推导出的兄弟姐妹。
 */
export function buildDirectPersonGraph(graph: TreeGraphResponse): PersonCenteredClientGraph {
  const { nodeMap, edges } = uniqueGraph(graph);
  const center = (graph.rootNodeId && nodeMap.get(graph.rootNodeId)) || nodeMap.values().next().value;
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
  const parentIds = new Set(
    parentEdges
      .filter(edge => edge.toNodeId === centerNodeId)
      .map(edge => edge.fromNodeId)
  );

  const siblingIds = new Set<string>();
  parentEdges.forEach(edge => {
    if (!parentIds.has(edge.fromNodeId) || edge.toNodeId === centerNodeId) return;
    if (!directEndpointIds.has(edge.toNodeId)) siblingIds.add(edge.toNodeId);
  });

  const visibleNodeIds = new Set<string>([
    centerNodeId,
    ...directEndpointIds,
    ...siblingIds
  ]);
  const visibleNodes = graph.nodes.filter(node => visibleNodeIds.has(node.nodeId));

  const roleAwareEdges = directEdges.map(edge => ({
    ...edge,
    relationLabel: directRelationLabel(edge, centerNodeId, nodeMap)
  }));
  const syntheticSiblingEdges: TreeEdgeResponse[] = [...siblingIds]
    .filter(siblingId => !directEdges.some(edge => otherEndpoint(edge, centerNodeId) === siblingId))
    .map(siblingId => ({
      edgeId: `client-direct-sibling-${centerNodeId}-${siblingId}`,
      relationshipId: null,
      fromNodeId: centerNodeId,
      toNodeId: siblingId,
      relationType: 'other',
      relationLabel: siblingRole(nodeMap.get(siblingId)),
      relationCategory: 'blood',
      visibility: 'visible',
      isLineageRelation: false,
      isBiological: true
    }));
  const visibleEdges = [...roleAwareEdges, ...syntheticSiblingEdges];

  return {
    ...graph,
    rootNodeId: centerNodeId,
    nodes: visibleNodes,
    edges: visibleEdges,
    meta: {
      ...graph.meta,
      appliedDepth: Math.min(graph.meta.appliedDepth, 1),
      nodeCount: visibleNodes.length,
      edgeCount: visibleEdges.length
    },
    warnings: (graph.warnings || []).filter(warning => warning.code !== 'isolated_nodes'),
    clientLayoutMode: 'person-centered'
  };
}
