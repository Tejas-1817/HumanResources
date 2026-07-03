const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('response', response => {
    if (!response.ok()) console.log(`HTTP ${response.status()}: ${response.url()}`);
  });

  await page.goto('http://localhost:5173/login');
  await page.type('input[type="email"]', 'admin@altzor.com');
  await page.type('input[type="password"]', 'admin');
  await page.click('button');
  await page.waitForNavigation();
  
  await page.goto('http://localhost:5173/job-roles/1', { waitUntil: 'networkidle0' });
  
  await browser.close();
})().catch(console.error);
