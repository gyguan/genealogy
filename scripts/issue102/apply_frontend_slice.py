from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected exactly one match, got {count}")
    file.write_text(text.replace(old, new, 1))


client = "frontend/genealogy-web/src/shared/api/client.ts"
if "export class ApiRequestError" not in Path(client).read_text():
    replace_once(
        client,
        """export type ApiError = {
  code?: string;
  message?: string;
  errorMessage?: string;
};
""",
        """export type ApiError = {
  code?: string;
  message?: string;
  errorMessage?: string;
};

export class ApiRequestError extends Error {
  readonly code?: string;
  readonly status: number;

  constructor(message: string, code: string | undefined, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.status = status;
  }
}
""",
    )
    replace_once(
        client,
        """function normalizeApiErrorMessage(message: string) {""",
        """function extractApiErrorCode(payload: unknown) {
  if (!payload || typeof payload !== 'object') return undefined;
  const code = String((payload as Record<string, unknown>).code ?? '').trim();
  return code || undefined;
}

function normalizeApiErrorMessage(message: string) {""",
    )
    replace_once(
        client,
        """  async delete<T = unknown>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }
""",
        """  async patch<T = unknown>(path: string, body?: unknown): Promise<T> {
    const normalizedBody = normalizeJsonBody(path, body);
    return this.request<T>(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: normalizedBody === undefined ? undefined : JSON.stringify(normalizedBody)
    });
  }

  async delete<T = unknown>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }
""",
    )
    replace_once(
        client,
        """    if (!res.ok || explicitFailure || implicitFailure) {
      throw new Error(extractApiErrorMessage(payload, res.status));
    }""",
        """    if (!res.ok || explicitFailure || implicitFailure) {
      throw new ApiRequestError(
        extractApiErrorMessage(payload, res.status),
        extractApiErrorCode(payload),
        res.status
      );
    }""",
    )

page = "frontend/genealogy-web/src/features/members/MemberPage.tsx"
text = Path(page).read_text()
if "memberPageModel.js" not in text:
    replace_once(
        page,
        """  type MemberCandidate,
  type MemberGrant
} from './memberPermissionApi';
""",
        """  type MemberCandidate,
  type MemberGrant,
  type MemberPermissionAudit
} from './memberPermissionApi';
import {
  auditActionText,
  createMemberQuery,
  formatAuditValue,
  memberPermissionErrorMessage,
  resetMemberQuery,
  roleCapabilityText,
  scopePreview,
  type MemberQuery
} from './memberPageModel.js';
""",
    )
    replace_once(
        page,
        """function dateTime(value?: string) {
  return value ? value.replace('T', ' ').slice(0, 16) : '-';
}
""",
        """function dateTime(value?: string) {
  return value ? value.replace('T', ' ').slice(0, 16) : '-';
}

function confirmHighRiskGrant(roleName: string, scopeText: string) {
  return new Promise<boolean>(resolve => {
    Modal.confirm({
      title: `确认授予高风险角色“${roleName}”`,
      content: `${scopeText}。请再次确认人员职责和授权边界。`,
      okText: '确认授权',
      cancelText: '返回检查',
      okButtonProps: { danger: true },
      onOk: () => resolve(true),
      onCancel: () => resolve(false)
    });
  });
}
""",
    )
    replace_once(
        page,
        """  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);""",
        """  const [statusFilter, setStatusFilter] = useState('');
  const [activeQuery, setActiveQuery] = useState<MemberQuery>(() => resetMemberQuery(DEFAULT_PAGE_SIZE));
  const [loading, setLoading] = useState(false);""",
    )
    replace_once(
        page,
        """  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<MemberGrant | null>(null);

  const selectedClanId = String(workspace.clanId || clans[0]?.id || '');
  const selectedRole = roles.find(role => role.roleCode === grantForm.getFieldValue('roleCode'));
  const selectedScopeType = Form.useWatch('scopeType', grantForm);
""",
        """  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<MemberGrant | null>(null);
  const [audits, setAudits] = useState<MemberPermissionAudit[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditPageNo, setAuditPageNo] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(10);
  const [auditTotal, setAuditTotal] = useState(0);

  const selectedClanId = String(workspace.clanId || clans[0]?.id || '');
  const selectedClanName = clans.find(clan => String(clan.id) === selectedClanId)?.clanName || '当前宗族';
  const selectedRoleCode = Form.useWatch('roleCode', grantForm);
  const selectedRole = roles.find(role => role.roleCode === selectedRoleCode);
  const selectedScopeType = Form.useWatch('scopeType', grantForm);
  const selectedScopeId = Form.useWatch('scopeId', grantForm);
""",
    )
    replace_once(
        page,
        """    } catch (error) {
      notify({ message: (error as Error).message || '操作失败' }, true);""",
        """    } catch (error) {
      notify({ message: memberPermissionErrorMessage(error) }, true);""",
    )
    replace_once(
        page,
        """  async function loadMembers(clanId = selectedClanId, nextPage = pageNo, nextPageSize = pageSize) {
    if (!clanId) {
      setMembers([]);
      setTotal(0);
      return;
    }
    const result = await memberPermissionApi.listMembers(clanId, {
      keyword: keyword.trim() || undefined,
      roleCode: roleFilter || undefined,
      scopeType: scopeFilter || undefined,
      status: statusFilter || undefined,
      pageNo: nextPage,
      pageSize: nextPageSize
    });
    setMembers(result.records || []);
    setTotal(result.total || 0);
    setPageNo(result.pageNo || nextPage);
    setPageSize(result.pageSize || nextPageSize);
    if (selectedMember) {
      const refreshed = (result.records || []).find(item => item.membershipId === selectedMember.membershipId);
      if (refreshed) setSelectedMember(refreshed);
    }
  }

  async function loadClanContext(clanId: string) {
    if (!clanId) return;
    const [branchResult, roleResult] = await Promise.all([
      apiClient.get(`/clans/${clanId}/branches`).catch(() => []),
      memberPermissionApi.grantableRoles(clanId).catch(() => [])
    ]);
    setBranches(toRecordList(branchResult) as BranchRow[]);
    setRoles(roleResult || []);
    await loadMembers(clanId, 1, pageSize);
  }
""",
        """  async function loadMembers(clanId: string, query: MemberQuery, selectedMembershipId?: number) {
    if (!clanId) {
      setMembers([]);
      setTotal(0);
      return;
    }
    const result = await memberPermissionApi.listMembers(clanId, {
      keyword: query.keyword || undefined,
      roleCode: query.roleCode || undefined,
      scopeType: query.scopeType || undefined,
      status: query.status || undefined,
      pageNo: query.pageNo,
      pageSize: query.pageSize
    });
    const resolvedQuery = createMemberQuery(query, result.pageNo || query.pageNo, result.pageSize || query.pageSize);
    setActiveQuery(resolvedQuery);
    setMembers(result.records || []);
    setTotal(result.total || 0);
    setPageNo(resolvedQuery.pageNo);
    setPageSize(resolvedQuery.pageSize);
    const membershipId = selectedMembershipId ?? selectedMember?.membershipId;
    if (membershipId) {
      const refreshed = (result.records || []).find(item => item.membershipId === membershipId);
      if (refreshed) setSelectedMember(refreshed);
    }
  }

  async function loadClanContext(clanId: string, query: MemberQuery) {
    if (!clanId) return;
    const [branchResult, roleResult] = await Promise.all([
      apiClient.get(`/clans/${clanId}/branches`).catch(() => []),
      memberPermissionApi.grantableRoles(clanId).catch(() => [])
    ]);
    setBranches(toRecordList(branchResult) as BranchRow[]);
    setRoles(roleResult || []);
    await loadMembers(clanId, query);
  }

  async function loadMemberAudits(clanId: string, membershipId: number, nextPage = 1, nextPageSize = auditPageSize) {
    setAuditLoading(true);
    try {
      const result = await memberPermissionApi.listAudits(clanId, {
        membershipId,
        pageNo: nextPage,
        pageSize: nextPageSize
      });
      setAudits(result.records || []);
      setAuditTotal(result.total || 0);
      setAuditPageNo(result.pageNo || nextPage);
      setAuditPageSize(result.pageSize || nextPageSize);
    } catch (error) {
      setAudits([]);
      setAuditTotal(0);
      notify({ message: memberPermissionErrorMessage(error, '权限变更记录加载失败') }, true);
    } finally {
      setAuditLoading(false);
    }
  }
""",
    )
    replace_once(
        page,
        """      if (nextClanId && nextClanId !== workspace.clanId) workspace.setClanId(nextClanId);
      if (nextClanId) await loadClanContext(nextClanId);""",
        """      if (nextClanId && nextClanId !== workspace.clanId) workspace.setClanId(nextClanId);
      if (nextClanId) await loadClanContext(nextClanId, resetMemberQuery(pageSize));""",
    )
    replace_once(
        page,
        """    setStatusFilter('');
    void execute(async () => { await loadClanContext(clanId); });""",
        """    setStatusFilter('');
    const nextQuery = resetMemberQuery(pageSize);
    setActiveQuery(nextQuery);
    void execute(async () => { await loadClanContext(clanId, nextQuery); });""",
    )
    replace_once(
        page,
        """    } catch (error) {
      notify({ message: (error as Error).message || '候选成员搜索失败' }, true);""",
        """    } catch (error) {
      notify({ message: memberPermissionErrorMessage(error, '候选成员搜索失败') }, true);""",
    )
    replace_once(
        page,
        """  async function submitGrant() {
    const values = await grantForm.validateFields();
    await execute(async () => {""",
        """  async function submitGrant() {
    const values = await grantForm.validateFields();
    if (selectedRole?.riskLevel === 'high') {
      const confirmed = await confirmHighRiskGrant(
        selectedRole.roleName,
        scopePreview(values.scopeType, values.scopeId, selectedClanName, branches)
      );
      if (!confirmed) return;
    }
    await execute(async () => {""",
    )
    replace_once(
        page,
        """      setGrantModalOpen(false);
      await loadMembers(selectedClanId, editingGrant ? pageNo : 1, pageSize);""",
        """      setGrantModalOpen(false);
      const refreshQuery = createMemberQuery(activeQuery, editingGrant ? activeQuery.pageNo : 1, activeQuery.pageSize);
      await loadMembers(selectedClanId, refreshQuery, selectedMember?.membershipId);""",
    )
    replace_once(
        page,
        """  function openMember(member: MemberAggregate) {
    setSelectedMember(member);
    setMemberDrawerOpen(true);
  }""",
        """  function openMember(member: MemberAggregate) {
    setSelectedMember(member);
    setMemberDrawerOpen(true);
    setAudits([]);
    setAuditTotal(0);
    if (member.allowedActions?.canViewHistory) {
      void loadMemberAudits(selectedClanId, member.membershipId, 1, auditPageSize);
    }
  }""",
    )
    replace_once(page, "      await loadMembers();\n", "      await loadMembers(selectedClanId, activeQuery, statusTarget.membershipId);\n", )
    replace_once(page, "      await loadMembers();\n", "      await loadMembers(selectedClanId, activeQuery, selectedMember?.membershipId);\n", )
    replace_once(
        page,
        """          <Button type="primary" loading={loading} onClick={() => void execute(async () => { await loadMembers(selectedClanId, 1, pageSize); })}>
            查询
          </Button>
          <Button onClick={() => {
            setKeyword('');
            setRoleFilter('');
            setScopeFilter('');
            setStatusFilter('');
            void execute(async () => { await loadMembers(selectedClanId, 1, pageSize); });
          }}>""",
        """          <Button type="primary" loading={loading} onClick={() => {
            const nextQuery = createMemberQuery({
              keyword,
              roleCode: roleFilter,
              scopeType: scopeFilter,
              status: statusFilter
            }, 1, pageSize);
            void execute(async () => { await loadMembers(selectedClanId, nextQuery); });
          }}>
            查询
          </Button>
          <Button onClick={() => {
            setKeyword('');
            setRoleFilter('');
            setScopeFilter('');
            setStatusFilter('');
            const nextQuery = resetMemberQuery(pageSize);
            void execute(async () => { await loadMembers(selectedClanId, nextQuery); });
          }}>""",
    )
    replace_once(
        page,
        """            onChange: (nextPage, nextPageSize) => void execute(async () => { await loadMembers(selectedClanId, nextPage, nextPageSize); })""",
        """            onChange: (nextPage, nextPageSize) => {
              const nextQuery = createMemberQuery(activeQuery, nextPage, nextPageSize);
              void execute(async () => { await loadMembers(selectedClanId, nextQuery); });
            }""",
    )
    replace_once(
        page,
        """          {selectedRole?.riskLevel === 'high' ? (
            <Alert type="warning" showIcon message="高风险授权" description="该角色具有全宗族治理或审核能力，请确认人员、职责和授权范围。" />
          ) : null}""",
        """          {selectedRole ? (
            <Alert
              type={selectedRole.riskLevel === 'high' ? 'warning' : 'info'}
              showIcon
              message={`${selectedRole.roleName}${selectedRole.riskLevel === 'high' ? ' · 高风险角色' : ''}`}
              description={(
                <Space direction="vertical" size={2}>
                  <span>{roleCapabilityText(selectedRole)}</span>
                  <span>{scopePreview(selectedScopeType, selectedScopeId, selectedClanName, branches)}</span>
                </Space>
              )}
            />
          ) : null}""",
    )
    replace_once(page, "        width={620}\n", "        width={760}\n")
    replace_once(
        page,
        """            <Table<MemberGrant>
              size="small"
              rowKey="grantId"
              pagination={false}
              dataSource={selectedMember.grants}
              columns={[
                { dataIndex: 'roleName', title: '角色' },
                { dataIndex: 'scopeName', title: '范围' },
                { dataIndex: 'updatedAt', title: '最近变更', render: value => dateTime(value) },
                {
                  key: 'actions',
                  title: '操作',
                  render: (_value, grant) => (
                    <Space>
                      {grant.canEditGrant ? <Button type="link" onClick={() => openEditGrant(grant)}>编辑</Button> : null}
                      {grant.canRevokeGrant ? <Button type="link" danger onClick={() => openRevoke(grant)}>撤销</Button> : null}
                    </Space>
                  )
                }
              ]}
            />""",
        """            <Table<MemberGrant>
              size="small"
              rowKey="grantId"
              pagination={false}
              dataSource={selectedMember.grants}
              columns={[
                { dataIndex: 'roleName', title: '角色' },
                { dataIndex: 'scopeName', title: '范围' },
                { dataIndex: 'updatedAt', title: '最近变更', render: value => dateTime(value) },
                {
                  key: 'actions',
                  title: '操作',
                  render: (_value, grant) => (
                    <Space>
                      {grant.canEditGrant ? <Button type="link" onClick={() => openEditGrant(grant)}>编辑</Button> : null}
                      {grant.canRevokeGrant ? <Button type="link" danger onClick={() => openRevoke(grant)}>撤销</Button> : null}
                    </Space>
                  )
                }
              ]}
            />
            {selectedMember.allowedActions?.canViewHistory ? (
              <>
                <Typography.Title level={5} style={{ marginTop: 24 }}>权限变更记录</Typography.Title>
                <Table<MemberPermissionAudit>
                  size="small"
                  rowKey="auditId"
                  loading={auditLoading}
                  dataSource={audits}
                  pagination={{
                    current: auditPageNo,
                    pageSize: auditPageSize,
                    total: auditTotal,
                    showSizeChanger: true,
                    showTotal: value => `共 ${value} 条记录`,
                    onChange: (nextPage, nextPageSize) => void loadMemberAudits(
                      selectedClanId,
                      selectedMember.membershipId,
                      nextPage,
                      nextPageSize
                    )
                  }}
                  columns={[
                    { dataIndex: 'actionType', title: '动作', width: 100, render: value => auditActionText(value) },
                    { key: 'actor', title: '操作者', width: 120, render: (_value, row) => `${row.actorDisplayName} · ${row.actorMaskedAccount}` },
                    {
                      key: 'change',
                      title: '变更内容',
                      render: (_value, row) => (
                        <Space direction="vertical" size={0}>
                          <Typography.Text type="secondary">变更前：{formatAuditValue(row.beforeValue, branches)}</Typography.Text>
                          <Typography.Text>变更后：{formatAuditValue(row.afterValue, branches)}</Typography.Text>
                          <Typography.Text type="secondary">原因：{row.reason || '-'}</Typography.Text>
                        </Space>
                      )
                    },
                    { dataIndex: 'changedAt', title: '时间', width: 140, render: value => dateTime(value) }
                  ]}
                />
              </>
            ) : null}""",
    )

package = "frontend/genealogy-web/package.json"
package_data = Path(package).read_text()
if '"test:members"' not in package_data:
    replace_once(
        package,
        '    "api:check": "npm run api:generate && git diff --exit-code src/shared/api/generated/api-contract.ts"\n',
        '    "api:check": "npm run api:generate && git diff --exit-code src/shared/api/generated/api-contract.ts",\n    "test:members": "node --test src/features/members/memberPageModel.test.js"\n',
    )
