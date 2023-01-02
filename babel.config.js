module.exports = {
  plugins: [],
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          chrome: 100,
        },
      },
    ],
  ],
};
