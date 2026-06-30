import { Children, cloneElement, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Button, DatePicker, Form, Input, Select, Space } from 'antd';

type AnyProps = Record<string, any>;

function emitValue(originalOnChange: any, value: unknown) {
  if (typeof originalOnChange === 'function') originalOnChange({ target: { value } });
}

function toAntdControl(child: ReactNode): ReactNode {
  if (!isValidElement<AnyProps>(child)) return child;
  if (typeof child.type !== 'string') return child;

  const props = child.props;
  if (child.type === 'textarea') {
    return <Input.TextArea {...props} value={props.value} onChange={props.onChange} />;
  }
  if (child.type === 'select') {
    const options = Children.toArray(props.children)
      .filter(isValidElement)
      .map(option => ({ label: (option as ReactElement<AnyProps>).props.children, value: String((option as ReactElement<AnyProps>).props.value ?? '') }));
    return <Select {...props} value={props.value} options={options} onChange={value => emitValue(props.onChange, value)} />;
  }
  if (child.type === 'input') {
    if (props.type === 'date') {
      return <Input {...props} type="date" value={props.value} onChange={props.onChange} />;
    }
    return <Input {...props} value={props.value} onChange={props.onChange} />;
  }
  return child;
}

function toAntdAction(child: ReactNode): ReactNode {
  if (!isValidElement<AnyProps>(child) || child.type !== 'button') return child;
  const { className, children, ...rest } = child.props;
  return <Button {...rest} type={className?.includes('secondary') ? 'default' : 'primary'}>{children}</Button>;
}

export function Field(props: { label: string; children: ReactNode; hint?: string }) {
  return (
    <Form.Item className="field antd-field" label={props.label} extra={props.hint} colon={false}>
      {toAntdControl(props.children)}
    </Form.Item>
  );
}

export function Actions({ children }: { children: ReactNode }) {
  return <Space className="actions antd-actions" wrap>{Children.map(children, toAntdAction)}</Space>;
}
