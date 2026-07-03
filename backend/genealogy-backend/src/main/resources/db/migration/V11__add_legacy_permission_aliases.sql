-- Add legacy permission aliases used by existing controllers/services.
-- The codebase historically used colon-style permissions such as review_task:view.
-- PermissionApplicationService normalizes ':' to '.', so the RBAC table must contain dot-style aliases.

with seed(permission_code, permission_name, module_code, module_name, resource_code, action_code, description) as (
    values
        ('clan.manage_settings', '管理宗族设置', 'clan', '宗族管理', 'clan', 'manage_settings', '兼容旧权限 clan:manage_settings。'),
        ('clan.delete', '删除宗族', 'clan', '宗族管理', 'clan', 'delete', '兼容旧权限 clan:delete。'),

        ('relationship.check_conflict', '关系冲突检查', 'relationship', '亲属关系', 'relationship', 'check_conflict', '兼容旧权限 relationship:check_conflict。'),

        ('source.bind', '绑定来源资料', 'source', '来源资料', 'source', 'bind', '兼容旧权限 source:bind。'),

        ('attachment.view', '查看附件', 'attachment', '附件管理', 'attachment', 'view', '兼容旧权限 attachment:view。'),
        ('attachment.upload', '上传附件', 'attachment', '附件管理', 'attachment', 'upload', '兼容旧权限 attachment:upload。'),
        ('attachment.preview', '预览附件', 'attachment', '附件管理', 'attachment', 'preview', '兼容旧权限 attachment:preview。'),
        ('attachment.download', '下载附件', 'attachment', '附件管理', 'attachment', 'download', '兼容旧权限 attachment:download。'),
        ('attachment.delete', '删除附件', 'attachment', '附件管理', 'attachment', 'delete', '兼容旧权限 attachment:delete。'),

        ('review_task.view', '查看审核任务', 'review_task', '审核任务', 'review_task', 'view', '兼容旧权限 review_task:view。'),
        ('review_task.approve', '审核通过任务', 'review_task', '审核任务', 'review_task', 'approve', '兼容旧权限 review_task:approve。'),
        ('review_task.reject', '审核驳回任务', 'review_task', '审核任务', 'review_task', 'reject', '兼容旧权限 review_task:reject。'),
        ('review_task.assign', '分配审核任务', 'review_task', '审核任务', 'review_task', 'assign', '兼容旧权限 review_task:assign。'),

        ('export_task.create', '创建导出任务', 'export_task', '导出任务', 'export_task', 'create', '兼容旧权限 export_task:create。'),
        ('export_task.approve', '审批导出任务', 'export_task', '导出任务', 'export_task', 'approve', '兼容旧权限 export_task:approve。'),
        ('export_task.download', '下载导出结果', 'export_task', '导出任务', 'export_task', 'download', '兼容旧权限 export_task:download。'),

        ('operation_log.view', '查看操作日志', 'operation_log', '操作日志', 'operation_log', 'view', '兼容旧权限 operation_log:view。'),
        ('operation_log.export', '导出操作日志', 'operation_log', '操作日志', 'operation_log', 'export', '兼容旧权限 operation_log:export。'),

        ('member.update_role', '调整成员角色', 'member', '成员权限', 'member', 'update_role', '兼容旧权限 member:update_role。'),
        ('member.disable', '停用成员', 'member', '成员权限', 'member', 'disable', '兼容旧权限 member:disable。'),
        ('member.transfer_owner', '转移宗族负责人', 'member', '成员权限', 'member', 'transfer_owner', '兼容旧权限 member:transfer_owner。')
)
insert into app_permission (
    permission_code,
    permission_name,
    module_code,
    module_name,
    resource_code,
    action_code,
    description,
    system_permission,
    status,
    created_at,
    updated_at
)
select
    permission_code,
    permission_name,
    module_code,
    module_name,
    resource_code,
    action_code,
    description,
    true,
    'active',
    now(),
    now()
from seed
on conflict (resource_code, action_code) do update
set permission_code = excluded.permission_code,
    permission_name = excluded.permission_name,
    module_code = excluded.module_code,
    module_name = excluded.module_name,
    description = excluded.description,
    system_permission = true,
    status = 'active',
    updated_at = now();

with role_permissions(role_code, permission_code) as (
    values
        -- clan_admin: legacy full clan administration permissions.
        ('clan_admin', 'clan.manage_settings'),
        ('clan_admin', 'clan.delete'),
        ('clan_admin', 'relationship.check_conflict'),
        ('clan_admin', 'source.bind'),
        ('clan_admin', 'attachment.view'),
        ('clan_admin', 'attachment.upload'),
        ('clan_admin', 'attachment.preview'),
        ('clan_admin', 'attachment.download'),
        ('clan_admin', 'attachment.delete'),
        ('clan_admin', 'review_task.view'),
        ('clan_admin', 'review_task.approve'),
        ('clan_admin', 'review_task.reject'),
        ('clan_admin', 'review_task.assign'),
        ('clan_admin', 'export_task.create'),
        ('clan_admin', 'export_task.approve'),
        ('clan_admin', 'export_task.download'),
        ('clan_admin', 'operation_log.view'),
        ('clan_admin', 'operation_log.export'),
        ('clan_admin', 'member.update_role'),
        ('clan_admin', 'member.disable'),
        ('clan_admin', 'member.transfer_owner'),

        -- branch_admin: branch-scoped maintenance permissions.
        ('branch_admin', 'relationship.check_conflict'),
        ('branch_admin', 'source.bind'),
        ('branch_admin', 'attachment.view'),
        ('branch_admin', 'attachment.upload'),
        ('branch_admin', 'attachment.preview'),
        ('branch_admin', 'attachment.download'),
        ('branch_admin', 'review_task.view'),
        ('branch_admin', 'export_task.create'),

        -- editor: data maintenance permissions.
        ('editor', 'relationship.check_conflict'),
        ('editor', 'source.bind'),
        ('editor', 'attachment.view'),
        ('editor', 'attachment.upload'),
        ('editor', 'attachment.preview'),
        ('editor', 'attachment.download'),
        ('editor', 'review_task.view'),

        -- reviewer: review permissions.
        ('reviewer', 'attachment.view'),
        ('reviewer', 'attachment.preview'),
        ('reviewer', 'review_task.view'),
        ('reviewer', 'review_task.approve'),
        ('reviewer', 'review_task.reject'),

        -- viewer: read-only attachment preview.
        ('viewer', 'attachment.view'),
        ('viewer', 'attachment.preview')
)
insert into app_role_permission (
    role_id,
    permission_id,
    effect,
    status,
    created_at,
    updated_at
)
select
    r.id,
    p.id,
    'allow',
    'active',
    now(),
    now()
from role_permissions rp
join app_role r on r.role_code = rp.role_code
join app_permission p on p.permission_code = rp.permission_code
on conflict (role_id, permission_id) do update
set effect = 'allow',
    status = 'active',
    updated_at = now();
