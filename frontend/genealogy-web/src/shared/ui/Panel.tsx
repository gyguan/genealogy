import type { ReactNode } from 'react';
import { Card, Space, Tooltip, Typography } from 'antd';

export function Panel(props: {
  title: string;
  description?: string;
  help?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const help = props.help || props.description;

  return (
    <Card
      className="panel antd-panel"
      title={(
        <Space size={6}>
          <Typography.Text strong>{props.title}</Typography.Text>
          {help ? (
            <Tooltip title={help}>
              <Typography.Text type="secondary" aria-label={`${props.title}说明`} style={{ cursor: 'help' }}>ⓘ</Typography.Text>
            </Tooltip>
          ) : null}
        </Space>
      )}
      extra={props.actions ? <Space size={8}>{props.actions}</Space> : null}
      size="small"
    >
      {props.children}
    </Card>
  );
}
