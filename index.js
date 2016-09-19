const loaderUtils = require('loader-utils');
const IconMaker = require('icon-maker');
const path = require('path');
const fs = require('fs');
const os = require('os');
const uuid = require('node-uuid');

const tmpFolder = path.join(os.tmpdir(), 'icon-maker-loader-tmp', uuid.v4());
// const tmpFolder = path.join(__dirname, '.tmp', uuid.v4());

// Create dirs, won't fail if exists
try {
  const baseTmpFolder = path.dirname(tmpFolder);
  fs.mkdirSync(baseTmpFolder);
  console.log(`Created dir '${baseTmpFolder}'.`);
} catch (e) {
  if (e.code !== 'EEXIST') throw e;
}
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
  const font = fonts[fontFamily];
  const pathToFontJs = path.join(tmpFolder, `${fontFamily}.js`);
  if (font.created === false && font.paths.indexOf(pathToSvg) === -1) {
    const cb = this.async();
    const exportFn = () => {
      if (font.paths.indexOf(pathToSvg) === -1) {
        console.log();
        cb(undefined, `
          var style = require(${JSON.stringify(pathToFontJs)});
          if (style) {
            module.exports = style[${JSON.stringify(fontFamily)}] + " " + style[${JSON.stringify(`${fontFamily}-${fileName}`)}];
          } else {
            module.exports = ${JSON.stringify(`${fontFamily} ${fontFamily}-${fileName}`)};
          }
        `);
        font.paths.push(pathToSvg);
      }
    };
    font.doOnRun.push(exportFn);
    console.log('load - ' + fontFamily + ' - ' + font.count);
    font.count -= 1;
    if (font.count === 0) {
      console.log('GO - ' + fontFamily);
      font.iconMaker.run((err, outFonts) => {
        if (err) {
          throw err;
        }
        const outFont = outFonts[0];
        Promise.all(outFont.fontFiles.map(fontFile => new Promise(resolve => {
          fs.writeFile(path.join(tmpFolder, path.basename(fontFile.path)), fontFile.contents.toString(), resolve);
        }))).then(() => {
          fs.writeFile(path.join(tmpFolder, `${fontFamily}.css`), outFont.css, () => {
            fs.writeFile(pathToFontJs, `
            var style = require("./${fontFamily}.css");
            module.exports = style.locals;
            `, () => {
              font.doOnRun.forEach(fn => fn(pathToFontJs));
              fonts[fontFamily] = {
                paths: fonts[fontFamily].paths,
                created: true
              };
              console.log('DONE - ' + fontFamily);
            });
          });
        });
      });
    }
  } else {
    return `
      var style = require(${JSON.stringify(pathToFontJs)});
      if (style) {
        module.exports = style[${JSON.stringify(fontFamily)}] + " " + style[${JSON.stringify(`${fontFamily}-${fileName}`)}];
      } else {
        module.exports = ${JSON.stringify(`${fontFamily} ${fontFamily}-${fileName}`)};
      }
    `;
  }
};
module.exports.pitch = function iconMakerLoaderPitch(pathToSvg) {
  const params = loaderUtils.parseQuery(this.query);
  const fontFamily = params.fontFamily || 'default';
  if (fonts[fontFamily] === undefined || fonts[fontFamily].count === undefined) {
    fonts[fontFamily] = {
      count: 0,
      paths: fonts[fontFamily] === undefined ? [] : fonts[fontFamily].paths,
      created: fonts[fontFamily] === undefined ? false : fonts[fontFamily].created,
      doOnRun: [],
      iconMaker: new IconMaker()
    };
  }
  const font = fonts[fontFamily];
  console.log('pitch - ' + fontFamily + ' - ' + font.count);
  if (font.paths.indexOf(pathToSvg) === -1) {
    font.count += 1;
    font.iconMaker.addSvg(pathToSvg, fontFamily);
  }
};
module.exports.raw = true;
