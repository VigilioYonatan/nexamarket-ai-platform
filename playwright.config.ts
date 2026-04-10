import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'tests/e2e',timeout:30000,retries:process.env.CI?2:1,fullyParallel:true,workers:2,
 use:{baseURL:process.env.E2E_BASE_URL??'http://127.0.0.1:5173',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[{name:'chromium',use:{...devices['Desktop Chrome']}},{name:'mobile',use:{...devices['iPhone 13']}}],
 reporter:[['list'],['html',{outputFolder:'playwright-report',open:'never'}]],
 webServer:process.env.E2E_WEB_SERVER?{command:'npm run dev:web',url:'http://127.0.0.1:5173',reuseExistingServer:!process.env.CI,timeout:90000}:undefined
});
