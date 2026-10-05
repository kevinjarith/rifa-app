const express = require('express');
const { requireAuth } = require('../../middleware/requireAuth');
const { validate } = require('../../middleware/validate');
const schemas = require('./reports.schema');
const controller = require('./reports.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/sales-by-day', validate(schemas.baseReportQuery, 'query'), controller.byDay);
router.get('/sales-by-user', validate(schemas.baseReportQuery, 'query'), controller.byUser);
router.get('/sales-by-method', validate(schemas.baseReportQuery, 'query'), controller.byMethod);
router.get('/tickets.csv', validate(schemas.exportQuery, 'query'), controller.ticketsCsv);

module.exports = router;
