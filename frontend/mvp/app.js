const state = {
  apiBase: localStorage.getItem('apiBase') || 'http://localhost:8080/api/v1',
  token: localStorage.getItem('token') || ''
};

const descriptions = {
  auth: '完成登录后可创建宗族，并自动成为宗族管理员。',
  clans: '创建宗族、查看宗族列表。',
  members: '维护宗族成员、角色和支派范围权限。',
  branches: '维护宗族下的支派树。',
  generations: '维护字辈方案和代次字辈。',
  persons: '录入人物、查询人物，自动支持在世人员隐私脱敏。',
  relationships: '建立人物关系，支持冲突预检、父母唯一、配偶双向和循环检测。',
  sources: '维护资料来源、证据绑定、附件上传和附件下载。',
  reviews: '提交审核、查看 before/after diff、管理员审核通过或驳回。',
  tree: '查看家庭图、上溯和下延世系。',
  imports: '支持人物/关系 CSV 预校验、导入和导出。',
  logs: '查询、统计和导出操作审计日志。'
};

bootstrap();

function bootstrap() {
  document.getElementById('api-base').value = state.apiBase;
  document.getElementById('token').value = state.token;
  document.getElementById('api-base').addEventListener('change', e => setApiBase(e.target.value));
  document.getElementById('token').addEventListener('change', e => setToken(e.target.value));
  document.querySelectorAll('.nav').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.nav').forEach(item => item.classList.remove('active'));
      document.querySelectorAll('.view').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      document.getElementById(`view-${button.dataset.view}`).classList.add('active');
      document.getElementById('page-title').innerText = button.innerText;
      document.getElementById('page-desc').innerText = descriptions[button.dataset.view] || '';
    });
  });
}

function api(path) { return `${state.apiBase}${path}`; }
function setApiBase(value) { state.apiBase = (value || '').replace(/\/$/, '') || '/api/v1'; localStorage.setItem('apiBase', state.apiBase); document.getElementById('api-base').value = state.apiBase; }
function setToken(token) { state.token = token || ''; localStorage.setItem('token', state.token); document.getElementById('token').value = state.token; }
function clearSession() { setToken(''); show('已清空本地 token'); }
function val(id) { return document.getElementById(id)?.value?.trim() || ''; }
function num(id) { const value = val(id); return value ? Number(value) : null; }
function checked(id) { return Boolean(document.getElementById(id)?.checked); }
function authHeaders(json = true) { const h = {}; if (json) h['Content-Type'] = 'application/json'; if (state.token) h.Authorization = `Bearer ${state.token}`; return h; }
function show(data, error = false) { const box = document.getElementById('message'); box.className = `message${error ? ' error' : ''}`; box.innerText = typeof data === 'string' ? data : JSON.stringify(data, null, 2); }
function run(fn) { fn().then(data => show(data)).catch(error => show(error.message || error.errorMessage || JSON.stringify(error), true)); }

async function request(path, options = {}) {
  const res = await fetch(api(path), options);
  const type = res.headers.get('content-type') || '';
  const data = type.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok || data?.success === false) throw data || { message: res.statusText };
  return data?.data ?? data;
}

function renderList(id, rows, options = {}) {
  const list = Array.isArray(rows) ? rows : (rows?.items || rows?.content || []);
  document.getElementById(id).innerHTML = list.map(row => {
    const title = options.title ? options.title(row) : `${row.name || row.clanName || row.branchName || row.sourceName || row.actionType || '记录'} #${row.id || ''}`;
    return `<div class="item"><div class="item-title">${escapeHtml(title)}</div><pre>${escapeHtml(JSON.stringify(row, null, 2))}</pre></div>`;
  }).join('') || '<p class="hint">暂无数据</p>';
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}

function downloadUrl(path, fileName) {
  const url = api(path);
  fetch(url, { headers: authHeaders(false) })
    .then(res => { if (!res.ok) throw new Error(`下载失败：${res.status}`); return res.blob(); })
    .then(blob => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(link.href);
    })
    .catch(error => show(error.message, true));
}

function register() { run(() => request('/auth/register', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ username: val('reg-username'), displayName: val('reg-display'), password: val('reg-password') }) })); }
function login() { run(async () => { const data = await request('/auth/login', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ username: val('login-username'), password: val('login-password') }) }); setToken(data.accessToken); return data; }); }
function me() { run(() => request('/auth/me', { headers: authHeaders(false) })); }

function createClan() { run(() => request('/clans', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ clanName: val('clan-name'), surname: val('clan-surname'), clanCode: val('clan-code'), hallName: val('clan-hall'), originPlace: val('clan-origin') }) })); }
function listClans() { run(async () => { const data = await request('/clans', { headers: authHeaders(false) }); renderList('clan-list', data); return data; }); }

function createMember() { run(() => request(`/clans/${num('member-clan-id')}/members`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ userId: num('member-user-id'), branchId: num('member-branch-id'), roleId: num('member-role-id'), memberName: val('member-name'), scopeType: val('member-scope-type'), scopeId: num('member-scope-id') }) })); }
function listMembers() { run(async () => { const data = await request(`/clans/${num('member-list-clan-id')}/members`, { headers: authHeaders(false) }); renderList('member-list', data); return data; }); }

function createBranch() { run(() => request(`/clans/${num('branch-clan-id')}/branches`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ branchName: val('branch-name'), parentId: num('branch-parent-id'), migrationFrom: val('branch-migration-from'), migrationTo: val('branch-migration-to') }) })); }
function listBranches() { run(async () => { const data = await request(`/clans/${num('branch-clan-id')}/branches`, { headers: authHeaders(false) }); renderList('branch-list', data); return data; }); }

function createGenerationScheme() { run(() => request(`/clans/${num('gen-clan-id')}/generation-schemes`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ branchId: num('gen-branch-id'), schemeName: val('gen-name'), poemText: val('gen-poem'), startGeneration: num('gen-start'), isDefault: checked('gen-default'), validationEnabled: true, strictMode: checked('gen-strict') }) })); }
function addGenerationWord() { run(() => request(`/generation-schemes/${num('gen-scheme-id')}/items`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ generationNo: num('gen-no'), word: val('gen-word') }) })); }
function listGenerationWords() { run(async () => { const data = await request(`/generation-schemes/${num('gen-scheme-id')}/items`, { headers: authHeaders(false) }); renderList('gen-list', data); return data; }); }

function createPerson() { run(() => request(`/clans/${num('person-clan-id')}/persons`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ branchId: num('person-branch-id'), name: val('person-name'), personCode: val('person-code'), gender: val('person-gender'), generationNo: num('person-gen-no'), generationWord: val('person-gen-word'), birthPlace: val('person-birth-place'), residencePlace: val('person-residence'), biography: val('person-biography'), isLiving: checked('person-living'), privacyLevel: 'clan_only' }) })); }
function listPersons() { run(async () => { const branchId = num('person-list-branch-id'); const path = branchId ? `/clans/${num('person-list-clan-id')}/branches/${branchId}/persons` : `/clans/${num('person-list-clan-id')}/persons`; const data = await request(path, { headers: authHeaders(false) }); renderList('person-list', data, { title: p => `${p.name} #${p.id} / ${p.dataStatus || ''}` }); return data; }); }
function getPerson() { run(async () => { const data = await request(`/persons/${num('person-get-id')}`, { headers: authHeaders(false) }); renderList('person-list', [data], { title: p => `${p.name} #${p.id}` }); return data; }); }

function relationshipBody() { return { fromPersonId: num('rel-from'), toPersonId: num('rel-to'), relationType: val('rel-type'), relationLabel: val('rel-label'), isLineageRelation: checked('rel-lineage'), isBiological: checked('rel-biological'), isPrimary: true, confidenceLevel: 'high' }; }
function checkRelationshipConflict() { run(() => request(`/clans/${num('rel-clan-id')}/relationships/check-conflict`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(relationshipBody()) })); }
function createRelationship() { run(() => request(`/clans/${num('rel-clan-id')}/relationships`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(relationshipBody()) })); }
function listRelationships() { run(async () => { const data = await request(`/persons/${num('rel-person-id')}/relationships`, { headers: authHeaders(false) }); renderList('rel-list', data, { title: r => `${r.relationType} #${r.id}: ${r.fromPersonId} -> ${r.toPersonId}` }); return data; }); }
function deleteRelationship() { run(() => request(`/relationships/${num('rel-delete-id')}`, { method: 'DELETE', headers: authHeaders(false) })); }

function createSource() { run(() => request(`/clans/${num('source-clan-id')}/sources`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ sourceName: val('source-name'), sourceType: val('source-type') || 'genealogy_book', bookTitle: val('source-book'), excerpt: val('source-excerpt') }) })); }
function listSources() { run(async () => { const data = await request(`/clans/${num('source-clan-id')}/sources`, { headers: authHeaders(false) }); renderList('source-list', data, { title: s => `${s.sourceName} #${s.id}` }); return data; }); }
function bindSource() { run(() => request('/source-bindings', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ sourceId: num('bind-source-id'), targetType: val('bind-target-type'), targetId: num('bind-target-id') }) })); }
function listSourceBindings() { run(async () => { const sourceId = num('bind-source-id'); const data = sourceId ? await request(`/sources/${sourceId}/bindings`, { headers: authHeaders(false) }) : await request(`/source-bindings?targetType=${encodeURIComponent(val('bind-target-type'))}&targetId=${num('bind-target-id')}`, { headers: authHeaders(false) }); renderList('source-binding-list', data); return data; }); }
function uploadAttachment() { run(async () => { const file = document.getElementById('upload-file').files[0]; if (!file) throw new Error('请选择文件'); const form = new FormData(); form.append('file', file); const sourceId = val('upload-source-id'); if (sourceId) form.append('sourceId', sourceId); const res = await fetch(api(`/clans/${num('upload-clan-id')}/attachments/upload`), { method: 'POST', headers: state.token ? { Authorization: `Bearer ${state.token}` } : {}, body: form }); const data = await res.json(); if (!res.ok || data.success === false) throw data; return data.data; }); }
function downloadAttachment() { downloadUrl(`/attachments/${num('download-attachment-id')}/download`, `attachment-${num('download-attachment-id')}`); }

function submitReview() { const type = val('review-target-type'); const id = num('review-target-id'); run(() => request(`/${type}/${id}/submit-review`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ diffSummary: val('review-summary') }) })); }
function listReviewTasks() { run(async () => { const data = await request(`/clans/${num('review-clan-id')}/review-tasks/pending`, { headers: authHeaders(false) }); renderList('review-list', data, { title: t => `任务 #${t.id} / ${t.status} / revision ${t.revisionId}` }); return data; }); }
function getReviewTaskDetail() { run(async () => { const data = await request(`/review-tasks/${num('task-id')}`, { headers: authHeaders(false) }); renderReviewDiff(data); return data; }); }
function approveTask() { run(() => request(`/review-tasks/${num('task-id')}/approve`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ comment: val('task-comment') }) })); }
function rejectTask() { run(() => request(`/review-tasks/${num('task-id')}/reject`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ comment: val('task-comment') }) })); }
function renderReviewDiff(data) { const record = data.auditRecord || data; document.getElementById('review-diff').innerHTML = `<div><h3>Before</h3><pre>${escapeHtml(formatJson(record.oldPayload))}</pre></div><div><h3>After</h3><pre>${escapeHtml(formatJson(record.newPayload))}</pre></div>`; }
function formatJson(value) { try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value || ''; } }

function treeDepthParam() { const depth = num('tree-depth'); return depth ? `&maxDepth=${depth}` : ''; }
function loadFamilyTree() { run(async () => { const data = await request(`/tree/person/${num('tree-person-id')}/family`, { headers: authHeaders(false) }); renderTree(data, 'family'); return data; }); }
function loadDescendants() { run(async () => { const data = await request(`/tree/descendants?rootPersonId=${num('tree-person-id')}${treeDepthParam()}`, { headers: authHeaders(false) }); renderTree(data, 'descendants'); return data; }); }
function loadAncestors() { run(async () => { const data = await request(`/tree/ancestors?personId=${num('tree-person-id')}${treeDepthParam()}`, { headers: authHeaders(false) }); renderTree(data, 'ancestors'); return data; }); }
function renderTree(data, mode) { document.getElementById('tree-result').innerText = JSON.stringify(data, null, 2); const graph = document.getElementById('tree-graph'); const center = data.centerPerson || data.rootPerson || data.person || data; const edges = data.relationships || data.edges || data.items || data.descendants || data.ancestors || []; const centerText = center.name ? `${center.name} #${center.id}` : `人物 #${num('tree-person-id')}`; const rows = Array.isArray(edges) ? edges.slice(0, 60).map(edge => `<div class="tree-row"><span class="tree-node">${edge.fromPersonId || edge.parentId || edge.sourceId || ''}</span><span class="tree-edge">${edge.relationType || edge.relationLabel || edge.type || mode}</span><span class="tree-node">${edge.toPersonId || edge.childId || edge.targetId || ''}</span></div>`).join('') : ''; graph.innerHTML = `<div class="tree-row"><span class="tree-node center">${escapeHtml(centerText)}</span><span class="tree-edge">${mode}</span></div>${rows || '<p class="hint">暂无关系边，原始 JSON 已展示。</p>'}`; }

function downloadPersonsTemplate() { downloadUrl('/imports/templates/persons.csv', 'persons-template.csv'); }
function downloadRelationsTemplate() { downloadUrl('/imports/templates/relations.csv', 'relations-template.csv'); }
function previewPersons() { run(() => uploadCsv(`/clans/${num('import-clan-id')}/imports/persons.csv/preview`, 'import-file')); }
function importPersons() { run(() => uploadCsv(`/clans/${num('import-clan-id')}/imports/persons.csv`, 'import-file')); }
function exportPersons() { downloadUrl(`/clans/${num('import-clan-id')}/exports/persons.csv`, 'persons.csv'); }
function exportBranchPersons() { downloadUrl(`/clans/${num('import-clan-id')}/branches/${num('export-branch-id')}/exports/persons.csv`, 'branch-persons.csv'); }
function previewRelations() { run(() => uploadCsv(`/clans/${num('import-clan-id')}/imports/relations.csv/preview`, 'relation-import-file')); }
function importRelations() { run(() => uploadCsv(`/clans/${num('import-clan-id')}/imports/relations.csv`, 'relation-import-file')); }
function exportRelations() { downloadUrl(`/clans/${num('import-clan-id')}/exports/relations.csv`, 'relations.csv'); }
async function uploadCsv(path, inputId) { const file = document.getElementById(inputId).files[0]; if (!file) throw new Error('请选择 CSV 文件'); const form = new FormData(); form.append('file', file); const res = await fetch(api(path), { method: 'POST', headers: state.token ? { Authorization: `Bearer ${state.token}` } : {}, body: form }); const data = await res.json(); if (!res.ok || data.success === false) throw data; return data.data; }

function logParams() { const params = new URLSearchParams(); const mapping = { 'log-clan-id': 'clanId', 'log-actor-id': 'actorId', 'log-action-type': 'actionType', 'log-target-type': 'targetType', 'log-target-id': 'targetId', 'log-keyword': 'keyword', 'log-start-time': 'startTime', 'log-end-time': 'endTime' }; Object.entries(mapping).forEach(([id, key]) => { const value = val(id); if (value) params.append(key, value); }); return params.toString(); }
function listLogs() { run(async () => { const query = logParams(); const data = await request(`/logs/operations${query ? `?${query}` : ''}`, { headers: authHeaders(false) }); renderList('log-list', data, { title: l => `${l.actionType} #${l.id} / ${l.createdAt}` }); return data; }); }
function loadLogStats() { run(async () => { const query = logParams(); const data = await request(`/logs/operations/stats${query ? `?${query}` : ''}`, { headers: authHeaders(false) }); renderStats(data); return data; }); }
function exportLogs() { const query = logParams(); downloadUrl(`/logs/operations/export.csv${query ? `?${query}` : ''}`, 'operation-logs.csv'); }
function renderStats(data) { const render = items => (items || []).map(item => `<span class="pill">${escapeHtml(item.key)}：${item.count}</span>`).join(''); document.getElementById('log-stats').innerHTML = `<div class="stat-card"><strong>总数：${data.totalCount}</strong></div><div><h3>按动作</h3>${render(data.byActionType)}</div><div><h3>按操作者</h3>${render(data.byActorId)}</div>`; }
