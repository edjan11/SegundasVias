import puppeteer from 'puppeteer';
(async () => {
  const url = 'http://127.0.0.1:4180/pages/Casamento2Via.html';
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', (m) => console.log('PAGE LOG:', m.text()));
  await page.goto(url, { waitUntil: 'networkidle2' });
  await page.evaluate(() => new Promise((r) => setTimeout(r, 500)));

  const selectors = ['input[name="nomeSolteiro"]', 'input[name="nomeMaeNoivo"]', 'input[name="nomeCasado"]'];
  for (const sel of selectors) {
    console.log('--- Testing', sel);
    // ensure dictionary clean for isolated check
    await page.evaluate(() => localStorage.removeItem('certidao.nameDictionary.v1'));
    await page.focus(sel);
    await page.click(sel, { clickCount: 3 });
    await page.keyboard.type('weqdwad');
    // blur
    await page.click('#statusText');
    await page.evaluate(() => new Promise((r) => setTimeout(r, 300)));

    const res = await page.evaluate((s) => {
      const input = document.querySelector(s);
      if (!input) return { err: 'no input' };
      const field = input.closest('.campo') || input.closest('.field') || input.parentElement;
      const hint = field ? field.querySelector('.hint .hint-text') : null;
      const suggest = field ? !!field.querySelector('.name-suggest') : false;
      const value = input.value || null;
      const check = window._nameValidator ? window._nameValidator.check(value) : null;
      return {
        invalidClass: input.classList.contains('invalid'),
        value,
        hintText: hint ? hint.textContent : null,
        suggestButton: suggest,
        validatorCheck: check,
      };
    }, sel);
    console.log('After blur:', res);
    if (res.suggestButton) {
      await page.evaluate((s) => {
        const input = document.querySelector(s);
        const btn = input.closest('.campo')?.querySelector('.name-suggest');
        if (btn) btn.click();
      }, sel);
      await page.evaluate(() => new Promise((r) => setTimeout(r, 200)));
      const dict = await page.evaluate(() => localStorage.getItem('certidao.nameDictionary.v1'));
      console.log('Dictionary snapshot (first 200 chars):', dict ? dict.slice(0,200) : dict);
    }
  }

  await browser.close();
})();