import type {
  TreeDataStatus,
  TreeEdgeResponse,
  TreeGraphMeta,
  TreePrivacyLevel,
  TreeRiskLevel,
  TreeTruncationReason
} from '../../shared/api/generated/tree-types';
import { isClientSiblingEdge } from './lineageClientRelation.js';

const DATA_STATUS_LABELS: Record<TreeDataStatus, string> = {
  draft: '草稿',
  pending_review: '待审核',
  official: '正式',
  rejected: '已驳回',
  archived: '已归档'
};

const RISK_LEVEL_LABELS: Record<TreeRiskLevel, string> = {
  none: '无风险',
  low: '低风险',
  medium: '中风险',
  high: '高风险',
  critical: '严重风险'
};

const PRIVACY_LABELS: Record<TreePrivacyLevel, string> = {
  public: '公开',
  clan_only: '宗族内可见',
  branch_only: '支派内可见',
  relatives_only: '亲属可见',
  private: '私密',
  sealed: '封存'
};

const TRUNCATION_LABELS: Record<TreeTruncationReason, string> = {
  max_depth: '达到展开深度',
  max_nodes: '达到人物数量上限',
  max_edges: '达到关系数量上限'
};

export function dataStatusText(value?: TreeDataStatus | string | null) {
  return value && DATA_STATUS_LABELS[value as TreeDataStatus] ? DATA_STATUS_LABELS[value as TreeDataStatus] : value || '已记录';
}

export function riskLevelText(value?: TreeRiskLevel | string | null) {
  return value && RISK_LEVEL_LABELS[value as TreeRiskLevel] ? RISK_LEVEL_LABELS[value as TreeRiskLevel] : value || '无风险';
}

export function privacyLevelText(value?: TreePrivacyLevel | string | null) {
  return value && PRIVACY_LABELS[value as TreePrivacyLevel] ? PRIVACY_LABELS[value as TreePrivacyLevel] : value || '未标注';
}

export function graphCompletenessText(meta?: TreeGraphMeta | null) {
  if (!meta) return '尚未生成';
  if (!meta.truncated) return `完整展示至 ${meta.appliedDepth} 代`;
  const reasons = meta.truncationReasons.map(reason => TRUNCATION_LABELS[reason] || reason).join('、');
  return `已裁剪：${reasons || '达到查询边界'}`;
}

export function relationshipEndpointText(edge: TreeEdgeResponse, fromName: string, toName: string) {
  if (isClientSiblingEdge(edge)) {
    return `${fromName} — ${toName}`;
  }
  if (edge.relationCategory === 'marriage' || edge.relationType === 'spouse') {
    return `${fromName} ↔ ${toName}`;
  }
  if (edge.relationCategory === 'ritual') {
    return `${fromName} ⇢ ${toName}`;
  }
  return `${fromName} → ${toName}`;
}

export function relationshipEndpointLabels(edge: TreeEdgeResponse) {
  if (isClientSiblingEdge(edge)) {
    return ['中心人物', '同辈人物'] as const;
  }
  if (edge.relationCategory === 'marriage' || edge.relationType === 'spouse') {
    return ['配偶一', '配偶二'] as const;
  }
  if (edge.relationCategory === 'ritual') {
    return ['承继来源', '承继人物'] as const;
  }
  return ['父辈人物', '子辈人物'] as const;
}

export function relationCategoryText(value?: string | null) {
  return ({ blood: '血缘', marriage: '婚配', ritual: '宗法承嗣', status: '状态' } as Record<string, string>)[value || ''] || '其他';
}
