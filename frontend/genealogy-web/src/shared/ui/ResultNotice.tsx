export type ResultNoticeProps = {
  result?: unknown;
  title?: string;
  successText?: string;
};

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' ? value as Record<string, any> : {};
}

export function ResultNotice({ result, title = '操作结果', successText = '操作已完成' }: ResultNoticeProps) {
  if (!result) return null;
  const record = asRecord(result);
  const isError = Boolean(record.error || record.errorMessage || record.message?.includes?.('失败'));
  const message = record.errorMessage || record.message || record.status || successText;

  return (
    <div className={`result-notice${isError ? ' result-notice--error' : ''}`}>
      <strong>{title}</strong>
      <span>{String(message)}</span>
    </div>
  );
}
