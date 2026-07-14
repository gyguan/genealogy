import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const modulePath = path.resolve('.tree-test/features/tree/lineageRequestState.js');
const { LineageRequestGate, readSearchPage, toPersonSearchItem } = await import(pathToFileURL(modulePath).href);

test('newer response invalidates an older response in the same scope', () => {
  const gate = new LineageRequestGate();
  gate.resetClan('clan-a');
  const oldRequest = gate.begin('search');
  const latestRequest = gate.begin('search');
  assert.equal(gate.isCurrent(oldRequest), false);
  assert.equal(gate.isCurrent(latestRequest), true);
});

test('clan reset invalidates all outstanding tokens atomically', () => {
  const gate = new LineageRequestGate();
  gate.resetClan('clan-a');
  const person = gate.begin('personGraph');
  const branch = gate.begin('branchGraph');
  const search = gate.begin('search');
  gate.resetClan('clan-b');
  assert.equal(gate.isCurrent(person), false);
  assert.equal(gate.isCurrent(branch), false);
  assert.equal(gate.isCurrent(search), false);
});

test('independent request scopes remain current together', () => {
  const gate = new LineageRequestGate();
  gate.resetClan('clan-a');
  const person = gate.begin('personGraph');
  const branch = gate.begin('branchGraph');
  gate.begin('search');
  assert.equal(gate.isCurrent(person), true);
  assert.equal(gate.isCurrent(branch), true);
});

test('search page uses server pagination and business labels', () => {
  const page = readSearchPage({
    records: [{ id: 1201, name: '黄承远', courtesyName: '子达', generationNo: 18, branchId: 7 }],
    total: 241,
    pageNo: 3,
    pageSize: 20,
    totalPages: 13
  }, value => toPersonSearchItem(value, new Map([['7', '长房']])));
  assert.equal(page.total, 241);
  assert.equal(page.pageNo, 3);
  assert.equal(page.totalPages, 13);
  assert.equal(page.records[0].label, '黄承远 · 子达 · 18世 · 长房');
  assert.ok(!page.records[0].label.includes('1201'));
});

test('array fallback remains a single result page', () => {
  const page = readSearchPage([{ id: 1, name: '甲' }, { id: 2, name: '乙' }], value => toPersonSearchItem(value, new Map()));
  assert.equal(page.records.length, 2);
  assert.equal(page.total, 2);
  assert.equal(page.pageNo, 1);
});
