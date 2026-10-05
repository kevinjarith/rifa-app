const { buildAgent, loginAs } = require('./helpers/testServer');
const { createUser, createRaffleWithTickets } = require('./helpers/factories');

describe('Pagos', () => {
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

  test('marcar como pagado crea un registro de pago', async () => {
    await vendedorAgent.postJson('/api/tickets/200/reserve', {
      raffleId: raffle.id,
      customer: { fullName: 'Cliente', phone: '3000000001' },
    });
    const payRes = await vendedorAgent.postJson('/api/tickets/200/pay', {
      raffleId: raffle.id,
      method: 'TRANSFERENCIA',
    });
    expect(payRes.status).toBe(200);

    const payments = await vendedorAgent.get('/api/payments');
    const created = payments.body.payments.find((p) => p.ticket.number === 200);
    expect(created.status).toBe('PAGADO');
    expect(Number(created.amount)).toBe(Number(raffle.ticketPrice));
  });

  test('el monto no se puede editar: cualquier "amount" enviado por el cliente se ignora y se cobra el precio fijo de la boleta', async () => {
    await vendedorAgent.postJson('/api/tickets/201/reserve', {
      raffleId: raffle.id,
      customer: { fullName: 'Cliente', phone: '3000000002' },
    });
    const res = await vendedorAgent.postJson('/api/tickets/201/pay', {
      raffleId: raffle.id,
      method: 'EFECTIVO',
      amount: -5,
    });
    expect(res.status).toBe(200);

    const payments = await vendedorAgent.get('/api/payments');
    const created = payments.body.payments.find((p) => p.ticket.number === 201);
    expect(Number(created.amount)).toBe(Number(raffle.ticketPrice));
  });

  test('no se puede pagar un número que no está reservado', async () => {
    const res = await vendedorAgent.postJson('/api/tickets/202/pay', {
      raffleId: raffle.id,
      method: 'EFECTIVO',
    });
    expect(res.status).toBe(400);
  });

  test('solo ADMIN+ puede cancelar un pago; cancelarlo libera el número', async () => {
    await vendedorAgent.postJson('/api/tickets/203/reserve', {
      raffleId: raffle.id,
      customer: { fullName: 'Cliente', phone: '3000000003' },
    });
    await vendedorAgent.postJson('/api/tickets/203/pay', { raffleId: raffle.id, method: 'EFECTIVO' });

    const paymentsList = await vendedorAgent.get('/api/payments');
    const payment = paymentsList.body.payments.find((p) => p.ticket.number === 203);

    const deniedCancel = await vendedorAgent.patchJson(`/api/payments/${payment.id}/cancel`, { reason: 'prueba' });
    expect(deniedCancel.status).toBe(403);

    const allowedCancel = await adminAgent.patchJson(`/api/payments/${payment.id}/cancel`, { reason: 'devolución' });
    expect(allowedCancel.status).toBe(200);

    const ticketCheck = await adminAgent.get(`/api/tickets/203?raffleId=${raffle.id}`);
    expect(ticketCheck.body.ticket.status).toBe('DISPONIBLE');
  });
});
