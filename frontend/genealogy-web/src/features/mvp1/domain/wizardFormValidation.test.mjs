import assert from 'node:assert/strict';
import test from 'node:test';
import { validateWizardStep } from '../../../.wizard-form-test/features/mvp1/domain/wizardFormValidation.js';

test('clan requires clan name and surname', () => {
  assert.deepEqual(validateWizardStep('clan', { '宗族名称': '', '姓氏': '' }), {
    '宗族名称': '请填写宗族名称',
    '姓氏': '请填写姓氏'
  });
});

test('person validates required fields and date order', () => {
  const errors = validateWizardStep('person', {
    '适用宗族': '1',
    '所属支派': '2',
    '姓名': '张三',
    '性别': '男',
    '出生日期': '2020-01-02',
    '逝世日期': '2019-01-02',
    '是否在世': '已故'
  });
  assert.equal(errors['逝世日期'], '逝世日期不能早于出生日期');
});

test('living person cannot have death date', () => {
  const errors = validateWizardStep('person', {
    '适用宗族': '1',
    '所属支派': '2',
    '姓名': '张三',
    '性别': '男',
    '出生日期': '2000-01-01',
    '逝世日期': '2020-01-01',
    '是否在世': '在世'
  });
  assert.match(errors['逝世日期'], /清空/);
  assert.match(errors['是否在世'], /不能填写逝世日期/);
});

test('relationship requires distinct center and relative', () => {
  const errors = validateWizardStep('relationship', {
    '中心人物': '人物#1',
    '关系类型': '父亲',
    '亲属': '人物#1',
    '选择规则': '目标代次：第2世'
  });
  assert.equal(errors['亲属'], '中心人物和亲属不能是同一人物');
});

test('relationship blocks a center person without generation', () => {
  const errors = validateWizardStep('relationship', {
    '中心人物': '人物#1',
    '关系类型': '父亲',
    '亲属': '人物#2',
    '选择规则': '中心人物需维护代次后才能自动筛选'
  });
  assert.match(errors['中心人物'], /维护代次/);
});
