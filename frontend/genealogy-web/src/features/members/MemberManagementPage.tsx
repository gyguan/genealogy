import { MemberInvitationAction } from './MemberInvitationAction';
import { MemberPage } from './MemberPage';

export function MemberManagementPage() {
  return (
    <div className="member-management-page">
      <MemberInvitationAction />
      <MemberPage />
    </div>
  );
}
