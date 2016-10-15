const loaderUtils = require('loader-utils');
const IconMaker = require('icon-maker');
const path = require('path');
const fs = require('fs');
const createTmpDir = require('./create-tmp-dir.js');

const tmpFolder = createTmpDir();

const fonts = {};

const writeFontFiles = (fontFamily, font, cb) => {
  const pathToFontJs = path.join(tmpFolder, `${fontFamily}.js`);
  font.iconMaker.run((err, outFont) => {
    if (err) {
      throw err;
    }
    Promise.all(outFont.fontFiles.map(fontFile => new Promise((resolve, reject) => {
      fs.writeFile(path.join(tmpFolder, path.basename(fontFile.path)), fontFile.contents.toString(), writeErr => {
        if (writeErr) {
          reject(writeErr);
        } else {
          resolve();
        }
      });
    })).concat([
      new Promise((resolve, reject) => {
        fs.writeFile(path.join(tmpFolder, `${fontFamily}.css`), outFont.css, writeErr => {
          if (writeErr) {
            reject(writeErr);
          } else {
            resolve();
          }
        });
      }),
      new Promise((resolve, reject) => {
        fs.writeFile(pathToFontJs, `
          var style;
          try {
            style = require("./${fontFamily}.css");
          } catch(e) {
            if (e.code !== 'MODULE_NOT_FOUND') throw e;
            style = {};
          }
          module.exports = style.locals;`, writeErr => {
            if (writeErr) {
              reject(writeErr);
            } else {
              resolve();
            }
          });
      })
    ])).then(cb.bind(undefined, undefined), rejects => {
      if (rejects) {
        cb(rejects);
      }
    });
  });
};

module.exports = function iconMakerLoader() {
  const pathToSvg = this.resourcePath;
  const params = loaderUtils.parseQuery(this.query);
  const fileName = path.basename(pathToSvg, '.svg');
  const fontFamily = params.fontFamily || 'default';
  const font = fonts[fontFamily];
  const tmpFolderForNode = path.join('icon-maker-loader', path.relative(__dirname, tmpFolder)).replace(/\\/g, '/');
  const moduleContent = `
    var style = require(${JSON.stringify(`${tmpFolderForNode}/${fontFamily}.js`)});
    if (style) {
      module.exports = style[${JSON.stringify(fontFamily)}] + " " + style[${JSON.stringify(`${fontFamily}-${fileName}`)}];
    } else {
      module.exports = ${JSON.stringify(`${fontFamily} ${fontFamily}-${fileName}`)};
    }
  `;

  if (font.paths.indexOf(pathToSvg) === -1) {
    font.count -= 1;
    if (font.count === 0) {
      writeFontFiles(fontFamily, font, err => {
        if (err) {
          throw err;
        }
        font.doOnRun.forEach(fn => fn());
        fonts[fontFamily] = {
          paths: fonts[fontFamily].paths,
          created: true
        };
      });
    }
    if (font.created) {
      return moduleContent;
    } else {
      const cb = this.async();
      font.doOnRun.push(() => {
        font.paths.push(pathToSvg);
        cb(undefined, moduleContent);
      });
      return undefined;
    }
  } else {
    return moduleContent;
  }
};
module.exports.pitch = function iconMakerLoaderPitch(pathToSvg) {
  const params = loaderUtils.parseQuery(this.query);
  const fontFamily = params.fontFamily || 'default';
  const isLocalCss = params.localCss !== undefined;
  const files = params.files !== undefined ? params.files.split(',') : ['eot', 'svg', 'ttf', 'woff'];
  if (fonts[fontFamily] === undefined || fonts[fontFamily].count === undefined) {
    fonts[fontFamily] = {
      count: 0,
      paths: fonts[fontFamily] === undefined ? [] : fonts[fontFamily].paths,
      created: fonts[fontFamily] === undefined ? false : fonts[fontFamily].created,
      doOnRun: [],
      iconMaker: new IconMaker({ fontFamily, files, isLocalCss })
    };
  }
  const font = fonts[fontFamily];
  if (font.paths.indexOf(pathToSvg) === -1) {
    font.count += 1;
    font.iconMaker.addSvg(pathToSvg, fontFamily);
  }
};
module.exports.raw = true;
