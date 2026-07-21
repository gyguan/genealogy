import { Select } from 'antd';
import type { SelectProps } from 'antd';

const SELECT_ALL_VALUE = '__query_select_all__';

export type QueryMultiSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type Props = Omit<SelectProps<string[]>, 'mode' | 'options' | 'value' | 'onChange'> & {
  value?: string[];
  options: QueryMultiSelectOption[];
  onChange?: (value: string[]) => void;
  selectAllLabel?: string;
};

/**
 * Standard multi-select for query filters.
 *
 * The synthetic select-all option never leaks into form state or API params.
 * Selecting it toggles between all enabled values and an empty selection.
 */
export function QueryMultiSelect({
  value = [],
  options,
  onChange,
  selectAllLabel = '全选',
  ...props
}: Props) {
  const enabledValues = options.filter(option => !option.disabled).map(option => option.value);
  const selectedValues = value.filter(item => enabledValues.includes(item));
  const allSelected = enabledValues.length > 0 && enabledValues.every(item => selectedValues.includes(item));

  const mergedOptions: QueryMultiSelectOption[] = [
    { value: SELECT_ALL_VALUE, label: allSelected ? '取消全选' : selectAllLabel },
    ...options
  ];

  return (
    <Select<string[]>
      {...props}
      mode="multiple"
      allowClear
      showSearch
      optionFilterProp="label"
      maxTagCount="responsive"
      value={selectedValues}
      options={mergedOptions}
      onChange={nextValue => {
        if (nextValue.includes(SELECT_ALL_VALUE)) {
          onChange?.(allSelected ? [] : enabledValues);
          return;
        }
        onChange?.(nextValue.filter(item => item !== SELECT_ALL_VALUE));
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
