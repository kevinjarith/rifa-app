const express = require('express');
const { requireAuth } = require('../../middleware/requireAuth');
const { requireRole } = require('../../middleware/requireRole');
const { validate } = require('../../middleware/validate');
const schemas = require('./users.schema');
const controller = require('./users.controller');

const router = express.Router();

router.use(requireAuth, requireRole('SUPER_ADMIN'));

router.get('/', controller.list);
router.post('/', validate(schemas.createUserSchema), controller.create);
router.patch('/:id/role', validate(schemas.changeRoleSchema), controller.changeRole);
router.patch('/:id/active', validate(schemas.changeActiveSchema), controller.changeActive);
router.post('/:id/reset-password', validate(schemas.resetPasswordSchema), controller.resetPassword);

module.exports = router;
