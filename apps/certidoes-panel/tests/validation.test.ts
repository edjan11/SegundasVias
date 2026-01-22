import { validateInput } from '../src/core/validators';

export function runValidationTest() {
  const bad = validateInput({ certidao: { tipo_registro: 'casamento' }, registro: { conjuges: [] } } as any);
  if (bad.ok) throw new Error('validation should fail for missing conjuges');
  return true;
}

if (require.main === module) {
  runValidationTest();
  console.log('validation ok');
}
