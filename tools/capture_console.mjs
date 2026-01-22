import puppeteer from 'puppeteer';
(async () => {
  const url = 'http://127.0.0.1:4180/pages/Casamento2Via.html';
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', (msg) => console.log('PAGE LOG:', msg.type(), msg.text()));
  await page.goto(url, { waitUntil: 'networkidle2' });
  await page.evaluate(() => new Promise((res) => setTimeout(res, 1200)));
  const statusText = await page.evaluate(() => (document.getElementById('name-db-status') || { textContent: null }).textContent);
  console.log('name-db-status text:', statusText);
  await browser.close();
})();
