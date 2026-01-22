import puppeteer from 'puppeteer';
(async()=>{
  const url='http://127.0.0.1:4180/pages/Casamento2Via.html';
  const b=await puppeteer.launch({headless:true,args:['--no-sandbox']});
  const p=await b.newPage();
  p.on('console',m=>console.log('PAGE LOG',m.text()));
  p.on('pageerror', e => console.log('PAGE ERROR', e && e.message));
  await p.goto(url,{waitUntil:'networkidle2'});
  // give page more time to run all setup code (networkidle2 may be early)
  await p.evaluate(()=>new Promise(r=>setTimeout(r,2000)));
  await p.evaluate(()=>new Promise(r=>setTimeout(r,100)));

  const info = await p.evaluate(()=>{
    try{
      const hasWindowValidator = !!window._nameValidator;
      const hasFactory = typeof window.createNameValidator === 'function';
      const fields = Array.from(document.querySelectorAll('[data-name-validate]')).map((el)=>{
        const field = el.closest('.campo');
        return {
          name: el.name || null,
          hasHint: field ? !!field.querySelector('.name-suggest') : false,
          hasSuspectClass: field ? field.classList.contains('name-suspect') : false,
          hasInvalidClass: el.classList.contains('invalid')
        };
      });
      const localEnableName = localStorage.getItem('ui.enableNameValidation');
      const localMode = localStorage.getItem('ui.nameValidationMode');
      return { hasWindowValidator, hasFactory, fields, localEnableName, localMode };
    }catch(e){ return {err:String(e)} }
  });

  console.log('PAGE INFO', info);

  // simulate typing a suspicious name into pessoa 'nomeSolteiro' and blurring
  await p.evaluate(()=>{
    const input = document.querySelector('input[name="nomeSolteiro"]');
    if (!input) return {err: 'no input'};
    input.focus();
    input.value = 'weqdwad';
    input.dispatchEvent(new Event('input', {bubbles:true}));
    // trigger blur
    input.blur();
    return {ok:true};
  });
  // allow validator to run
  await p.evaluate(()=>new Promise(r=>setTimeout(r,300)));

  const checkResult = await p.evaluate(()=>{
    try{
      const input = document.querySelector('input[name="nomeSolteiro"]');
      const field = input ? (input.closest('.campo') || input.closest('.field') || input.parentElement) : null;
      const hint = field ? field.querySelector('.name-suggest') : null;
      const dictRaw = localStorage.getItem('certidao.nameDictionary.v1');
      return {
        invalidClass: input ? input.classList.contains('invalid') : null,
        fieldSuspect: field ? field.classList.contains('name-suspect') : null,
        hasHintButton: !!hint,
        hintText: hint ? hint.textContent : null,
        dictBefore: dictRaw ? JSON.parse(dictRaw) : null,
      };
    }catch(e){ return {err:String(e)} }
  });
  console.log('CHECK AFTER BLUR', checkResult);

  // click suggestion button if present
  const clickResult = await p.evaluate(()=>{
    try{
      const input = document.querySelector('input[name="nomeSolteiro"]');
      const field = input ? (input.closest('.campo') || input.closest('.field') || input.parentElement) : null;
      const hint = field ? field.querySelector('.name-suggest') : null;
      if (!hint) return {err:'no hint button'};
      hint.click();
      return {clicked:true};
    }catch(e){ return {err:String(e)} }
  });
  console.log('CLICK SUGGESTION', clickResult);
  await p.evaluate(()=>new Promise(r=>setTimeout(r,200)));
  const afterClick = await p.evaluate(()=>{
    const dictRaw = localStorage.getItem('certidao.nameDictionary.v1');
    return {dictAfter: dictRaw ? JSON.parse(dictRaw) : null};
  });
  console.log('DICT AFTER', afterClick);

  await b.close();
})();