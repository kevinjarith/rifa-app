const { asyncHandler } = require('../../utils/asyncHandler');
const { prisma } = require('../../db/prisma');
const { listAuditLogs } = require('./auditLogs.service');

const list = asyncHandler(async (req, res) => {
  const { userId, action, from, to, page, pageSize } = req.query;
  const result = await listAuditLogs(prisma, {
    userId,
    action,
    from,
    to,
    page: page ? Number(page) : undefined,
    pageSize: pageSize ? Number(pageSize) : undefined,
  });
  res.json(result);
});

module.exports = { list };
