-- Reset demo user passwords to hashes compatible with PasswordHashUtil.
-- PasswordHashUtil requires: PBKDF2$120000$base64Salt$base64Hash.

update app_user
set password_hash = 'PBKDF2$120000$Z2VuZWFsb2d5LWFkbWluMQ==$b3LgXPJaGszu+eUFifk0u1gc01G+sy70jxCOlqBbazA=',
    status = 'active',
    deleted_at = null,
    updated_at = now()
where username = 'demo_admin';

update app_user
set password_hash = 'PBKDF2$120000$Z2VuZWFsb2d5LWJyYW5jaDE=$I60OAoASGVeCP1WXNskRXjK7ziGMOCFbvsMdz8VfpCw=',
    status = 'active',
    deleted_at = null,
    updated_at = now()
where username = 'demo_branch_admin';

update app_user
set password_hash = 'PBKDF2$120000$Z2VuZWFsb2d5LWRlbW8tMQ==$JAo+pyqkFYJLFstlWyONhsMq/i+KEAeBiakqAieAjTU=',
    status = 'active',
    deleted_at = null,
    updated_at = now()
where username = 'demo_editor';

update app_user
set password_hash = 'PBKDF2$120000$Z2VuZWFsb2d5LXJldmlldw==$VDT/MoCaU7RJRCA4ivkij4xwe8glg3M9RC21BffUYsU=',
    status = 'active',
    deleted_at = null,
    updated_at = now()
where username = 'demo_reviewer';

update app_user
set password_hash = 'PBKDF2$120000$Z2VuZWFsb2d5LXZpZXdlcg==$WfS44R32Q6Ha47/vAG4ruSU9HDMug+eS0PUUHABE7co=',
    status = 'active',
    deleted_at = null,
    updated_at = now()
where username = 'demo_viewer';
