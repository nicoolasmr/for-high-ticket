const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const authTokenKey = 'revenue-os-demo-token'

const state = { activeView: 'dashboard', workspaceId: 'ws-default', search: '', owner: 'all', temperature: 'all', status: 'all', selectedLeadId: null, leads: [], stages: [], team: [], workspaces: [], invites: [], user: null, authToken: localStorage.getItem(authTokenKey) || '' }
const titleByView = { dashboard: 'Dashboard operacional', leads: 'Lead inbox', pipeline: 'Pipeline comercial', tasks: 'Tasks e follow-up', analytics: 'Analytics executivo' }

const qs = (id) => document.querySelector(id)
const authShell = qs('#auth-shell')
const appShell = qs('#app-shell')
const viewTitle = qs('#view-title')
const navItems = [...document.querySelectorAll('.nav-item')]
const loginForm = qs('#login-form')
const loginFeedback = qs('#login-feedback')
const invitePanel = qs('#invite-panel')
const inviteList = qs('#invite-list')
const logoutButton = qs('#logout-button')
const searchInput = qs('#lead-search')
const ownerFilter = qs('#owner-filter')
const temperatureFilter = qs('#temperature-filter')
const statusFilter = qs('#status-filter')
const workspaceSwitcher = qs('#workspace-switcher')
const workspaceName = qs('#workspace-name')
const workspaceMeta = qs('#workspace-meta')
const leadOwnerInput = qs('#lead-owner')
const leadForm = qs('#lead-form')
const noteForm = qs('#note-form')
const taskForm = qs('#task-form')
const teamForm = qs('#team-form')
const teamFormSection = teamForm.closest('.glass-card')
const markWonButton = qs('#mark-won-button')
const markLostButton = qs('#mark-lost-button')
const leadFormFeedback = qs('#lead-form-feedback')
const noteFormFeedback = qs('#note-form-feedback')
const taskFormFeedback = qs('#task-form-feedback')
const teamFormFeedback = qs('#team-form-feedback')
const completedCountPill = qs('#completed-count-pill')
const kpiGrid = qs('#kpi-grid')
const priorityList = qs('#priority-list')
const priorityPill = qs('#priority-pill')
const aiSummary = qs('#ai-summary')
const timelineList = qs('#timeline-list')
const notesList = qs('#notes-list')
const teamList = qs('#team-list')
const leadsTableBody = qs('#leads-table-body')
const pipelineBoard = qs('#pipeline-board')
const taskList = qs('#task-list')
const onboardingList = qs('#onboarding-list')
const insightsList = qs('#insights-list')
const sourcePerformance = qs('#source-performance')
const ownerPerformance = qs('#owner-performance')
const statusPerformance = qs('#status-performance')

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const optionTag = (value, label, selected = false) => `<option value="${escapeHtml(value)}" ${selected ? 'selected' : ''}>${escapeHtml(label)}</option>`


function withWorkspace(url) {
  const next = new URL(url, window.location.origin)
  next.searchParams.set('workspace', state.workspaceId)
  return `${next.pathname}${next.search}`
}

async function request(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (state.authToken) headers.Authorization = `Bearer ${state.authToken}`
  const response = await fetch(withWorkspace(url), { headers, ...options })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || `Request failed: ${response.status}`)
  return data
}

const stageOptions = (selectedStageId) => state.stages.map((stage) => optionTag(stage.id, stage.name, stage.id === selectedStageId)).join('')

function setView(view) {
  state.activeView = view
  viewTitle.textContent = titleByView[view]
  navItems.forEach((item) => item.classList.toggle('active', item.dataset.view === view))
  document.querySelectorAll('.view-stack').forEach((section) => section.classList.toggle('hidden', section.id !== `${view}-view`))
}

function renderFilters() {
  workspaceSwitcher.innerHTML = state.workspaces.map((workspace) => optionTag(workspace.id, workspace.name)).join('')
  workspaceSwitcher.value = state.workspaceId
  const currentWorkspace = state.workspaces.find((workspace) => workspace.id === state.workspaceId)
  if (currentWorkspace) {
    workspaceName.textContent = currentWorkspace.name
    workspaceMeta.textContent = `${currentWorkspace.role} · ${currentWorkspace.id === 'ws-default' ? 'Growth plan · Trial ativo' : 'Vertical playbook · Workspace demo'}`
    teamFormSection.classList.toggle('hidden', !['admin', 'manager'].includes(currentWorkspace.role))
  }
  const activeMembers = state.team.filter((member) => member.status === 'active')
  const owners = ['all', ...new Set(activeMembers.map((member) => member.name))]
  ownerFilter.innerHTML = owners.map((owner) => optionTag(owner, owner === 'all' ? 'Todos os owners' : owner)).join('')
  ownerFilter.value = state.owner
  leadOwnerInput.innerHTML = [optionTag('', 'Sem owner'), ...activeMembers.map((member) => optionTag(member.name, member.name))].join('')
  const temperatures = ['all', 'hot', 'warm', 'cold']
  temperatureFilter.innerHTML = temperatures.map((value) => optionTag(value, value === 'all' ? 'Todas as temperaturas' : value)).join('')
  temperatureFilter.value = state.temperature
  const statuses = ['all', 'novo', 'qualificado', 'ganho', 'perdido', 'etapa atualizada', 'proposta enviada']
  statusFilter.innerHTML = statuses.map((value) => optionTag(value, value === 'all' ? 'Todos os status' : value)).join('')
  statusFilter.value = state.status
}

function setAuthenticated(isAuthenticated) {
  authShell.classList.toggle('hidden', isAuthenticated)
  appShell.classList.toggle('hidden', !isAuthenticated)
}

function renderInvites() {
  invitePanel.classList.toggle('hidden', state.invites.length === 0)
  inviteList.innerHTML = state.invites.map((invite) => `<div class="stack-item"><div><strong>${escapeHtml(invite.name)}</strong><p>${escapeHtml(invite.role)} · ${escapeHtml(invite.status)}</p></div><button class="button button-primary small-button" data-accept-invite="${escapeHtml(invite.id)}">Aceitar</button></div>`).join('')
}

function hasActiveWorkspace() {
  return Boolean(state.workspaces.length && state.workspaceId)
}

function clearAuthState() {
  state.authToken = ''
  state.user = null
  state.workspaces = []
  state.invites = []
  localStorage.removeItem(authTokenKey)
}

function clearOperationalState() {
  state.workspaceId = ''
  state.selectedLeadId = null
  state.leads = []
  state.team = []
  state.stages = []
  workspaceSwitcher.innerHTML = ''
  workspaceName.textContent = 'Sem workspace ativo'
  workspaceMeta.textContent = 'Aceite um convite para liberar a operação.'
  teamList.innerHTML = ''
  leadsTableBody.innerHTML = ''
  pipelineBoard.innerHTML = ''
  taskList.innerHTML = ''
  onboardingList.innerHTML = ''
  kpiGrid.innerHTML = ''
  priorityList.innerHTML = ''
  aiSummary.innerHTML = ''
  timelineList.innerHTML = ''
  notesList.innerHTML = ''
  insightsList.innerHTML = ''
  sourcePerformance.innerHTML = ''
  ownerPerformance.innerHTML = ''
  statusPerformance.innerHTML = ''
  completedCountPill.textContent = '0 concluídas'
  priorityPill.textContent = '0 leads críticos'
  teamFormSection.classList.add('hidden')
}

function applySession(session) {
  state.user = session.user
  state.workspaces = session.workspaces
  state.invites = session.invites || []
  renderInvites()
  if (session.workspaces.length) {
    state.workspaceId = session.workspaces[0]?.id || 'ws-default'
    renderFilters()
    setAuthenticated(true)
    return true
  }
  clearOperationalState()
  setAuthenticated(false)
  loginFeedback.textContent = state.invites.length ? 'Você tem convites pendentes. Aceite um convite para entrar no app.' : 'Seu usuário ainda não participa de nenhum workspace ativo.'
  return false
}

async function bootstrapSession() {
  if (!state.authToken) { setAuthenticated(false); return false }
  const session = await request('/api/auth/me')
  return applySession(session)
}

async function loadWorkspaces() {
  state.workspaces = (await request('/api/workspaces')).items
  if (!state.workspaces.some((workspace) => workspace.id === state.workspaceId)) state.workspaceId = state.workspaces[0]?.id || ''
  renderFilters()
}
async function loadStages() { state.stages = (await request('/api/stages')).items }
async function loadTeam() { state.team = (await request('/api/team')).items; teamList.innerHTML = state.team.map((member) => `<div class="stack-item"><div><strong>${escapeHtml(member.name)}</strong><p>${escapeHtml(member.email)} · ${escapeHtml(member.role)}</p></div><span class="pill ${member.status === 'active' ? 'pill-success' : 'pill-neutral'}">${escapeHtml(member.status)}</span></div>`).join(''); renderFilters() }

async function loadDashboard() { const dashboard = await request('/api/dashboard'); kpiGrid.innerHTML = dashboard.kpis.map((kpi) => `<article class="metric-card glass-card compact-card"><span>${escapeHtml(kpi.label)}</span><strong>${escapeHtml(typeof kpi.value === 'number' && kpi.label.includes('Receita') ? currency.format(kpi.value) : kpi.value)}</strong><small>${escapeHtml(kpi.detail)}</small></article>`).join(''); priorityPill.textContent = `${dashboard.priorities.length} leads críticos`; priorityList.innerHTML = dashboard.priorities.map((lead) => `<button class="stack-item action-card" data-select-lead="${escapeHtml(lead.id)}"><div><strong>${escapeHtml(lead.name)}</strong><p>${escapeHtml(lead.company)} · ${escapeHtml(lead.owner)}</p></div><span class="pill pill-danger">${escapeHtml(`${lead.lastReplyHours}h sem resposta`)}</span></button>`).join('') }

async function loadLeads() {
  const next = new URL('/api/leads', window.location.origin)
  next.searchParams.set('workspace', state.workspaceId)
  next.searchParams.set('search', state.search)
  next.searchParams.set('owner', state.owner)
  next.searchParams.set('temperature', state.temperature)
  next.searchParams.set('status', state.status)
  const payload = await request(`${next.pathname}?${next.searchParams.toString().replace(/^workspace=[^&]*&?/, '')}`)
  state.leads = payload.items
  if (!state.leads.some((lead) => lead.id === state.selectedLeadId)) state.selectedLeadId = state.leads[0]?.id || null
  leadsTableBody.innerHTML = state.leads.map((lead) => `<tr><td><button class="table-lead-button" data-select-lead="${lead.id}"><strong>${lead.name}</strong><div class="table-sub">${lead.company} · ${lead.source}</div></button></td><td><select class="stage-select" data-stage-select="${lead.id}">${stageOptions(lead.stageId)}</select></td><td>${lead.owner}</td><td><span class="temp temp-${lead.temperature}">${lead.temperature}</span></td><td>${lead.nextAction}</td><td>${currency.format(lead.value)}</td><td>${lead.status}${lead.lostReason ? `<div class="table-sub">${lead.lostReason}</div>` : ''}</td></tr>`).join('')
  if (!state.selectedLeadId) {
    aiSummary.innerHTML = ''
    notesList.innerHTML = ''
    timelineList.innerHTML = ''
  }
}

async function loadSummary(leadId) { if (!leadId) return; const lead = await request(`/api/leads/${leadId}/summary`); aiSummary.innerHTML = `<div class="summary-block"><span class="eyebrow">${escapeHtml(lead.name)} · ${escapeHtml(lead.company)}</span><p>${escapeHtml(lead.text)}</p><p><strong>Status:</strong> ${escapeHtml(lead.status)}${lead.lostReason ? ` · ${escapeHtml(lead.lostReason)}` : ''}</p><div class="summary-columns"><div><strong>Objeções</strong><ul>${lead.objections.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div><div><strong>Sinais de compra</strong><ul>${lead.signals.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div></div><p><strong>Próxima melhor ação:</strong> ${escapeHtml(lead.nextBestAction)}</p><blockquote>${escapeHtml(lead.suggestedReply)}</blockquote></div>` }
async function loadTimeline() { if (!state.selectedLeadId) return; const payload = await request(`/api/leads/${state.selectedLeadId}/timeline`); timelineList.innerHTML = payload.items.map((event) => `<div class="stack-item vertical-item"><strong>${escapeHtml(event.eventType)}</strong><p>${escapeHtml(JSON.stringify(event.payload))}</p><small>${escapeHtml(new Date(event.createdAt).toLocaleString('pt-BR'))}</small></div>`).join('') }
async function loadNotes() { if (!state.selectedLeadId) return; const payload = await request(`/api/leads/${state.selectedLeadId}/notes`); notesList.innerHTML = payload.items.map((note) => `<div class="stack-item vertical-item"><div><strong>${escapeHtml(note.author)}</strong><p>${escapeHtml(note.body)}</p></div><small>${escapeHtml(new Date(note.created_at).toLocaleString('pt-BR'))}</small></div>`).join('') }
async function loadPipeline() { const payload = await request('/api/pipeline'); pipelineBoard.innerHTML = payload.stages.map((stage) => `<section class="pipeline-column glass-card compact-card"><header><h3>${escapeHtml(stage.name)}</h3><span>${escapeHtml(stage.leads.length)}</span></header><div class="pipeline-column-body">${stage.leads.map((lead) => `<button class="pipeline-card" data-select-lead="${escapeHtml(lead.id)}"><div><strong>${escapeHtml(lead.name)}</strong><p>${escapeHtml(lead.company)}</p></div><small>${escapeHtml(currency.format(lead.value))} · ${escapeHtml(lead.owner)}</small></button>`).join('')}</div></section>`).join('') }
async function loadTasks() { const payload = await request('/api/tasks'); completedCountPill.textContent = `${payload.completedCount} concluídas`; taskList.innerHTML = payload.tasks.map((task) => `<div class="stack-item"><div><strong>${escapeHtml(task.due_time)}</strong><p>${escapeHtml(task.title)}</p><small>${task.lead_id ? `Lead: ${escapeHtml(task.lead_id)}` : 'Sem lead vinculado'}</small></div><div class="task-actions"><span class="pill ${task.priority === 'urgent' ? 'pill-danger' : 'pill-neutral'}">${escapeHtml(task.priority)}</span><button class="button button-ghost small-button" data-complete-task="${escapeHtml(task.id)}">Concluir</button></div></div>`).join(''); onboardingList.innerHTML = payload.onboarding.map((step) => `<div class="stack-item"><div><strong>${escapeHtml(step.title)}</strong><p>${step.done ? 'Concluído' : 'Pendente para ativação'}</p></div><span class="pill ${step.done ? 'pill-success' : 'pill-neutral'}">${step.done ? 'feito' : 'pendente'}</span></div>`).join('') }
async function loadAnalytics() {
  try {
    const payload = await request('/api/analytics')
    insightsList.innerHTML = payload.insights.map((insight) => `<div class="stack-item"><div><strong>Insight</strong><p>${escapeHtml(insight)}</p></div></div>`).join('')
    sourcePerformance.innerHTML = payload.sources.map((item) => `<div class="stack-item"><div><strong>${escapeHtml(item.source)}</strong><p>${escapeHtml(`${item.count} leads`)}</p></div><span class="pill pill-success">${escapeHtml(currency.format(item.revenue || 0))}</span></div>`).join('')
    ownerPerformance.innerHTML = payload.owners.map((item) => `<div class="stack-item"><div><strong>${escapeHtml(item.owner)}</strong><p>${escapeHtml(`${item.count} leads`)}</p></div><span class="pill pill-success">${escapeHtml(currency.format(item.revenue || 0))}</span></div>`).join('')
    statusPerformance.innerHTML = payload.statuses.map((item) => `<div class="stack-item"><div><strong>${escapeHtml(item.status)}</strong><p>${escapeHtml(`${item.count} leads`)}</p></div><span class="pill pill-neutral">${escapeHtml(currency.format(item.revenue || 0))}</span></div>`).join('')
  } catch (error) {
    insightsList.innerHTML = `<div class="stack-item"><div><strong>Acesso restrito</strong><p>${escapeHtml(error.message)}</p></div></div>`
    sourcePerformance.innerHTML = ''
    ownerPerformance.innerHTML = ''
    statusPerformance.innerHTML = ''
  }
}

async function loadAppData() {
  await Promise.all([loadWorkspaces(), loadStages(), loadTeam(), loadDashboard(), loadLeads(), loadPipeline(), loadTasks(), loadAnalytics()])
  if (state.selectedLeadId) await Promise.all([loadSummary(state.selectedLeadId), loadNotes(), loadTimeline()])
}

async function refreshOperationalViews() {
  if (!hasActiveWorkspace()) return
  await Promise.all([loadDashboard(), loadLeads(), loadPipeline(), loadTasks(), loadAnalytics(), loadTeam()])
  if (state.selectedLeadId) await Promise.all([loadSummary(state.selectedLeadId), loadNotes(), loadTimeline()])
}

const createLead = async (form) => { const payload = Object.fromEntries(new FormData(form).entries()); payload.value = Number(payload.value || 0); payload.workspaceId = state.workspaceId; const lead = await request('/api/leads', { method: 'POST', body: JSON.stringify(payload) }); state.selectedLeadId = lead.id; await refreshOperationalViews(); form.reset(); leadFormFeedback.textContent = `Lead ${lead.name} criado com sucesso.` }
const moveLeadStage = async (leadId, stageId) => { await request(`/api/leads/${leadId}/stage`, { method: 'PATCH', body: JSON.stringify({ stageId }) }); await refreshOperationalViews() }
const createTask = async (form) => { const payload = Object.fromEntries(new FormData(form).entries()); payload.workspaceId = state.workspaceId; const task = await request('/api/tasks', { method: 'POST', body: JSON.stringify(payload) }); await loadTasks(); form.reset(); taskFormFeedback.textContent = `Task ${task.title} criada com sucesso.` }
const completeTask = async (taskId) => { await request(`/api/tasks/${taskId}/complete`, { method: 'POST', body: '{}' }); await loadTasks(); await loadDashboard(); await loadTimeline() }
const createNote = async (form) => { if (!state.selectedLeadId) throw new Error('Selecione um lead antes de registrar uma nota.'); await request(`/api/leads/${state.selectedLeadId}/notes`, { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) }); await Promise.all([loadNotes(), loadTimeline()]); form.reset(); noteFormFeedback.textContent = 'Nota adicionada com sucesso.' }
const markLeadWon = async () => { if (!state.selectedLeadId) return; await request(`/api/leads/${state.selectedLeadId}/mark-won`, { method: 'POST', body: '{}' }); await refreshOperationalViews() }
const markLeadLost = async () => { if (!state.selectedLeadId) return; const lostReason = window.prompt('Qual o motivo da perda?') || 'Sem motivo informado'; await request(`/api/leads/${state.selectedLeadId}/mark-lost`, { method: 'POST', body: JSON.stringify({ lostReason }) }); await refreshOperationalViews() }
const inviteTeamMember = async (form) => { const payload = Object.fromEntries(new FormData(form).entries()); payload.workspaceId = state.workspaceId; const member = await request('/api/team', { method: 'POST', body: JSON.stringify(payload) }); await loadTeam(); form.reset(); teamFormFeedback.textContent = `Convite criado para ${member.name}.` }
const acceptInvite = async (workspaceId) => {
  state.workspaceId = workspaceId
  await request('/api/team/accept-invite', { method: 'POST', body: JSON.stringify({ workspaceId }) })
  const session = await request('/api/auth/me')
  if (applySession(session)) await loadAppData()
}
const login = async (form) => {
  const payload = Object.fromEntries(new FormData(form).entries())
  const session = await request('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) })
  state.authToken = session.token
  localStorage.setItem(authTokenKey, session.token)
  const hasWorkspace = applySession(session)
  if (hasWorkspace) {
    await loadAppData()
    loginFeedback.textContent = ''
  }
  form.reset()
}
const logout = async () => {
  try {
    if (state.authToken) await request('/api/auth/logout', { method: 'POST', body: '{}' })
  } catch (_) {
    // Logout local deve sempre prosseguir, mesmo se a sessão remota já expirou.
  } finally {
    clearAuthState()
    clearOperationalState()
    renderInvites()
    setAuthenticated(false)
  }
}

function attachEvents() {
  navItems.forEach((item) => item.addEventListener('click', () => setView(item.dataset.view)))
  loginForm.addEventListener('submit', async (event) => { event.preventDefault(); try { await login(event.currentTarget) } catch (error) { loginFeedback.textContent = error.message } })
  logoutButton.addEventListener('click', async () => { try { await logout() } catch (error) { loginFeedback.textContent = error.message } })
  workspaceSwitcher.addEventListener('change', async (event) => { state.workspaceId = event.target.value; state.selectedLeadId = null; state.owner = 'all'; state.temperature = 'all'; state.status = 'all'; await refreshOperationalViews() })
  searchInput.addEventListener('input', async (event) => { state.search = event.target.value; await loadLeads() })
  ownerFilter.addEventListener('change', async (event) => { state.owner = event.target.value; await loadLeads() })
  temperatureFilter.addEventListener('change', async (event) => { state.temperature = event.target.value; await loadLeads() })
  statusFilter.addEventListener('change', async (event) => { state.status = event.target.value; await loadLeads() })
  leadForm.addEventListener('submit', async (event) => { event.preventDefault(); try { await createLead(event.currentTarget); setView('leads') } catch (error) { leadFormFeedback.textContent = error.message } })
  taskForm.addEventListener('submit', async (event) => { event.preventDefault(); try { await createTask(event.currentTarget) } catch (error) { taskFormFeedback.textContent = error.message } })
  noteForm.addEventListener('submit', async (event) => { event.preventDefault(); try { await createNote(event.currentTarget) } catch (error) { noteFormFeedback.textContent = error.message } })
  teamForm.addEventListener('submit', async (event) => { event.preventDefault(); try { await inviteTeamMember(event.currentTarget) } catch (error) { teamFormFeedback.textContent = error.message } })
  markWonButton.addEventListener('click', markLeadWon)
  markLostButton.addEventListener('click', markLeadLost)
  document.body.addEventListener('click', async (event) => {
    const inviteButton = event.target.closest('[data-accept-invite]')
    if (inviteButton) { try { await acceptInvite(inviteButton.dataset.acceptInvite) } catch (error) { loginFeedback.textContent = error.message } return }
    const leadButton = event.target.closest('[data-select-lead]')
    if (leadButton) { state.selectedLeadId = leadButton.dataset.selectLead; await Promise.all([loadSummary(state.selectedLeadId), loadNotes(), loadTimeline()]); setView('dashboard'); return }
    const completeButton = event.target.closest('[data-complete-task]')
    if (completeButton) await completeTask(completeButton.dataset.completeTask)
  })
  document.body.addEventListener('change', async (event) => { const select = event.target.closest('[data-stage-select]'); if (select) { try { await moveLeadStage(select.dataset.stageSelect, select.value); setView('pipeline') } catch (error) { leadFormFeedback.textContent = error.message } } })
}

async function init() {
  attachEvents()
  clearOperationalState()
  try {
    const hasSession = await bootstrapSession()
    if (!hasSession) return
    await loadAppData()
  } catch (error) {
    clearAuthState()
    clearOperationalState()
    setAuthenticated(false)
    loginFeedback.textContent = 'Faça login com uma credencial demo para abrir o app.'
  }
}

init()
