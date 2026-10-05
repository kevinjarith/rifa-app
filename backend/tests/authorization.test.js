const { buildAgent, loginAs } = require('./helpers/testServer');
const { createUser, createRaffleWithTickets } = require('./helpers/factories');

describe('Autorización: manipulación directa de requests sin pasar por la UI', () => {
  let raffle;
  let vendedorAgent;

  beforeEach(async () => {
    raffle = await createRaffleWithTickets();
    const vendedor = await createUser({ role: 'VENDEDOR' });
    vendedorAgent = buildAgent();
    await loginAs(vendedorAgent, vendedor);
  });

  test('VENDEDOR golpeando /block directamente recibe 403, aunque el botón esté oculto en la UI', async () => {
    const res = await vendedorAgent.postJson('/api/tickets/600/block', { raffleId: raffle.id });
    expect(res.status).toBe(403);
  });

  test('VENDEDOR golpeando /unblock directamente recibe 403', async () => {
    const res = await vendedorAgent.postJson('/api/tickets/600/unblock', { raffleId: raffle.id });
    expect(res.status).toBe(403);
  });

  test('VENDEDOR golpeando /unsell directamente recibe 403', async () => {
    const res = await vendedorAgent.postJson('/api/tickets/600/unsell', { raffleId: raffle.id, reason: 'x' });
    expect(res.status).toBe(403);
  });

  test('VENDEDOR golpeando POST /users directamente recibe 403', async () => {
    const res = await vendedorAgent.postJson('/api/users', {
      name: 'x',
      email: `x_${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'ADMIN',
    });
    expect(res.status).toBe(403);
  });

  test('VENDEDOR golpeando GET /users directamente recibe 403', async () => {
    const res = await vendedorAgent.get('/api/users');
    expect(res.status).toBe(403);
  });

  test('VENDEDOR golpeando GET /audit-logs directamente recibe 403', async () => {
    const res = await vendedorAgent.get('/api/audit-logs');
    expect(res.status).toBe(403);
  });

  test('VENDEDOR golpeando PATCH /payments/:id/cancel directamente recibe 403', async () => {
    const res = await vendedorAgent.patchJson('/api/payments/non-existent-id/cancel', { reason: 'x' });
    expect(res.status).toBe(403);
  });

  test('una request mutante sin el header X-Requested-With es rechazada (mitigación CSRF)', async () => {
    const res = await vendedorAgent.post('/api/tickets/601/reserve').send({
      raffleId: raffle.id,
      customer: { fullName: 'Cliente', phone: '3000000001' },
    });
    expect(res.status).toBe(403);
  });

  test('intentar enviar un campo "status" o "id" propio en el body no tiene ningún efecto (el servidor ignora campos no declarados en el esquema)', async () => {
    const res = await vendedorAgent.postJson('/api/tickets/602/reserve', {
      raffleId: raffle.id,
      customer: { fullName: 'Cliente', phone: '3000000001' },
      status: 'PAGADO', // attempted tampering: not part of the schema, must be ignored
      id: 'fake-id',
    });
    expect(res.status).toBe(200);
    expect(res.body.ticket.status).toBe('RESERVADO');
  });

  test('sin sesión (no autenticado), todas las rutas protegidas devuelven 401, no 403', async () => {
    const anonAgent = buildAgent();
    const res = await anonAgent.get('/api/tickets?raffleId=' + raffle.id);
    expect(res.status).toBe(401);
  });
});
