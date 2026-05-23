const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    background: './src/background/index.ts',
    content: './src/content/index.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.shadow\.css$/,
        use: ['raw-loader', 'postcss-loader'],
      },
      {
        test: /\.css$/,
        exclude: /\.shadow\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@platforms': path.resolve(__dirname, 'src/platforms'),
      '@providers': path.resolve(__dirname, 'src/providers'),
      '@ocr': path.resolve(__dirname, 'src/ocr'),
      '@storage': path.resolve(__dirname, 'src/storage'),
    },
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [{ from: 'manifest.json', to: '.' }],
    }),
  ],
};
