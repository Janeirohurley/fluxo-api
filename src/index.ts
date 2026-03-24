import 'dotenv/config';

import { createApp } from './app/create-app';

const port = Number(process.env.PORT ?? 3000);
const { app, modules } = createApp();

app.listen(port, () => {
  const moduleNames = modules.map((module) => module.name).join(', ');
  console.log(`Fluxo API listening on port ${port} with modules: ${moduleNames}`);
});
