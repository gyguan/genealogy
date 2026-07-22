import type { TreeEdgeResponse } from '../../shared/api/generated/tree-types';

export type LineageClientRelationKind = 'sibling';

export type LineageClientEdge = TreeEdgeResponse & {
  clientRelationKind?: LineageClientRelationKind;
  clientDerived?: boolean;
};

export function clientRelationKind(edge: TreeEdgeResponse) {
  return (edge as LineageClientEdge).clientRelationKind;
}

export function isClientSiblingEdge(edge: TreeEdgeResponse) {
  return clientRelationKind(edge) === 'sibling';
}
