const express = require('express');
const { requireAuth } = require('../../middleware/requireAuth');
const { requireRole } = require('../../middleware/requireRole');
const { validate } = require('../../middleware/validate');
const schemas = require('./payments.schema');
const controller = require('./payments.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/', validate(schemas.listPaymentsQuerySchema, 'query'), controller.list);
router.patch(
  '/:id/cancel',
  requireRole('ADMIN', 'SUPER_ADMIN'),
  validate(schemas.cancelPaymentSchema),
  controller.cancel
);

module.exports = router;
