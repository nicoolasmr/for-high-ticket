const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

function createElement(overrides = {}) {
  return {
    innerHTML: '',
    textContent: '',
    value: '',
    dataset: {},
    listeners: {},
    classList: {
      toggle() {},
      add() {},
      remove() {}
    },
    addEventListener(type, handler) {
      this.listeners[type] = handler
    },
    reset() {},
    closest() { return this },
    ...overrides
  }
}

function createHarness({ initialStorage = {}, initialFetchQueue = [] } = {}) {
  const elements = {
    '#auth-shell': createElement(),
    '#app-shell': createElement(),
    '#view-title': createElement(),
    '#login-form': createElement(),
    '#login-feedback': createElement(),
    '#invite-panel': createElement(),
    '#invite-list': createElement(),
    '#logout-button': createElement(),
    '#lead-search': createElement(),
    '#owner-filter': createElement(),
    '#temperature-filter': createElement(),
    '#status-filter': createElement(),
    '#workspace-switcher': createElement(),
    '#workspace-name': createElement(),
    '#workspace-meta': createElement(),
    '#lead-owner': createElement(),
    '#lead-form': createElement(),
    '#note-form': createElement(),
    '#task-form': createElement(),
    '#team-form': createElement({ closest() { return createElement() } }),
    '#mark-won-button': createElement(),
    '#mark-lost-button': createElement(),
    '#lead-form-feedback': createElement(),
    '#note-form-feedback': createElement(),
    '#task-form-feedback': createElement(),
    '#team-form-feedback': createElement(),
    '#completed-count-pill': createElement(),
    '#kpi-grid': createElement(),
    '#priority-list': createElement(),
    '#priority-pill': createElement(),
    '#ai-summary': createElement(),
    '#timeline-list': createElement(),
    '#notes-list': createElement(),
    '#team-list': createElement(),
    '#leads-table-body': createElement(),
    '#pipeline-board': createElement(),
    '#task-list': createElement(),
    '#onboarding-list': createElement(),
    '#insights-list': createElement(),
    '#source-performance': createElement(),
    '#owner-performance': createElement(),
    '#status-performance': createElement()
  }

  const navItems = [createElement({ dataset: { view: 'dashboard' } })]
  const viewStacks = [createElement({ id: 'dashboard-view' })]
  const body = createElement()
  const fetchCalls = []
  let fetchQueue = initialFetchQueue.slice()
  const storage = new Map(Object.entries(initialStorage))

  const context = {
    console,
    URL,
    Intl,
    Date,
    setTimeout,
    clearTimeout,
    window: { location: { origin: 'http://127.0.0.1:3000' }, prompt: () => null },
    document: {
      body,
      querySelector(selector) {
        return elements[selector] || createElement()
      },
      querySelectorAll(selector) {
        if (selector === '.nav-item') return navItems
        if (selector === '.view-stack') return viewStacks
        return []
      }
    },
    localStorage: {
      getItem(key) { return storage.get(key) || '' },
      setItem(key, value) { storage.set(key, String(value)) },
      removeItem(key) { storage.delete(key) }
    },
    FormData: class FormData {
      constructor(form) { this.form = form }
      entries() { return Object.entries(this.form.fields || {}) }
    },
    fetch: async (url, options = {}) => {
      fetchCalls.push({ url, options })
      const next = fetchQueue.shift()
      assert.ok(next, `Unexpected fetch: ${url}`)
      return {
        ok: next.ok,
        status: next.status || (next.ok ? 200 : 500),
        async json() { return next.body }
      }
    }
  }
  context.global = context
  context.globalThis = context

  vm.createContext(context)
  const script = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8')
  vm.runInContext(script, context)

  return {
    context,
    elements,
    fetchCalls,
    setFetchQueue(queue) {
      fetchQueue = queue.slice()
    },
    async call(expression) {
      return vm.runInContext(expression, context)
    },
    async settle() {
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }
}

async function seedAuthenticatedWorkspace(harness, { workspaceId = 'ws-default', workspaceName = 'High Ticket Labs', role = 'admin' } = {}) {
  await harness.call(`
    state.authToken = 'active-token'
    state.user = { id: 'user-1', name: 'Carla', email: 'carla@highticketlabs.com' }
    state.workspaceId = '${workspaceId}'
    state.workspaces = [
      { id: 'ws-default', name: 'High Ticket Labs', role: '${role}' },
      { id: 'ws-clinics', name: 'Clínicas Premium', role: '${role}' }
    ]
    state.team = [{ id: 'user-1', name: 'Carla', email: 'carla@highticketlabs.com', role: '${role}', status: 'active' }]
    renderFilters()
  `)
  assert.equal(harness.elements['#workspace-name'].textContent, workspaceName)
}

async function testInvalidSavedTokenClearsAuthState() {
  const harness = createHarness({
    initialStorage: { 'revenue-os-demo-token': 'stale-token' },
    initialFetchQueue: [{ ok: false, status: 401, body: { error: 'Unauthorized' } }]
  })

  await harness.settle()

  assert.equal(harness.fetchCalls.length, 1)
  assert.match(harness.fetchCalls[0].url, /\/api\/auth\/me/)
  assert.equal(harness.context.localStorage.getItem('revenue-os-demo-token'), '')
  assert.equal(harness.elements['#login-feedback'].textContent, 'Faça login com uma credencial demo para abrir o app.')
  assert.equal(harness.elements['#workspace-name'].textContent, 'Sem workspace ativo')
}

async function testLogoutClearsLocalStateEvenWhenApiFails() {
  const harness = createHarness({
    initialStorage: { 'revenue-os-demo-token': 'stale-token' }
  })
  await harness.call(`
    state.authToken = 'stale-token'
    state.user = { id: 'user-1' }
    state.workspaces = [{ id: 'ws-default', name: 'High Ticket Labs', role: 'admin' }]
    state.invites = [{ id: 'ws-default', name: 'High Ticket Labs', role: 'rep', status: 'invited' }]
    workspaceName.textContent = 'High Ticket Labs'
  `)
  harness.setFetchQueue([{ ok: false, status: 401, body: { error: 'Unauthorized' } }])

  await harness.call('logout()')

  assert.equal(harness.context.localStorage.getItem('revenue-os-demo-token'), '')
  assert.equal(harness.elements['#workspace-name'].textContent, 'Sem workspace ativo')
  assert.equal(harness.elements['#invite-list'].innerHTML, '')
}

async function testInviteOnlyLoginSkipsProtectedBoot() {
  const harness = createHarness()
  harness.setFetchQueue([
    {
      ok: true,
      body: {
        token: 'invite-token',
        user: { id: 'user-4', name: 'Bia', email: 'bia@invitee.com' },
        workspaces: [],
        invites: [{ id: 'ws-default', name: 'High Ticket Labs', role: 'rep', status: 'invited' }]
      }
    }
  ])

  harness.elements['#login-form'].fields = { email: 'bia@invitee.com', password: 'demo123' }
  await harness.call('login(document.querySelector("#login-form"))')

  assert.equal(harness.fetchCalls.length, 1)
  assert.match(harness.fetchCalls[0].url, /\/api\/auth\/login/)
  assert.equal(harness.elements['#login-feedback'].textContent, 'Você tem convites pendentes. Aceite um convite para entrar no app.')
  assert.equal(harness.elements['#workspace-name'].textContent, 'Sem workspace ativo')
  assert.equal(harness.elements['#completed-count-pill'].textContent, '0 concluídas')
}

async function testActiveWorkspaceLoginBootstrapsAppData() {
  const harness = createHarness()
  harness.setFetchQueue([
    {
      ok: true,
      body: {
        token: 'active-token',
        user: { id: 'user-1', name: 'Carla', email: 'carla@highticketlabs.com' },
        workspaces: [{ id: 'ws-default', name: 'High Ticket Labs', role: 'admin' }],
        invites: []
      }
    },
    { ok: true, body: { items: [{ id: 'ws-default', name: 'High Ticket Labs', role: 'admin' }] } },
    { ok: true, body: { items: [{ id: 'entry', name: 'Entrada' }] } },
    { ok: true, body: { items: [{ id: 'user-1', name: 'Carla', email: 'carla@highticketlabs.com', role: 'admin', status: 'active' }] } },
    { ok: true, body: { kpis: [], priorities: [] } },
    { ok: true, body: { items: [] } },
    { ok: true, body: { stages: [] } },
    { ok: true, body: { tasks: [], onboarding: [], completedCount: 0 } },
    { ok: true, body: { insights: [], sources: [], owners: [], statuses: [] } }
  ])

  harness.elements['#login-form'].fields = { email: 'carla@highticketlabs.com', password: 'demo123' }
  await harness.call('login(document.querySelector("#login-form"))')

  assert.equal(harness.fetchCalls.length, 9)
  assert.match(harness.fetchCalls[1].url, /\/api\/workspaces\?workspace=ws-default/)
  assert.match(harness.fetchCalls[2].url, /\/api\/stages\?workspace=ws-default/)
  assert.match(harness.fetchCalls[3].url, /\/api\/team\?workspace=ws-default/)
  assert.equal(harness.elements['#workspace-name'].textContent, 'High Ticket Labs')
}

async function testWorkspaceSwitcherRefetchesViews() {
  const harness = createHarness()
  await seedAuthenticatedWorkspace(harness)
  harness.setFetchQueue([
    { ok: true, body: { kpis: [{ label: 'Leads', value: 3, detail: 'ws-clinics' }], priorities: [] } },
    { ok: true, body: { items: [{ id: 'lead-3', name: 'Clínica Lumina', company: 'Clínica Lumina', source: 'Google', stageId: 'proposal', owner: 'Carla', temperature: 'hot', nextAction: 'Call final', value: 32000, status: 'proposta enviada' }] } },
    { ok: true, body: { stages: [{ name: 'Proposta', leads: [{ id: 'lead-3', name: 'Clínica Lumina', company: 'Clínica Lumina', value: 32000, owner: 'Carla' }] }] } },
    { ok: true, body: { tasks: [{ id: 'task-9', due_time: '17:00', title: 'Confirmar call', lead_id: 'lead-3', priority: 'medium' }], onboarding: [], completedCount: 1 } },
    { ok: true, status: 403, body: { error: 'Analytics restrito' } },
    { ok: true, body: { items: [{ id: 'user-1', name: 'Carla', email: 'carla@highticketlabs.com', role: 'admin', status: 'active' }] } },
    { ok: true, body: { name: 'Clínica Lumina', company: 'Clínica Lumina', text: 'Resumo', status: 'proposta enviada', lostReason: null, objections: [], signals: [], nextBestAction: 'Fechar', suggestedReply: 'Vamos fechar' } },
    { ok: true, body: { items: [] } },
    { ok: true, body: { items: [] } }
  ])

  await harness.call(`
    document.querySelector('#workspace-switcher').listeners.change({ target: { value: 'ws-clinics' } })
  `)

  assert.equal(harness.fetchCalls.length, 9)
  assert.deepEqual(
    harness.fetchCalls.map(({ url }) => url),
    [
      '/api/dashboard?workspace=ws-clinics',
      '/api/leads?search=&owner=all&temperature=all&status=all&workspace=ws-clinics',
      '/api/pipeline?workspace=ws-clinics',
      '/api/tasks?workspace=ws-clinics',
      '/api/analytics?workspace=ws-clinics',
      '/api/team?workspace=ws-clinics',
      '/api/leads/lead-3/summary?workspace=ws-clinics',
      '/api/leads/lead-3/notes?workspace=ws-clinics',
      '/api/leads/lead-3/timeline?workspace=ws-clinics'
    ]
  )
  assert.equal(harness.elements['#workspace-name'].textContent, 'Clínicas Premium')
  assert.match(harness.elements['#leads-table-body'].innerHTML, /Clínica Lumina/)
  assert.match(harness.elements['#task-list'].innerHTML, /Confirmar call/)
  assert.match(harness.elements['#insights-list'].innerHTML, /Acesso restrito/)
}

async function testCreateLeadUpdatesSelectedLeadId() {
  const harness = createHarness()
  await seedAuthenticatedWorkspace(harness)
  harness.elements['#lead-form'].fields = { name: 'Novo Lead', company: 'Acme', source: 'Indicação', stageId: 'entry', owner: 'Carla', temperature: 'warm', nextAction: 'Enviar proposta', value: '15000', status: 'novo' }
  harness.setFetchQueue([
    { ok: true, body: { id: 'lead-new', name: 'Novo Lead' } },
    { ok: true, body: { kpis: [], priorities: [] } },
    { ok: true, body: { items: [{ id: 'lead-new', name: 'Novo Lead', company: 'Acme', source: 'Indicação', stageId: 'entry', owner: 'Carla', temperature: 'warm', nextAction: 'Enviar proposta', value: 15000, status: 'novo' }] } },
    { ok: true, body: { stages: [] } },
    { ok: true, body: { tasks: [], onboarding: [], completedCount: 0 } },
    { ok: true, body: { insights: ['Lead criado'], sources: [], owners: [], statuses: [] } },
    { ok: true, body: { items: [{ id: 'user-1', name: 'Carla', email: 'carla@highticketlabs.com', role: 'admin', status: 'active' }] } },
    { ok: true, body: { name: 'Novo Lead', company: 'Acme', text: 'Resumo novo', status: 'novo', lostReason: null, objections: [], signals: [], nextBestAction: 'Avançar', suggestedReply: 'Mensagem' } },
    { ok: true, body: { items: [] } },
    { ok: true, body: { items: [] } }
  ])

  await harness.call('createLead(document.querySelector("#lead-form"))')

  assert.equal(await harness.call('state.selectedLeadId'), 'lead-new')
  assert.equal(harness.fetchCalls.length, 10)
  assert.equal(harness.fetchCalls[0].url, '/api/leads?workspace=ws-default')
  assert.equal(JSON.parse(harness.fetchCalls[0].options.body).workspaceId, 'ws-default')
  assert.equal(harness.elements['#lead-form-feedback'].textContent, 'Lead Novo Lead criado com sucesso.')
  assert.match(harness.elements['#leads-table-body'].innerHTML, /Novo Lead/)
}

async function testCreateTaskUpdatesIndicators() {
  const harness = createHarness()
  await seedAuthenticatedWorkspace(harness)
  harness.elements['#task-form'].fields = { title: 'Ligar lead VIP', due_time: '10:00', priority: 'urgent', lead_id: 'lead-1' }
  harness.setFetchQueue([
    { ok: true, body: { id: 'task-10', title: 'Ligar lead VIP' } },
    { ok: true, body: { tasks: [{ id: 'task-10', due_time: '10:00', title: 'Ligar lead VIP', lead_id: 'lead-1', priority: 'urgent' }], onboarding: [], completedCount: 2 } }
  ])

  await harness.call('createTask(document.querySelector("#task-form"))')

  assert.equal(harness.fetchCalls.length, 2)
  assert.equal(harness.fetchCalls[0].url, '/api/tasks?workspace=ws-default')
  assert.equal(JSON.parse(harness.fetchCalls[0].options.body).workspaceId, 'ws-default')
  assert.equal(harness.elements['#completed-count-pill'].textContent, '2 concluídas')
  assert.match(harness.elements['#task-list'].innerHTML, /Ligar lead VIP/)
  assert.equal(harness.elements['#task-form-feedback'].textContent, 'Task Ligar lead VIP criada com sucesso.')
}

async function testAnalytics403ShowsRestrictedState() {
  const harness = createHarness()
  await seedAuthenticatedWorkspace(harness)
  harness.setFetchQueue([{ ok: false, status: 403, body: { error: 'Forbidden' } }])

  await harness.call('loadAnalytics()')

  assert.equal(harness.fetchCalls.length, 1)
  assert.equal(harness.fetchCalls[0].url, '/api/analytics?workspace=ws-default')
  assert.match(harness.elements['#insights-list'].innerHTML, /Acesso restrito/)
  assert.match(harness.elements['#insights-list'].innerHTML, /Forbidden/)
}

async function testAcceptInviteReloadsSessionAndAppData() {
  const harness = createHarness()
  harness.setFetchQueue([
    { ok: true, body: { accepted: true } },
    { ok: true, body: { user: { id: 'user-4', name: 'Bia', email: 'bia@invitee.com' }, workspaces: [{ id: 'ws-default', name: 'High Ticket Labs', role: 'rep' }], invites: [] } },
    { ok: true, body: { items: [{ id: 'ws-default', name: 'High Ticket Labs', role: 'rep' }] } },
    { ok: true, body: { items: [{ id: 'entry', name: 'Entrada' }] } },
    { ok: true, body: { items: [{ id: 'user-4', name: 'Bia', email: 'bia@invitee.com', role: 'rep', status: 'active' }] } },
    { ok: true, body: { kpis: [], priorities: [] } },
    { ok: true, body: { items: [{ id: 'lead-1', name: 'Lead Aceito', company: 'Acme', source: 'Google', stageId: 'entry', owner: 'Bia', temperature: 'warm', nextAction: 'Atender', value: 10000, status: 'novo' }] } },
    { ok: true, body: { stages: [] } },
    { ok: true, body: { tasks: [], onboarding: [], completedCount: 0 } },
    { ok: false, status: 403, body: { error: 'Forbidden' } },
    { ok: true, body: { name: 'Lead Aceito', company: 'Acme', text: 'Resumo', status: 'novo', lostReason: null, objections: [], signals: [], nextBestAction: 'Atender', suggestedReply: 'Oi' } },
    { ok: true, body: { items: [] } },
    { ok: true, body: { items: [] } }
  ])

  await harness.call('acceptInvite("ws-default")')

  assert.equal(harness.fetchCalls.length, 13)
  assert.deepEqual(
    harness.fetchCalls.slice(0, 2).map(({ url }) => url),
    [
      '/api/team/accept-invite?workspace=ws-default',
      '/api/auth/me?workspace=ws-default'
    ]
  )
  assert.equal(harness.elements['#workspace-name'].textContent, 'High Ticket Labs')
  assert.match(harness.elements['#leads-table-body'].innerHTML, /Lead Aceito/)
  assert.match(harness.elements['#login-feedback'].textContent, /^$/)
}

async function testRemovingSelectedLeadViaFiltersUpdatesSelection() {
  const harness = createHarness()
  await seedAuthenticatedWorkspace(harness)
  await harness.call(`
    state.selectedLeadId = 'lead-1'
    state.owner = 'Bia'
    aiSummary.innerHTML = '<p>Resumo antigo</p>'
    notesList.innerHTML = '<p>Notas antigas</p>'
    timelineList.innerHTML = '<p>Timeline antiga</p>'
  `)
  harness.setFetchQueue([
    { ok: true, body: { items: [{ id: 'lead-2', name: 'Lead Filtrado', company: 'Filtro SA', source: 'Referral', stageId: 'entry', owner: 'Bia', temperature: 'hot', nextAction: 'Follow-up', value: 5000, status: 'qualificado' }] } }
  ])

  await harness.call('loadLeads()')

  assert.equal(harness.fetchCalls.length, 1)
  assert.equal(harness.fetchCalls[0].url, '/api/leads?search=&owner=Bia&temperature=all&status=all&workspace=ws-default')
  assert.equal(await harness.call('state.selectedLeadId'), 'lead-2')
  assert.match(harness.elements['#leads-table-body'].innerHTML, /Lead Filtrado/)
}

Promise.resolve()
  .then(testInvalidSavedTokenClearsAuthState)
  .then(testLogoutClearsLocalStateEvenWhenApiFails)
  .then(testInviteOnlyLoginSkipsProtectedBoot)
  .then(testActiveWorkspaceLoginBootstrapsAppData)
  .then(testWorkspaceSwitcherRefetchesViews)
  .then(testCreateLeadUpdatesSelectedLeadId)
  .then(testCreateTaskUpdatesIndicators)
  .then(testAnalytics403ShowsRestrictedState)
  .then(testAcceptInviteReloadsSessionAndAppData)
  .then(testRemovingSelectedLeadViaFiltersUpdatesSelection)
  .then(() => {
    console.log('app.js frontend checks passed')
  })
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
