const path = require('path');

module.exports = {
  context: path.resolve(__dirname),
  entry: './entry.js',
  output: {
    filename: 'bundle.js',
    path: path.join(__dirname, 'build'),
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  module: {
    loaders: [
      {
        test: /\.svg$/,
        loader: 'icon-maker',
        include: path.join(__dirname, 'svg')
      }, {
        test: /\.svg$/,
        loader: 'icon-maker?fontFamily=bla',
        include: path.join(__dirname, '2svg')
      }, {
        test: /\.css$/g,
        loader: 'css'
      }, {
        test: /\.(woff|eot|ttf|svg)$/,
        loader: 'url',
        exclude: [
          path.join(__dirname, 'svg'),
          path.join(__dirname, '2svg')
        ]
      }
    ]
  },
  resolve: {
    alias: {
      'icon-maker-loader': path.join(__dirname, '..')
    }
  }
};
