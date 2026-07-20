import type { ReactNode } from 'react';
import { Button, Divider, Select } from 'antd';

export type TrackingOption = {
  value: string;
  label: string;
  options?: TrackingOption[];
};

type Props = {
  value: string;
  options: TrackingOption[];
  placeholder: string;
  ariaLabel: string;
  onChange: (value: string) => void;
  notFoundContent?: ReactNode;
};

function selectableValues(options: TrackingOption[]) {
  return options.flatMap(option => option.options ? selectableValues(option.options) : option.value ? [option.value] : []);
}

function selectedValues(value: string) {
  return Array.from(new Set(String(value || '').split(',').map(item => item.trim()).filter(Boolean)));
}

export function TrackingMultiSelect({ value, options, placeholder, ariaLabel, onChange, notFoundContent }: Props) {
  const allValues = selectableValues(options);
  return (
    <Select<string[]>
      aria-label={ariaLabel}
      mode="multiple"
      allowClear
      showSearch
      optionFilterProp="label"
      value={selectedValues(value)}
      options={options}
      placeholder={placeholder}
      maxTagCount="responsive"
      notFoundContent={notFoundContent}
      popupRender={menu => (
        <div className="tracking-multi-popup">
          <div className="tracking-multi-popup-actions" onMouseDown={event => event.preventDefault()}>
            <Button type="link" size="small" onClick={() => onChange(allValues.join(','))}>全选</Button>
            <Button type="link" size="small" onClick={() => onChange('')}>清空</Button>
          </div>
          <Divider className="tracking-multi-popup-divider" />
          {menu}
        </div>
      )}
      onChange={values => onChange(values.join(','))}
    />
  );
}
