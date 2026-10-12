import { createApp } from './app.js';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
// Resolve from source/build location, independent of the terminal's working directory.
const envFile = new URL('../.env', import.meta.url);
if (existsSync(envFile)) loadEnvFile(envFile);
const port = Number(process.env.PORT ?? 3000);
createApp().listen(port, '0.0.0.0', () => console.log(`EchoBench API: http://localhost:${port}/api/health (data is stored in memory only)`));
