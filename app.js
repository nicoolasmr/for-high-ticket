const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

const state = { activeView: 'dashboard', workspaceId: 'ws-default', search: '', owner: 'all', temperature: 'all', status: 'all', selectedLeadId: null, leads: [], stages: [], team: [], workspaces: [] }
const titleByView = { dashboard: 'Dashboard operacional', leads: 'Lead inbox', pipeline: 'Pipeline comercial', tasks: 'Tasks e follow-up', analytics: 'Analytics executivo' }

const qs = (id) => document.querySelector(id)
const viewTitle = qs('#view-title')
const navItems = [...document.querySelectorAll('.nav-item')]
const searchInput = qs('#lead-search')
const ownerFilter = qs('#owner-filter')
const temperatureFilter = qs('#temperature-filter')
const statusFilter = qs('#status-filter')
const workspaceSwitcher = qs('#workspace-switcher')
const leadOwnerInput = qs('#lead-owner')
const leadForm = qs('#lead-form')
const noteForm = qs('#note-form')
const taskForm = qs('#task-form')
const teamForm = qs('#team-form')
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

function withWorkspace(url) {
  const next = new URL(url, window.location.origin)
  next.searchParams.set('workspace', state.workspaceId)
  return `${next.pathname}${next.search}`
}

async function request(url, options = {}) {
  const response = await fetch(withWorkspace(url), { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || `Request failed: ${response.status}`)
  return data
}

const stageOptions = (selectedStageId) => state.stages.map((stage) => `<option value="${stage.id}" ${stage.id === selectedStageId ? 'selected' : ''}>${stage.name}</option>`).join('')

function setView(view) {
  state.activeView = view
  viewTitle.textContent = titleByView[view]
  navItems.forEach((item) => item.classList.toggle('active', item.dataset.view === view))
  document.querySelectorAll('.view-stack').forEach((section) => section.classList.toggle('hidden', section.id !== `${view}-view`))
}

function renderFilters() {
  workspaceSwitcher.innerHTML = state.workspaces.map((workspace) => `<option value="${workspace.id}">${workspace.name}</option>`).join('')
  workspaceSwitcher.value = state.workspaceId
  const owners = ['all', ...new Set(state.team.map((member) => member.name))]
  ownerFilter.innerHTML = owners.map((owner) => `<option value="${owner}">${owner === 'all' ? 'Todos os owners' : owner}</option>`).join('')
  ownerFilter.value = state.owner
  leadOwnerInput.innerHTML = ['<option value="">Sem owner</option>', ...state.team.map((member) => `<option value="${member.name}">${member.name}</option>`)].join('')
  const temperatures = ['all', 'hot', 'warm', 'cold']
  temperatureFilter.innerHTML = temperatures.map((value) => `<option value="${value}">${value === 'all' ? 'Todas as temperaturas' : value}</option>`).join('')
  temperatureFilter.value = state.temperature
  const statuses = ['all', 'novo', 'qualificado', 'ganho', 'perdido', 'etapa atualizada', 'proposta enviada']
  statusFilter.innerHTML = statuses.map((value) => `<option value="${value}">${value === 'all' ? 'Todos os status' : value}</option>`).join('')
  statusFilter.value = state.status
}

async function loadWorkspaces() { state.workspaces = (await request('/api/workspaces')).items; renderFilters() }
async function loadStages() { state.stages = (await request('/api/stages')).items }
async function loadTeam() { state.team = (await request('/api/team')).items; teamList.innerHTML = state.team.map((member) => `<div class="stack-item"><div><strong>${member.name}</strong><p>${member.role}</p></div></div>`).join(''); renderFilters() }

async function loadDashboard() { const dashboard = await request('/api/dashboard'); kpiGrid.innerHTML = dashboard.kpis.map((kpi) => `<article class="metric-card glass-card compact-card"><span>${kpi.label}</span><strong>${typeof kpi.value === 'number' && kpi.label.includes('Receita') ? currency.format(kpi.value) : kpi.value}</strong><small>${kpi.detail}</small></article>`).join(''); priorityPill.textContent = `${dashboard.priorities.length} leads críticos`; priorityList.innerHTML = dashboard.priorities.map((lead) => `<button class="stack-item action-card" data-select-lead="${lead.id}"><div><strong>${lead.name}</strong><p>${lead.company} · ${lead.owner}</p></div><span class="pill pill-danger">${lead.lastReplyHours}h sem resposta</span></button>`).join('') }

async function loadLeads() {
  const next = new URL('/api/leads', window.location.origin)
  next.searchParams.set('workspace', state.workspaceId)
  next.searchParams.set('search', state.search)
  next.searchParams.set('owner', state.owner)
  next.searchParams.set('temperature', state.temperature)
  next.searchParams.set('status', state.status)
  const payload = await request(`${next.pathname}?${next.searchParams.toString().replace(/^workspace=[^&]*&?/, '')}`)
  state.leads = payload.items
  if (!state.selectedLeadId && state.leads[0]) state.selectedLeadId = state.leads[0].id
  leadsTableBody.innerHTML = state.leads.map((lead) => `<tr><td><button class="table-lead-button" data-select-lead="${lead.id}"><strong>${lead.name}</strong><div class="table-sub">${lead.company} · ${lead.source}</div></button></td><td><select class="stage-select" data-stage-select="${lead.id}">${stageOptions(lead.stageId)}</select></td><td>${lead.owner}</td><td><span class="temp temp-${lead.temperature}">${lead.temperature}</span></td><td>${lead.nextAction}</td><td>${currency.format(lead.value)}</td><td>${lead.status}${lead.lostReason ? `<div class="table-sub">${lead.lostReason}</div>` : ''}</td></tr>`).join('')
}

async function loadSummary(leadId) { if (!leadId) return; const lead = await request(`/api/leads/${leadId}/summary`); aiSummary.innerHTML = `<div class="summary-block"><span class="eyebrow">${lead.name} · ${lead.company}</span><p>${lead.text}</p><p><strong>Status:</strong> ${lead.status}${lead.lostReason ? ` · ${lead.lostReason}` : ''}</p><div class="summary-columns"><div><strong>Objeções</strong><ul>${lead.objections.map((item) => `<li>${item}</li>`).join('')}</ul></div><div><strong>Sinais de compra</strong><ul>${lead.signals.map((item) => `<li>${item}</li>`).join('')}</ul></div></div><p><strong>Próxima melhor ação:</strong> ${lead.nextBestAction}</p><blockquote>${lead.suggestedReply}</blockquote></div>` }
async function loadTimeline() { if (!state.selectedLeadId) return; const payload = await request(`/api/leads/${state.selectedLeadId}/timeline`); timelineList.innerHTML = payload.items.map((event) => `<div class="stack-item vertical-item"><strong>${event.eventType}</strong><p>${JSON.stringify(event.payload)}</p><small>${new Date(event.createdAt).toLocaleString('pt-BR')}</small></div>`).join('') }
async function loadNotes() { if (!state.selectedLeadId) return; const payload = await request(`/api/leads/${state.selectedLeadId}/notes`); notesList.innerHTML = payload.items.map((note) => `<div class="stack-item vertical-item"><div><strong>${note.author}</strong><p>${note.body}</p></div><small>${new Date(note.created_at).toLocaleString('pt-BR')}</small></div>`).join('') }
async function loadPipeline() { const payload = await request('/api/pipeline'); pipelineBoard.innerHTML = payload.stages.map((stage) => `<section class="pipeline-column glass-card compact-card"><header><h3>${stage.name}</h3><span>${stage.leads.length}</span></header><div class="pipeline-column-body">${stage.leads.map((lead) => `<button class="pipeline-card" data-select-lead="${lead.id}"><div><strong>${lead.name}</strong><p>${lead.company}</p></div><small>${currency.format(lead.value)} · ${lead.owner}</small></button>`).join('')}</div></section>`).join('') }
async function loadTasks() { const payload = await request('/api/tasks'); completedCountPill.textContent = `${payload.completedCount} concluídas`; taskList.innerHTML = payload.tasks.map((task) => `<div class="stack-item"><div><strong>${task.due_time}</strong><p>${task.title}</p><small>${task.lead_id ? `Lead: ${task.lead_id}` : 'Sem lead vinculado'}</small></div><div class="task-actions"><span class="pill ${task.priority === 'urgent' ? 'pill-danger' : 'pill-neutral'}">${task.priority}</span><button class="button button-ghost small-button" data-complete-task="${task.id}">Concluir</button></div></div>`).join(''); onboardingList.innerHTML = payload.onboarding.map((step) => `<div class="stack-item"><div><strong>${step.title}</strong><p>${step.done ? 'Concluído' : 'Pendente para ativação'}</p></div><span class="pill ${step.done ? 'pill-success' : 'pill-neutral'}">${step.done ? 'feito' : 'pendente'}</span></div>`).join('') }
async function loadAnalytics() { const payload = await request('/api/analytics'); insightsList.innerHTML = payload.insights.map((insight) => `<div class="stack-item"><div><strong>Insight</strong><p>${insight}</p></div></div>`).join(''); sourcePerformance.innerHTML = payload.sources.map((item) => `<div class="stack-item"><div><strong>${item.source}</strong><p>${item.count} leads</p></div><span class="pill pill-success">${currency.format(item.revenue || 0)}</span></div>`).join(''); ownerPerformance.innerHTML = payload.owners.map((item) => `<div class="stack-item"><div><strong>${item.owner}</strong><p>${item.count} leads</p></div><span class="pill pill-success">${currency.format(item.revenue || 0)}</span></div>`).join(''); statusPerformance.innerHTML = payload.statuses.map((item) => `<div class="stack-item"><div><strong>${item.status}</strong><p>${item.count} leads</p></div><span class="pill pill-neutral">${currency.format(item.revenue || 0)}</span></div>`).join('') }

async function refreshOperationalViews() { await Promise.all([loadDashboard(), loadLeads(), loadPipeline(), loadTasks(), loadAnalytics(), loadTeam()]); if (state.selectedLeadId) await Promise.all([loadSummary(state.selectedLeadId), loadNotes(), loadTimeline()]) }

const createLead = async (form) => { const payload = Object.fromEntries(new FormData(form).entries()); payload.value = Number(payload.value || 0); payload.workspaceId = state.workspaceId; const lead = await request('/api/leads', { method: 'POST', body: JSON.stringify(payload) }); state.selectedLeadId = lead.id; await refreshOperationalViews(); form.reset(); leadFormFeedback.textContent = `Lead ${lead.name} criado com sucesso.` }
const moveLeadStage = async (leadId, stageId) => { await request(`/api/leads/${leadId}/stage`, { method: 'PATCH', body: JSON.stringify({ stageId }) }); await refreshOperationalViews() }
const createTask = async (form) => { const task = await request('/api/tasks', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) }); await loadTasks(); form.reset(); taskFormFeedback.textContent = `Task ${task.title} criada com sucesso.` }
const completeTask = async (taskId) => { await request(`/api/tasks/${taskId}/complete`, { method: 'POST', body: '{}' }); await loadTasks(); await loadDashboard(); await loadTimeline() }
const createNote = async (form) => { if (!state.selectedLeadId) throw new Error('Selecione um lead antes de registrar uma nota.'); await request(`/api/leads/${state.selectedLeadId}/notes`, { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) }); await Promise.all([loadNotes(), loadTimeline()]); form.reset(); noteFormFeedback.textContent = 'Nota adicionada com sucesso.' }
const markLeadWon = async () => { if (!state.selectedLeadId) return; await request(`/api/leads/${state.selectedLeadId}/mark-won`, { method: 'POST', body: '{}' }); await refreshOperationalViews() }
const markLeadLost = async () => { if (!state.selectedLeadId) return; const lostReason = window.prompt('Qual o motivo da perda?') || 'Sem motivo informado'; await request(`/api/leads/${state.selectedLeadId}/mark-lost`, { method: 'POST', body: JSON.stringify({ lostReason }) }); await refreshOperationalViews() }
const inviteTeamMember = async (form) => { const payload = Object.fromEntries(new FormData(form).entries()); payload.workspaceId = state.workspaceId; const member = await request('/api/team', { method: 'POST', body: JSON.stringify(payload) }); await loadTeam(); form.reset(); teamFormFeedback.textContent = `Convite criado para ${member.name}.` }

function attachEvents() {
  navItems.forEach((item) => item.addEventListener('click', () => setView(item.dataset.view)))
  workspaceSwitcher.addEventListener('change', async (event) => { state.workspaceId = event.target.value; state.selectedLeadId = null; await refreshOperationalViews() })
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
    const leadButton = event.target.closest('[data-select-lead]')
    if (leadButton) { state.selectedLeadId = leadButton.dataset.selectLead; await Promise.all([loadSummary(state.selectedLeadId), loadNotes(), loadTimeline()]); setView('dashboard'); return }
    const completeButton = event.target.closest('[data-complete-task]')
    if (completeButton) await completeTask(completeButton.dataset.completeTask)
  })
  document.body.addEventListener('change', async (event) => { const select = event.target.closest('[data-stage-select]'); if (select) { try { await moveLeadStage(select.dataset.stageSelect, select.value); setView('pipeline') } catch (error) { leadFormFeedback.textContent = error.message } } })
}

async function init() {
  try {
    await Promise.all([loadWorkspaces(), loadStages(), loadTeam()])
    await Promise.all([loadDashboard(), loadLeads(), loadPipeline(), loadTasks(), loadAnalytics()])
    if (state.selectedLeadId) await Promise.all([loadSummary(state.selectedLeadId), loadNotes(), loadTimeline()])
    attachEvents()
  } catch (error) {
    aiSummary.innerHTML = `<div class="stack-item"><p>Falha ao carregar a demo: ${error.message}</p></div>`
  }
}

init()
