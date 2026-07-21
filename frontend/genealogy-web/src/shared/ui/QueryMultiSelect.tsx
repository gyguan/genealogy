import type { ReactNode } from 'react';
import { Select } from 'antd';
import type { SelectProps } from 'antd';

const SELECT_ALL_VALUE = '__query_select_all__';

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
 * Unified query multi-select based on the native Ant Design option style.
 *
 * Page-specific values and serialization stay outside the component. The
 * synthetic select-all option is consumed internally and never reaches forms,
 * URLs or API parameters.
 */
export function QueryMultiSelect<Value extends QueryMultiSelectValue = string>({
  value = [],
  options,
  onChange,
  selectAllLabel = '全选 / 取消全选',
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
  const mergedOptions = [
    { value: SELECT_ALL_VALUE, label: selectAllLabel },
    ...options
  ] as SelectProps<Value[]>['options'];

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
      options={mergedOptions}
      onChange={nextValue => {
        const rawValues = nextValue as QueryMultiSelectValue[];
        if (rawValues.includes(SELECT_ALL_VALUE)) {
          onChange?.(allSelected ? [] : enabledValues);
          return;
        }
        onChange?.(rawValues.filter(item => item !== SELECT_ALL_VALUE) as Value[]);
      }}
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
