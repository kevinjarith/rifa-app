const express = require('express');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../../middleware/requireAuth');
const { validate } = require('../../middleware/validate');
const { loginSchema } = require('./auth.schema');
const controller = require('./auth.controller');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  // The test suite logs in far more than a real brute-force window allows
  // (many tests, each logging in fresh agents) — this limiter exists to slow
  // down real credential-guessing, not to throttle automated tests.
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: { code: 'TOO_MANY_ATTEMPTS', message: 'Demasiados intentos. Intente de nuevo más tarde.' } },
});

router.post('/login', loginLimiter, validate(loginSchema), controller.login);
router.post('/logout', requireAuth, controller.logout);
router.get('/me', requireAuth, controller.me);

module.exports = router;
