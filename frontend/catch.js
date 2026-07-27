const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE ERROR:', msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log('PAGE EXCEPTION:', err.toString());
  });

  try {
    await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle0' });
    
    await page.evaluate(() => {
      localStorage.setItem('resumeiq_token', 'fake-token');
      localStorage.setItem('resumeiq_user', JSON.stringify({ id: 1, role: 'admin', name: 'Admin' }));
    });
    
    await page.goto('http://localhost:5174/', { waitUntil: 'networkidle0' });
    
    await new Promise(r => setTimeout(r, 2000));
    console.log("Finished waiting.");
    
  } catch (err) {
    console.log("NAVIGATION ERROR:", err.toString());
  }
  
  await browser.close();
})();
