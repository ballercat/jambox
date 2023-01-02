const path = require('path');
const HTMLWebpackPlugin = require('html-webpack-plugin');
const ManifestPlugin = require('./manifest-plugin.js');
const { EnvironmentPlugin } = require('webpack');

module.exports = {
  mode: process.env.CI ? 'production' : 'development',
  devtool: 'source-map',
  entry: {
    devtool: './ext/devtool.js',
    panel: './ext/panel.js',
  },
  output: {
    path: path.join(__dirname, 'build'),
    filename: '[name].js',
    clean: true,
  },
  resolve: {
    extensions: ['.js', '.mjs', '.svelte'],
    alias: {
      svelte: path.resolve('node_modules', 'svelte'),
    },
    mainFields: ['svelte', 'browser', 'module', 'main'],
  },
  plugins: [
    new ManifestPlugin(),
    new HTMLWebpackPlugin({
      filename: 'panel.html',
      chunks: ['panel'],
      template: path.join(__dirname, 'ext', 'panel.html'),
    }),
    new HTMLWebpackPlugin({
      filename: 'devtool.html',
      chunks: ['devtool'],
      template: path.join(__dirname, 'ext', 'devtool.html'),
    }),
    new EnvironmentPlugin({
      BROWSER: 'chrome',
    }),
  ],
  module: {
    rules: [
      {
        test: /.(js)$/,
        loader: 'babel-loader',
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(svelte)$/,
        use: {
          loader: 'svelte-loader',
          options: {
            compilerOptions: {
              dev: false,
            },
            hotReload: false,
          },
        },
      },
      {
        test: /node_modules\/svelte\/.*\.mjs$/,
        resolve: {
          fullySpecified: false,
        },
      },
    ],
  },
};
