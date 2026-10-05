const { asyncHandler } = require('../../utils/asyncHandler');
const customersService = require('./customers.service');

const list = asyncHandler(async (req, res) => {
  res.json({ customers: await customersService.listCustomers({ search: req.query.search }) });
});

module.exports = { list };
