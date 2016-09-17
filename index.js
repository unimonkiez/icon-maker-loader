const loaderUtils = require('loader-utils');
const IconMaker = require('icon-maker');
const path = require('path');
const fs = require('fs');

const tmpFolder = path.join(__dirname, '.tmp');
// Create dir, won't fail if exists
try {
  fs.mkdirSync(tmpFolder);
  console.log(`Created dir '${tmpFolder}'.`);
} catch (e) {
  if (e.code !== 'EEXIST') throw e;
}

const fonts = {};
let count = 0;

module.exports = function iconMakerLoader() {
  count -= 1;
  const pathToSvg = this.resourcePath;
  const params = loaderUtils.parseQuery(this.query);

  const fileName = path.basename(pathToSvg, '.svg');
  const fontFamily = params.fontFamily || 'default';
  const cb = this.async();
  const font = fonts[fontFamily];
  font.doOnRun.push(pathToCss => {
    cb(undefined, `
      var style = require(${JSON.stringify(pathToCss)});
      var locals = style.locals;
      if (locals) {
        module.exports = locals[${JSON.stringify(fontFamily)}] + " " + locals[${JSON.stringify(`${fontFamily}-${fileName}`)}];
      } else {
        module.exports = ${JSON.stringify(`${fontFamily} ${fontFamily}-${fileName}`)};
      }
    `);
  });
  if (count === 0) {
    console.log('GO');
    font.iconMaker.run((err, outFonts) => {
      if (err) {
        throw err;
      }
      const outFont = outFonts[0];
      Promise.all(outFont.fontFiles.map(fontFile => new Promise(resolve => {
        fs.writeFile(path.join(tmpFolder, path.basename(fontFile.path)), fontFile.contents.toString(), resolve);
      }))).then(() => {
        const pathToCss = path.join(tmpFolder, `${fontFamily}.css`);
        fs.writeFile(pathToCss, outFont.css, () => {
          font.doOnRun.forEach(fn => fn(pathToCss));
          fonts[fontFamily] = undefined;
        });
      });
    });
  }
};
module.exports.pitch = function iconMakerLoaderPitch(pathToSvg) {
  count += 1;
  console.log(pathToSvg);
  const params = loaderUtils.parseQuery(this.query);
  const fontFamily = params.fontFamily || 'default';
  if (fonts[fontFamily] === undefined) {
    fonts[fontFamily] = {
      lastPathToSvg: pathToSvg,
      doOnRun: [],
      iconMaker: new IconMaker()
    };
  }
  const font = fonts[fontFamily];
  font.iconMaker.addSvg(pathToSvg, fontFamily);
};
module.exports.raw = true;
