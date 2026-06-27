const API = '/api/v1';
const state = { token: localStorage.getItem('token') || '' };

document.getElementById('token').value = state.token;
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

const descriptions = {
  auth: '完成登录后可创建宗族，并自动成为宗族管理员。', clans: '创建宗族、查看宗族列表。', branches: '维护宗族下的支派树。', generations: '维护字辈方案和代次字辈。', persons: '录入人物、查询人物，自动支持在世人员隐私脱敏。', relationships: '建立人物之间的族谱关系，后端会执行父母唯一、配偶双向等规则。', sources: '维护资料来源、证据绑定和附件上传。', reviews: '提交审核、管理员审核通过或驳回。', tree: '查看家庭图、上溯和下延世系。', imports: '支持人物/关系 CSV 预校验、导入和导出。', logs: '按宗族、操作者、动作、目标、关键词和时间范围查询审计日志。'
};

initImportEnhancements();
initTreePanel();

function setToken(token) { state.token = token || ''; localStorage.setItem('token', state.token); document.getElementById('token').value = state.token; }
function headers(json = true) { const h = {}; if (json) h['Content-Type'] = 'application/json'; if (state.token) h.Authorization = `Bearer ${state.token}`; return h; }
function val(id) { return document.getElementById(id).value.trim(); }
function num(id) { const v = val(id); return v ? Number(v) : null; }
function show(data, error = false) { const box = document.getElementById('message'); box.className = `message${error ? ' error' : ''}`; box.innerText = typeof data === 'string' ? data : JSON.stringify(data, null, 2); }
async function request(path, options = {}) { const res = await fetch(API + path, options); const text = await res.text(); const data = text ? JSON.parse(text) : null; if (!res.ok || data?.success === false) throw data || { message: res.statusText }; return data?.data ?? data; }
async function run(fn) { try { show(await fn()); } catch (e) { show(e.message || e.errorMessage || JSON.stringify(e), true); } }
function renderList(id, rows) { document.getElementById(id).innerHTML = (rows || []).map(row => `<div class="item"><pre>${JSON.stringify(row, null, 2)}</pre></div>`).join(''); }

function initImportEnhancements() {
  const card = document.querySelector('#view-imports .card');
  if (!card || document.getElementById('relation-import-file')) return;
  card.insertAdjacentHTML('beforeend', `
    <hr />
    <h2>关系 CSV</h2>
    <a href="/api/v1/imports/templates/relations.csv" target="_blank">下载关系模板</a>
    <input id="relation-import-file" type="file" />
    <button onclick="previewRelations()">预校验关系CSV</button>
    <button onclick="importRelations()">导入关系CSV</button>
    <button onclick="exportRelations()">导出关系CSV</button>
    <hr />
    <h2>按支派导出人物</h2>
    <input id="export-branch-id" placeholder="支派ID" />
    <button onclick="exportBranchPersons()">按支派导出人物CSV</button>
  `);
}

function initTreePanel() { const pre = document.getElementById('tree-result'); if (pre && !document.getElementById('tree-graph')) pre.insertAdjacentHTML('beforebegin', '<div id="tree-graph" class="tree-graph">暂无世系图</div>'); }
function register() { run(() => request('/auth/register', { method: 'POST', headers: headers(), body: JSON.stringify({ username: val('reg-username'), displayName: val('reg-display'), password: val('reg-password') }) })); }
function login() { run(async () => { const data = await request('/auth/login', { method: 'POST', headers: headers(), body: JSON.stringify({ username: val('login-username'), password: val('login-password') }) }); setToken(data.accessToken); return data; }); }
function me() { run(() => request('/auth/me', { headers: headers(false) })); }
function createClan() { run(() => request('/clans', { method: 'POST', headers: headers(), body: JSON.stringify({ clanName: val('clan-name'), surname: val('clan-surname'), clanCode: val('clan-code') }) })); }
function listClans() { run(async () => { const data = await request('/clans', { headers: headers(false) }); renderList('clan-list', data.items || data.content || []); return data; }); }
function createBranch() { run(() => request(`/clans/${num('branch-clan-id')}/branches`, { method: 'POST', headers: headers(), body: JSON.stringify({ branchName: val('branch-name'), parentId: num('branch-parent-id') }) })); }
function listBranches() { run(async () => { const data = await request(`/clans/${num('branch-clan-id')}/branches`, { headers: headers(false) }); renderList('branch-list', data); return data; }); }
function createGenerationScheme() { run(() => request(`/clans/${num('gen-clan-id')}/generation-schemes`, { method: 'POST', headers: headers(), body: JSON.stringify({ schemeName: val('gen-name'), poemText: val('gen-poem'), isDefault: true, validationEnabled: true, strictMode: false }) })); }
function addGenerationWord() { run(() => request(`/generation-schemes/${num('gen-scheme-id')}/items`, { method: 'POST', headers: headers(), body: JSON.stringify({ generationNo: num('gen-no'), word: val('gen-word') }) })); }
function listGenerationWords() { run(async () => { const data = await request(`/generation-schemes/${num('gen-scheme-id')}/items`, { headers: headers(false) }); renderList('gen-list', data); return data; }); }
function createPerson() { run(() => request(`/clans/${num('person-clan-id')}/persons`, { method: 'POST', headers: headers(), body: JSON.stringify({ branchId: num('person-branch-id'), name: val('person-name'), personCode: val('person-code'), generationNo: num('person-gen-no'), generationWord: val('person-gen-word'), isLiving: true, privacyLevel: 'clan_only' }) })); }
function listPersons() { run(async () => { const data = await request(`/clans/${num('person-list-clan-id')}/persons`, { headers: headers(false) }); renderList('person-list', data.items || data.content || []); return data; }); }
function createRelationship() { run(() => request(`/clans/${num('rel-clan-id')}/relationships`, { method: 'POST', headers: headers(), body: JSON.stringify({ fromPersonId: num('rel-from'), toPersonId: num('rel-to'), relationType: val('rel-type') }) })); }
function createSource() { run(() => request(`/clans/${num('source-clan-id')}/sources`, { method: 'POST', headers: headers(), body: JSON.stringify({ sourceName: val('source-name'), sourceType: val('source-type') || 'genealogy_book' }) })); }
function bindSource() { run(() => request('/source-bindings', { method: 'POST', headers: headers(), body: JSON.stringify({ sourceId: num('bind-source-id'), targetType: val('bind-target-type'), targetId: num('bind-target-id') }) })); }
function uploadAttachment() { run(async () => { const form = new FormData(); form.append('file', document.getElementById('upload-file').files[0]); const sourceId = val('upload-source-id'); if (sourceId) form.append('sourceId', sourceId); const res = await fetch(`${API}/clans/${num('upload-clan-id')}/attachments/upload`, { method: 'POST', headers: state.token ? { Authorization: `Bearer ${state.token}` } : {}, body: form }); const data = await res.json(); if (!res.ok || data.success === false) throw data; return data.data; }); }
function submitReview() { const type = val('review-target-type'); const id = num('review-target-id'); run(() => request(`/${type}/${id}/submit-review`, { method: 'POST', headers: headers(), body: JSON.stringify({ diffSummary: val('review-summary') }) })); }
function listReviewTasks() { run(async () => { const data = await request(`/clans/${num('review-clan-id')}/review-tasks/pending`, { headers: headers(false) }); renderList('review-list', data); return data; }); }
function approveTask() { run(() => request(`/review-tasks/${num('task-id')}/approve`, { method: 'POST', headers: headers(), body: JSON.stringify({ comment: val('task-comment') }) })); }
function rejectTask() { run(() => request(`/review-tasks/${num('task-id')}/reject`, { method: 'POST', headers: headers(), body: JSON.stringify({ comment: val('task-comment') }) })); }
function loadFamilyTree() { run(async () => { const data = await request(`/tree/person/${num('tree-person-id')}/family`, { headers: headers(false) }); renderTree(data, 'family'); return data; }); }
function loadDescendants() { run(async () => { const data = await request(`/tree/descendants?rootPersonId=${num('tree-person-id')}`, { headers: headers(false) }); renderTree(data, 'descendants'); return data; }); }
function loadAncestors() { run(async () => { const data = await request(`/tree/ancestors?personId=${num('tree-person-id')}`, { headers: headers(false) }); renderTree(data, 'ancestors'); return data; }); }
function renderTree(data, mode) { const graph = document.getElementById('tree-graph'); const pre = document.getElementById('tree-result'); pre.innerText = JSON.stringify(data, null, 2); const center = data.centerPerson || data.rootPerson || data.person || data.node || data; const relations = data.relationships || data.edges || data.items || data.descendants || data.ancestors || []; const name = center.name || center.personName || `ID ${center.id || val('tree-person-id')}`; const rows = Array.isArray(relations) ? relations.slice(0, 30).map(edge => { const label = edge.relationType || edge.relationLabel || edge.type || 'relation'; const from = edge.fromPersonId || edge.parentId || edge.sourceId || ''; const to = edge.toPersonId || edge.childId || edge.targetId || ''; return `<div class="tree-row"><span class="tree-node">${from || '节点'}</span><span class="tree-edge">${label}</span><span class="tree-node">${to || '节点'}</span></div>`; }).join('') : ''; graph.innerHTML = `<div class="tree-row"><span class="tree-node center">${name}</span><span class="tree-edge">${mode}</span></div>${rows || '<div class="tree-edge">暂无关系边，已展示原始 JSON。</div>'}`; }
function importPersons() { run(async () => uploadCsv(`/clans/${num('import-clan-id')}/imports/persons.csv`, 'import-file')); }
function previewPersons() { run(async () => uploadCsv(`/clans/${num('import-clan-id')}/imports/persons.csv/preview`, 'import-file')); }
function exportPersons() { window.open(`${API}/clans/${num('import-clan-id')}/exports/persons.csv`, '_blank'); }
function previewRelations() { run(async () => uploadCsv(`/clans/${num('import-clan-id')}/imports/relations.csv/preview`, 'relation-import-file')); }
function importRelations() { run(async () => uploadCsv(`/clans/${num('import-clan-id')}/imports/relations.csv`, 'relation-import-file')); }
function exportRelations() { window.open(`${API}/clans/${num('import-clan-id')}/exports/relations.csv`, '_blank'); }
function exportBranchPersons() { window.open(`${API}/clans/${num('import-clan-id')}/branches/${num('export-branch-id')}/exports/persons.csv`, '_blank'); }
async function uploadCsv(path, inputId) { const form = new FormData(); form.append('file', document.getElementById(inputId).files[0]); const res = await fetch(`${API}${path}`, { method: 'POST', headers: state.token ? { Authorization: `Bearer ${state.token}` } : {}, body: form }); const data = await res.json(); if (!res.ok || data.success === false) throw data; return data.data; }
function listLogs() { run(async () => { const params = new URLSearchParams(); ['clan-id','actor-id','action-type','target-type','target-id','keyword','start-time','end-time'].forEach(key => { const id = `log-${key}`; const value = document.getElementById(id)?.value?.trim(); if (value) params.append(key.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), value); }); const data = await request(`/logs/operations${params.toString() ? `?${params}` : ''}`, { headers: headers(false) }); renderList('log-list', data.items || data.content || []); return data; }); }
