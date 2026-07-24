import { useEffect, useState } from 'react';
import { Button } from 'antd';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { toRecordList } from '../../shared/ui/DataTable';
import { feedback } from '../../shared/ui/OperationFeedback';
import { memberPermissionApi, type GrantableRole } from './memberPermissionApi';
import { MemberInvitationModal } from './MemberInvitationModal';

type Branch = { id: number; branchName: string };

export function MemberInvitationAction() {
  const workspace = useWorkspace();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<GrantableRole[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const clanId = Number(workspace.clanId || 0);

  async function loadContext() {
    if (!clanId) {
      setRoles([]);
      setBranches([]);
      return [] as GrantableRole[];
    }
    setLoading(true);
    try {
      const [roleResult, branchResult] = await Promise.all([
        memberPermissionApi.grantableRoles(String(clanId)),
        apiClient.get(`/clans/${clanId}/branches`).catch(() => [])
      ]);
      const nextRoles = roleResult || [];
      setRoles(nextRoles);
      setBranches(toRecordList(branchResult) as Branch[]);
      return nextRoles;
    } catch (error) {
      feedback.error(error instanceof Error ? error.message : '邀请上下文加载失败');
      setRoles([]);
      setBranches([]);
      return [] as GrantableRole[];
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadContext();
  }, [clanId]);

  async function showInvitation() {
    const availableRoles = roles.length ? roles : await loadContext();
    if (availableRoles.length) setOpen(true);
  }

  return (
    <>
      <Button loading={loading} disabled={!clanId || (!loading && !roles.length)} onClick={() => void showInvitation()}>
        邀请新成员
      </Button>
      <MemberInvitationModal
        open={open}
        clanId={clanId}
        roles={roles}
        branches={branches}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
