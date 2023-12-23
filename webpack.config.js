import * as url from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';
import HTMLWebpackPlugin from 'html-webpack-plugin';
import ManifestPlugin from './manifest-plugin.js';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import webpack from 'webpack';

const { EnvironmentPlugin } = webpack;
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(import.meta.url);

export default {
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
        test: /\.(js)$/,
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.(js)$/,
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
          },
        },
      },
      {
        test: /node_modules\/svelte\/.*\.mjs$/,
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
};
