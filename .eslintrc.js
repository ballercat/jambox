/**
 * Eslint config
 *
 * @author    Joe Boyle <joboyle@wayfair.com>
 * @copyright 2020 Wayfair LLC - All rights reserved
 */

module.exports = {
  plugins: ['svelte3'],
  rules: {
    'no-console': 0,
    'no-undefined': 1,
    camelcase: 0,
    'import/no-namespace': 0,
    'import/no-extraneous-dependencies': 0,
    // The most trash rule in existence
    'import/no-unresolved': 0,
    'react/jsx-uses-react': 0,
    'react/react-in-jsx-scope': 0,
  },
  env: {
    browser: true,
    node: true,
    webextensions: true,
    es2022: true,
  },
  parserOptions: { /*ecmaVersion: 12,*/ sourceType: 'module' },
  overrides: [
    {
      files: ['*.svelte'],
      processor: 'svelte3/svelte3',
    },
  ],
};
