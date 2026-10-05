const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

module.exports = async function globalSetup() {
  const testDbUrl = process.env.TEST_DATABASE_URL;
  if (!testDbUrl) {
    throw new Error('TEST_DATABASE_URL no está definido (revisa backend/.env)');
  }
  execSync('npx prisma migrate deploy', {
    cwd: path.join(__dirname, '..'),
    // Override both: schema.prisma's directUrl (used by the migration engine)
    // would otherwise still point at the dev database from .env.
    env: { ...process.env, DATABASE_URL: testDbUrl, DIRECT_URL: testDbUrl },
    stdio: 'inherit',
  });
};
