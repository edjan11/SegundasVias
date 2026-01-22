(async () => {
  const mod = await import('../dist-src/shared/validators/name.js');
  const { isValidName, validateName } = mod;
  console.log('isValidName("A") =', isValidName('A'));
  console.log('validateName("A") =', validateName('A', { minWords: 2 }));
})();