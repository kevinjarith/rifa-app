const { asyncHandler } = require('../../utils/asyncHandler');
const usersService = require('./users.service');

const list = asyncHandler(async (req, res) => {
  res.json({ users: await usersService.listUsers(), max: usersService.MAX_USERS });
});

const create = asyncHandler(async (req, res) => {
  const user = await usersService.createUser(req.body, req.user.id);
  res.status(201).json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, active: user.active },
  });
});

const changeRole = asyncHandler(async (req, res) => {
  const user = await usersService.changeRole(req.params.id, req.body.role, req.user.id);
  res.json({ user: { id: user.id, role: user.role } });
});

const changeActive = asyncHandler(async (req, res) => {
  const user = await usersService.changeActive(req.params.id, req.body.active, req.user.id);
  res.json({ user: { id: user.id, active: user.active } });
});

const resetPassword = asyncHandler(async (req, res) => {
  await usersService.resetPassword(req.params.id, req.body.newPassword, req.user.id);
  res.json({ ok: true });
});

module.exports = { list, create, changeRole, changeActive, resetPassword };
