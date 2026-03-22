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
    classList: {
      toggle() {},
      add() {},
      remove() {}
    },
    addEventListener() {},
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
  assert.match(harness.fetchCalls[1].url, /\/api\/workspaces/)
  assert.match(harness.fetchCalls[2].url, /\/api\/stages/)
  assert.match(harness.fetchCalls[3].url, /\/api\/team/)
  assert.equal(harness.elements['#workspace-name'].textContent, 'High Ticket Labs')
}

async function testEscapesUserControlledHtmlInRenderedViews() {
  const harness = createHarness()
  harness.setFetchQueue([
    { ok: true, body: { items: [{ id: 'user-1', name: '<img src=x onerror=1>', email: 'carla@example.com', role: 'admin', status: 'active' }] } },
    { ok: true, body: { items: [{ id: 'lead-1', name: '<script>alert(1)</script>', company: 'ACME <b>bold</b>', source: 'Web', stageId: 'entry', owner: 'Carla', temperature: 'hot', nextAction: 'Hoje', value: 1000, status: 'Novo lead' }], meta: { total: 1, limit: null, offset: 0 } } },
    { ok: true, body: { name: 'Lead <img>', company: 'Empresa <svg>', text: '<script>boom</script>', status: 'Novo', objections: ['<b>obj</b>'], signals: ['<i>signal</i>'], nextBestAction: '<span>next</span>', suggestedReply: '<img src=x>' } },
    { ok: true, body: { items: [{ eventType: 'note_added', payload: { body: '<script>x</script>' }, createdAt: '2026-01-01T00:00:00Z' }] } },
    { ok: true, body: { items: [{ author: 'Carla', body: '<img src=x onerror=1>', created_at: '2026-01-01T00:00:00Z' }] } }
  ])

  await harness.call('state.stages = [{ id: "entry", name: "Entrada" }]')
  await harness.call('loadTeam()')
  await harness.call('loadLeads()')
  await harness.call('state.selectedLeadId = "lead-1"')
  await harness.call('loadSummary("lead-1")')
  await harness.call('loadTimeline()')
  await harness.call('loadNotes()')

  assert.match(harness.elements['#team-list'].innerHTML, /&lt;img src=x onerror=1&gt;/)
  assert.doesNotMatch(harness.elements['#team-list'].innerHTML, /<img src=x onerror=1>/)
  assert.match(harness.elements['#leads-table-body'].innerHTML, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
  assert.match(harness.elements['#ai-summary'].innerHTML, /&lt;script&gt;boom&lt;\/script&gt;/)
  assert.match(harness.elements['#timeline-list'].innerHTML, /&lt;script&gt;x&lt;\/script&gt;/)
  assert.match(harness.elements['#notes-list'].innerHTML, /&lt;img src=x onerror=1&gt;/)
}

Promise.resolve()
  .then(testInvalidSavedTokenClearsAuthState)
  .then(testLogoutClearsLocalStateEvenWhenApiFails)
  .then(testInviteOnlyLoginSkipsProtectedBoot)
  .then(testActiveWorkspaceLoginBootstrapsAppData)
  .then(testEscapesUserControlledHtmlInRenderedViews)
  .then(() => {
    console.log('app.js frontend checks passed')
  })
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
