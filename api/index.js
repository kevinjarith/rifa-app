// Vercel serverless entry point. An Express app instance is directly callable
// as (req, res), so it works as a Vercel Node function handler with no
// adapter — this does NOT call app.listen() (that stays in backend/src/server.js
// for local/Docker use). All routes (including the static frontend served
// inside createApp()) are forwarded here by vercel.json.
const { createApp } = require('../backend/src/app');

module.exports = createApp();
