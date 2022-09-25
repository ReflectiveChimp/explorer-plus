const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  watchOptions: {},
  entry: {
    background: path.resolve(__dirname, '..', 'src', 'background.ts'),
    etherscan: path.resolve(__dirname, '..', 'src', 'etherscan.ts'),
  },
  output: {
    path: path.join(__dirname, '../dist'),
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [{from: '.', to: '.', context: 'public'}],
    }),
  ],
};