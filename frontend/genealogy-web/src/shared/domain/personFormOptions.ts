export type PersonGenerationItem = {
  word?: unknown;
  generationNo?: unknown;
};

export const personEducationOptions = [
  { value: '', label: '请选择教育程度' },
  { value: '私塾/家学', label: '私塾/家学' },
  { value: '小学', label: '小学' },
  { value: '初中', label: '初中' },
  { value: '高中', label: '高中' },
  { value: '中专', label: '中专' },
  { value: '大专', label: '大专' },
  { value: '本科', label: '本科' },
  { value: '硕士', label: '硕士' },
  { value: '博士', label: '博士' },
  { value: '其他', label: '其他' }
];

export function personGenerationOptionValue(item: PersonGenerationItem) {
  return `${String(item.word || '')}@@${String(item.generationNo || '')}`;
}

export function personGenerationLabel(item: PersonGenerationItem) {
  return `${String(item.word || '-')} · 第${String(item.generationNo || '-')}世`;
}

export function personGenerationSelectedValue(
  word: unknown,
  generationNo: unknown,
  items: PersonGenerationItem[]
) {
  if (!word && !generationNo) return '';
  const selected = items.find(item =>
    String(item.word || '') === String(word || '')
    && String(item.generationNo || '') === String(generationNo || '')
  );
  return selected ? personGenerationOptionValue(selected) : '';
}

export function selectPersonGeneration(value: string | undefined, items: PersonGenerationItem[]) {
  const selected = items.find(item => personGenerationOptionValue(item) === String(value || ''));
  return {
    generationWord: selected?.word ? String(selected.word) : '',
    generationNo: selected?.generationNo ? String(selected.generationNo) : ''
  };
}
