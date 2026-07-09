export {
  STATUS_LABELS,
  SOURCE_TYPE_LABELS,
  SOURCE_STATUS_LABELS,
  RELATION_TYPE_LABELS,
  REVIEW_TARGET_TYPE_LABELS as TARGET_TYPE_LABELS,
  CONFIDENCE_LABELS,
  GENDER_OPTIONS,
  SOURCE_TYPE_OPTIONS,
  statusText,
  statusColor,
  sourceTypeText,
  sourceStatusText,
  sourceStatusColor,
  confidenceText,
  relationTypeText,
  reviewTargetTypeText as targetTypeText
} from '../../shared/dictionaries';

export function display(value: unknown, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}
