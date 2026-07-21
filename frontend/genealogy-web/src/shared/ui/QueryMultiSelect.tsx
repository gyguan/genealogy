import type { MouseEvent, ReactNode } from 'react';
import { Button, Divider, Select, Space } from 'antd';
import type { SelectProps } from 'antd';

export type QueryMultiSelectValue = string | number;

export type QueryMultiSelectOption<Value extends QueryMultiSelectValue = string> = {
  value?: Value;
  label: ReactNode;
  disabled?: boolean;
  options?: QueryMultiSelectOption<Value>[];
};

type Props<Value extends QueryMultiSelectValue = string> = Omit<
  SelectProps<Value[]>,
  'mode' | 'options' | 'value' | 'onChange' | 'popupRender'
> & {
  value?: Value[];
  options: QueryMultiSelectOption<Value>[];
  onChange?: (value: Value[]) => void;
  selectAllLabel?: string;
  clearLabel?: string;
};

function selectableValues<Value extends QueryMultiSelectValue>(options: QueryMultiSelectOption<Value>[]): Value[] {
  const values = options.flatMap(option => {
    if (option.options?.length) return selectableValues(option.options);
    if (option.disabled || option.value === undefined) return [];
    return [option.value];
  });
  return Array.from(new Set(values));
}

/**
 * Unified Ant Design multi-select for query filters.
 *
 * It keeps page-specific values and serialization outside the component while
 * standardizing search, clear, responsive tags and select-all interactions.
 */
export function QueryMultiSelect<Value extends QueryMultiSelectValue = string>({
  value = [],
  options,
  onChange,
  selectAllLabel = '全选',
  clearLabel = '清空',
  allowClear = true,
  showSearch = true,
  optionFilterProp = 'label',
  maxTagCount = 'responsive',
  className,
  style,
  ...props
}: Props<Value>) {
  const enabledValues = selectableValues(options);
  const selectedValues = new Set(value);
  const allSelected = enabledValues.length > 0 && enabledValues.every(optionValue => selectedValues.has(optionValue));

  function preventDropdownClose(event: MouseEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <Select<Value[]>
      {...props}
      className={['query-multi-select', className].filter(Boolean).join(' ')}
      style={{ width: '100%', ...style }}
      mode="multiple"
      allowClear={allowClear}
      showSearch={showSearch}
      optionFilterProp={optionFilterProp}
      maxTagCount={maxTagCount}
      value={value}
      options={options as SelectProps<Value[]>['options']}
      popupRender={menu => (
        <div className="query-multi-select-popup">
          <Space className="query-multi-select-popup-actions" size={4} onMouseDown={preventDropdownClose}>
            <Button
              type="text"
              size="small"
              disabled={allSelected || enabledValues.length === 0}
              onClick={() => onChange?.(enabledValues)}
            >
              {selectAllLabel}
            </Button>
            <Button type="text" size="small" disabled={value.length === 0} onClick={() => onChange?.([])}>
              {clearLabel}
            </Button>
          </Space>
          <Divider className="query-multi-select-popup-divider" />
          {menu}
        </div>
      )}
      onChange={nextValue => onChange?.(nextValue as Value[])}
    />
  );
}

export function readMultiValue(params: URLSearchParams, key: string, allowedValues?: Set<string>) {
  const rawValues = params.getAll(key).flatMap(value => value.split(','));
  return [...new Set(rawValues.map(value => value.trim()).filter(Boolean))]
    .filter(value => !allowedValues || allowedValues.has(value));
}

export function writeMultiValue(params: URLSearchParams, key: string, values?: string[]) {
  params.delete(key);
  values?.filter(Boolean).forEach(value => params.append(key, value));
}
