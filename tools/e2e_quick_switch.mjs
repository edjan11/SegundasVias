import puppeteer from 'puppeteer';
(async () => {
  const url = 'http://127.0.0.1:4180/pages/Casamento2Via.html';
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', (m) => console.log('PAGE LOG:', m.text()));
  await page.goto(url, { waitUntil: 'networkidle2' });
  await page.evaluate(() => new Promise((r) => setTimeout(r, 300)));
  const exists = await page.$('#ato-switch');
  console.log('ato-switch exists?', !!exists);
  if (exists) {
    await page.click('#ato-switch button[title="nascimento"]');
    await page.waitForTimeout(300);
    console.log('after click URL', page.url());
  }
  await browser.close();
})();