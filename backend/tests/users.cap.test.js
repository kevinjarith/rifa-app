const { buildAgent, loginAs } = require('./helpers/testServer');
const { createUser } = require('./helpers/factories');

describe('Límite de 7 usuarios', () => {
  test('se pueden crear usuarios hasta llegar a 7, el octavo es rechazado', async () => {
    const superAdmin = await createUser({ role: 'SUPER_ADMIN' });
    const agent = buildAgent();
    await loginAs(agent, superAdmin);

    // superAdmin ya cuenta como 1 de los 7.
    for (let i = 0; i < 5; i += 1) {
      const res = await agent.postJson('/api/users', {
        name: `Vendedor ${i}`,
        email: `vendedor${i}_${Date.now()}@example.com`,
        password: 'Password123!',
        role: 'VENDEDOR',
      });
      expect(res.status).toBe(201);
    }

    // Esto completa el 7mo usuario.
    const seventh = await agent.postJson('/api/users', {
      name: 'Usuario 7',
      email: `usuario7_${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'VENDEDOR',
    });
    expect(seventh.status).toBe(201);

    const eighth = await agent.postJson('/api/users', {
      name: 'Usuario 8',
      email: `usuario8_${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'VENDEDOR',
    });
    expect(eighth.status).toBe(409);
    expect(eighth.body.error.code).toBe('USER_LIMIT_REACHED');

    const list = await agent.get('/api/users');
    expect(list.body.users).toHaveLength(7);
  });

  test('un VENDEDOR no puede crear usuarios', async () => {
    const vendedor = await createUser({ role: 'VENDEDOR' });
    const agent = buildAgent();
    await loginAs(agent, vendedor);
    const res = await agent.postJson('/api/users', {
      name: 'Nuevo',
      email: `nuevo_${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'VENDEDOR',
    });
    expect(res.status).toBe(403);
  });

  test('un ADMIN no puede crear usuarios (solo SUPER_ADMIN)', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const agent = buildAgent();
    await loginAs(agent, admin);
    const res = await agent.postJson('/api/users', {
      name: 'Nuevo',
      email: `nuevo2_${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'VENDEDOR',
    });
    expect(res.status).toBe(403);
  });
});
