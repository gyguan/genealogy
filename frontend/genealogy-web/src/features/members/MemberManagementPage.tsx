import { MemberInvitationAction } from './MemberInvitationAction';
import { MemberPage } from './MemberPage';

export function MemberManagementPage() {
  return (
    <div className="member-management-page">
      <div
        className="member-management-page__actions"
        style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}
      >
        <MemberInvitationAction />
      </div>
      <MemberPage />
    </div>
  );
}
