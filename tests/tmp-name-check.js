(async () => {
  const mod = await import('../dist-src/shared/validators/name.js');
  const { validateName, isValidName } = mod;
  const samples = ["O'Connor Maria", 'Anne-Marie Silva'];
  for (const s of samples) {
    console.log(s, validateName(s, { minWords: 2 }), isValidName(s));
  }
})();