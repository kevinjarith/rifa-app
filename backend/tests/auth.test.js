const { buildAgent, loginAs } = require('./helpers/testServer');
const { createUser } = require('./helpers/factories');
const { prisma } = require('../src/db/prisma');

describe('Autenticación', () => {
  test('login exitoso con credenciales correctas', async () => {
    const user = await createUser({ role: 'ADMIN' });
    const agent = buildAgent();
    const res = await agent.postJson('/api/auth/login', { email: user.email, password: user.plainPassword });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(user.email);
  });

  test('login falla con contraseña incorrecta, mensaje genérico', async () => {
    const user = await createUser();
    const agent = buildAgent();
    const res = await agent.postJson('/api/auth/login', { email: user.email, password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Correo o contraseña incorrectos');
  });

  test('login falla con correo inexistente, mismo mensaje genérico', async () => {
    const agent = buildAgent();
    const res = await agent.postJson('/api/auth/login', { email: 'nadie@example.com', password: 'whatever123' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Correo o contraseña incorrectos');
  });

  test('un usuario desactivado no puede iniciar sesión', async () => {
    const user = await createUser({ active: false });
    const agent = buildAgent();
    const res = await agent.postJson('/api/auth/login', { email: user.email, password: user.plainPassword });
    expect(res.status).toBe(401);
  });

  test('la sesión persiste entre requests y /auth/me responde al usuario autenticado', async () => {
    const user = await createUser({ role: 'VENDEDOR' });
    const agent = buildAgent();
    await loginAs(agent, user);
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('VENDEDOR');
  });

  test('desactivar un usuario invalida su sesión en la siguiente petición', async () => {
    const user = await createUser({ role: 'VENDEDOR' });
    const agent = buildAgent();
    await loginAs(agent, user);

    await prisma.user.update({ where: { id: user.id }, data: { active: false } });

    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('logout destruye la sesión', async () => {
    const user = await createUser();
    const agent = buildAgent();
    await loginAs(agent, user);
    await agent.postJson('/api/auth/logout', {});
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('sin sesión, las rutas protegidas devuelven 401', async () => {
    const agent = buildAgent();
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
