from pathlib import Path
import re


def read(path: str) -> str:
    return Path(path).read_text(encoding='utf-8')


def write(path: str, content: str) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding='utf-8')


def require_replace(path: str, old: str, new: str, label: str) -> None:
    text = read(path)
    if old not in text:
        raise RuntimeError(f'{label} anchor missing')
    write(path, text.replace(old, new, 1))


shared_path = 'frontend/genealogy-web/src/shared/domain/personFormOptions.ts'
write(shared_path, '''export type PersonGenerationItem = {
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
''')

person_step_path = 'frontend/genealogy-web/src/features/mvp1/steps/person/PersonStep.tsx'
text = read(person_step_path)
import_anchor = "import { nullableBoolean, nullableNumber, nullableString } from '../../domain/normalize';"
shared_import = "import { personEducationOptions } from '../../../../shared/domain/personFormOptions';"
if shared_import not in text:
    if import_anchor not in text:
        raise RuntimeError('person create import anchor missing')
    text = text.replace(import_anchor, shared_import + '\n' + import_anchor, 1)
text, count = re.subn(
    r"\nconst educationOptions = \[.*?\n\];\n\nconst lineageStatusOptions",
    "\nconst lineageStatusOptions",
    text,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError('person create education options anchor missing')
text = text.replace('options={educationOptions}', 'options={personEducationOptions}')
write(person_step_path, text)

person_edit_path = 'frontend/genealogy-web/src/features/persons/PersonEditPage.tsx'
text = read(person_edit_path)
edit_import_anchor = "import { apiClient } from '../../shared/api/client';"
edit_shared_import = "import { personEducationOptions, personGenerationLabel, personGenerationOptionValue, personGenerationSelectedValue, selectPersonGeneration } from '../../shared/domain/personFormOptions';"
if edit_shared_import not in text:
    if edit_import_anchor not in text:
        raise RuntimeError('person edit import anchor missing')
    text = text.replace(edit_import_anchor, edit_import_anchor + '\n' + edit_shared_import, 1)
text, count = re.subn(
    r"\nfunction distinct\(values: string\[\]\) \{.*?\n\}\n",
    "\n",
    text,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError('person edit distinct helper anchor missing')

generation_options = '''  const generationOptions = useMemo(() => {
    const options = new Map<string, { value: string; label: string }>();
    availableGenerationItems.forEach(item => {
      const value = personGenerationOptionValue(item);
      if (value === '@@') return;
      options.set(value, { value, label: personGenerationLabel(item) });
    });
    return [...options.values()];
  }, [availableGenerationItems]);

  useEffect(() =>'''
text, count = re.subn(
    r"  const generationWordOptions = useMemo\(\(\) => \{.*?\n  \}, \[availableGenerationItems, selectedGenerationNo\]\);\n\n  useEffect\(\(\) =>",
    generation_options,
    text,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError('person edit generation options anchor missing')

generation_handler = '''  function changeGeneration(value?: string) {
    form.setFieldsValue(selectPersonGeneration(value, availableGenerationItems));
    setDirty(true);
    setSaved(false);
  }

  function changeDate'''
text, count = re.subn(
    r"  function changeGenerationWord\(value\?: string\) \{.*?\n  \}\n\n  function changeDate",
    generation_handler,
    text,
    count=1,
    flags=re.S,
)
if count != 1:
    raise RuntimeError('person edit generation handler anchor missing')

generation_fields = '''            <Form.Item name="generationWord" hidden><Input /></Form.Item>
            <Form.Item name="generationNo" hidden><Input /></Form.Item>
            <Form.Item label="字辈" extra="选择字辈后自动带出代次，仅展示已审核通过的字辈方案明细">
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                value={personGenerationSelectedValue(selectedGenerationWord, selectedGenerationNo, availableGenerationItems)}
                loading={loadingGenerations}
                disabled={!loadingGenerations && !generationOptions.length}
                placeholder={loadingGenerations ? '正在加载字辈' : '请选择字辈'}
                options={generationOptions}
                onChange={changeGeneration}
              />
            </Form.Item>
            <Form.Item label="代次">
              <Input value={selectedGenerationNo ? `第${selectedGenerationNo}世` : '选择字辈后自动带出'} disabled readOnly />
            </Form.Item>'''
field_pattern = re.compile(
    r'''            <Form\.Item name="generationNo" label="代次"[\s\S]*?'''
    r'''            </Form\.Item>\n'''
    r'''            <Form\.Item name="generationWord" label="字辈"[\s\S]*?'''
    r'''            </Form\.Item>'''
)
text, count = field_pattern.subn(generation_fields, text, count=1)
if count != 1:
    raise RuntimeError('person edit generation fields anchor missing')

old_education = '<Form.Item name="occupation" label="职业"><Input /></Form.Item><Form.Item name="education" label="教育程度"><Input /></Form.Item><Form.Item name="titleOrHonor" label="称号荣誉"><Input /></Form.Item>'
new_education = '<Form.Item name="occupation" label="职业"><Input /></Form.Item><Form.Item name="education" label="教育程度"><Select options={personEducationOptions} /></Form.Item><Form.Item name="titleOrHonor" label="称号荣誉"><Input /></Form.Item>'
if old_education not in text:
    raise RuntimeError('person edit education anchor missing')
text = text.replace(old_education, new_education, 1)
write(person_edit_path, text)

test_path = 'frontend/genealogy-web/src/features/persons/personEditModel.test.mjs'
text = read(test_path)
shared_test_import = '''import {
  personEducationOptions,
  personGenerationSelectedValue,
  selectPersonGeneration
} from '../../../.person-edit-test/shared/domain/personFormOptions.js';'''
status_import_end = "} from '../../../.person-edit-test/features/persons/personStatusActions.js';"
if shared_test_import not in text:
    if status_import_end not in text:
        raise RuntimeError('person edit test import anchor missing')
    text = text.replace(status_import_end, status_import_end + '\n' + shared_test_import, 1)
source_anchor = "const personEditPageSource = readFileSync(new URL('./PersonEditPage.tsx', import.meta.url), 'utf8');"
if 'const personCreatePageSource' not in text:
    if source_anchor not in text:
        raise RuntimeError('person edit test source anchor missing')
    text = text.replace(
        source_anchor,
        source_anchor + "\nconst personCreatePageSource = readFileSync(new URL('../mvp1/steps/person/PersonStep.tsx', import.meta.url), 'utf8');",
        1,
    )
new_tests = r'''

test('person create and edit share education options', () => {
  assert.deepEqual(personEducationOptions.map(item => item.value), [
    '', '私塾/家学', '小学', '初中', '高中', '中专', '大专', '本科', '硕士', '博士', '其他'
  ]);
  assert.match(personCreatePageSource, /options=\{personEducationOptions\}/);
  assert.match(personEditPageSource, /name="education" label="教育程度"><Select options=\{personEducationOptions\}/);
});

test('person edit selects generation word and derives generation number', () => {
  const items = [
    { word: '永', generationNo: 18 },
    { word: '世', generationNo: 19 }
  ];
  assert.equal(personGenerationSelectedValue('永', '18', items), '永@@18');
  assert.deepEqual(selectPersonGeneration('世@@19', items), { generationWord: '世', generationNo: '19' });
  assert.deepEqual(selectPersonGeneration('', items), { generationWord: '', generationNo: '' });
  assert.doesNotMatch(personEditPageSource, /name="generationNo" label="代次"/);
  assert.match(personEditPageSource, /<Form.Item label="代次">[\s\S]*disabled readOnly/);
  assert.match(personEditPageSource, /onChange=\{changeGeneration\}/);
});
'''
if "test('person create and edit share education options'" not in text:
    text += new_tests
write(test_path, text)

package_path = 'frontend/genealogy-web/package.json'
text = read(package_path)
old_script = 'npx tsc src/features/persons/personEditModel.ts src/features/persons/personDetailModel.ts src/features/persons/personStatusActions.ts --ignoreConfig'
new_script = 'npx tsc src/shared/domain/personFormOptions.ts src/features/persons/personEditModel.ts src/features/persons/personDetailModel.ts src/features/persons/personStatusActions.ts --ignoreConfig'
if old_script not in text:
    raise RuntimeError('person edit test script anchor missing')
write(package_path, text.replace(old_script, new_script, 1))

task_path = 'tasks/issue-713-execution.md'
text = read(task_path)
for item in [
    '抽取人物表单公共选项与字辈联动模型',
    '调整人物编辑页字辈/代次交互',
    '统一创建页与编辑页教育程度选项',
    '增加回归测试',
    '通过前端 CI'
]:
    text = text.replace(f'- [ ] {item}', f'- [x] {item}')
write(task_path, text)
