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
  auth: '完成登录后可创建宗族，并自动成为宗族管理员。', clans: '创建宗族、查看宗族列表。', branches: '维护宗族下的支派树。', generations: '维护字辈方案和代次字辈。', persons: '录入人物、查询人物，自动支持在世人员隐私脱敏。', relationships: '建立人物之间的族谱关系。', sources: '维护资料来源、证据绑定和附件上传。', reviews: '提交审核、管理员审核通过或驳回。', tree: '查看家庭图、上溯和下延世系。', imports: '下载模板、导入导出人物 CSV。', logs: '查看关键操作审计日志。'
};

function setToken(token) { state.token = token || ''; localStorage.setItem('token', state.token); document.getElementById('token').value = state.token; }
function headers(json = true) { const h = {}; if (json) h['Content-Type'] = 'application/json'; if (state.token) h.Authorization = `Bearer ${state.token}`; return h; }
function val(id) { return document.getElementById(id).value.trim(); }
function num(id) { const v = val(id); return v ? Number(v) : null; }
function show(data, error = false) { const box = document.getElementById('message'); box.className = `message${error ? ' error' : ''}`; box.innerText = typeof data === 'string' ? data : JSON.stringify(data, null, 2); }
async function request(path, options = {}) { const res = await fetch(API + path, options); const text = await res.text(); const data = text ? JSON.parse(text) : null; if (!res.ok || data?.success === false) throw data || { message: res.statusText }; return data?.data ?? data; }
async function run(fn) { try { show(await fn()); } catch (e) { show(e.message || e.errorMessage || JSON.stringify(e), true); } }
function renderList(id, rows) { document.getElementById(id).innerHTML = (rows || []).map(row => `<div class="item"><pre>${JSON.stringify(row, null, 2)}</pre></div>`).join(''); }

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

function loadFamilyTree() { run(async () => { const data = await request(`/tree/person/${num('tree-person-id')}/family`, { headers: headers(false) }); document.getElementById('tree-result').innerText = JSON.stringify(data, null, 2); return data; }); }
function loadDescendants() { run(async () => { const data = await request(`/tree/descendants?rootPersonId=${num('tree-person-id')}`, { headers: headers(false) }); document.getElementById('tree-result').innerText = JSON.stringify(data, null, 2); return data; }); }
function loadAncestors() { run(async () => { const data = await request(`/tree/ancestors?personId=${num('tree-person-id')}`, { headers: headers(false) }); document.getElementById('tree-result').innerText = JSON.stringify(data, null, 2); return data; }); }

function importPersons() { run(async () => { const form = new FormData(); form.append('file', document.getElementById('import-file').files[0]); const res = await fetch(`${API}/clans/${num('import-clan-id')}/imports/persons.csv`, { method: 'POST', headers: state.token ? { Authorization: `Bearer ${state.token}` } : {}, body: form }); const data = await res.json(); if (!res.ok || data.success === false) throw data; return data.data; }); }
function exportPersons() { window.open(`${API}/clans/${num('import-clan-id')}/exports/persons.csv`, '_blank'); }
function listLogs() { run(async () => { const clanId = val('log-clan-id'); const data = await request(`/logs/operations${clanId ? `?clanId=${clanId}` : ''}`, { headers: headers(false) }); renderList('log-list', data.items || data.content || []); return data; }); }
