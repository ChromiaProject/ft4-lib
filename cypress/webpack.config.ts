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
        exclude: modulePath =>
          /node_modules/.test(modulePath) &&
          !/node_modules\/@synthetixio\/synpress/.test(modulePath),
      },
    ],
  },
};

export default cypressWebpackConfig;
