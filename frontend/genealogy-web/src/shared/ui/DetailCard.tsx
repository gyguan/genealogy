import { Card, Descriptions, Empty } from 'antd';

export type DetailField<T> = {
  label: string;
  value: (data: T) => string | number | null | undefined;
};

export function DetailCard<T extends Record<string, any>>({ title, data, fields, empty = '请选择或查询一条记录' }: { title: string; data?: T | null; fields: DetailField<T>[]; empty?: string }) {
  if (!data) return <Empty className="empty antd-empty" description={empty} />;
  return (
    <Card className="detail-card antd-detail-card" title={title} size="small">
      <Descriptions size="small" bordered column={{ xs: 1, sm: 2, md: 3 }}>
        {fields.map(field => <Descriptions.Item key={field.label} label={field.label}>{String(field.value(data) ?? '-')}</Descriptions.Item>)}
      </Descriptions>
    </Card>
  );
}
