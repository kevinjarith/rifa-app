const express = require('express');
const { requireAuth } = require('../../middleware/requireAuth');
const controller = require('./customers.controller');

const router = express.Router();

router.get('/', requireAuth, controller.list);

module.exports = router;
