const path = require('path');
const express = require('express');
const pinoHttp = require('pino-http');
const pino = require('pino');
const env = require('./config/env');
const { buildSessionMiddleware } = require('./config/session');
const { csrfLite } = require('./middleware/csrfLite');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const rafflesRoutes = require('./modules/raffles/raffles.routes');
const ticketsRoutes = require('./modules/tickets/tickets.routes');
const customersRoutes = require('./modules/customers/customers.routes');
const paymentsRoutes = require('./modules/payments/payments.routes');
const auditLogsRoutes = require('./modules/auditLogs/auditLogs.routes');
const reportsRoutes = require('./modules/reports/reports.routes');

function createApp() {
  const app = express();
  const logger = pino({ level: env.NODE_ENV === 'test' ? 'silent' : 'info' });

  app.use(pinoHttp({ logger }));
  app.use(express.json());
  app.use(buildSessionMiddleware());
  app.use('/api', csrfLite);

  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/raffles', rafflesRoutes);
  app.use('/api/tickets', ticketsRoutes);
  app.use('/api/customers', customersRoutes);
  app.use('/api/payments', paymentsRoutes);
  app.use('/api/audit-logs', auditLogsRoutes);
  app.use('/api/reports', reportsRoutes);

  app.use(express.static(path.join(__dirname, '..', '..', 'frontend', 'public')));

  app.use((req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Recurso no encontrado' } });
  });

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
