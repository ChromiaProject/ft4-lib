const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const webpack = require('webpack');

module.exports = env => ({
  entry: './src/index.ts',
  devtool: 'eval-source-map',
  mode: env.mode === 'prod' ? 'production' : 'development',
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: 'bundle.js',
    publicPath: '/'
  },
  target: 'web',
  devServer: {
    port: '5002',
    static: {
      directory: path.join(__dirname, './public')
    },
    open: false,
    hot: true,
    liveReload: true,
    historyApiFallback: true
  },
  experiments: {
    topLevelAwait: true
  },
  resolve: {
    extensions: ['.js', '.json', '.ts'],
    fallback: {
      "buffer": require.resolve("buffer"),
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"),
      "vm": require.resolve("vm-browserify"),
      "events": require.resolve("events/"),
      "url": false,
      "http": false,
      "https": false,
      "zlib": false,
      "assert": false,
      "net": false,
      "tls": false,
      "utf-8-validate": false,
      "bufferutil": false
    }
  },
  module: {
    rules: [
      {
        test: /\.(js|ts)$/, 
        exclude: /node_modules/, 
        use: 'ts-loader', 
      }
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, 'public', 'index.html')
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
  ]
});
