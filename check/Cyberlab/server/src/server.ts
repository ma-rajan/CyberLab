import { app } from './app.js';
import { env } from './config/env.js';

app.listen(env.PORT, '127.0.0.1', () => {
  console.info(`CyberLab API listening at http://127.0.0.1:${env.PORT}`);
});
