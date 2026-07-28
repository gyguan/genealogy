import { Space } from 'antd';
import { MemberInvitationAction } from './MemberInvitationAction';
import { MemberPage } from './MemberPage';

export function MemberManagementPage() {
  return (
    <div className="member-management-page">
      <div className="member-management-page__actions">
        <Space wrap>
          <MemberInvitationAction />
        </Space>
      </div>
      <MemberPage />
    </div>
  );
}
