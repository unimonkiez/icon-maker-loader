const webpack = require('webpack');
const config = require('./webpack.config.js');

const compiler = webpack(config);
compiler.watch({}, err => {
  if (err) {
    throw err;
  }
  try {
    delete require.cache[require.resolve('./build/bundle.js')];

    // Disable global require because need to import the build only after it's done building
    // eslint-disable-next-line global-require
    const build = require('./build/bundle.js');

    console.log('result:', build);
  } catch (e) {
    console.log(e);
  }
});
