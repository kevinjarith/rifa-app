const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({ connectionString: env.DATABASE_URL });

function buildSessionMiddleware() {
  return session({
    store: new pgSession({ pool, tableName: 'session', createTableIfMissing: true }),
    name: 'rifa.sid',
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 12, // 12 hours
    },
  });
}

module.exports = { buildSessionMiddleware, pool };
