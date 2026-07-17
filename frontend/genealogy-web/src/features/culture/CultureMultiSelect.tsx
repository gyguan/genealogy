import type { MouseEvent, ReactNode } from 'react';
import { Button, Select, Space } from 'antd';

export type CultureSelectValue = string | number;
export type CultureSelectOption = {
  value: CultureSelectValue;
  label: ReactNode;
  disabled?: boolean;
};

type Props = {
  value?: CultureSelectValue[];
  options: CultureSelectOption[];
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
  showSearch?: boolean;
  optionFilterProp?: string;
  onChange?: (value: CultureSelectValue[]) => void;
  'aria-label'?: string;
};

export function CultureMultiSelect({
  value = [],
  options,
  placeholder = '可多选',
  loading,
  disabled,
  showSearch = true,
  optionFilterProp = 'label',
  onChange,
  'aria-label': ariaLabel
}: Props) {
  const selectableValues = options.filter(option => !option.disabled).map(option => option.value);
  const selectedValues = new Set(value);
  const allSelected = selectableValues.length > 0 && selectableValues.every(optionValue => selectedValues.has(optionValue));

  function preventDropdownClose(event: MouseEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <Select
      aria-label={ariaLabel}
      mode="multiple"
      allowClear
      maxTagCount="responsive"
      value={value}
      options={options}
      placeholder={placeholder}
      loading={loading}
      disabled={disabled}
      showSearch={showSearch}
      optionFilterProp={optionFilterProp}
      onChange={next => onChange?.(next as CultureSelectValue[])}
      dropdownRender={menu => (
        <div className="culture-multi-select-dropdown">
          <Space className="culture-multi-select-actions" size={4} onMouseDown={preventDropdownClose}>
            <Button
              type="text"
              size="small"
              disabled={allSelected || selectableValues.length === 0}
              onClick={() => onChange?.(selectableValues)}
            >
              全选
            </Button>
            <Button type="text" size="small" disabled={value.length === 0} onClick={() => onChange?.([])}>
              清空
            </Button>
          </Space>
          {menu}
        </div>
      )}
    />
  );
}
