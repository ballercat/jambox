const path = require('path');
const HTMLWebpackPlugin = require('html-webpack-plugin');
const ManifestPlugin = require('./manifest-plugin.js');
const MiniCssExtractPlugn = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
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
      //  svelte: path.resolve('node_modules', 'svelte'),
      svelte: path.dirname(require.resolve('svelte/package.json')),
    },
    mainFields: ['svelte', 'browser', 'module', 'main'],
    conditionNames: ['svelte', 'import'],
  },
  plugins: [
    new MiniCssExtractPlugn({ filename: 'styles.css' }),
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
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'ext/*.png',
          to() {
            return 'icons/[name][ext]';
          },
        },
      ],
    }),
  ],
  module: {
    rules: [
      {
        test: /.(js)$/,
        loader: 'babel-loader',
      },
      {
        test: /\.(svelte)$/,
        use: {
          loader: 'svelte-loader',
          options: {
            compilerOptions: {
              dev: !process.env.CI,
            },
            emitCss: true,
          },
        },
      },
      {
        test: /node_modules\/svelte\/.*\.mjs$/,
        resolve: {
          fullySpecified: false,
        },
      },
      // {
      //   test: /\.css$/i,
      //   use: ['style-loader', 'css-loader'],
      // },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugn.loader,
          {
            loader: 'css-loader',
            options: {
              url: false,
            },
          },
        ],
      },
    ],
  },
};
