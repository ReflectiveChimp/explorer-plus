const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  target: ['web', 'es5'],
  mode: 'production',
  watchOptions: {
    poll: 1000,
  },
  entry: {
    etherscan: path.resolve(__dirname, '..', 'src', 'etherscan', 'index.ts'),
  },
  output: {
    path: path.join(__dirname, '../dist'),
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.ts', '.js'],
    fallback: {
      fs: false,
      vm: require.resolve('vm-browserify'),
      path: require.resolve('path-browserify'),
    },
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
      patterns: [{ from: '.', to: '.', context: 'public' }],
    }),
  ],
};
