import { MemberInvitationAction } from './MemberInvitationAction';
import { MemberPage } from './MemberPage';
import { StandardPageActions } from '../../shared/ui/StandardPagePatterns';

export function MemberManagementPage() {
  return (
    <div className="member-management-page">
      <StandardPageActions><MemberInvitationAction /></StandardPageActions>
      <MemberPage />
    </div>
  );
}
