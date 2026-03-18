import { insights, leads, onboardingSteps, stages, tasks } from './data.js'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const state = {
  activeView: 'dashboard',
  search: '',
  owner: 'all',
  temperature: 'all',
  selectedLeadId: leads[0]?.id ?? null,
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

function getFilteredLeads() {
  return leads.filter((lead) => {
    const matchesSearch = [lead.name, lead.company, lead.source].join(' ').toLowerCase().includes(state.search.toLowerCase())
    const matchesOwner = state.owner === 'all' || lead.owner === state.owner
    const matchesTemperature = state.temperature === 'all' || lead.temperature === state.temperature
    return matchesSearch && matchesOwner && matchesTemperature
  })
}

function getKpis() {
  const totalValue = leads.reduce((sum, lead) => sum + lead.value, 0)
  const hotLeads = leads.filter((lead) => lead.temperature === 'hot').length
  const riskyLeads = leads.filter((lead) => lead.lastReplyHours >= 18).length
  const overdueTasks = tasks.filter((task) => ['urgent', 'high'].includes(task.priority)).length

  return [
    { label: 'Leads no pipeline', value: String(leads.length), detail: `${hotLeads} quentes` },
    { label: 'Receita prevista', value: currency.format(totalValue), detail: 'Somatório do pipeline' },
    { label: 'Leads em risco', value: String(riskyLeads), detail: 'Silêncio crítico ou atraso' },
    { label: 'Tasks prioritárias', value: String(overdueTasks), detail: 'Hoje' },
  ]
}

function renderKpis() {
  kpiGrid.innerHTML = getKpis()
    .map(
      (kpi) => `
        <article class="metric-card glass-card compact-card">
          <span>${kpi.label}</span>
          <strong>${kpi.value}</strong>
          <small>${kpi.detail}</small>
        </article>
      `,
    )
    .join('')
}

function renderPriorityList() {
  const risky = [...leads]
    .sort((a, b) => b.lastReplyHours - a.lastReplyHours)
    .slice(0, 3)

  priorityPill.textContent = `${risky.length} leads críticos`
  priorityList.innerHTML = risky
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

function renderSummary() {
  const lead = leads.find((item) => item.id === state.selectedLeadId) ?? leads[0]
  if (!lead) return

  aiSummary.innerHTML = `
    <div class="summary-block">
      <span class="eyebrow">${lead.name} · ${lead.company}</span>
      <p>${lead.summary.text}</p>
      <div class="summary-columns">
        <div>
          <strong>Objeções</strong>
          <ul>${lead.summary.objections.map((item) => `<li>${item}</li>`).join('')}</ul>
        </div>
        <div>
          <strong>Sinais de compra</strong>
          <ul>${lead.summary.signals.map((item) => `<li>${item}</li>`).join('')}</ul>
        </div>
      </div>
      <p><strong>Próxima melhor ação:</strong> ${lead.summary.nextBestAction}</p>
      <blockquote>${lead.summary.suggestedReply}</blockquote>
    </div>
  `
}

function renderFilters() {
  const owners = ['all', ...new Set(leads.map((lead) => lead.owner))]
  ownerFilter.innerHTML = owners.map((owner) => `<option value="${owner}">${owner === 'all' ? 'Todos os owners' : owner}</option>`).join('')
  ownerFilter.value = state.owner

  const temperatures = ['all', 'hot', 'warm', 'cold']
  temperatureFilter.innerHTML = temperatures
    .map((value) => `<option value="${value}">${value === 'all' ? 'Todas as temperaturas' : value}</option>`)
    .join('')
  temperatureFilter.value = state.temperature
}

function renderLeadsTable() {
  const filtered = getFilteredLeads()
  leadsTableBody.innerHTML = filtered
    .map(
      (lead) => `
        <tr data-select-lead="${lead.id}">
          <td>
            <strong>${lead.name}</strong>
            <div class="table-sub">${lead.company} · ${lead.source}</div>
          </td>
          <td>${stageName(lead.stage)}</td>
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

function stageName(stageId) {
  return stages.find((stage) => stage.id === stageId)?.name ?? stageId
}

function renderPipeline() {
  pipelineBoard.innerHTML = stages
    .map((stage) => {
      const stageLeads = leads.filter((lead) => lead.stage === stage.id)
      return `
        <section class="pipeline-column">
          <header>
            <h3>${stage.name}</h3>
            <span>${stageLeads.length}</span>
          </header>
          <div class="pipeline-column-body">
            ${stageLeads
              .map(
                (lead) => `
                  <button class="pipeline-card" data-select-lead="${lead.id}">
                    <strong>${lead.name}</strong>
                    <p>${lead.company}</p>
                    <small>${currency.format(lead.value)} · ${lead.owner}</small>
                  </button>
                `,
              )
              .join('')}
          </div>
        </section>
      `
    })
    .join('')
}

function renderTasks() {
  taskList.innerHTML = tasks
    .map(
      (task) => `
        <div class="stack-item">
          <div>
            <strong>${task.time}</strong>
            <p>${task.title}</p>
          </div>
          <span class="pill ${task.priority === 'urgent' ? 'pill-danger' : 'pill-neutral'}">${task.priority}</span>
        </div>
      `,
    )
    .join('')

  onboardingList.innerHTML = onboardingSteps
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

function renderAnalytics() {
  insightsList.innerHTML = insights
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

  const bySource = Object.values(
    leads.reduce((acc, lead) => {
      acc[lead.source] ??= { source: lead.source, count: 0, revenue: 0 }
      acc[lead.source].count += 1
      acc[lead.source].revenue += lead.value
      return acc
    }, {}),
  )

  sourcePerformance.innerHTML = bySource
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

function setView(view) {
  state.activeView = view
  viewTitle.textContent = titleByView[view]
  navItems.forEach((item) => item.classList.toggle('active', item.dataset.view === view))
  document.querySelectorAll('.view-stack').forEach((section) => {
    section.classList.toggle('hidden', section.id !== `${view}-view`)
  })
}

function attachEvents() {
  navItems.forEach((item) => item.addEventListener('click', () => setView(item.dataset.view)))
  searchInput.addEventListener('input', (event) => {
    state.search = event.target.value
    renderLeadsTable()
  })
  ownerFilter.addEventListener('change', (event) => {
    state.owner = event.target.value
    renderLeadsTable()
  })
  temperatureFilter.addEventListener('change', (event) => {
    state.temperature = event.target.value
    renderLeadsTable()
  })
  document.body.addEventListener('click', (event) => {
    const button = event.target.closest('[data-select-lead]')
    if (!button) return
    state.selectedLeadId = button.dataset.selectLead
    renderSummary()
    setView('dashboard')
  })
}

function init() {
  renderKpis()
  renderPriorityList()
  renderSummary()
  renderFilters()
  renderLeadsTable()
  renderPipeline()
  renderTasks()
  renderAnalytics()
  attachEvents()
}

init()
