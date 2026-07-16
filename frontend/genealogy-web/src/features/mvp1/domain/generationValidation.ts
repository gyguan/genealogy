import type { GenerationItemLike } from '../services/generationService';

export const GENERATION_NUMBERS_MUST_BE_CONTINUOUS = false;

export type GenerationValidationIssueCode =
  | 'empty_items'
  | 'invalid_generation_no'
  | 'empty_word'
  | 'duplicate_generation_no'
  | 'duplicate_word'
  | 'non_continuous_generation_no';

export type GenerationValidationIssue = {
  code: GenerationValidationIssueCode;
  message: string;
  rowIndexes?: number[];
  generationNo?: number;
  word?: string;
};

export type GenerationValidationResult = {
  valid: boolean;
  issues: GenerationValidationIssue[];
  summary: string;
};

function positiveInteger(value: unknown) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : undefined;
}

function duplicateGroups<T>(values: T[]) {
  const groups = new Map<T, number[]>();
  values.forEach((value, index) => groups.set(value, [...(groups.get(value) || []), index]));
  return [...groups.entries()].filter(([, indexes]) => indexes.length > 1);
}

export function validateGenerationItems(items: GenerationItemLike[]): GenerationValidationResult {
  const issues: GenerationValidationIssue[] = [];
  if (!items.length) {
    issues.push({ code: 'empty_items', message: '至少需要一条有效字辈明细后才能提交审核' });
  }

  const normalized = items.map((item, index) => ({
    index,
    generationNo: positiveInteger(item.generationNo),
    word: String(item.word || '').trim()
  }));

  for (const row of normalized) {
    if (row.generationNo === undefined) {
      issues.push({ code: 'invalid_generation_no', message: `第 ${row.index + 1} 条明细的代次必须是正整数`, rowIndexes: [row.index] });
    }
    if (!row.word) {
      issues.push({ code: 'empty_word', message: `第 ${row.index + 1} 条明细的字辈不能为空`, rowIndexes: [row.index] });
    }
  }

  const validGenerationRows = normalized.filter(row => row.generationNo !== undefined);
  for (const [generationNo, indexes] of duplicateGroups(validGenerationRows.map(row => row.generationNo as number))) {
    issues.push({
      code: 'duplicate_generation_no',
      message: `代次“第${generationNo}世”重复，请保留一条后再提交`,
      generationNo,
      rowIndexes: indexes.map(index => validGenerationRows[index].index)
    });
  }

  const validWordRows = normalized.filter(row => row.word);
  for (const [word, indexes] of duplicateGroups(validWordRows.map(row => row.word))) {
    issues.push({
      code: 'duplicate_word',
      message: `字辈“${word}”重复，请确认并去重后再提交`,
      word,
      rowIndexes: indexes.map(index => validWordRows[index].index)
    });
  }

  if (GENERATION_NUMBERS_MUST_BE_CONTINUOUS && validGenerationRows.length) {
    const values = [...new Set(validGenerationRows.map(row => row.generationNo as number))].sort((a, b) => a - b);
    const missing: number[] = [];
    for (let value = values[0]; value <= values[values.length - 1]; value += 1) {
      if (!values.includes(value)) missing.push(value);
    }
    if (missing.length) {
      issues.push({
        code: 'non_continuous_generation_no',
        message: `代次不连续，缺少：${missing.map(value => `第${value}世`).join('、')}`
      });
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    summary: issues.length ? issues.map(issue => issue.message).join('；') : `共 ${items.length} 条有效字辈明细，可提交审核`
  };
}

export class GenerationReviewBlockedError extends Error {
  readonly code = 'GENERATION_REVIEW_BLOCKED';
  readonly issues: GenerationValidationIssue[];

  constructor(result: GenerationValidationResult) {
    super(result.summary);
    this.name = 'GenerationReviewBlockedError';
    this.issues = result.issues;
  }
}

export function isGenerationReviewBlockedError(error: unknown): error is GenerationReviewBlockedError {
  return error instanceof GenerationReviewBlockedError
    || Boolean(error && typeof error === 'object' && (error as { code?: unknown }).code === 'GENERATION_REVIEW_BLOCKED');
}
