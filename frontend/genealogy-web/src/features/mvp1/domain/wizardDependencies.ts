import type { Mvp1StepKey } from './wizardStepState';

export type WizardSelectionField =
  | 'clanId'
  | 'branchId'
  | 'generationSchemeId'
  | 'personId'
  | 'relationshipId'
  | 'sourceId';

export type WizardSelections = Record<WizardSelectionField | 'reviewTaskId', string>;

export type WizardDependencyPlan = {
  changedField: WizardSelectionField;
  changedStep: Mvp1StepKey;
  affectedSteps: Mvp1StepKey[];
  clearedFields: Array<keyof WizardSelections>;
  patch: Partial<WizardSelections>;
  hasSelectedImpact: boolean;
};

const fieldStep: Record<WizardSelectionField, Mvp1StepKey> = {
  clanId: 'clan',
  branchId: 'branch',
  generationSchemeId: 'generation',
  personId: 'person',
  relationshipId: 'relationship',
  sourceId: 'source'
};

const dependencyFields: Record<WizardSelectionField, Array<keyof WizardSelections>> = {
  clanId: ['branchId', 'generationSchemeId', 'personId', 'relationshipId', 'sourceId', 'reviewTaskId'],
  branchId: ['generationSchemeId', 'personId', 'relationshipId', 'sourceId', 'reviewTaskId'],
  generationSchemeId: ['personId', 'relationshipId', 'sourceId', 'reviewTaskId'],
  personId: ['relationshipId', 'sourceId', 'reviewTaskId'],
  relationshipId: ['sourceId', 'reviewTaskId'],
  sourceId: ['reviewTaskId']
};

const fieldLabel: Record<keyof WizardSelections, string> = {
  clanId: '宗族',
  branchId: '支派',
  generationSchemeId: '字辈',
  personId: '人物',
  relationshipId: '关系',
  sourceId: '来源',
  reviewTaskId: '审核'
};

export const wizardSelectionFields: WizardSelectionField[] = [
  'clanId',
  'branchId',
  'generationSchemeId',
  'personId',
  'relationshipId',
  'sourceId'
];

export function planWizardDependencyChange(
  current: WizardSelections,
  changedField: WizardSelectionField,
  nextValue: string
): WizardDependencyPlan {
  const clearedFields = dependencyFields[changedField];
  const patch: Partial<WizardSelections> = { [changedField]: nextValue };
  for (const field of clearedFields) patch[field] = '';
  return {
    changedField,
    changedStep: fieldStep[changedField],
    affectedSteps: clearedFields.map(field => field === 'reviewTaskId' ? 'review' : fieldStep[field as WizardSelectionField]),
    clearedFields,
    patch,
    hasSelectedImpact: clearedFields.some(field => Boolean(current[field]))
  };
}

export function dependencyImpactText(plan: WizardDependencyPlan) {
  return plan.clearedFields.map(field => fieldLabel[field]).join('、');
}

export function dependencyStepLabel(step: Mvp1StepKey) {
  return fieldLabel[step === 'review' ? 'reviewTaskId' : `${step}Id` as keyof WizardSelections] || step;
}
