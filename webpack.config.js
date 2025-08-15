var webpack = require('webpack');
var path = require('path');
var sourcePath = path.join(__dirname, './');
var outPath = path.join(__dirname, './dist');
var HtmlWebpackPlugin = require('html-webpack-plugin');

const baseRules = require('./webpack.rules.js');
const TsConfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    context: sourcePath,
    entry: {
      app: './src/index.tsx',
    },
    output: {
      path: outPath,
      filename: isProduction ? '[name].[contenthash].js' : 'bundle.js',
      chunkFilename: isProduction ? '[name].[contenthash].js' : '[chunkhash].js',
      publicPath: '/',
      clean: true,
    },
    target: 'web',
    mode: isProduction ? 'production' : 'development',
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
      ...(isProduction ? [] : [
        new webpack.HotModuleReplacementPlugin(),
        new ReactRefreshWebpackPlugin(),
      ]),
      new HtmlWebpackPlugin({
        template: path.join(__dirname, 'public', 'index.html'),
      }),
      new ForkTsCheckerWebpackPlugin(),
    ],
    devServer: {
      historyApiFallback: true,
    },
  };
};
