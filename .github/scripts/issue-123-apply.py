from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    if old not in text:
        raise RuntimeError(f"anchor not found in {path}: {old[:120]!r}")
    file.write_text(text.replace(old, new, 1), encoding="utf-8")


# Tracking center: persist clan context, restore canonical deep links, and protect unauthorized summaries.
path = "frontend/genealogy-web/src/features/logs/LogPage.tsx"
replace_once(path,
"""    const search = writeTrackingCenterState({
      activeTab,
""",
"""    const search = writeTrackingCenterState({
      clanId: workspace.clanId,
      activeTab,
""")
replace_once(path,
"""  useEffect(() => {
    const search = writeTrackingCenterState({
""",
"""  useEffect(() => {
    if (!initial.clanId || initial.clanId === workspace.clanId) return;
    initializedClan.current = '';
    workspace.patch({ clanId: initial.clanId, branchId: '' });
  }, []);

  useEffect(() => {
    const search = writeTrackingCenterState({
""")
replace_once(path,
"""      setSelectedAuditLogId(restored.selectedAuditLogId);
      setSelectedAuditLog(null);
      if (!workspace.clanId) return;
      void loadObjects(restored.objectFilters);
      if (restored.activeTab === TRACKING_TABS.AUDIT) void loadAudit(restored.auditFilters, restored.selectedAuditLogId);
      if (restored.selectedTrace.targetType && restored.selectedTrace.targetId) {
        void loadTrace(restored.selectedTrace.targetType, restored.selectedTrace.targetId, null);
      }
""",
"""      setSelectedAuditLogId(restored.selectedAuditLogId);
      setSelectedAuditLog(null);
      if (restored.clanId && restored.clanId !== workspace.clanId) {
        initializedClan.current = '';
        workspace.patch({ clanId: restored.clanId, branchId: '' });
        return;
      }
      if (!workspace.clanId) return;
      void loadObjects(restored.objectFilters);
      if (restored.activeTab === TRACKING_TABS.AUDIT) void loadAudit(restored.auditFilters, restored.selectedAuditLogId);
      if (restored.selectedTrace.targetType && restored.selectedTrace.targetId) {
        void loadTrace(
          restored.selectedTrace.targetType,
          restored.selectedTrace.targetId,
          null,
          restored.selectedTrace.reviewTaskId
        );
      }
""")
replace_once(path,
"""    if (selectedTrace.targetType && selectedTrace.targetId) {
      void loadTrace(selectedTrace.targetType, selectedTrace.targetId, null);
    }
""",
"""    if (selectedTrace.targetType && selectedTrace.targetId) {
      void loadTrace(selectedTrace.targetType, selectedTrace.targetId, null, selectedTrace.reviewTaskId);
    }
""")
replace_once(path,
"""  async function loadTrace(targetType: string, targetId: string, row: TrackingObjectResponse | null) {
""",
"""  async function loadTrace(
    targetType: string,
    targetId: string,
    row: TrackingObjectResponse | null,
    reviewTaskId = ''
  ) {
""")
replace_once(path,
"""    setSelectedTrace({ targetType, targetId });
""",
"""    setSelectedTrace({ targetType, targetId, reviewTaskId });
""")
replace_once(path,
"""    } catch (error) {
      if (requestVersion !== traceRequestVersion.current) return;
      setTraceError((error as Error)?.message || '追踪详情加载失败');
    } finally {
""",
"""    } catch (error) {
      if (requestVersion !== traceRequestVersion.current) return;
      const requestError = error as ApiRequestError;
      if (requestError.status === 403 || requestError.status === 404) {
        setSelectedObject(null);
        setTraceError('当前账号无权查看该对象，或对象已不可用。');
      } else {
        setTraceError((error as Error)?.message || '追踪详情加载失败');
      }
    } finally {
""")
replace_once(path,
"""          setSelectedTrace({ targetType: '', targetId: '' });
""",
"""          setSelectedTrace({ targetType: '', targetId: '', reviewTaskId: '' });
""")

# Person detail entry.
path = "frontend/genealogy-web/src/features/persons/PersonArchiveSearchPage.tsx"
replace_once(path,
"""import { apiClient } from '../../shared/api/client';
""",
"""import { apiClient } from '../../shared/api/client';
import { TrackingLinkButton } from '../../shared/navigation/TrackingLinkButton';
""")
replace_once(path,
"""          <Space>
            {drawerMode === 'view' ? <Button onClick={startEdit}>编辑档案</Button> : <Button onClick={cancelEdit}>取消编辑</Button>}
            <Button onClick={closeDetail}>关闭</Button>
          </Space>
""",
"""          <Space>
            <TrackingLinkButton
              clanId={workspace.clanId}
              targetType="person"
              targetId={selected.id || selected.personId}
            />
            {drawerMode === 'view' ? <Button onClick={startEdit}>编辑档案</Button> : <Button onClick={cancelEdit}>取消编辑</Button>}
            <Button onClick={closeDetail}>关闭</Button>
          </Space>
""")

# Source detail and visible citation entries.
path = "frontend/genealogy-web/src/features/sources/SourceLibraryPage.tsx"
replace_once(path,
"""import { useWorkspace } from '../../shared/context/WorkspaceContext';
""",
"""import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { TrackingLinkButton } from '../../shared/navigation/TrackingLinkButton';
""")
replace_once(path,
"""        extra={<Space><Button onClick={() => void reloadDetail()}>刷新</Button>{canBind ? <Button type="primary" onClick={openCreateBinding}>新建绑定关系</Button> : null}</Space>}
""",
"""        extra={(
          <Space>
            <TrackingLinkButton clanId={clanId} targetType="source" targetId={selectedSource?.id} />
            <Button onClick={() => void reloadDetail()}>刷新</Button>
            {canBind ? <Button type="primary" onClick={openCreateBinding}>新建绑定关系</Button> : null}
          </Space>
        )}
""")
replace_once(path,
"""{ key: 'bindings', label: `引用情况（${bindingTotal || bindings.length}）`, children: <BindingTable rows={bindings} canBind={canBind} onReplace={openReplaceBinding} onDelete={submitDeleteRevision} /> },
""",
"""{ key: 'bindings', label: `引用情况（${bindingTotal || bindings.length}）`, children: <BindingTable clanId={clanId} rows={bindings} canBind={canBind} onReplace={openReplaceBinding} onDelete={submitDeleteRevision} /> },
""")
replace_once(path,
"""function BindingTable({ rows, canBind, onReplace, onDelete }: { rows: SourceBindingSummary[]; canBind: boolean; onReplace: (row: SourceBindingSummary) => void; onDelete: (row: SourceBindingSummary) => void }) {
""",
"""function BindingTable({ clanId, rows, canBind, onReplace, onDelete }: { clanId: string; rows: SourceBindingSummary[]; canBind: boolean; onReplace: (row: SourceBindingSummary) => void; onDelete: (row: SourceBindingSummary) => void }) {
""")
replace_once(path,
"""        { title: '创建时间', width: 170, render: (_value, row) => row.createdAt || '待维护' },
        {
          title: '操作',
""",
"""        { title: '创建时间', width: 170, render: (_value, row) => row.createdAt || '待维护' },
        {
          title: '追踪',
          width: 96,
          render: (_value, row) => (
            <TrackingLinkButton
              size="small"
              type="link"
              clanId={clanId}
              targetType={row.targetType}
              targetId={row.targetId}
            />
          )
        },
        {
          title: '操作',
""")

# Branch record entry.
path = "frontend/genealogy-web/src/features/mvp1/steps/branch/BranchStep.tsx"
replace_once(path,
"""import { useWorkspace } from '../../../../shared/context/WorkspaceContext';
""",
"""import { useWorkspace } from '../../../../shared/context/WorkspaceContext';
import { TrackingLinkButton } from '../../../../shared/navigation/TrackingLinkButton';
""")
replace_once(path,
"""              width: 210,
""",
"""              width: 290,
""")
replace_once(path,
"""                  <Space size="small" wrap onClick={event => event.stopPropagation()}>
                    <Button size="small" type={selected ? 'primary' : 'default'} disabled={!isOfficial(row)} onClick={() => selectBranch(row)}>{selected ? '已选中' : '选中支派'}</Button>
""",
"""                  <Space size="small" wrap onClick={event => event.stopPropagation()}>
                    <TrackingLinkButton size="small" type="link" clanId={workspace.clanId} targetType="branch" targetId={row.id} />
                    <Button size="small" type={selected ? 'primary' : 'default'} disabled={!isOfficial(row)} onClick={() => selectBranch(row)}>{selected ? '已选中' : '选中支派'}</Button>
""")

# Relationship record entry.
path = "frontend/genealogy-web/src/features/mvp1/steps/relationship/RelationshipStep.tsx"
replace_once(path,
"""import { useWorkspace } from '../../../../shared/context/WorkspaceContext';
""",
"""import { useWorkspace } from '../../../../shared/context/WorkspaceContext';
import { TrackingLinkButton } from '../../../../shared/navigation/TrackingLinkButton';
""")
replace_once(path,
"""              { key: 'dataStatus', title: '状态', width: 110, render: (_value, row) => <Tag color={statusColor(row)}>{statusText(row)}</Tag> }
""",
"""              { key: 'dataStatus', title: '状态', width: 110, render: (_value, row) => <Tag color={statusColor(row)}>{statusText(row)}</Tag> },
              {
                key: 'tracking',
                title: '操作',
                width: 100,
                render: (_value, row) => (
                  <TrackingLinkButton size="small" type="link" clanId={workspace.clanId} targetType="relationship" targetId={row.id} />
                )
              }
""")

# Review detail entry: always track the business target, never the review task alone.
path = "frontend/genealogy-web/src/features/reviews/ReviewCenterPage.tsx"
replace_once(path,
"""import { useWorkspace } from '../../shared/context/WorkspaceContext';
""",
"""import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { TrackingLinkButton } from '../../shared/navigation/TrackingLinkButton';
""")
replace_once(path,
"""        extra={currentDetail && isPending(currentDetail) && activeTab === 'pending' ? (
          <Space>
            <Button danger onClick={() => openDecision(currentDetail, 'reject')}>驳回</Button>
            <Button type="primary" onClick={() => openDecision(currentDetail, 'approve')}>通过</Button>
          </Space>
        ) : null}
""",
"""        extra={currentDetail ? (
          <Space>
            <TrackingLinkButton
              clanId={workspace.clanId}
              targetType={currentDetail.targetType}
              targetId={currentDetail.targetId}
              reviewTaskId={currentDetail.id}
            />
            {isPending(currentDetail) && activeTab === 'pending' ? (
              <>
                <Button danger onClick={() => openDecision(currentDetail, 'reject')}>驳回</Button>
                <Button type="primary" onClick={() => openDecision(currentDetail, 'approve')}>通过</Button>
              </>
            ) : null}
          </Space>
        ) : null}
""")
