import type { TreeEdgeResponse, TreeNodeResponse } from '../../shared/api/generated/tree-types';
import { riskLevelText } from './treeDisplayModel.js';

export type LineageSemanticTone = 'blood' | 'marriage' | 'ritual' | 'status' | 'other';
export type LineageIndicatorTone = 'neutral' | 'info' | 'warning' | 'danger';
export type LineageEdgeVisual = { tone: LineageSemanticTone; label: string; description: string; marker: 'arrow' | 'ritual' | 'none' };
export type LineageIndicator = { code: string; label: string; tone: LineageIndicatorTone; glyph: string };

const RELATION_LABELS: Record<string, string> = {
  father: '生父', mother: '生母', parent_child: '亲子', spouse: '配偶',
  secondary_spouse: '继配', concubine: '侧室', adoptive: '收养', successor: '承嗣',
  out_adoption: '出嗣', in_adoption: '入继', dual_successor: '兼祧',
  '\u0068\u0065\u0069\u0072_son': '嗣子',
  '\u0068\u0065\u0069\u0072_successor': '嗣子',
  '\u0068\u0065\u0069\u0072_sucessor': '嗣子',
  no_descendant: '无嗣', other: '其他关系'
};
const ANOMALY_LABELS: Record<string, { label: string; tone: LineageIndicatorTone; glyph: string }> = {
  generation_mismatch: { label: '世次异常', tone: 'warning', glyph: '世' },
  relationship_conflict: { label: '关系冲突', tone: 'danger', glyph: '冲' },
  possible_duplicate: { label: '疑似重复', tone: 'warning', glyph: '重' },
  missing_source: { label: '来源缺失', tone: 'warning', glyph: '证' },
  isolated_person: { label: '孤立人物', tone: 'info', glyph: '孤' },
  other: { label: '待复核', tone: 'warning', glyph: '核' }
};
const TONE_PRIORITY: Record<LineageIndicatorTone, number> = { danger: 0, warning: 1, info: 2, neutral: 3 };
const REVIEW_LABELS: Record<string, string> = { pending: '待审核', approved: '已通过', rejected: '已驳回', mixed: '状态混合' };

function normalized(value?: string | null) { return String(value || '').trim().toLowerCase(); }
function sortIndicators(items: LineageIndicator[]) {
  return [...items].sort((a, b) => TONE_PRIORITY[a.tone] - TONE_PRIORITY[b.tone] || a.label.localeCompare(b.label, 'zh-CN'));
}
function anomalyIndicators(codes: string[] = []) {
  return codes.map(code => ({ code, ...(ANOMALY_LABELS[code] || ANOMALY_LABELS.other) }));
}

export function relationshipDisplayLabel(edge: TreeEdgeResponse) {
  const rawLabel = normalized(edge.relationLabel);
  if (RELATION_LABELS[rawLabel]) return RELATION_LABELS[rawLabel];
  if (edge.relationType === 'parent_child' && edge.isBiological === false) return '法定亲子';
  if (edge.relationType === 'spouse' && edge.isPrimary === false) return '继配/侧室';
  return edge.relationLabel || RELATION_LABELS[edge.relationType] || '其他关系';
}

export function edgeVisual(edge: TreeEdgeResponse): LineageEdgeVisual {
  const label = relationshipDisplayLabel(edge);
  if (edge.relationCategory === 'marriage' || edge.relationType === 'spouse') return { tone: 'marriage', label, description: `${label}关系，使用无箭头实线表示`, marker: 'none' };
  if (edge.relationCategory === 'ritual' || edge.ritualRelationType) return { tone: 'ritual', label, description: `${label}宗法承嗣关系，使用虚线和空心箭头表示`, marker: 'ritual' };
  if (edge.relationCategory === 'status' || edge.relationType === 'no_descendant') return { tone: 'status', label, description: `${label}状态关系，使用点划线表示`, marker: 'none' };
  if (edge.relationCategory === 'blood' || edge.relationType === 'parent_child') {
    const bloodLabel = edge.isBiological === false ? '法定亲子' : label;
    return { tone: 'blood', label: bloodLabel, description: `${bloodLabel}血缘关系，使用实线箭头表示`, marker: 'arrow' };
  }
  return { tone: 'other', label, description: `${label}，使用点线表示`, marker: 'none' };
}

export function nodeIndicators(node: TreeNodeResponse): LineageIndicator[] {
  if (node.visibility === 'masked') return [{ code: 'privacy', label: '隐私保护', tone: 'neutral', glyph: '私' }];
  const items: LineageIndicator[] = [];
  if (node.evidenceSummary?.missingOfficialEvidence) items.push({ code: 'missing-evidence', label: '缺少正式证据', tone: 'warning', glyph: '证' });
  else if (node.evidenceSummary?.confidenceLevel === 'low') items.push({ code: 'low-confidence', label: '低可信', tone: 'warning', glyph: '低' });
  if (node.reviewSummary?.state === 'pending') items.push({ code: 'review-pending', label: '待审核', tone: 'info', glyph: '审' });
  else if (node.reviewSummary?.state === 'rejected') items.push({ code: 'review-rejected', label: '审核驳回', tone: 'danger', glyph: '驳' });
  else if (node.reviewSummary?.state === 'mixed') items.push({ code: 'review-mixed', label: '审核状态混合', tone: 'warning', glyph: '审' });
  for (const item of anomalyIndicators(node.anomalySummary?.codes)) if (!items.some(value => value.code === item.code || value.label === item.label)) items.push(item);
  return sortIndicators(items);
}

export function edgeIndicators(edge: TreeEdgeResponse): LineageIndicator[] {
  if (edge.visibility === 'masked') return [];
  const items: LineageIndicator[] = [];
  if (edge.evidenceSummary?.missingOfficialEvidence) items.push({ code: 'missing-evidence', label: '缺少正式证据', tone: 'warning', glyph: '证' });
  else if (edge.evidenceSummary?.confidenceLevel === 'low') items.push({ code: 'low-confidence', label: '低可信', tone: 'warning', glyph: '低' });
  if (edge.reviewSummary?.state === 'pending') items.push({ code: 'review-pending', label: '待审核', tone: 'info', glyph: '审' });
  else if (edge.reviewSummary?.state === 'rejected') items.push({ code: 'review-rejected', label: '审核驳回', tone: 'danger', glyph: '驳' });
  else if (edge.reviewSummary?.state === 'mixed') items.push({ code: 'review-mixed', label: '审核状态混合', tone: 'warning', glyph: '审' });
  for (const item of anomalyIndicators(edge.anomalySummary?.codes)) if (!items.some(value => value.code === item.code || value.label === item.label)) items.push(item);
  return sortIndicators(items);
}

export function summaryText(
  evidence?: TreeNodeResponse['evidenceSummary'] | TreeEdgeResponse['evidenceSummary'],
  review?: TreeNodeResponse['reviewSummary'] | TreeEdgeResponse['reviewSummary'],
  anomaly?: TreeNodeResponse['anomalySummary'] | TreeEdgeResponse['anomalySummary']
) {
  const parts: string[] = [];
  if (evidence) parts.push(`证据 ${evidence.officialBindingCount}/${evidence.bindingCount}`);
  if (review && review.state !== 'none') parts.push(`审核：${REVIEW_LABELS[review.state] || review.state}`);
  if (anomaly?.count) parts.push(`异常 ${anomaly.count} · ${riskLevelText(anomaly.highestRisk)}`);
  return parts.join(' · ');
}
