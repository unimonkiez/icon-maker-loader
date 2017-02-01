const loaderUtils = require('loader-utils');
const InstanceManager = require('./instance-manager.js');

module.exports = function iconFontWebpackPluginLoader() {
  const svgPath = this.resourcePath;
  console.log('pitch', svgPath);
  const query = loaderUtils.parseQuery(this.query);
  const iconFontWebpackPluginInstance = InstanceManager.getInstance(query.id);

  const cb = this.async();
  iconFontWebpackPluginInstance.registerSvg(svgPath, (err, moduleContent) => {
    cb(err, moduleContent);
  });
};
