const { buildAgent, loginAs } = require('./helpers/testServer');
const { createUser, createRaffleWithTickets } = require('./helpers/factories');
const { prisma } = require('../src/db/prisma');

describe('Concurrencia: no se puede vender el mismo número dos veces', () => {
  test('dos usuarios reservando el mismo número al mismo tiempo: solo uno tiene éxito', async () => {
    const raffle = await createRaffleWithTickets();
    const userA = await createUser({ role: 'VENDEDOR' });
    const userB = await createUser({ role: 'VENDEDOR' });

    const agentA = buildAgent();
    const agentB = buildAgent();
    await loginAs(agentA, userA);
    await loginAs(agentB, userB);

    const [resA, resB] = await Promise.all([
      agentA.postJson('/api/tickets/325/reserve', {
        raffleId: raffle.id,
        customer: { fullName: 'Cliente A', phone: '3000000001' },
      }),
      agentB.postJson('/api/tickets/325/reserve', {
        raffleId: raffle.id,
        customer: { fullName: 'Cliente B', phone: '3000000002' },
      }),
    ]);

    const statuses = [resA.status, resB.status].sort((a, b) => a - b);
    expect(statuses).toEqual([200, 409]);

    const ticket = await prisma.ticket.findUnique({
      where: { raffleId_number: { raffleId: raffle.id, number: 325 } },
      include: { customer: true },
    });
    expect(ticket.status).toBe('RESERVADO');
    // Exactly one of the two customers ended up attached — never both, never neither.
    expect(['Cliente A', 'Cliente B']).toContain(ticket.customer.fullName);

    // The losing attempt's transaction rolls back entirely (including its customer
    // insert), so only the winner's customer row survives — no orphan data.
    const customerCount = await prisma.customer.count({ where: { fullName: { in: ['Cliente A', 'Cliente B'] } } });
    expect(customerCount).toBe(1);
  });

  test('10 intentos concurrentes sobre el mismo número: exactamente uno gana', async () => {
    const raffle = await createRaffleWithTickets();
    const agents = [];
    for (let i = 0; i < 10; i += 1) {
      const user = await createUser({ role: 'VENDEDOR' });
      const agent = buildAgent();
      await loginAs(agent, user);
      agents.push(agent);
    }

    const results = await Promise.all(
      agents.map((agent, i) =>
        agent.postJson('/api/tickets/500/reserve', {
          raffleId: raffle.id,
          customer: { fullName: `Cliente ${i}`, phone: `300000${i}` },
        })
      )
    );

    const successCount = results.filter((r) => r.status === 200).length;
    const conflictCount = results.filter((r) => r.status === 409).length;
    expect(successCount).toBe(1);
    expect(conflictCount).toBe(9);
  });

  test('reservar y pagar simultáneamente el mismo número por dos usuarios distintos', async () => {
    const raffle = await createRaffleWithTickets();
    const userA = await createUser({ role: 'VENDEDOR' });
    const userB = await createUser({ role: 'VENDEDOR' });
    const agentA = buildAgent();
    const agentB = buildAgent();
    await loginAs(agentA, userA);
    await loginAs(agentB, userB);

    await agentA.postJson('/api/tickets/700/reserve', {
      raffleId: raffle.id,
      customer: { fullName: 'Cliente A', phone: '3000000001' },
    });

    // B tries to reserve the same (already reserved) number while A pays for it.
    const [payRes, reserveRes] = await Promise.all([
      agentA.postJson('/api/tickets/700/pay', { raffleId: raffle.id, method: 'EFECTIVO', amount: 10000 }),
      agentB.postJson('/api/tickets/700/reserve', {
        raffleId: raffle.id,
        customer: { fullName: 'Cliente B', phone: '3000000002' },
      }),
    ]);

    expect(reserveRes.status).toBe(409);
    expect([200, 400]).toContain(payRes.status); // 200 if pay wins the race, 400 only in a pathological ordering
  });
});
