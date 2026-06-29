export type Column<T> = {
  key: string;
  title: string;
  render?: (row: T) => string | number | null | undefined;
};

export function toRecordList<T = any>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.content)) return data.content;
  if (data && typeof data === 'object') return [data];
  return [];
}

export function DataTable<T extends Record<string, any>>({ data, columns, empty = '暂无数据', onSelect }: { data: any; columns: Column<T>[]; empty?: string; onSelect?: (row: T) => void }) {
  const rows = toRecordList<T>(data);
  if (!rows.length) return <div className="empty">{empty}</div>;

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>{columns.map(column => <th key={column.key}>{column.title}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || index} onClick={() => onSelect?.(row)} className={onSelect ? 'clickable' : ''}>
              {columns.map(column => <td key={column.key}>{String(column.render ? column.render(row) ?? '' : row[column.key] ?? '')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
