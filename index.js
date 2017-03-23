const loaderUtils = require('loader-utils');
const IconMaker = require('icon-maker');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const createTmpDir = require('./create-tmp-dir.js');

const tmpFolder = createTmpDir();
const tmpFolderForNode = path.join('icon-maker-loader', path.relative(__dirname, tmpFolder)).replace(/\\/g, '/');

const fonts = {};
const filesForFont = {};

const getSha1ForContent = content => crypto.createHash('sha1').update(content).digest('hex');

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
          }
          module.exports = style;`, writeErr => {
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
  const fontFamily = params.fontFamily || 'icon-maker';
  const isLocalCss = params.localCss !== undefined ? true : undefined;
  const files = params.files !== undefined ? params.files.split(',') : undefined;
  if (fonts[fontFamily] === undefined) {
    fonts[fontFamily] = {
      doOnFinish: [],
      paths: [],
      iconMaker: new IconMaker({ fontFamily, files, isLocalCss })
    };
  }
  const font = fonts[fontFamily];
  clearTimeout(font.timeoutIdentifier);
  font.iconMaker.addSvg(pathToSvg, fontFamily);
  const cb = this.async();
  const moduleContent = `
  var style = require(${JSON.stringify(`${tmpFolderForNode}/${fontFamily}.js`)});
  var mainClass = style[${JSON.stringify(fontFamily)}];
  if (mainClass) {
    module.exports = mainClass + " " + style[${JSON.stringify(`${fontFamily}-${fileName}`)}];
  } else {
    module.exports = ${JSON.stringify(`${fontFamily} ${fontFamily}-${fileName}`)};
  }
  `;
  font.paths.push(pathToSvg);
  font.doOnFinish.push(err => {
    cb(err, moduleContent);
  });
  font.timeoutIdentifier = setTimeout(() => {
    const isFirstTime = filesForFont[fontFamily] === undefined;
    let shouldntRebundleFontPromise;
    if (isFirstTime) {
      // Always build on first time
      shouldntRebundleFontPromise = Promise.reject();
    } else {
      shouldntRebundleFontPromise = Promise.all(
        [
          new Promise((res, rej) => {
            const isThereAChangeInLength = Object.keys(filesForFont[fontFamily]).length !== font.paths.length;
            if (isThereAChangeInLength) {
              rej();
            } else {
              res();
            }
          })
        ].concat(font.paths.map(currPathToSvg => new Promise((res, rej) => {
          fs.readFile(currPathToSvg, (err, data) => {
            const isThereAChangeInHashForSvg = filesForFont[fontFamily][currPathToSvg] !== getSha1ForContent(data);
            if (isThereAChangeInHashForSvg) {
              rej();
            } else {
              res();
            }
          });
        })))
      );
    }
    shouldntRebundleFontPromise.then(
      () => {
        font.doOnFinish.forEach(fn => fn());
        delete fonts[fontFamily];
      },
      () => {
        filesForFont[fontFamily] = {};
        Promise.all(
          [
            new Promise((res, rej) => {
              writeFontFiles(fontFamily, font.iconMaker, err => {
                if (err) {
                  rej(err);
                } else {
                  res();
                }
              });
            })
          ].concat(font.paths.map(currPathToSvg => new Promise((res, rej) => {
            fs.readFile(currPathToSvg, (err, data) => {
              if (err) {
                rej(err);
              } else {
                filesForFont[fontFamily][currPathToSvg] = getSha1ForContent(data);
                res();
              }
            });
          })))
        ).then(() => {
          font.doOnFinish.forEach(fn => fn());
          delete fonts[fontFamily];
        }, err => {
          font.doOnFinish.forEach(fn => fn(err));
          delete fonts[fontFamily];
        });
      });
  }, 1000);
};
