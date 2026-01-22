import { runGoldenTests } from './golden-xml.test';
import { runSearchTest } from './search.test';
import { runValidationTest } from './validation.test';

function run() {
  runValidationTest();
  runSearchTest();
  runGoldenTests();
  console.log('all tests ok');
}

run();
