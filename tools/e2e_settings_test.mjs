import puppeteer from 'puppeteer';

(async () => {
  const url = 'http://127.0.0.1:4180/pages/Casamento2Via.html';
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  await page.goto(url, { waitUntil: 'networkidle2' });

  // Open drawer
  await page.click('#drawer-toggle');
  await page.waitForSelector('#tab-config', { visible: true });

  // Wait for name DB status indicator and read it
  try {
    await page.waitForSelector('#name-db-status', { visible: true, timeout: 4000 });
    const dbStatus = await page.evaluate(() => (document.getElementById('name-db-status') || { textContent: '' }).textContent);
    console.log('name DB status:', dbStatus);
  } catch (e) {
    console.log('name DB status: not available (indicator not found)');
  }

  // Read initial name validation mode value
  const initialMode = await page.evaluate(() => localStorage.getItem('ui.nameValidationMode'));
  console.log('initial nameValidationMode:', initialMode);

  // Toggle the 'Validar Nomes' checkbox and click Save (settings-save) (top-level panel)
  const nameCheckbox = await page.$('#settings-enable-name');
  const checkedBefore = await page.evaluate((el) => el.checked, nameCheckbox);
  console.log('settings-enable-name before:', checkedBefore);
  // toggle the checkbox programmatically (click might be blocked by layout)
  await page.evaluate((el) => { el.checked = !el.checked; el.dispatchEvent(new Event('click')); }, nameCheckbox);

  // Click Save in settings panel (programmatic in case element not clickable)
  await page.evaluate(() => { const el = document.getElementById('settings-save'); if (el) el.click(); });

  // Wait for reload - detect by waiting for navigation
  try {
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 });
  } catch (e) { /* navigation may not happen in some environments */ }
  const savedEnableName = await page.evaluate(() => localStorage.getItem('ui.enableNameValidation'));
  console.log('ui.enableNameValidation after save:', savedEnableName);

  // Test name field behavior
  await page.goto(url, { waitUntil: 'networkidle2' });
  await page.click('#drawer-toggle');
  // Make sure mode is 'blur' (default) by reading saved mode (if unset it should be 'blur')
  const nameMode = await page.evaluate(() => localStorage.getItem('ui.nameValidationMode') || 'blur');
  console.log('nameValidationMode currently:', nameMode);

  // Input a suspicious name and blur
  const inputSel = 'input[name="nomeSolteiro"]';
  await page.focus(inputSel);
  await page.type(inputSel, 'weqdwad');
  // blur: click elsewhere
  await page.click('body');
  await page.waitForTimeout(200);
  const hasInvalid = await page.evaluate((sel) => document.querySelector(sel).classList.contains('invalid'), inputSel);
  console.log('nomeSolteiro invalid after blur:', hasInvalid);

  // If suspect, click suggestion button to add exception
  if (hasInvalid) {
    const hintBtn = await page.$('.name-suggest');
    if (hintBtn) {
      await hintBtn.click();
      await page.waitForTimeout(100);
      const dict = await page.evaluate(() => localStorage.getItem('certidao.nameDictionary.v1'));
      console.log('name dictionary after suggestion:', dict);
      const stillInvalid = await page.evaluate((sel) => document.querySelector(sel).classList.contains('invalid'), inputSel);
      console.log('nomeSolteiro invalid after suggestion:', stillInvalid);
    } else {
      console.log('No suggestion button found');
    }
  }

  await browser.close();
})();
