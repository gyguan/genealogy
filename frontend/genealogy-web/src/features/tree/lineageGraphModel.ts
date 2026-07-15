import type {
  TreeEdgeResponse,
  TreeGraphResponse,
  TreeGraphWarning,
  TreeNodeResponse
} from '../../shared/api/generated/tree-types';

export type LineageEdgeKind = 'parent' | 'spouse' | 'status' | 'other';

export type LineageLayoutNode = {
  id: string;
  node: TreeNodeResponse;
  x: number;
  y: number;
  width: number;
  height: number;
  layer: number;
  hasChildren: boolean;
  collapsed: boolean;
  isolated: boolean;
};

export type LineageLayoutEdge = {
  id: string;
  edge: TreeEdgeResponse;
  kind: LineageEdgeKind;
  path: string;
  labelX: number;
  labelY: number;
};

export type LineageLayoutNotice = {
  code: string;
  message: string;
  count: number;
};

export type LineageLayout = {
  nodes: LineageLayoutNode[];
  edges: LineageLayoutEdge[];
  width: number;
  height: number;
  roots: string[];
  isolatedNodeIds: string[];
  notices: LineageLayoutNotice[];
};

const NODE_WIDTH = 176;
const NODE_HEIGHT = 116;
const NODE_GAP = 46;
const GROUP_GAP = 72;
const LAYER_GAP = 176;
const CANVAS_PADDING = 72;

const PARENT_RELATION_TYPES = new Set([
  'parent_child',
  'adoptive',
  'successor',
  'out_adoption',
  'in_adoption',
  'dual_successor',
  'heir_son'
]);

function edgeKind(edge: TreeEdgeResponse): LineageEdgeKind {
  if (edge.relationCategory === 'marriage' || edge.relationType === 'spouse') return 'spouse';
  if (edge.relationCategory === 'status' || edge.relationType === 'no_descendant') return 'status';
  if (edge.isLineageRelation || PARENT_RELATION_TYPES.has(edge.relationType)) return 'parent';
  return 'other';
}

function stableNodeCompare(a: TreeNodeResponse, b: TreeNodeResponse, rootNodeId: string | null) {
  if (a.nodeId === rootNodeId) return -1;
  if (b.nodeId === rootNodeId) return 1;
  const generationCompare = (a.generationNo ?? Number.MAX_SAFE_INTEGER) - (b.generationNo ?? Number.MAX_SAFE_INTEGER);
  if (generationCompare) return generationCompare;
  const nameCompare = a.displayName.localeCompare(b.displayName, 'zh-CN');
  return nameCompare || a.nodeId.localeCompare(b.nodeId);
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

function visibleAfterCollapse(
  nodeIds: string[],
  parentEdges: TreeEdgeResponse[],
  rootNodeId: string | null,
  collapsedNodeIds: ReadonlySet<string>
) {
  if (!collapsedNodeIds.size) return new Set(nodeIds);

  const incoming = new Map(nodeIds.map(id => [id, 0]));
  const children = new Map<string, string[]>();
  parentEdges.forEach(edge => {
    incoming.set(edge.toNodeId, (incoming.get(edge.toNodeId) || 0) + 1);
    children.set(edge.fromNodeId, [...(children.get(edge.fromNodeId) || []), edge.toNodeId]);
  });
  const seeds = nodeIds.filter(id => (incoming.get(id) || 0) === 0);
  if (rootNodeId && !seeds.includes(rootNodeId)) seeds.unshift(rootNodeId);
  if (!seeds.length) seeds.push(...nodeIds);

  const visible = new Set<string>();
  const queue = [...new Set(seeds)];
  while (queue.length) {
    const current = queue.shift() as string;
    if (visible.has(current)) continue;
    visible.add(current);
    if (collapsedNodeIds.has(current)) continue;
    (children.get(current) || []).forEach(child => queue.push(child));
  }

  const incident = new Set(parentEdges.flatMap(edge => [edge.fromNodeId, edge.toNodeId]));
  nodeIds.filter(id => !incident.has(id)).forEach(id => visible.add(id));
  return visible;
}

class DisjointSet {
  private parent = new Map<string, string>();

  constructor(ids: string[]) {
    ids.forEach(id => this.parent.set(id, id));
  }

  find(id: string): string {
    const parent = this.parent.get(id) || id;
    if (parent === id) return id;
    const root = this.find(parent);
    this.parent.set(id, root);
    return root;
  }

  union(left: string, right: string) {
    const leftRoot = this.find(left);
    const rightRoot = this.find(right);
    if (leftRoot !== rightRoot) this.parent.set(rightRoot, leftRoot);
  }
}

function assignLayers(
  nodes: TreeNodeResponse[],
  parentEdges: TreeEdgeResponse[],
  spouseEdges: TreeEdgeResponse[],
  rootNodeId: string | null
) {
  const nodeIds = nodes.map(node => node.nodeId);
  const indegree = new Map(nodeIds.map(id => [id, 0]));
  const children = new Map<string, string[]>();
  parentEdges.forEach(edge => {
    indegree.set(edge.toNodeId, (indegree.get(edge.toNodeId) || 0) + 1);
    children.set(edge.fromNodeId, [...(children.get(edge.fromNodeId) || []), edge.toNodeId]);
  });

  const layers = new Map<string, number>();
  const queue = nodeIds.filter(id => (indegree.get(id) || 0) === 0).sort();
  if (rootNodeId && queue.includes(rootNodeId)) {
    queue.splice(queue.indexOf(rootNodeId), 1);
    queue.unshift(rootNodeId);
  }
  queue.forEach(id => layers.set(id, 0));

  while (queue.length) {
    const current = queue.shift() as string;
    const currentLayer = layers.get(current) || 0;
    (children.get(current) || []).forEach(child => {
      layers.set(child, Math.max(layers.get(child) || 0, currentLayer + 1));
      indegree.set(child, (indegree.get(child) || 0) - 1);
      if ((indegree.get(child) || 0) === 0) queue.push(child);
    });
  }

  const knownGenerations = nodes.map(node => node.generationNo).filter((value): value is number => typeof value === 'number');
  const minimumGeneration = knownGenerations.length ? Math.min(...knownGenerations) : 0;
  const fallbackLayer = layers.size ? Math.max(...layers.values()) + 1 : 0;
  nodes.forEach(node => {
    if (!layers.has(node.nodeId)) {
      layers.set(node.nodeId, node.generationNo ? Math.max(0, node.generationNo - minimumGeneration) : fallbackLayer);
    }
  });

  // Spouses share a layer. Raising one spouse can raise its descendants, so settle both constraints together.
  for (let round = 0; round < nodes.length + 2; round += 1) {
    let changed = false;
    spouseEdges.forEach(edge => {
      const shared = Math.max(layers.get(edge.fromNodeId) || 0, layers.get(edge.toNodeId) || 0);
      if (layers.get(edge.fromNodeId) !== shared) { layers.set(edge.fromNodeId, shared); changed = true; }
      if (layers.get(edge.toNodeId) !== shared) { layers.set(edge.toNodeId, shared); changed = true; }
    });
    parentEdges.forEach(edge => {
      const required = (layers.get(edge.fromNodeId) || 0) + 1;
      if ((layers.get(edge.toNodeId) || 0) < required) {
        layers.set(edge.toNodeId, required);
        changed = true;
      }
    });
    if (!changed) break;
  }
  return layers;
}

function orderedLayers(
  nodes: TreeNodeResponse[],
  layers: Map<string, number>,
  spouseEdges: TreeEdgeResponse[],
  rootNodeId: string | null
) {
  const union = new DisjointSet(nodes.map(node => node.nodeId));
  spouseEdges.forEach(edge => union.union(edge.fromNodeId, edge.toNodeId));
  const byLayer = new Map<number, TreeNodeResponse[]>();
  nodes.forEach(node => {
    const layer = layers.get(node.nodeId) || 0;
    byLayer.set(layer, [...(byLayer.get(layer) || []), node]);
  });

  const result = new Map<number, TreeNodeResponse[]>();
  byLayer.forEach((layerNodes, layer) => {
    const groups = new Map<string, TreeNodeResponse[]>();
    layerNodes.forEach(node => {
      const root = union.find(node.nodeId);
      groups.set(root, [...(groups.get(root) || []), node]);
    });
    const sortedGroups = [...groups.values()]
      .map(group => group.sort((a, b) => stableNodeCompare(a, b, rootNodeId)))
      .sort((a, b) => stableNodeCompare(a[0], b[0], rootNodeId));
    result.set(layer, sortedGroups.flat());
  });
  return result;
}

function edgePath(kind: LineageEdgeKind, from: LineageLayoutNode, to: LineageLayoutNode) {
  if (kind === 'spouse') {
    const left = from.x <= to.x ? from : to;
    const right = left === from ? to : from;
    const startX = left.x + left.width;
    const endX = right.x;
    const y = left.y + left.height / 2;
    return { path: `M ${startX} ${y} L ${endX} ${y}`, labelX: (startX + endX) / 2, labelY: y - 8 };
  }
  const startX = from.x + from.width / 2;
  const startY = from.y + from.height;
  const endX = to.x + to.width / 2;
  const endY = to.y;
  const middleY = (startY + endY) / 2;
  return {
    path: `M ${startX} ${startY} C ${startX} ${middleY}, ${endX} ${middleY}, ${endX} ${endY}`,
    labelX: (startX + endX) / 2,
    labelY: middleY - 6
  };
}

function mergeNotices(graphWarnings: TreeGraphWarning[], roots: string[], isolated: string[]) {
  const notices: LineageLayoutNotice[] = graphWarnings.map(warning => ({ ...warning }));
  if (roots.length > 1) notices.push({ code: 'multiple_roots', message: '当前图包含多个根人物或独立世系分支', count: roots.length });
  if (isolated.length && !notices.some(notice => notice.code === 'isolated_nodes')) {
    notices.push({ code: 'isolated_nodes', message: '当前图包含暂无可见关系边的孤立人物', count: isolated.length });
  }
  return notices;
}

export function buildLineageLayout(
  graph: TreeGraphResponse,
  collapsedNodeIds: ReadonlySet<string> = new Set()
): LineageLayout {
  const { nodeMap, edges: uniqueEdges } = uniqueGraph(graph);
  const allNodes = [...nodeMap.values()];
  const parentEdges = uniqueEdges.filter(edge => edgeKind(edge) === 'parent');
  const visibleIds = visibleAfterCollapse(allNodes.map(node => node.nodeId), parentEdges, graph.rootNodeId, collapsedNodeIds);
  const nodes = allNodes.filter(node => visibleIds.has(node.nodeId));
  const visibleEdges = uniqueEdges.filter(edge => visibleIds.has(edge.fromNodeId) && visibleIds.has(edge.toNodeId));
  const visibleParentEdges = visibleEdges.filter(edge => edgeKind(edge) === 'parent');
  const visibleSpouseEdges = visibleEdges.filter(edge => edgeKind(edge) === 'spouse');

  const incomingParentCount = new Map(nodes.map(node => [node.nodeId, 0]));
  visibleParentEdges.forEach(edge => incomingParentCount.set(edge.toNodeId, (incomingParentCount.get(edge.toNodeId) || 0) + 1));
  let roots = nodes.filter(node => (incomingParentCount.get(node.nodeId) || 0) === 0).map(node => node.nodeId);
  if (!roots.length && graph.rootNodeId && visibleIds.has(graph.rootNodeId)) roots = [graph.rootNodeId];
  if (!roots.length && nodes.length) roots = [nodes[0].nodeId];

  const layers = assignLayers(nodes, visibleParentEdges, visibleSpouseEdges, graph.rootNodeId);
  const incidentIds = new Set(visibleEdges.flatMap(edge => [edge.fromNodeId, edge.toNodeId]));
  const isolatedNodeIds = nodes.filter(node => !incidentIds.has(node.nodeId)).map(node => node.nodeId);
  const maximumConnectedLayer = Math.max(0, ...nodes.filter(node => !isolatedNodeIds.includes(node.nodeId)).map(node => layers.get(node.nodeId) || 0));
  isolatedNodeIds.forEach(id => layers.set(id, maximumConnectedLayer + 1));

  const ordered = orderedLayers(nodes, layers, visibleSpouseEdges, graph.rootNodeId);
  const positioned = new Map<string, LineageLayoutNode>();
  let maximumLayerWidth = 0;
  ordered.forEach((layerNodes, layer) => {
    let cursor = CANVAS_PADDING;
    let previousGroup = '';
    const spouseUnion = new DisjointSet(layerNodes.map(node => node.nodeId));
    visibleSpouseEdges.forEach(edge => spouseUnion.union(edge.fromNodeId, edge.toNodeId));
    layerNodes.forEach(node => {
      const group = spouseUnion.find(node.nodeId);
      if (previousGroup && previousGroup !== group) cursor += GROUP_GAP - NODE_GAP;
      positioned.set(node.nodeId, {
        id: node.nodeId,
        node,
        x: cursor,
        y: CANVAS_PADDING + layer * LAYER_GAP,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        layer,
        hasChildren: visibleParentEdges.some(edge => edge.fromNodeId === node.nodeId),
        collapsed: collapsedNodeIds.has(node.nodeId),
        isolated: isolatedNodeIds.includes(node.nodeId)
      });
      cursor += NODE_WIDTH + NODE_GAP;
      previousGroup = group;
    });
    maximumLayerWidth = Math.max(maximumLayerWidth, cursor + CANVAS_PADDING - NODE_GAP);
  });

  const layoutEdges = visibleEdges.flatMap(edge => {
    const from = positioned.get(edge.fromNodeId);
    const to = positioned.get(edge.toNodeId);
    if (!from || !to) return [];
    const kind = edgeKind(edge);
    const geometry = edgePath(kind, from, to);
    return [{ id: edge.edgeId, edge, kind, ...geometry }];
  });

  const maximumLayer = Math.max(0, ...[...positioned.values()].map(node => node.layer));
  return {
    nodes: [...positioned.values()],
    edges: layoutEdges,
    width: Math.max(720, maximumLayerWidth),
    height: Math.max(420, CANVAS_PADDING * 2 + maximumLayer * LAYER_GAP + NODE_HEIGHT),
    roots,
    isolatedNodeIds,
    notices: mergeNotices(graph.warnings || [], roots, isolatedNodeIds)
  };
}

export function relationLabel(edge: TreeEdgeResponse) {
  const labels: Record<string, string> = {
    parent_child: '亲子',
    spouse: '婚配',
    adoptive: '收养',
    successor: '承嗣',
    out_adoption: '出嗣',
    in_adoption: '入继',
    dual_successor: '兼祧',
    heir_son: '嗣子',
    no_descendant: '无嗣'
  };
  return edge.relationLabel || labels[edge.relationType] || edge.relationType;
}

export { findLineagePath } from './lineagePathModel';
