import { createApp } from './app.js';
const port = Number(process.env.PORT ?? 3000);
createApp().listen(port, '0.0.0.0', () => console.log(`Gemify API: http://localhost:${port}/api/health (podaci su samo u memoriji)`));
