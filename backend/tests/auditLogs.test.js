const { buildAgent, loginAs } = require('./helpers/testServer');
const { createUser, createRaffleWithTickets } = require('./helpers/factories');
const { prisma } = require('../src/db/prisma');

describe('Auditoría', () => {
  test('reservar un número genera exactamente una fila de auditoría con el estado anterior y nuevo', async () => {
    const raffle = await createRaffleWithTickets();
    const vendedor = await createUser({ role: 'VENDEDOR' });
    const agent = buildAgent();
    await loginAs(agent, vendedor);

    await agent.postJson('/api/tickets/400/reserve', {
      raffleId: raffle.id,
      customer: { fullName: 'Cliente', phone: '3000000001' },
    });

    const logs = await prisma.auditLog.findMany({ where: { action: 'RESERVE', ticketNumber: 400 } });
    expect(logs).toHaveLength(1);
    expect(logs[0].previousStatus).toBe('DISPONIBLE');
    expect(logs[0].newStatus).toBe('RESERVADO');
    expect(logs[0].userId).toBe(vendedor.id);
  });

  test('un VENDEDOR no puede consultar los logs de auditoría', async () => {
    const vendedor = await createUser({ role: 'VENDEDOR' });
    const agent = buildAgent();
    await loginAs(agent, vendedor);
    const res = await agent.get('/api/audit-logs');
    expect(res.status).toBe(403);
  });

  test('un ADMIN no puede consultar los logs de auditoría (solo SUPER_ADMIN)', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const agent = buildAgent();
    await loginAs(agent, admin);
    const res = await agent.get('/api/audit-logs');
    expect(res.status).toBe(403);
  });

  test('SUPER_ADMIN puede consultar los logs de auditoría', async () => {
    const superAdmin = await createUser({ role: 'SUPER_ADMIN' });
    const agent = buildAgent();
    await loginAs(agent, superAdmin);
    const res = await agent.get('/api/audit-logs');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  test('no existe ninguna ruta para editar o borrar logs de auditoría', async () => {
    const superAdmin = await createUser({ role: 'SUPER_ADMIN' });
    const agent = buildAgent();
    await loginAs(agent, superAdmin);
    const patchRes = await agent.patchJson('/api/audit-logs/some-id', { action: 'HACKED' });
    expect([404, 405]).toContain(patchRes.status);
    const deleteRes = await agent.delete('/api/audit-logs/some-id').set('X-Requested-With', 'fetch');
    expect([404, 405]).toContain(deleteRes.status);
  });
});
