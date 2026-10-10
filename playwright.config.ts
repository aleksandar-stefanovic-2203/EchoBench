import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', fullyParallel: false, workers: 1, timeout: 60000,
  expect: {timeout: 10000}, reporter: 'list',
  use: {baseURL: 'http://localhost:4200', trace: 'retain-on-failure', screenshot: 'only-on-failure'},
  projects: [{name:'edge',use:{...devices['Desktop Edge'],channel:'msedge'}}],
  webServer: [
    {command:'npm.cmd --prefix backend run dev',url:'http://localhost:3000/api/health',reuseExistingServer:!process.env.CI,timeout:60000},
    {command:'npm.cmd --prefix frontend start',url:'http://localhost:4200',reuseExistingServer:!process.env.CI,timeout:120000},
  ]
});
