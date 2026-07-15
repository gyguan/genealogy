import type { TreeGraphResponse } from '../../shared/api/generated/tree-types';

export type LineagePath = { nodeIds: string[]; edgeIds: string[] };

function emptyPath(): LineagePath {
  return { nodeIds: [], edgeIds: [] };
}

export function findLineagePath(graph: TreeGraphResponse, startNodeId: string, targetNodeId: string): LineagePath {
  if (!startNodeId || !targetNodeId) return emptyPath();
  if (startNodeId === targetNodeId) return { nodeIds: [startNodeId], edgeIds: [] };
  const visibleNodeIds = new Set(graph.nodes.map(node => node.nodeId));
  if (!visibleNodeIds.has(startNodeId) || !visibleNodeIds.has(targetNodeId)) return emptyPath();

  const adjacency = new Map<string, Array<{ nodeId: string; edgeId: string }>>();
  graph.edges.forEach(edge => {
    if (!visibleNodeIds.has(edge.fromNodeId) || !visibleNodeIds.has(edge.toNodeId)) return;
    adjacency.set(edge.fromNodeId, [...(adjacency.get(edge.fromNodeId) || []), { nodeId: edge.toNodeId, edgeId: edge.edgeId }]);
    adjacency.set(edge.toNodeId, [...(adjacency.get(edge.toNodeId) || []), { nodeId: edge.fromNodeId, edgeId: edge.edgeId }]);
  });

  const queue = [startNodeId];
  const visited = new Set([startNodeId]);
  const previous = new Map<string, { nodeId: string; edgeId: string }>();
  while (queue.length) {
    const current = queue.shift() as string;
    for (const next of adjacency.get(current) || []) {
      if (visited.has(next.nodeId)) continue;
      visited.add(next.nodeId);
      previous.set(next.nodeId, { nodeId: current, edgeId: next.edgeId });
      if (next.nodeId === targetNodeId) {
        const nodeIds = [targetNodeId];
        const edgeIds: string[] = [];
        let cursor = targetNodeId;
        while (cursor !== startNodeId) {
          const step = previous.get(cursor);
          if (!step) return emptyPath();
          edgeIds.unshift(step.edgeId);
          cursor = step.nodeId;
          nodeIds.unshift(cursor);
        }
        return { nodeIds, edgeIds };
      }
      queue.push(next.nodeId);
    }
  }
  return emptyPath();
}
