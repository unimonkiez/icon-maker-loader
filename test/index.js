const webpack = require('webpack');
const config = require('./webpack.config.js');

const compiler = webpack(config);
compiler.run(err => {
  if (err) {
    throw err;
  }
  const build = require('./build/bundle.js');

  console.log(build);
});
