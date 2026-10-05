const express = require('express');
const { requireAuth } = require('../../middleware/requireAuth');
const { requireRole } = require('../../middleware/requireRole');
const { validate } = require('../../middleware/validate');
const { parseNumberParam } = require('./parseNumber');
const schemas = require('./tickets.schema');
const controller = require('./tickets.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/', validate(schemas.listTicketsQuerySchema, 'query'), controller.list);

router.get(
  '/:number',
  parseNumberParam,
  validate(schemas.simpleRaffleSchema, 'query'),
  controller.getOne
);

router.post(
  '/:number/reserve',
  parseNumberParam,
  validate(schemas.reserveSchema),
  controller.reserve
);

router.post('/:number/pay', parseNumberParam, validate(schemas.paySchema), controller.pay);

router.post(
  '/:number/release',
  parseNumberParam,
  validate(schemas.simpleRaffleSchema),
  controller.release
);

router.post(
  '/:number/block',
  parseNumberParam,
  requireRole('ADMIN', 'SUPER_ADMIN'),
  validate(schemas.blockSchema),
  controller.block
);

router.post(
  '/:number/unblock',
  parseNumberParam,
  requireRole('ADMIN', 'SUPER_ADMIN'),
  validate(schemas.simpleRaffleSchema),
  controller.unblock
);

router.post(
  '/:number/unsell',
  parseNumberParam,
  requireRole('ADMIN', 'SUPER_ADMIN'),
  validate(schemas.unsellSchema),
  controller.unsell
);

router.patch(
  '/:number',
  parseNumberParam,
  validate(schemas.editTicketSchema),
  controller.editTicket
);

module.exports = router;
