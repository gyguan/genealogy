import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mapWizardServerFieldErrors,
  validateWizardStep,
  wizardFieldName
} from '../../../../.wizard-form-test/features/mvp1/domain/wizardFormValidation.js';

test('clan requires semantic clan name and surname fields', () => {
  assert.deepEqual(validateWizardStep('clan', { clanName: '', surname: '' }), {
    clanName: '请填写宗族名称',
    surname: '请填写姓氏'
  });
});

test('person validates required fields and date order', () => {
  const errors = validateWizardStep('person', {
    clanId: '1',
    branchId: '2',
    personName: '张三',
    gender: 'male',
    birthDate: '2020-01-02',
    deathDate: '2019-01-02',
    isLiving: 'false'
  });
  assert.equal(errors.deathDate, '逝世日期不能早于出生日期');
});

test('living person cannot have death date', () => {
  const errors = validateWizardStep('person', {
    clanId: '1',
    branchId: '2',
    personName: '张三',
    gender: 'male',
    birthDate: '2000-01-01',
    deathDate: '2020-01-01',
    isLiving: 'true'
  });
  assert.match(errors.deathDate, /清空/);
  assert.match(errors.isLiving, /不能填写逝世日期/);
});

test('relationship requires distinct center and relative', () => {
  const errors = validateWizardStep('relationship', {
    centerPersonId: '1',
    relationType: 'father',
    relativePersonId: '1',
    selectionRule: '目标代次：第2世'
  });
  assert.equal(errors.relativePersonId, '中心人物和亲属不能是同一人物');
});

test('relationship blocks a center person without generation', () => {
  const errors = validateWizardStep('relationship', {
    centerPersonId: '1',
    relationType: 'father',
    relativePersonId: '2',
    selectionRule: '中心人物需维护代次后才能自动筛选'
  });
  assert.match(errors.centerPersonId, /维护代次/);
});

test('display label aliases map to stable semantic names', () => {
  assert.equal(wizardFieldName('人物姓名'), '人物姓名');
  assert.equal(wizardFieldName('姓名 *'), 'personName');
  assert.equal(wizardFieldName('逝世日期'), 'deathDate');
});

test('server field errors are mapped without DOM lookup', () => {
  assert.deepEqual(mapWizardServerFieldErrors({ '姓名': '姓名已存在', deathDate: '日期冲突' }), {
    personName: '姓名已存在',
    deathDate: '日期冲突'
  });
});
