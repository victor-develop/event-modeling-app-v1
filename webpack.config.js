var webpack = require('webpack');
var path = require('path');
var sourcePath = path.join(__dirname, './');
var outPath = path.join(__dirname, './dist');
var HtmlWebpackPlugin = require('html-webpack-plugin');

const baseRules = require('./webpack.rules.js');
const TsConfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

module.exports = {
  context: sourcePath,
  entry: {
    app: './src/index.tsx',
  },
  output: {
    path: outPath,
    filename: 'bundle.js',
    chunkFilename: '[chunkhash].js',
    publicPath: '/',
  },
  target: 'web',
  mode: 'development',
  resolve: {
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx'],
    mainFields: ['module', 'browser', 'main'],
    plugins: [new TsConfigPathsPlugin({})],
  },
  module: {
    rules: [
      ...baseRules,
      {
        test: /\.html$/,
        loader: 'html-loader',
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new ReactRefreshWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, 'public', 'index.html'),
    }),
    new ForkTsCheckerWebpackPlugin(),
  ],
  devServer: {
    historyApiFallback: true,
  },
};
