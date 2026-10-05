const { asyncHandler } = require('../../utils/asyncHandler');
const paymentsService = require('./payments.service');

const list = asyncHandler(async (req, res) => {
  res.json({ payments: await paymentsService.listPayments(req.query) });
});

const cancel = asyncHandler(async (req, res) => {
  const result = await paymentsService.cancelPayment(req.params.id, req.body.reason, req.user.id);
  res.json(result);
});

module.exports = { list, cancel };
