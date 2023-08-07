module.exports = {
  plugins: ['svelte3', 'typescript'],
  rules: {
    'no-console': 0,
    'no-undefined': 1,
    'no-unused-vars': ['error', { ignoreRestSiblings: true }],
    camelcase: 0,
    'import/no-namespace': 0,
    'import/no-extraneous-dependencies': 0,
    // The most trash rule in existence
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
