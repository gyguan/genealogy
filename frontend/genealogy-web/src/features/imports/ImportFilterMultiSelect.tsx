import type { ReactNode } from 'react';
import { Button, Divider, Select } from 'antd';

export type ImportFilterOption<Value extends string> = { value: Value; label: string };

type Props<Value extends string> = {
  value?: Value[];
  options: ImportFilterOption<Value>[];
  placeholder: string;
  ariaLabel: string;
  onChange?: (value: Value[]) => void;
};

export function ImportFilterMultiSelect<Value extends string>({
  value,
  options,
  placeholder,
  ariaLabel,
  onChange
}: Props<Value>) {
  function renderPopup(menu: ReactNode) {
    return (
      <div className="import-filter-popup">
        <div className="import-filter-popup-actions" onMouseDown={event => event.preventDefault()}>
          <Button type="link" size="small" onClick={() => onChange?.(options.map(option => option.value))}>全选</Button>
          <Button type="link" size="small" onClick={() => onChange?.([])}>清空</Button>
        </div>
        <Divider className="import-filter-popup-divider" />
        {menu}
      </div>
    );
  }

  return (
    <Select<Value[]>
      aria-label={ariaLabel}
      mode="multiple"
      allowClear
      showSearch
      optionFilterProp="label"
      value={value}
      options={options}
      placeholder={placeholder}
      maxTagCount="responsive"
      popupRender={renderPopup}
      onChange={values => onChange?.(values as Value[])}
    />
  );
}
