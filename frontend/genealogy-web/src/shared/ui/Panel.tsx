import type { ReactNode } from 'react';
import { Card, Space, Typography } from 'antd';

export function Panel(props: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <Card
      className="panel antd-panel"
      title={<Typography.Text strong>{props.title}</Typography.Text>}
      extra={props.actions ? <Space size={8}>{props.actions}</Space> : null}
      size="small"
    >
      {props.description ? <Typography.Paragraph className="panel-description" type="secondary">{props.description}</Typography.Paragraph> : null}
      {props.children}
    </Card>
  );
}
