export type DetailField<T> = {
  label: string;
  value: (data: T) => string | number | null | undefined;
};

export function DetailCard<T extends Record<string, any>>({ title, data, fields, empty = '请选择或查询一条记录' }: { title: string; data?: T | null; fields: DetailField<T>[]; empty?: string }) {
  if (!data) return <div className="empty">{empty}</div>;
  return (
    <div className="detail-card">
      <h3>{title}</h3>
      <div className="detail-grid">
        {fields.map(field => (
          <div key={field.label}>
            <span>{field.label}</span>
            <strong>{String(field.value(data) ?? '-')}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
