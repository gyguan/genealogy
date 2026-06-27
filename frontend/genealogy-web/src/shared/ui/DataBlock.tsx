export function DataBlock({ data, empty = '暂无数据' }: { data: unknown; empty?: string }) {
  if (data === undefined || data === null || data === '') {
    return <div className="empty">{empty}</div>;
  }
  return <pre className="data-block">{typeof data === 'string' ? data : JSON.stringify(data, null, 2)}</pre>;
}
