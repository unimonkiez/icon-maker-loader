const loaderUtils = require('loader-utils');
const IconMaker = require('icon-maker');
const path = require('path');
const fs = require('fs');
const createTmpDir = require('./create-tmp-dir.js');

const tmpFolder = createTmpDir();
const tmpFolderForNode = path.join('icon-maker-loader', path.relative(__dirname, tmpFolder)).replace(/\\/g, '/');

const fonts = {};

const writeFontFiles = (fontFamily, iconMaker, cb) => {
  const pathToFontJs = path.join(tmpFolder, `${fontFamily}.js`);
  iconMaker.run((err, outFont) => {
    if (err) {
      throw err;
    }
    Promise.all(outFont.fontFiles.map(fontFile => new Promise((resolve, reject) => {
      fs.open(path.join(tmpFolder, path.basename(fontFile.path)), 'a', (openErr, fd) => {
        if (openErr) {
          reject(openErr);
        } else {
          fs.write(fd, fontFile.contents, 0, fontFile.contents.length, writeErr => {
            if (writeErr) {
              reject(writeErr);
            } else {
              fs.close(fd, closeErr => {
                if (closeErr) {
                  reject(closeErr);
                } else {
                  resolve();
                }
              });
            }
          });
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
  console.log('load', pathToSvg);
  const params = loaderUtils.parseQuery(this.query);
  const fileName = path.basename(pathToSvg, '.svg');
  const fontFamily = params.fontFamily || 'icon-maker';
  const isLocalCss = params.localCss !== undefined ? true : undefined;
  const files = params.files !== undefined ? params.files.split(',') : undefined;
  if (fonts[fontFamily] === undefined) {
    fonts[fontFamily] = {
      doOnFinish: [],
      iconMaker: new IconMaker({ fontFamily, files, isLocalCss })
    };
  }
  const font = fonts[fontFamily];
  clearTimeout(font.timeoutIdentifier);
  font.iconMaker.addSvg(pathToSvg, fontFamily);
  const cb = this.async();
  font.doOnFinish.push(err => {
    const moduleContent = `
      var style = require(${JSON.stringify(`${tmpFolderForNode}/${fontFamily}.js`)});
      if (style) {
        module.exports = style[${JSON.stringify(fontFamily)}] + " " + style[${JSON.stringify(`${fontFamily}-${fileName}`)}];
      } else {
        module.exports = ${JSON.stringify(`${fontFamily} ${fontFamily}-${fileName}`)};
      }
    `;
    cb(err, moduleContent);
  });
  font.timeoutIdentifier = setTimeout(() => {
    writeFontFiles(fontFamily, font.iconMaker, err => {
      console.log(err);
      setTimeout(() => {
        font.doOnFinish.forEach(fn => fn(err));
        delete fonts[fontFamily];
      }, 1000);
    });
  }, 1000);
};
