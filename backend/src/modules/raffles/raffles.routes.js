const express = require('express');
const { requireAuth } = require('../../middleware/requireAuth');
const { requireRole } = require('../../middleware/requireRole');
const { validate } = require('../../middleware/validate');
const schemas = require('./raffles.schema');
const controller = require('./raffles.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/', controller.list);
router.get('/:id/stats', controller.stats);
router.post('/', requireRole('SUPER_ADMIN', 'ADMIN'), validate(schemas.createRaffleSchema), controller.create);
router.patch(
  '/:id/active',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  validate(schemas.setActiveSchema),
  controller.setActive
);

module.exports = router;
