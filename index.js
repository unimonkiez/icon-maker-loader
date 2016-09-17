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

module.exports = function iconMakerLoader() {
  const pathToSvg = this.resourcePath;
  const params = loaderUtils.parseQuery(this.query);
  const fileName = path.basename(pathToSvg, '.svg');
  const fontFamily = params.fontFamily || 'default';
  const cb = this.async();
  const font = fonts[fontFamily];
  font.doOnRun.push(pathTojs => {
    cb(undefined, `
      //var style = require(${JSON.stringify(pathTojs)});
      var style = false;
      if (style) {
        module.exports = style[${JSON.stringify(fontFamily)}] + " " + style[${JSON.stringify(`${fontFamily}-${fileName}`)}];
      } else {
        module.exports = ${JSON.stringify(`${fontFamily} ${fontFamily}-${fileName}`)};
      }
    `);
  });
  console.log('loader - ' + font.count);
  font.count -= 1;
  if (font.count === 0) {
    console.log('GO');
    console.log(fileName);
    console.log(this.query);
    console.log(fontFamily);
    font.iconMaker.run((err, outFonts) => {
      if (err) {
        throw err;
      }
      const outFont = outFonts[0];
      Promise.all(outFont.fontFiles.map(fontFile => new Promise(resolve => {
        fs.writeFile(path.join(tmpFolder, path.basename(fontFile.path)), fontFile.contents.toString(), resolve);
      }))).then(() => {
        fs.writeFile(path.join(tmpFolder, `${fontFamily}.css`), outFont.css, () => {
          const pathToFontJs = path.join(tmpFolder, `${fontFamily}.js`);
          fs.writeFile(pathToFontJs, `
          var style = require("./${fontFamily}.css");
          module.exports = style.locals;
          `, () => {
            font.doOnRun.forEach(fn => fn(pathToFontJs));
            fonts[fontFamily] = undefined;
          });
        });
      });
    });
  }
};
module.exports.pitch = function iconMakerLoaderPitch(pathToSvg) {
  if (pathToSvg.indexOf('!') === -1) {
    const params = loaderUtils.parseQuery(this.query);
    const fontFamily = params.fontFamily || 'default';
    if (fonts[fontFamily] === undefined) {
      fonts[fontFamily] = {
        count: 0,
        lastPathToSvg: pathToSvg,
        doOnRun: [],
        iconMaker: new IconMaker()
      };
    }
    const font = fonts[fontFamily];
    console.log('pitch - ' + font.count);
    font.count += 1;
    font.iconMaker.addSvg(pathToSvg, fontFamily);
  }
};
module.exports.raw = true;
