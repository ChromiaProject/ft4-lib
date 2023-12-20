import webpack from 'webpack';

const cypressWebpackConfig: webpack.Configuration = {
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.(js|ts)$/,
        use: {
          loader: 'babel-loader',
          options: {
            sourceType: 'unambiguous',
            presets: [
              [
                '@babel/preset-env',
                {
                  modules: 'commonjs',
                },
              ],
            ],
            plugins: ['@babel/plugin-transform-runtime'], // For async/await support
          },
        },
        // This is basically the whole point of this file
        // Only transpile Synpress modules in order to make it possible
        // for the end-to-end tests to be implemented in TypeScript
        exclude: modulePath =>
          /node_modules/.test(modulePath) &&
          !/node_modules\/@synthetixio\/synpress/.test(modulePath),
      },
    ],
  },
};

export default cypressWebpackConfig;
