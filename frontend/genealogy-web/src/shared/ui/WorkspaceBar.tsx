import { WorkspaceContext, WorkspaceUpdater } from '../workspace/types';

const fields: Array<[keyof WorkspaceContext, string]> = [
  ['clanId', '宗族ID'],
  ['branchId', '支派ID'],
  ['personId', '人物ID'],
  ['relationshipId', '关系ID'],
  ['sourceId', '来源ID'],
  ['attachmentId', '附件ID'],
  ['reviewTaskId', '审核任务ID']
];

export function WorkspaceBar({ workspace, updateWorkspace }: { workspace: WorkspaceContext; updateWorkspace: WorkspaceUpdater }) {
  return (
    <section className="workspace-bar">
      <div className="workspace-bar__title">
        <strong>当前工作区</strong>
        <span>常用 ID 会在各功能页面自动带入，也可手工修改。</span>
      </div>
      <div className="workspace-bar__fields">
        {fields.map(([key, label]) => (
          <label key={key}>
            <span>{label}</span>
            <input value={workspace[key]} onChange={e => updateWorkspace({ [key]: e.target.value })} />
          </label>
        ))}
      </div>
    </section>
  );
}
