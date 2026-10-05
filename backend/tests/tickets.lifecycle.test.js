const { buildAgent, loginAs } = require('./helpers/testServer');
const { createUser, createRaffleWithTickets } = require('./helpers/factories');

describe('Ciclo de vida de una boleta', () => {
  let raffle;
  let vendedorAgent;
  let adminAgent;

  beforeEach(async () => {
    raffle = await createRaffleWithTickets();
    const vendedor = await createUser({ role: 'VENDEDOR' });
    const admin = await createUser({ role: 'ADMIN' });
    vendedorAgent = buildAgent();
    await loginAs(vendedorAgent, vendedor);
    adminAgent = buildAgent();
    await loginAs(adminAgent, admin);
  });

  test('DISPONIBLE -> RESERVADO -> PAGADO', async () => {
    const reserveRes = await vendedorAgent.postJson('/api/tickets/325/reserve', {
      raffleId: raffle.id,
      customer: { fullName: 'Juan Pérez', phone: '3000000000' },
    });
    expect(reserveRes.status).toBe(200);
    expect(reserveRes.body.ticket.status).toBe('RESERVADO');

    const payRes = await vendedorAgent.postJson('/api/tickets/325/pay', {
      raffleId: raffle.id,
      method: 'NEQUI',
      amount: 10000,
    });
    expect(payRes.status).toBe(200);
    expect(payRes.body.ticket.status).toBe('PAGADO');
  });

  test('un número ya PAGADO no se puede reservar de nuevo', async () => {
    await vendedorAgent.postJson('/api/tickets/010/reserve', {
      raffleId: raffle.id,
      customer: { fullName: 'Cliente A', phone: '3000000001' },
    });
    await vendedorAgent.postJson('/api/tickets/010/pay', { raffleId: raffle.id, method: 'EFECTIVO', amount: 10000 });

    const secondReserve = await vendedorAgent.postJson('/api/tickets/010/reserve', {
      raffleId: raffle.id,
      customer: { fullName: 'Cliente B', phone: '3000000002' },
    });
    expect(secondReserve.status).toBe(409);
  });

  test('RESERVADO -> DISPONIBLE (liberar)', async () => {
    await vendedorAgent.postJson('/api/tickets/050/reserve', {
      raffleId: raffle.id,
      customer: { fullName: 'Cliente', phone: '3000000003' },
    });
    const releaseRes = await vendedorAgent.postJson('/api/tickets/050/release', { raffleId: raffle.id });
    expect(releaseRes.status).toBe(200);
    expect(releaseRes.body.ticket.status).toBe('DISPONIBLE');

    const again = await vendedorAgent.postJson('/api/tickets/050/reserve', {
      raffleId: raffle.id,
      customer: { fullName: 'Otro cliente', phone: '3000000004' },
    });
    expect(again.status).toBe(200);
  });

  test('un VENDEDOR no puede bloquear un número (requiere ADMIN+)', async () => {
    const res = await vendedorAgent.postJson('/api/tickets/060/block', { raffleId: raffle.id });
    expect(res.status).toBe(403);
  });

  test('ADMIN puede bloquear y desbloquear', async () => {
    const blockRes = await adminAgent.postJson('/api/tickets/060/block', { raffleId: raffle.id });
    expect(blockRes.status).toBe(200);
    expect(blockRes.body.ticket.status).toBe('BLOQUEADO');

    const unblockRes = await adminAgent.postJson('/api/tickets/060/unblock', { raffleId: raffle.id });
    expect(unblockRes.status).toBe(200);
    expect(unblockRes.body.ticket.status).toBe('DISPONIBLE');
  });

  test('un VENDEDOR no puede des-vender (PAGADO -> DISPONIBLE); un ADMIN sí puede', async () => {
    await vendedorAgent.postJson('/api/tickets/070/reserve', {
      raffleId: raffle.id,
      customer: { fullName: 'Cliente', phone: '3000000005' },
    });
    await vendedorAgent.postJson('/api/tickets/070/pay', { raffleId: raffle.id, method: 'EFECTIVO', amount: 10000 });

    const deniedUnsell = await vendedorAgent.postJson('/api/tickets/070/unsell', {
      raffleId: raffle.id,
      reason: 'intento no autorizado',
    });
    expect(deniedUnsell.status).toBe(403);

    const allowedUnsell = await adminAgent.postJson('/api/tickets/070/unsell', {
      raffleId: raffle.id,
      reason: 'cliente pidió reembolso',
    });
    expect(allowedUnsell.status).toBe(200);
    expect(allowedUnsell.body.ticket.status).toBe('DISPONIBLE');
  });

  test('reservar un número bloqueado es rechazado', async () => {
    await adminAgent.postJson('/api/tickets/080/block', { raffleId: raffle.id });
    const res = await vendedorAgent.postJson('/api/tickets/080/reserve', {
      raffleId: raffle.id,
      customer: { fullName: 'Cliente', phone: '3000000006' },
    });
    expect(res.status).toBe(409);
  });

  test('número inválido (más de 3 dígitos o no numérico) es rechazado', async () => {
    const res1 = await vendedorAgent.postJson('/api/tickets/1000/reserve', {
      raffleId: raffle.id,
      customer: { fullName: 'Cliente', phone: '3000000007' },
    });
    expect(res1.status).toBe(400);

    const res2 = await vendedorAgent.postJson('/api/tickets/abc/reserve', {
      raffleId: raffle.id,
      customer: { fullName: 'Cliente', phone: '3000000007' },
    });
    expect(res2.status).toBe(400);
  });

  test('el precio de la boleta es fijo: crear una rifa ignora cualquier "ticketPrice" enviado por el cliente', async () => {
    const res = await adminAgent.postJson('/api/raffles', { name: 'Rifa con precio manipulado', ticketPrice: -10 });
    expect(res.status).toBe(201);
    expect(Number(res.body.raffle.ticketPrice)).toBe(3000);
  });

  test('crear una rifa sin nombre es rechazado', async () => {
    const res = await adminAgent.postJson('/api/raffles', { name: '' });
    expect(res.status).toBe(400);
  });

  test('cliente vacío al reservar es rechazado', async () => {
    const res = await vendedorAgent.postJson('/api/tickets/090/reserve', {
      raffleId: raffle.id,
      customer: { fullName: '', phone: '' },
    });
    expect(res.status).toBe(400);
  });
});
