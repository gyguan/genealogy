import { apiClient } from '../../shared/api/client';
import { toRecordList } from '../../shared/utils/records';

export type CulturePersonOption = {
  value: number;
  name: string;
  branchName?: string;
  generationText?: string;
  label: string;
};

function text(value: unknown) {
  return String(value ?? '').trim();
}

function personId(row: Record<string, any>) {
  const value = Number(row.id ?? row.personId);
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

function personName(row: Record<string, any>) {
  return text(row.name || row.personName || row.displayName || row.genealogyName) || '未命名人物';
}

function personBranchName(row: Record<string, any>) {
  return text(row.branchName || row.branch?.branchName || row.scope?.branchName) || undefined;
}

function personGenerationText(row: Record<string, any>) {
  const generationNo = text(row.generationNo || row.generation || row.generationNumber);
  const generationWord = text(row.generationWord || row.word);
  if (generationNo && generationWord) return `第${generationNo}世 · ${generationWord}字辈`;
  if (generationNo) return `第${generationNo}世`;
  if (generationWord) return `${generationWord}字辈`;
  return undefined;
}

function toPersonOption(row: Record<string, any>): CulturePersonOption | null {
  const value = personId(row);
  if (!value) return null;
  const name = personName(row);
  const branchName = personBranchName(row);
  const generationText = personGenerationText(row);
  return {
    value,
    name,
    branchName,
    generationText,
    label: [name, branchName, generationText].filter(Boolean).join(' · ')
  };
}

export async function searchCulturePersons(clanId: string, keyword: string, branchId?: number) {
  const params = new URLSearchParams({
    clanId,
    keyword: keyword.trim(),
    pageNo: '1',
    pageSize: '20'
  });
  if (branchId) params.set('branchId', String(branchId));
  const data = await apiClient.get<unknown>(`/persons/search?${params.toString()}`);
  return toRecordList<Record<string, any>>(data)
    .map(toPersonOption)
    .filter((item): item is CulturePersonOption => Boolean(item));
}
