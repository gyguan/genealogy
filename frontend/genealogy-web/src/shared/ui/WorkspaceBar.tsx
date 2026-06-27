import { useWorkspace } from '../context/WorkspaceContext';

const fields = [
  ['clanId', '宗族ID'],
  ['branchId', '支派ID'],
  ['personId', '人物ID'],
  ['relationshipId', '关系ID'],
  ['sourceId', '来源ID'],
  ['attachmentId', '附件ID'],
  ['reviewTaskId', '审核任务ID']
] as const;

type WorkspaceField = typeof fields[number][0];

export function WorkspaceBar() {
  const workspace = useWorkspace();

  function update(key: WorkspaceField, value: string) {
    switch (key) {
      case 'clanId': workspace.setClanId(value); break;
      case 'branchId': workspace.setBranchId(value); break;
      case 'personId': workspace.setPersonId(value); break;
      case 'relationshipId': workspace.setRelationshipId(value); break;
      case 'sourceId': workspace.setSourceId(value); break;
      case 'attachmentId': workspace.setAttachmentId(value); break;
      case 'reviewTaskId': workspace.setReviewTaskId(value); break;
    }
  }

  return (
    <section className="workspace-bar">
      <div className="workspace-bar__title">
        <strong>当前工作区</strong>
        <span>创建/查询产生的关键 ID 会自动沉淀，也可手工修正。</span>
      </div>
      <div className="workspace-bar__fields">
        {fields.map(([key, label]) => (
          <label key={key}>
            <span>{label}</span>
            <input value={workspace[key]} onChange={e => update(key, e.target.value)} />
          </label>
        ))}
      </div>
    </section>
  );
}
