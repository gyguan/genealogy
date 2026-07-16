import { useEffect, useMemo, useRef, useState } from 'react';
import { Select } from 'antd';
import type { CulturePersonOption } from './culturePersonService';
import { searchCulturePersons } from './culturePersonService';

type Props = {
  clanId: string;
  branchId?: number;
  value?: number | null;
  initialName?: string | null;
  disabled?: boolean;
  placeholder?: string;
  onChange?: (value?: number) => void;
};

function initialOption(value?: number | null, initialName?: string | null): CulturePersonOption | null {
  if (!value) return null;
  const name = String(initialName || '').trim() || '关联人物姓名不可见';
  return { value, name, label: name };
}

export function CulturePersonSelect({
  clanId,
  branchId,
  value,
  initialName,
  disabled,
  placeholder = '输入姓名搜索人物',
  onChange
}: Props) {
  const requestVersion = useRef(0);
  const timer = useRef<number>();
  const initial = useMemo(() => initialOption(value, initialName), [value, initialName]);
  const [options, setOptions] = useState<CulturePersonOption[]>(initial ? [initial] : []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!initial) return;
    setOptions(current => current.some(option => option.value === initial.value) ? current : [initial, ...current]);
  }, [initial]);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
    requestVersion.current += 1;
  }, []);

  function search(keyword: string) {
    if (timer.current) window.clearTimeout(timer.current);
    const query = keyword.trim();
    if (!clanId || !query) {
      requestVersion.current += 1;
      setLoading(false);
      setOptions(initial ? [initial] : []);
      return;
    }

    timer.current = window.setTimeout(() => {
      const version = ++requestVersion.current;
      setLoading(true);
      searchCulturePersons(clanId, query, branchId)
        .then(rows => {
          if (version !== requestVersion.current) return;
          const next = initial && !rows.some(row => row.value === initial.value) ? [initial, ...rows] : rows;
          setOptions(next);
        })
        .catch(() => {
          if (version === requestVersion.current) setOptions(initial ? [initial] : []);
        })
        .finally(() => {
          if (version === requestVersion.current) setLoading(false);
        });
    }, 250);
  }

  return (
    <Select<number>
      allowClear
      showSearch
      filterOption={false}
      value={value ?? undefined}
      disabled={disabled || !clanId}
      loading={loading}
      placeholder={placeholder}
      notFoundContent={loading ? '正在搜索人物…' : '未找到可见人物'}
      options={options.map(option => ({ value: option.value, label: option.label }))}
      onSearch={search}
      onChange={next => onChange?.(next)}
      onClear={() => onChange?.(undefined)}
    />
  );
}
