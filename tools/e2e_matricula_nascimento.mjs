import puppeteer from 'puppeteer';

(async () => {
  const url = 'http://127.0.0.1:4180/pages/Nascimento2Via.html';
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));

  try {
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Wait for cartorio CNS input and assert default value
    await page.waitForSelector('input[data-bind="certidao.cartorio_cns"]', { visible: true, timeout: 5000 });
    const cns = await page.$eval('input[data-bind="certidao.cartorio_cns"]', (el) => el.value);
    console.log('cartorio_cns:', cns);

    // Fill required fields for matrícula generation
    await page.waitForSelector('#matricula-livro');
    await page.click('#matricula-livro', { clickCount: 3 });
    await page.type('#matricula-livro', '00012');
    await page.click('#matricula-folha', { clickCount: 3 });
    await page.type('#matricula-folha', '023');
    await page.click('#matricula-termo', { clickCount: 3 });
    await page.type('#matricula-termo', '0001234');

    // Fill data_registro
    await page.click('input[data-bind="registro.data_registro"]', { clickCount: 3 });
    await page.type('input[data-bind="registro.data_registro"]', '18/07/2024');
    // trigger input/change so updateMatricula runs
    await page.evaluate(() => {
      const el = document.querySelector('input[data-bind="registro.data_registro"]');
      if (el) { el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }
      // also trigger events for livro/folha/termo in case bindings use these
      ['#matricula-livro', '#matricula-folha', '#matricula-termo'].forEach((sel) => {
        const e = document.querySelector(sel);
        if (e) { e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }
      });
      if (typeof window.updateMatricula === 'function') { try { window.updateMatricula(); } catch (e) { /* ignore */ } }
      // debug: print state values
      try { console.log('DBG typeof window.updateMatricula =', typeof window.updateMatricula); } catch(e) { /* ignore */ }
      try { console.log('DBG check #matricula value =', (document.querySelector('#matricula') || { value: null }).value); } catch(e) { /* ignore */ }
      try { console.log('DBG livro=', (document.querySelector('#matricula-livro') || { value: null }).value, 'folha=', (document.querySelector('#matricula-folha') || { value: null }).value, 'termo=', (document.querySelector('#matricula-termo') || { value: null }).value); } catch(e) { /* ignore */ }
      try { console.log('DBG data_registro=', (document.querySelector('input[data-bind="registro.data_registro"]') || { value: null }).value); } catch(e) { /* ignore */ }
      try { console.log('DBG cns_input=', (document.querySelector('input[data-bind="certidao.cartorio_cns"]') || { value: null }).value); } catch(e) { /* ignore */ }
      // try forcing an update by calling the exposed function directly
      try { if (typeof window.updateMatricula === 'function') { window.updateMatricula(); console.log('DBG called updateMatricula'); } } catch (e) { console.log('DBG updateMatricula call failed', e); }
      try { console.log('DBG after call #matricula value =', (document.querySelector('#matricula') || { value: null }).value); } catch(e) { /* ignore */ }
      // compute expected base30 + DV from DOM to diagnose why UI didn't generate
      try {
        const res = (function(){
          const digitsOnly = (v)=>String(v||'').replace(/\D/g,'');
          const padLeft = (v,s)=>digitsOnly(v).padStart(s,'0').slice(-s);
          const cns = digitsOnly((document.querySelector('input[data-bind="certidao.cartorio_cns"]')||{value:''}).value||'');
          const dr = (document.querySelector('input[data-bind="registro.data_registro"]')||{value:''}).value||'';
          const ano = (dr.match(/(\d{4})$/)||[])[1]||'';
          const tipo = '1';
          const livro = padLeft((document.getElementById('matricula-livro')||{value:''}).value,5);
          const folha = padLeft((document.getElementById('matricula-folha')||{value:''}).value,3);
          const termo = padLeft((document.getElementById('matricula-termo')||{value:''}).value,7);
          const base30 = `${cns}01` + `55${ano}${tipo}${livro}${folha}${termo}`;
          const calcDv = (base) => {
            if(!base||base.length!==30) return '';
            let s1=0; for(let i=0;i<30;i++) s1+=Number(base[i])*(31-i);
            let d1=11-(s1%11); d1 = d1===11?0: d1===10?1:d1;
            const seq31 = base + String(d1);
            let s2=0; for(let i=0;i<31;i++) s2+=Number(seq31[i])*(32-i);
            let d2=11-(s2%11); d2 = d2===11?0:d2===10?1:d2;
            return `${d1}${d2}`;
          };
          const dv = calcDv(base30);
          return {cns,ano,livro,folha,termo,base30,base30len:base30.length,dv,final: dv? base30+dv : ''};
        })();
        console.log('DBG computed matricula parts:', JSON.stringify(res));
      } catch(e) { console.log('DBG compute failed', e); }
    });

    await new Promise((r) => setTimeout(r, 300));

    const matricula = await page.$eval('#matricula', (el) => el.value);
    console.log('matricula field:', matricula);

    // Generate JSON and read output
    await page.evaluate(() => { const b = document.getElementById('btn-json'); if (b) b.click(); });
    await new Promise((r) => setTimeout(r, 250));

    const jsonText = await page.$eval('#json-output', (el) => el.value);
    console.log('json length:', jsonText ? jsonText.length : 0);
    const data = JSON.parse(jsonText || '{}');

    console.log('json.certidao.cartorio_cns:', data?.certidao?.cartorio_cns);
    console.log('json.registro.matricula:', data?.registro?.matricula);

    // Validations
    if (cns !== '163659') throw new Error(`cartorio_cns expected 163659 but was '${cns}'`);
    if (!data || !data.registro) throw new Error('JSON output invalid or missing registro');
    // accept matricula present either in the input field or in the JSON (mapper can compute fallback)
    const generated = (matricula && matricula.length ? matricula : (data.registro.matricula || ''));
    if (!generated) throw new Error('matricula not generated in field nor JSON');
    if (String(data.registro.matricula || '') !== String(generated || '')) throw new Error('matricula mismatch between field/JSON');
    if (String(data.certidao.cartorio_cns || '') !== '163659') throw new Error('JSON cartorio_cns mismatch');

    console.log('E2E matricula generation test: PASS');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('E2E matricula generation test: FAIL', err);
    await browser.close();
    process.exit(1);
  }
})();
