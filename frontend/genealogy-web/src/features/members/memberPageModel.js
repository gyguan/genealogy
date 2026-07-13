export const EMPTY_MEMBER_FILTERS = Object.freeze({
  keyword: '',
  roleCode: '',
  scopeType: '',
  status: ''
});

const ERROR_MESSAGES = Object.freeze({
  AUTH_UNAUTHORIZED: '登录状态已失效，请重新登录后再操作',
  AUTH_FORBIDDEN: '当前账号没有执行该操作的权限',
  MEMBER_GRANT_FORBIDDEN: '目标成员或授权范围超出你的管理边界',
  MEMBER_PERMISSION_REASON_REQUIRED: '请填写权限变更原因',
  MEMBER_GRANT_DUPLICATED: '该成员已经拥有相同角色和授权范围',
  LAST_CLAN_ADMIN_REQUIRED: '该操作会导致宗族失去最后一名有效管理员，请先指定另一名宗族管理员',
  MEMBER_ROLE_SCOPE_INVALID: '所选角色与授权范围不匹配',
  MEMBER_SCOPE_INVALID: '授权范围不正确，请重新选择',
  BRANCH_CLAN_MISMATCH: '所选支派不属于当前宗族',
  MEMBER_PERMISSION_AUDIT_ACTION_INVALID: '权限变更动作筛选条件不正确',
  MEMBER_PERMISSION_AUDIT_TIME_INVALID: '审计查询开始时间不能晚于结束时间'
});

const ROLE_LABELS = Object.freeze({
  clan_admin: '宗族管理员',
  branch_admin: '支派管理员',
  editor: '编辑',
  reviewer: '审核员',
  viewer: '查看者'
});

const STATUS_LABELS = Object.freeze({
  active: '有效',
  revoked: '已撤销',
  disabled: '已停用',
  removed: '已移除'
});

export function createMemberQuery(filters, pageNo, pageSize) {
  return {
    keyword: String(filters?.keyword || '').trim(),
    roleCode: String(filters?.roleCode || ''),
    scopeType: String(filters?.scopeType || ''),
    status: String(filters?.status || ''),
    pageNo: Math.max(1, Number(pageNo) || 1),
    pageSize: Math.max(1, Number(pageSize) || 10)
  };
}

export function resetMemberQuery(pageSize = 10) {
  return createMemberQuery(EMPTY_MEMBER_FILTERS, 1, pageSize);
}

export function memberPermissionErrorMessage(error, fallback = '操作失败') {
  const code = String(error?.code || '');
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  const message = String(error?.message || '').trim();
  return message && !/exception|stack trace|java\.|org\./i.test(message) ? message : fallback;
}

export function roleCapabilityText(role) {
  if (!role) return '';
  if (role.description) return role.description;
  const defaults = {
    clan_admin: '管理全宗族成员、支派和权限配置',
    branch_admin: '管理指定支派及全部下级支派的数据',
    editor: '在授权范围内新增和编辑族谱资料',
    reviewer: '审核全宗族范围内提交的正式数据变更',
    viewer: '查看授权范围内允许访问的族谱资料'
  };
  return defaults[role.roleCode] || '能力由后台角色权限配置决定';
}

export function scopePreview(scopeType, scopeId, clanName, branches) {
  if (scopeType === 'clan') {
    return `授权范围：${clanName || '当前宗族'}全部数据`;
  }
  const branch = (branches || []).find(item => Number(item.id) === Number(scopeId));
  return branch
    ? `授权范围：${branch.branchName}及全部下级支派`
    : '授权范围：请选择一个支派，权限将覆盖该支派及全部下级支派';
}

export function formatAuditValue(value, branches = []) {
  const text = String(value || '').trim();
  if (!text) return '-';
  if (STATUS_LABELS[text]) return STATUS_LABELS[text];

  const pairs = Object.fromEntries(text.split(',').map(part => {
    const index = part.indexOf('=');
    return index < 0 ? [part.trim(), ''] : [part.slice(0, index).trim(), part.slice(index + 1).trim()];
  }));
  if (!pairs.role && !pairs.scopeType && !pairs.status) return text;

  const role = ROLE_LABELS[pairs.role] || pairs.role || '未指定角色';
  let scope = '未指定范围';
  if (pairs.scopeType === 'clan') {
    scope = '全宗族';
  } else if (pairs.scopeType === 'branch' || pairs.scopeType === 'branch_subtree') {
    const branch = branches.find(item => Number(item.id) === Number(pairs.scopeId));
    const branchName = branch?.branchName || '历史支派';
    scope = pairs.scopeType === 'branch_subtree' ? `${branchName}及下级支派` : branchName;
  }
  const status = STATUS_LABELS[pairs.status] || pairs.status || '未知状态';
  return `角色：${role}；范围：${scope}；状态：${status}`;
}

export function auditActionText(actionType) {
  const labels = {
    member_grant_create: '新增授权',
    member_grant_update: '调整授权',
    member_grant_revoke: '撤销授权',
    member_status_update: '变更成员状态'
  };
  return labels[actionType] || actionType || '权限变更';
}
