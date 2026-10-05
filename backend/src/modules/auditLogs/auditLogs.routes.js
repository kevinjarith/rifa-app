const express = require('express');
const { requireAuth } = require('../../middleware/requireAuth');
const { requireRole } = require('../../middleware/requireRole');
const controller = require('./auditLogs.controller');

const router = express.Router();

// Audit logs are append-only by design: only a GET route is ever exposed here.
// There is intentionally no PATCH/DELETE route for this resource.
router.get('/', requireAuth, requireRole('SUPER_ADMIN'), controller.list);

module.exports = router;
