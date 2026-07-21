import type { ReactNode } from 'react';
import { QueryMultiSelect } from '../../shared/ui/QueryMultiSelect';

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
  return (
    <QueryMultiSelect<CultureSelectValue>
      aria-label={ariaLabel}
      value={value}
      options={options}
      placeholder={placeholder}
      loading={loading}
      disabled={disabled}
      showSearch={showSearch}
      optionFilterProp={optionFilterProp}
      onChange={onChange}
    />
  );
}
