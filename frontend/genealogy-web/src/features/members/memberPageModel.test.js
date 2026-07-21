import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createMemberQuery,
  formatAuditValue,
  memberPermissionErrorMessage,
  resetMemberQuery,
  scopePreview
} from './memberPageModel.js';

const memberPageSource = readFileSync(new URL('./MemberPage.tsx', import.meta.url), 'utf8');

test('query state trims keyword and keeps explicit page state', () => {
  assert.deepEqual(
    createMemberQuery({ keyword: '  黄 ', roleCode: 'viewer', scopeType: '', status: 'active' }, 3, 25),
    { keyword: '黄', roleCode: 'viewer', scopeType: '', status: 'active', pageNo: 3, pageSize: 25 }
  );
});

test('reset query does not reuse stale filters', () => {
  assert.deepEqual(resetMemberQuery(20), {
    keyword: '', roleCode: '', scopeType: '', status: '', pageNo: 1, pageSize: 20
  });
});

test('member permission errors prefer stable business code', () => {
  assert.equal(
    memberPermissionErrorMessage({ code: 'LAST_CLAN_ADMIN_REQUIRED', message: 'internal text' }),
    '该操作会导致宗族失去最后一名有效管理员，请先指定另一名宗族管理员'
  );
});

test('scope preview and audit values show business names rather than ids', () => {
  const branches = [{ id: 12, branchName: '长沙支' }];
  assert.equal(scopePreview('branch_subtree', 12, '黄氏宗族', branches), '授权范围：长沙支及全部下级支派');
  assert.equal(
    formatAuditValue('role=viewer,scopeType=branch_subtree,scopeId=12,status=active', branches),
    '角色：查看者；范围：长沙支及下级支派；状态：有效'
  );
});


test('member query filters reuse the unified query multi-select', () => {
  assert.equal((memberPageSource.match(/<QueryMultiSelect/g) || []).length, 3);
  assert.match(memberPageSource, /value=\{roleFilter\}[\s\S]*placeholder="请选择角色（可多选）"/);
  assert.match(memberPageSource, /value=\{scopeFilter\}[\s\S]*placeholder="请选择授权范围（可多选）"/);
  assert.match(memberPageSource, /value=\{statusFilter\}[\s\S]*placeholder="请选择成员状态（可多选）"/);
  assert.doesNotMatch(memberPageSource, /label: '全部角色'|label: '全部范围'|label: '全部状态'/);
});

test('query state preserves comma-separated multi-value filters', () => {
  assert.deepEqual(
    createMemberQuery({
      keyword: ' 黄 ',
      roleCode: 'viewer,editor',
      scopeType: 'clan,branch_subtree',
      status: 'active,disabled'
    }, 2, 10),
    {
      keyword: '黄',
      roleCode: 'viewer,editor',
      scopeType: 'clan,branch_subtree',
      status: 'active,disabled',
      pageNo: 2,
      pageSize: 10
    }
  );
});

