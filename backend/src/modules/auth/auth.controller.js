const { asyncHandler } = require('../../utils/asyncHandler');
const authService = require('./auth.service');

const login = asyncHandler(async (req, res) => {
  const user = await authService.login(req.body);
  req.session.regenerate((err) => {
    if (err) throw err;
    req.session.userId = user.id;
    res.json({ user });
  });
});

const logout = asyncHandler(async (req, res) => {
  const userId = req.session?.userId;
  await authService.logout(userId);
  req.session.destroy(() => {
    res.clearCookie('rifa.sid');
    res.json({ ok: true });
  });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

module.exports = { login, logout, me };
