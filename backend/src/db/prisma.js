const { PrismaClient } = require('@prisma/client');

// Always cache on `global`, including in production: on Vercel this file runs
// inside a serverless function, where a "warm" instance reuses the same
// module scope across invocations — caching here avoids opening a fresh
// PrismaClient (and a fresh pooled connection) on every single request.
const prisma = global.__prisma__ || new PrismaClient();
global.__prisma__ = prisma;

module.exports = { prisma };
