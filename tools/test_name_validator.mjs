(async ()=>{
  try {
    const mod = await import('../dist-src/shared/nameValidator/index.js');
    const v = mod.createNameValidator();
    console.log('check weqdwad ->', v.check('weqdwad'));
    console.log('check Ana Silva ->', v.check('Ana Silva'));
    console.log('check Joao ->', v.check('Joao'));
  } catch (e) {
    console.error('ERROR', e);
  }
})();
