const env = require('./config/env');
const { createApp } = require('./app');

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`rifa-app backend escuchando en http://localhost:${env.PORT}`);
});
