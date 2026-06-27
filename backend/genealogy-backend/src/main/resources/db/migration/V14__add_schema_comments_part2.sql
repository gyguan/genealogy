-- Add remaining database-level comments not covered by V12.

comment on column person.tomb_place is '墓葬地';
comment on column person.epitaph is '墓志或碑文';
comment on column person.has_descendant is '是否有后裔';
comment on column person.lineage_status is '世系状态，normal/adopted/out等';
comment on column person.privacy_level is '隐私级别，public/clan_only/private等';
comment on column person.data_status is '数据状态，draft/pending_review/official等';
comment on column person.created_by is '创建人用户ID';
comment on column person.created_at is '创建时间';
comment on column person.updated_by is '更新人用户ID';
comment on column person.updated_at is '更新时间';
comment on column person.deleted_at is '软删除时间';

comment on table relationship is '人物关系表，记录亲子、配偶、收养等族谱关系';
comment on column relationship.clan_id is '所属宗族ID';
comment on column relationship.from_person_id is '关系起点人物ID，parent_child中代表父或母';
comment on column relationship.to_person_id is '关系终点人物ID，parent_child中代表子女';
comment on column relationship.relation_type is '关系类型，parent_child/spouse/adoptive等';
comment on column relationship.relation_label is '关系标签，如father/mother等';
comment on column relationship.is_lineage_relation is '是否纳入主世系关系';
comment on column relationship.is_biological is '是否血缘关系';
comment on column relationship.confidence_level is '可信度，low/medium/high等';
comment on column relationship.data_status is '数据状态，draft/pending_review/official等';
comment on column relationship.deleted_at is '软删除时间';

comment on table source is '资料来源表，记录族谱、碑文、口述等来源资料';
comment on column source.clan_id is '所属宗族ID';
comment on column source.source_name is '来源名称';
comment on column source.source_type is '来源类型，如genealogy_book/tombstone/oral等';
comment on column source.provider_name is '提供者或采集者';
comment on column source.book_title is '书名或资料标题';
comment on column source.volume_no is '卷号';
comment on column source.page_no is '页码';
comment on column source.excerpt is '资料摘录';
comment on column source.verification_status is '核验状态，unverified/pending_review/verified等';

comment on table attachment is '附件表，记录来源资料相关附件元数据';
comment on column attachment.clan_id is '所属宗族ID';
comment on column attachment.source_id is '关联来源ID';
comment on column attachment.file_name is '原始文件名';
comment on column attachment.file_type is '文件MIME类型';
comment on column attachment.file_size is '文件大小，单位字节';
comment on column attachment.storage_path is '文件存储路径';
comment on column attachment.checksum is '文件校验值';
comment on column attachment.uploaded_by is '上传人用户ID';
comment on column attachment.access_level is '访问级别，clan_only/private等';

comment on table source_binding is '来源绑定表，将来源资料绑定到人物、关系、支派或宗族';
comment on column source_binding.source_id is '来源ID';
comment on column source_binding.target_type is '目标类型，person/relationship/branch/clan等';
comment on column source_binding.target_id is '目标对象ID';
comment on column source_binding.binding_reason is '绑定原因';
comment on column source_binding.excerpt is '绑定摘录';

comment on table revision is '审核记录表，记录提交审核的变更对象和审核状态';
comment on column revision.target_type is '审核目标类型';
comment on column revision.target_id is '审核目标ID';
comment on column revision.change_type is '变更类型';
comment on column revision.diff_summary is '变更摘要';
comment on column revision.submitter_id is '提交人用户ID';
comment on column revision.status is '审核状态，draft/pending/approved/rejected等';

comment on table review_task is '审核任务表，承载待审核任务和审核处理信息';
comment on column review_task.revision_id is '关联审核记录ID';
comment on column review_task.reviewer_id is '审核人用户ID';
comment on column review_task.reviewer_role is '要求审核角色';
comment on column review_task.status is '任务状态，pending/approved/rejected等';

comment on table generation_scheme is '字辈方案表，记录宗族或支派的字辈规则';
comment on column generation_scheme.clan_id is '所属宗族ID';
comment on column generation_scheme.branch_id is '适用支派ID，空表示宗族默认方案';
comment on column generation_scheme.scheme_name is '方案名称';
comment on column generation_scheme.poem_text is '字辈诗';
comment on column generation_scheme.validation_enabled is '是否启用字辈校验';
comment on column generation_scheme.strict_mode is '是否严格校验';

comment on table generation_word is '字辈明细表，记录每一代对应的字辈';
comment on column generation_word.scheme_id is '所属字辈方案ID';
comment on column generation_word.generation_no is '代次';
comment on column generation_word.word is '字辈字';

comment on table app_user is '应用用户表，当前认证登录使用的用户账号';
comment on column app_user.username is '用户名';
comment on column app_user.phone is '手机号';
comment on column app_user.email is '邮箱';
comment on column app_user.password_hash is '密码哈希';
comment on column app_user.display_name is '显示名称';
comment on column app_user.status is '用户状态，active/inactive等';

comment on table app_auth_session is '登录会话表，保存轻量token会话信息';
comment on column app_auth_session.user_id is '用户ID';
comment on column app_auth_session.token_hash is 'token哈希值';
comment on column app_auth_session.issued_at is '签发时间';
comment on column app_auth_session.expires_at is '过期时间';
comment on column app_auth_session.revoked_at is '注销时间';

comment on table clan_member is '宗族成员表，记录用户在宗族中的成员身份、角色和授权范围';
comment on column clan_member.clan_id is '所属宗族ID';
comment on column clan_member.user_id is '应用用户ID';
comment on column clan_member.role_id is '当前角色ID，对应app_role';
comment on column clan_member.member_status is '成员状态，active/inactive/invited/removed等';
comment on column clan_member.scope_type is '授权范围类型，clan/branch等';
comment on column clan_member.scope_id is '授权范围ID';

comment on table app_role is '应用角色表，定义宗族内可分配的系统角色';
comment on column app_role.role_code is '角色编码';
comment on column app_role.role_name is '角色名称';
comment on table app_permission is '应用权限表，定义系统可授权的权限点';
comment on column app_permission.permission_code is '权限编码';
comment on column app_permission.module_code is '模块编码';
comment on column app_permission.action_code is '动作编码';
comment on table app_role_permission is '角色权限关系表，维护角色与权限点的多对多关系';

comment on table operation_log is '操作日志表，记录关键写操作和审计信息';
comment on column operation_log.actor_id is '操作者用户ID';
comment on column operation_log.action_type is '操作类型';
comment on column operation_log.target_type is '目标类型';
comment on column operation_log.target_id is '目标ID';
comment on column operation_log.summary is '操作摘要';
comment on column operation_log.request_id is '请求ID';
comment on column operation_log.client_ip is '客户端IP';

comment on table user_account is '早期用户表，兼容保留，当前认证使用app_user';
comment on table role is '早期角色表，兼容保留，当前成员角色使用app_role';
comment on table member_role is '早期成员角色关系表，兼容保留';
