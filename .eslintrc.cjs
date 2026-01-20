module.exports = {
  root: true,
  env: {
    es2021: true,
    node: true,
    browser: true
  },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'unused-imports'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
    // Note: intentionally NOT using "project" here to avoid heavy type-aware rules
  },
  // Files/dirs we should ignore from linting (build artifacts / bundles)
  ignorePatterns: ['dist/', 'build/', 'public/', 'node_modules/', 'ui/js/*.bundle.js', '*.bundle.js'],

  rules: {
    // Disable core rules superseded by TS-aware rules
    'no-undef': 'off',
    'no-unused-vars': 'off',

    // Prefer unused-imports to auto-clean imports, but as warnings so it doesn't block
    'unused-imports/no-unused-imports': 'warn',

    // Make some rules less strict by default (warn instead of error)
    'no-redeclare': 'warn'
  },

  overrides: [
    // Only lint TS files under src/ by default (script targets these files)
    {
      files: ['src/**/*.{ts,tsx}'],
      rules: {
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/explicit-module-boundary-types': 'warn',
        'unused-imports/no-unused-imports': 'warn',
        // prefer console to be allowed as warn in general code
        'no-console': 'warn'
      }
    },
    // In UI and test code we allow console usage freely
    {
      files: ['src/ui/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx,js,jsx}'],
      rules: { 'no-console': 'off' }
    },
    // JS files (bundles / tooling) parsed by espree, but we avoid linting build artifacts via ignorePatterns
    {
      files: ['**/*.js'],
      parser: 'espree',
      rules: {}
    }
  ]
};
