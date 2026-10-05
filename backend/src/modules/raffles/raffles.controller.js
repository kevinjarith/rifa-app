const { asyncHandler } = require('../../utils/asyncHandler');
const rafflesService = require('./raffles.service');

const list = asyncHandler(async (req, res) => {
  res.json({ raffles: await rafflesService.listRaffles() });
});

const create = asyncHandler(async (req, res) => {
  const raffle = await rafflesService.createRaffleWithTickets(req.body, req.user.id);
  res.status(201).json({ raffle });
});

const setActive = asyncHandler(async (req, res) => {
  const raffle = await rafflesService.setActive(req.params.id, req.body.isActive);
  res.json({ raffle });
});

const stats = asyncHandler(async (req, res) => {
  res.json(await rafflesService.getStats(req.params.id));
});

module.exports = { list, create, setActive, stats };
