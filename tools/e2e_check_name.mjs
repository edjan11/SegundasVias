import puppeteer from 'puppeteer';
(async () => {
  const url = 'http://127.0.0.1:4180/pages/Casamento2Via.html';
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  await page.goto(url, { waitUntil: 'networkidle2' });
  await page.evaluate(() => new Promise((r) => setTimeout(r, 500)));

  // attach a test handler to observe blur events
  await page.evaluate(() => {
    const input = document.querySelector('input[name="nomeSolteiro"]');
    if (input) input.addEventListener('blur', () => console.log('TEST BLUR event fired'));
  });

  // focus field and type
  const sel = 'input[name="nomeSolteiro"]';
  await page.focus(sel);
  await page.click(sel, { clickCount: 3 });
  await page.keyboard.type('weqdwad');
  // blur by focusing status text (more reliable than body click)
  await page.click('#statusText');
  await page.evaluate(() => new Promise((r) => setTimeout(r, 300)));

  const invalid = await page.evaluate((s) => document.querySelector(s)?.classList.contains('invalid'), sel);
  const hint = await page.evaluate((s) => {
    const f = document.querySelector(s)?.closest('.campo');
    if (!f) return null;
    const hint = f.querySelector('.hint .hint-text');
    return hint ? hint.textContent : null;
  }, sel);
  const suggest = await page.evaluate((s) => {
    const f = document.querySelector(s)?.closest('.campo');
    if (!f) return false;
    return !!f.querySelector('.name-suggest');
  }, sel);

  const enableName = await page.evaluate(() => localStorage.getItem('ui.enableNameValidation'));
  const nameMode = await page.evaluate(() => localStorage.getItem('ui.nameValidationMode') || 'blur');
  const createExists = await page.evaluate(() => typeof window.createNameValidator === 'function' || typeof createNameValidator === 'function');
  const globalValidatorExists = await page.evaluate(() => !!window._nameValidator);
  const globalCheck = await page.evaluate(async () => {
    try {
      if (!window._nameValidator) return { err: 'no global validator' };
      try { await (window._nameValidator.ready || Promise.resolve()); } catch(e) { return { err: 'ready failed '+String(e) } }
      return window._nameValidator.check('weqdwad');
    } catch (e) { return { error: String(e) } }
  });
  // try an immediate check using a fresh validator instance in page context (fallback)
  const immediateCheck = await page.evaluate(async () => {
    try {
      if (typeof createNameValidator !== 'function') return { error: 'no factory' };
      const v = createNameValidator();
      // wait briefly for ready
      await (v.ready || Promise.resolve());
      return v.check('weqdwad');
    } catch (e) { return { error: String(e) }; }
  });

  console.log('invalid class present:', invalid);
  console.log('hint text:', hint);
  console.log('suggest button exists:', suggest);
  console.log('localStorage.ui.enableNameValidation:', enableName);
  console.log('localStorage.ui.nameValidationMode:', nameMode);
  console.log('createNameValidator exists:', createExists);
  console.log('global validator available:', globalValidatorExists);
  console.log('globalCheck result:', globalCheck);
  console.log('immediateCheck result:', immediateCheck);

  // try clicking suggestion if exists
  if (suggest) {
    await page.evaluate((s) => {
      const f = document.querySelector(s)?.closest('.campo');
      const btn = f?.querySelector('.name-suggest');
      if (btn) btn.click();
    }, sel);
    await page.evaluate(() => new Promise((r) => setTimeout(r, 200)));
    const stillInvalid = await page.evaluate((s) => document.querySelector(s)?.classList.contains('invalid'), sel);
    const dict = await page.evaluate(() => localStorage.getItem('certidao.nameDictionary.v1'));
    console.log('still invalid after suggestion:', stillInvalid);
    console.log('dictionary snapshot:', dict ? dict.slice(0, 200) : dict);
  }

  await browser.close();
})();