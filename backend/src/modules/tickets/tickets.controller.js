const { asyncHandler } = require('../../utils/asyncHandler');
const ticketsService = require('./tickets.service');

const list = asyncHandler(async (req, res) => {
  const tickets = await ticketsService.listTickets(req.query);
  res.json({ tickets });
});

const getOne = asyncHandler(async (req, res) => {
  const ticket = await ticketsService.getTicket(req.query.raffleId, req.ticketNumber);
  res.json({ ticket });
});

const reserve = asyncHandler(async (req, res) => {
  const ticket = await ticketsService.reserve({ ...req.body, number: req.ticketNumber }, req.user.id);
  res.json({ ticket });
});

const pay = asyncHandler(async (req, res) => {
  const ticket = await ticketsService.pay({ ...req.body, number: req.ticketNumber }, req.user.id);
  res.json({ ticket });
});

const release = asyncHandler(async (req, res) => {
  const ticket = await ticketsService.release({ ...req.body, number: req.ticketNumber }, req.user.id);
  res.json({ ticket });
});

const block = asyncHandler(async (req, res) => {
  const ticket = await ticketsService.block({ ...req.body, number: req.ticketNumber }, req.user.id);
  res.json({ ticket });
});

const unblock = asyncHandler(async (req, res) => {
  const ticket = await ticketsService.unblock({ ...req.body, number: req.ticketNumber }, req.user.id);
  res.json({ ticket });
});

const unsell = asyncHandler(async (req, res) => {
  const ticket = await ticketsService.unsell({ ...req.body, number: req.ticketNumber }, req.user.id);
  res.json({ ticket });
});

const editTicket = asyncHandler(async (req, res) => {
  const ticket = await ticketsService.editTicket({ ...req.body, number: req.ticketNumber }, req.user);
  res.json({ ticket });
});

module.exports = { list, getOne, reserve, pay, release, block, unblock, unsell, editTicket };
