const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})

const state = {
  activeView: 'dashboard',
  search: '',
  owner: 'all',
  temperature: 'all',
  selectedLeadId: null,
  leads: [],
  stages: [],
}

const titleByView = {
  dashboard: 'Dashboard operacional',
  leads: 'Lead inbox',
  pipeline: 'Pipeline comercial',
  tasks: 'Tasks e follow-up',
  analytics: 'Analytics executivo',
}

const viewTitle = document.querySelector('#view-title')
const navItems = [...document.querySelectorAll('.nav-item')]
const searchInput = document.querySelector('#lead-search')
const ownerFilter = document.querySelector('#owner-filter')
const temperatureFilter = document.querySelector('#temperature-filter')
const leadForm = document.querySelector('#lead-form')
const noteForm = document.querySelector('#note-form')
const taskForm = document.querySelector('#task-form')
const leadFormFeedback = document.querySelector('#lead-form-feedback')
const noteFormFeedback = document.querySelector('#note-form-feedback')
const taskFormFeedback = document.querySelector('#task-form-feedback')
const completedCountPill = document.querySelector('#completed-count-pill')
const kpiGrid = document.querySelector('#kpi-grid')
const priorityList = document.querySelector('#priority-list')
const priorityPill = document.querySelector('#priority-pill')
const aiSummary = document.querySelector('#ai-summary')
const notesList = document.querySelector('#notes-list')
const leadsTableBody = document.querySelector('#leads-table-body')
const pipelineBoard = document.querySelector('#pipeline-board')
const taskList = document.querySelector('#task-list')
const onboardingList = document.querySelector('#onboarding-list')
const insightsList = document.querySelector('#insights-list')
const sourcePerformance = document.querySelector('#source-performance')

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || `Request failed: ${response.status}`)
  return data
}

function stageOptions(selectedStageId) {
  return state.stages
    .map((stage) => `<option value="${stage.id}" ${stage.id === selectedStageId ? 'selected' : ''}>${stage.name}</option>`)
    .join('')
}

function setView(view) {
  state.activeView = view
  viewTitle.textContent = titleByView[view]
  navItems.forEach((item) => item.classList.toggle('active', item.dataset.view === view))
  document.querySelectorAll('.view-stack').forEach((section) => {
    section.classList.toggle('hidden', section.id !== `${view}-view`)
  })
}

function renderFilters() {
  const owners = ['all', ...new Set(state.leads.map((lead) => lead.owner))]
  ownerFilter.innerHTML = owners
    .map((owner) => `<option value="${owner}">${owner === 'all' ? 'Todos os owners' : owner}</option>`)
    .join('')
  ownerFilter.value = state.owner

  const temperatures = ['all', 'hot', 'warm', 'cold']
  temperatureFilter.innerHTML = temperatures
    .map((value) => `<option value="${value}">${value === 'all' ? 'Todas as temperaturas' : value}</option>`)
    .join('')
  temperatureFilter.value = state.temperature
}

async function loadStages() {
  const payload = await request('/api/stages')
  state.stages = payload.items
}

async function loadDashboard() {
  const dashboard = await request('/api/dashboard')
  kpiGrid.innerHTML = dashboard.kpis
    .map(
      (kpi) => `
        <article class="metric-card glass-card compact-card">
          <span>${kpi.label}</span>
          <strong>${typeof kpi.value === 'number' && kpi.label.includes('Receita') ? currency.format(kpi.value) : kpi.value}</strong>
          <small>${kpi.detail}</small>
        </article>
      `,
    )
    .join('')

  priorityPill.textContent = `${dashboard.priorities.length} leads críticos`
  priorityList.innerHTML = dashboard.priorities
    .map(
      (lead) => `
        <button class="stack-item action-card" data-select-lead="${lead.id}">
          <div>
            <strong>${lead.name}</strong>
            <p>${lead.company} · ${lead.owner}</p>
          </div>
          <span class="pill pill-danger">${lead.lastReplyHours}h sem resposta</span>
        </button>
      `,
    )
    .join('')
}

async function loadLeads() {
  const params = new URLSearchParams({
    search: state.search,
    owner: state.owner,
    temperature: state.temperature,
  })
  const payload = await request(`/api/leads?${params.toString()}`)
  state.leads = payload.items
  if (!state.selectedLeadId && state.leads[0]) state.selectedLeadId = state.leads[0].id
  renderFilters()
  leadsTableBody.innerHTML = state.leads
    .map(
      (lead) => `
        <tr>
          <td>
            <button class="table-lead-button" data-select-lead="${lead.id}">
              <strong>${lead.name}</strong>
              <div class="table-sub">${lead.company} · ${lead.source}</div>
            </button>
          </td>
          <td>
            <select class="stage-select" data-stage-select="${lead.id}">${stageOptions(lead.stageId)}</select>
          </td>
          <td>${lead.owner}</td>
          <td><span class="temp temp-${lead.temperature}">${lead.temperature}</span></td>
          <td>${lead.nextAction}</td>
          <td>${currency.format(lead.value)}</td>
          <td>${lead.status}</td>
        </tr>
      `,
    )
    .join('')
}

async function loadSummary(leadId) {
  if (!leadId) return
  const lead = await request(`/api/leads/${leadId}/summary`)
  aiSummary.innerHTML = `
    <div class="summary-block">
      <span class="eyebrow">${lead.name} · ${lead.company}</span>
      <p>${lead.text}</p>
      <div class="summary-columns">
        <div>
          <strong>Objeções</strong>
          <ul>${lead.objections.map((item) => `<li>${item}</li>`).join('')}</ul>
        </div>
        <div>
          <strong>Sinais de compra</strong>
          <ul>${lead.signals.map((item) => `<li>${item}</li>`).join('')}</ul>
        </div>
      </div>
      <p><strong>Próxima melhor ação:</strong> ${lead.nextBestAction}</p>
      <blockquote>${lead.suggestedReply}</blockquote>
    </div>
  `
}

async function loadNotes() {
  if (!state.selectedLeadId) return
  const payload = await request(`/api/leads/${state.selectedLeadId}/notes`)
  notesList.innerHTML = payload.items
    .map(
      (note) => `
        <div class="stack-item vertical-item">
          <div>
            <strong>${note.author}</strong>
            <p>${note.body}</p>
          </div>
          <small>${new Date(note.created_at).toLocaleString('pt-BR')}</small>
        </div>
      `,
    )
    .join('')
}

async function loadPipeline() {
  const payload = await request('/api/pipeline')
  pipelineBoard.innerHTML = payload.stages
    .map(
      (stage) => `
        <section class="pipeline-column glass-card compact-card">
          <header>
            <h3>${stage.name}</h3>
            <span>${stage.leads.length}</span>
          </header>
          <div class="pipeline-column-body">
            ${stage.leads
              .map(
                (lead) => `
                  <button class="pipeline-card" data-select-lead="${lead.id}">
                    <div>
                      <strong>${lead.name}</strong>
                      <p>${lead.company}</p>
                    </div>
                    <small>${currency.format(lead.value)} · ${lead.owner}</small>
                  </button>
                `,
              )
              .join('')}
          </div>
        </section>
      `,
    )
    .join('')
}

async function loadTasks() {
  const payload = await request('/api/tasks')
  completedCountPill.textContent = `${payload.completedCount} concluídas`
  taskList.innerHTML = payload.tasks
    .map(
      (task) => `
        <div class="stack-item">
          <div>
            <strong>${task.due_time}</strong>
            <p>${task.title}</p>
            <small>${task.lead_id ? `Lead: ${task.lead_id}` : 'Sem lead vinculado'}</small>
          </div>
          <div class="task-actions">
            <span class="pill ${task.priority === 'urgent' ? 'pill-danger' : 'pill-neutral'}">${task.priority}</span>
            <button class="button button-ghost small-button" data-complete-task="${task.id}">Concluir</button>
          </div>
        </div>
      `,
    )
    .join('')

  onboardingList.innerHTML = payload.onboarding
    .map(
      (step) => `
        <div class="stack-item">
          <div>
            <strong>${step.title}</strong>
            <p>${step.done ? 'Concluído' : 'Pendente para ativação'}</p>
          </div>
          <span class="pill ${step.done ? 'pill-success' : 'pill-neutral'}">${step.done ? 'feito' : 'pendente'}</span>
        </div>
      `,
    )
    .join('')
}

async function loadAnalytics() {
  const payload = await request('/api/analytics')
  insightsList.innerHTML = payload.insights
    .map(
      (insight) => `
        <div class="stack-item">
          <div>
            <strong>Insight</strong>
            <p>${insight}</p>
          </div>
        </div>
      `,
    )
    .join('')

  sourcePerformance.innerHTML = payload.sources
    .map(
      (item) => `
        <div class="stack-item">
          <div>
            <strong>${item.source}</strong>
            <p>${item.count} leads</p>
          </div>
          <span class="pill pill-success">${currency.format(item.revenue)}</span>
        </div>
      `,
    )
    .join('')
}

async function refreshOperationalViews() {
  await Promise.all([loadDashboard(), loadLeads(), loadPipeline(), loadTasks(), loadAnalytics()])
  if (state.selectedLeadId) {
    await loadSummary(state.selectedLeadId)
    await loadNotes()
  }
}

async function createLead(form) {
  const formData = new FormData(form)
  const payload = Object.fromEntries(formData.entries())
  payload.value = Number(payload.value || 0)
  const lead = await request('/api/leads', { method: 'POST', body: JSON.stringify(payload) })
  state.selectedLeadId = lead.id
  await refreshOperationalViews()
  form.reset()
  leadFormFeedback.textContent = `Lead ${lead.name} criado com sucesso.`
}

async function moveLeadStage(leadId, stageId) {
  await request(`/api/leads/${leadId}/stage`, { method: 'PATCH', body: JSON.stringify({ stageId }) })
  await refreshOperationalViews()
}

async function createTask(form) {
  const formData = new FormData(form)
  const payload = Object.fromEntries(formData.entries())
  const task = await request('/api/tasks', { method: 'POST', body: JSON.stringify(payload) })
  await loadTasks()
  form.reset()
  taskFormFeedback.textContent = `Task ${task.title} criada com sucesso.`
}

async function completeTask(taskId) {
  await request(`/api/tasks/${taskId}/complete`, { method: 'POST', body: '{}' })
  await loadTasks()
  await loadDashboard()
}

async function createNote(form) {
  if (!state.selectedLeadId) throw new Error('Selecione um lead antes de registrar uma nota.')
  const formData = new FormData(form)
  const payload = Object.fromEntries(formData.entries())
  await request(`/api/leads/${state.selectedLeadId}/notes`, { method: 'POST', body: JSON.stringify(payload) })
  await loadNotes()
  form.reset()
  noteFormFeedback.textContent = 'Nota adicionada com sucesso.'
}

function attachEvents() {
  navItems.forEach((item) => item.addEventListener('click', () => setView(item.dataset.view)))
  searchInput.addEventListener('input', async (event) => {
    state.search = event.target.value
    await loadLeads()
  })
  ownerFilter.addEventListener('change', async (event) => {
    state.owner = event.target.value
    await loadLeads()
  })
  temperatureFilter.addEventListener('change', async (event) => {
    state.temperature = event.target.value
    await loadLeads()
  })
  leadForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    try {
      await createLead(event.currentTarget)
      setView('leads')
    } catch (error) {
      leadFormFeedback.textContent = error.message
    }
  })
  taskForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    try {
      await createTask(event.currentTarget)
    } catch (error) {
      taskFormFeedback.textContent = error.message
    }
  })
  noteForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    try {
      await createNote(event.currentTarget)
    } catch (error) {
      noteFormFeedback.textContent = error.message
    }
  })
  document.body.addEventListener('click', async (event) => {
    const leadButton = event.target.closest('[data-select-lead]')
    if (leadButton) {
      state.selectedLeadId = leadButton.dataset.selectLead
      await loadSummary(state.selectedLeadId)
      await loadNotes()
      setView('dashboard')
      return
    }

    const completeButton = event.target.closest('[data-complete-task]')
    if (completeButton) {
      await completeTask(completeButton.dataset.completeTask)
    }
  })
  document.body.addEventListener('change', async (event) => {
    const select = event.target.closest('[data-stage-select]')
    if (!select) return
    try {
      await moveLeadStage(select.dataset.stageSelect, select.value)
      setView('pipeline')
    } catch (error) {
      leadFormFeedback.textContent = error.message
    }
  })
}

async function init() {
  try {
    await loadStages()
    await Promise.all([loadDashboard(), loadLeads(), loadPipeline(), loadTasks(), loadAnalytics()])
    if (state.selectedLeadId) {
      await loadSummary(state.selectedLeadId)
      await loadNotes()
    }
    attachEvents()
  } catch (error) {
    aiSummary.innerHTML = `<div class="stack-item"><p>Falha ao carregar a demo: ${error.message}</p></div>`
  }
}

init()
