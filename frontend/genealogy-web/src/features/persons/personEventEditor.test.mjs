import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const editorSource = readFileSync(new URL('./PersonEventEditor.tsx', import.meta.url), 'utf8');
const modelSource = readFileSync(new URL('./personEventEditorModel.ts', import.meta.url), 'utf8');

test('person event editor uses modal maintenance and list presentation', () => {
  assert.ok(editorSource.includes('export function PersonEventEditor'));
  assert.ok(editorSource.includes('<Modal'));
  assert.ok(editorSource.includes("title={editingIndex === null ? '新增生平事迹' : '编辑生平事迹'}"));
  assert.ok(editorSource.includes('<Table<PersonEventDraft>'));
  assert.ok(editorSource.includes('Grid.useBreakpoint'));
  assert.ok(editorSource.includes('暂未录入生平事迹'));
  assert.ok(editorSource.includes('新增第一条生平事迹'));
  assert.ok(editorSource.includes('Popconfirm'));
  assert.ok(editorSource.includes('确认删除'));
});

test('person event modal preserves validation ordering and draft-only mutation', () => {
  assert.ok(editorSource.includes('label="事件标题" required'));
  assert.ok(editorSource.includes('label="事件类型"'));
  assert.ok(editorSource.includes('label="事件日期"'));
  assert.ok(editorSource.includes('label="日期精度"'));
  assert.ok(editorSource.includes('label="地点"'));
  assert.ok(editorSource.includes('label="事件描述"'));
  assert.ok(editorSource.includes('isFuturePersonEventDate'));
  assert.ok(editorSource.includes('onChange?.(normalizePersonEvents(next))'));
  assert.ok(editorSource.includes('movePersonEvent'));
  assert.ok(modelSource.includes('toReplacePersonEventsPayload'));
  assert.ok(modelSource.includes('normalizePersonEvents'));
});
