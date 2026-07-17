export type PersonCreateEntryContext = {
  clanId: string;
  branchId: string;
};

export function getPersonCreateEntryError(context: PersonCreateEntryContext) {
  if (!context.clanId.trim()) return '请先选择宗族后再创建人物。';
  return '';
}
