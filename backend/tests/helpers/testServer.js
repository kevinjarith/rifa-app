const supertest = require('supertest');
const { createApp } = require('../../src/app');

// Thin wrappers that always attach the X-Requested-With header the app's
// csrfLite middleware requires on every mutating request — avoids repeating
// `.set(...)` in every single test.
function buildAgent() {
  const app = createApp();
  const agent = supertest.agent(app);
  agent.postJson = (path, body) => agent.post(path).set('X-Requested-With', 'fetch').send(body);
  agent.patchJson = (path, body) => agent.patch(path).set('X-Requested-With', 'fetch').send(body);
  return agent;
}

async function loginAs(agent, user) {
  const res = await agent.postJson('/api/auth/login', { email: user.email, password: user.plainPassword });
  if (res.status !== 200) {
    throw new Error(`Login falló para ${user.email}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return agent;
}

module.exports = { buildAgent, loginAs };
