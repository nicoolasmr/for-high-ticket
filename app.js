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
const kpiGrid = document.querySelector('#kpi-grid')
const priorityList = document.querySelector('#priority-list')
const priorityPill = document.querySelector('#priority-pill')
const aiSummary = document.querySelector('#ai-summary')
const leadsTableBody = document.querySelector('#leads-table-body')
const pipelineBoard = document.querySelector('#pipeline-board')
const taskList = document.querySelector('#task-list')
const onboardingList = document.querySelector('#onboarding-list')
const insightsList = document.querySelector('#insights-list')
const sourcePerformance = document.querySelector('#source-performance')

async function fetchJson(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Request failed: ${response.status}`)
  return response.json()
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

async function loadDashboard() {
  const dashboard = await fetchJson('/api/dashboard')
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
  const payload = await fetchJson(`/api/leads?${params.toString()}`)
  state.leads = payload.items
  if (!state.selectedLeadId && state.leads[0]) state.selectedLeadId = state.leads[0].id
  renderFilters()
  leadsTableBody.innerHTML = state.leads
    .map(
      (lead) => `
        <tr data-select-lead="${lead.id}">
          <td>
            <strong>${lead.name}</strong>
            <div class="table-sub">${lead.company} · ${lead.source}</div>
          </td>
          <td>${lead.stageName}</td>
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
  const lead = await fetchJson(`/api/leads/${leadId}/summary`)
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

async function loadPipeline() {
  const payload = await fetchJson('/api/pipeline')
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
  const payload = await fetchJson('/api/tasks')
  taskList.innerHTML = payload.tasks
    .map(
      (task) => `
        <div class="stack-item">
          <div>
            <strong>${task.due_time}</strong>
            <p>${task.title}</p>
          </div>
          <span class="pill ${task.priority === 'urgent' ? 'pill-danger' : 'pill-neutral'}">${task.priority}</span>
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
  const payload = await fetchJson('/api/analytics')
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
  document.body.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-select-lead]')
    if (!button) return
    state.selectedLeadId = button.dataset.selectLead
    await loadSummary(state.selectedLeadId)
    setView('dashboard')
  })
}

async function init() {
  try {
    await Promise.all([loadDashboard(), loadLeads(), loadPipeline(), loadTasks(), loadAnalytics()])
    if (state.selectedLeadId) await loadSummary(state.selectedLeadId)
    attachEvents()
  } catch (error) {
    aiSummary.innerHTML = `<div class="stack-item"><p>Falha ao carregar a demo: ${error.message}</p></div>`
  }
}

init()
