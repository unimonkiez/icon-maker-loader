const IconMaker = require('icon-maker');
const path = require('path');
const fs = require('fs');
const createTmpDir = require('./create-tmp-dir.js');
const InstanceManager = require('./instance-manager.js');

const tmpFolder = createTmpDir();
const tmpFolderForNode = path.join('icon-maker-loader', path.relative(__dirname, tmpFolder)).replace(/\\/g, '/');

const loader = id => {
  const options = {
    id
  };
  return require.resolve('./loader') + (options ? '?' + JSON.stringify(options) : '');
};

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

class IconFontWebpackPlugin {
  static extract() {
    return loader(0);
  }
  constructor({
    fontFamily = 'icon-maker',
    files = ['eot', 'svg', 'ttf', 'woff'],
    localCss = false
  } = {}) {
    this._fontFamily = fontFamily;
    this._files = files;
    this._localCss = localCss;

    this._id = InstanceManager.setInstance(this);
  }
  apply(compiler) {
    compiler.plugin("normal-module-factory", function(nmf) {
        nmf.plugin("after-resolve", function(data) {
          console.log('after-resolve');
        });
    });
    // [
    //   'normal-module-factory',
    //   'after-resolve',
    //   'compile',
    //   'make',
    //   'emit',
    //   'after-emit',
    //   'done',
    //   'failed',
    //   'invalid',
    //   'after-plugins',
    //   'after-resolvers'
    // ].forEach(pluginName => {
    //   compiler.plugin(pluginName, () => {
    //     console.log(`***************************************${pluginName}***************************************`);
    //   });
    // });
    // compiler.plugin('this-compilation', compilation => {
    //   console.log(`***************************************${'this-compilation'}***************************************`);
    //   // compilation.plugin('optimize-tree', (chunks, modules, callback) => {
    //   //   console.log(`***************************************${'optimize-tree'}***************************************`);
    //   //   callback();
    //   // });
    //   // compilation.plugin('optimize', () => {
    //   //   console.log(`***************************************${'optimize'}***************************************`);
    //   // });
    //   compilation.plugin('after-hash', () => {
    //     console.log(`***************************************${'after-hash'}***************************************`);
    //   });
    // });
    // compiler.plugin('after-compile', (compilation, callback) => {
    //   if (this._svgPaths) {
    //     // on second time means all files have been loaded
    //     const fontFamily = this._fontFamily;
    //     const iconMaker = new IconMaker({
    //       fontFamily: this._fontFamily,
    //       files: this._files,
    //       isLocalCss: this._isLocalCss
    //     });
    //     this._loaderRegistries.forEach((([svgPath]) => {
    //       iconMaker.addSvg(svgPath);
    //     }));
    //
    //     writeFontFiles(fontFamily, iconMaker, err => {
    //       this._loaderRegistries.forEach((([svgPath, loaderCb]) => {
    //         const fileName = path.basename(svgPath, '.svg');
    //         loaderCb(err,
    //           `
    //             var style = require(${JSON.stringify(`${tmpFolderForNode}/${fontFamily}.js`)});
    //             if (style) {
    //               module.exports = style[${JSON.stringify(fontFamily)}] + " " + style[${JSON.stringify(`${fontFamily}-${fileName}`)}];
    //             } else {
    //               module.exports = ${JSON.stringify(`${fontFamily} ${fontFamily}-${fileName}`)};
    //             }
    //           `
    //         );
    //       }));
    //       delete this._loaderRegistries;
    //       callback();
    //     });
    //   } else {
    //     // on first time initialize registries
    //     this._loaderRegistries = [];
    //     callback();
    //   }
    // });
  }
  registerSvg(...args) {
    // console.log(this._loaderRegistries);
    // this._loaderRegistries.push(args);
  }
  extract() {
    return loader(this._id);
  }
}
module.exports = IconFontWebpackPlugin;
// const loaderUtils = require('loader-utils');
// const IconMaker = require('icon-maker');
// const path = require('path');
// const fs = require('fs');
// const createTmpDir = require('./create-tmp-dir.js');
//
// const tmpFolder = createTmpDir();
//
// const fonts = {};
//
// const writeFontFiles = (fontFamily, font, cb) => {
//   const pathToFontJs = path.join(tmpFolder, `${fontFamily}.js`);
//   font.iconMaker.run((err, outFont) => {
//     if (err) {
//       throw err;
//     }
//     Promise.all(outFont.fontFiles.map(fontFile => new Promise((resolve, reject) => {
//       fs.open(path.join(tmpFolder, path.basename(fontFile.path)), 'a', (openErr, fd) => {
//         if (openErr) {
//           reject(openErr);
//         } else {
//           fs.write(fd, fontFile.contents, 0, fontFile.contents.length, writeErr => {
//             if (writeErr) {
//               reject(writeErr);
//             } else {
//               fs.close(fd, closeErr => {
//                 if (closeErr) {
//                   reject(closeErr);
//                 } else {
//                   resolve();
//                 }
//               });
//             }
//           });
//         }
//       });
//     })).concat([
//       new Promise((resolve, reject) => {
//         fs.writeFile(path.join(tmpFolder, `${fontFamily}.css`), outFont.css, writeErr => {
//           if (writeErr) {
//             reject(writeErr);
//           } else {
//             resolve();
//           }
//         });
//       }),
//       new Promise((resolve, reject) => {
//         fs.writeFile(pathToFontJs, `
//           var style;
//           try {
//             style = require("./${fontFamily}.css");
//           } catch(e) {
//             if (e.code !== 'MODULE_NOT_FOUND') throw e;
//             style = {};
//           }
//           module.exports = style.locals;`, writeErr => {
//             if (writeErr) {
//               reject(writeErr);
//             } else {
//               resolve();
//             }
//           });
//       })
//     ])).then(cb.bind(undefined, undefined), rejects => {
//       if (rejects) {
//         cb(rejects);
//       }
//     });
//   });
// };
//
// var NS = fs.realpathSync(__dirname);
//
// module.exports = function iconMakerLoader() {
//   const pathToSvg = this.resourcePath;
//   console.log(
//     'loader',
//     pathToSvg
//   );
//   // const params = loaderUtils.parseQuery(this.query);
//   // const fileName = path.basename(pathToSvg, '.svg');
//   // const fontFamily = params.fontFamily || 'icon-maker';
//   // const font = fonts[fontFamily];
//   // const tmpFolderForNode = path.join('icon-maker-loader', path.relative(__dirname, tmpFolder)).replace(/\\/g, '/');
//   // const moduleContent = `
//   //   var style = require(${JSON.stringify(`${tmpFolderForNode}/${fontFamily}.js`)});
//   //   if (style) {
//   //     module.exports = style[${JSON.stringify(fontFamily)}] + " " + style[${JSON.stringify(`${fontFamily}-${fileName}`)}];
//   //   } else {
//   //     module.exports = ${JSON.stringify(`${fontFamily} ${fontFamily}-${fileName}`)};
//   //   }
//   // `;
//
//   return '';
//
//   // if (font.paths.indexOf(pathToSvg) === -1) {
//   //   font.count -= 1;
//   //   if (font.count === 0) {
//   //     writeFontFiles(fontFamily, font, err => {
//   //       if (err) {
//   //         throw err;
//   //       }
//   //       font.doOnRun.forEach(fn => fn());
//   //       fonts[fontFamily] = {
//   //         paths: fonts[fontFamily].paths,
//   //         created: true
//   //       };
//   //     });
//   //   }
//   //   if (font.created) {
//   //     return moduleContent;
//   //   } else {
//   //     const cb = this.async();
//   //     font.doOnRun.push(() => {
//   //       font.paths.push(pathToSvg);
//   //       cb(undefined, moduleContent);
//   //     });
//   //     return undefined;
//   //   }
//   // } else {
//   //   return moduleContent;
//   // }
// };
// module.exports.pitch = function iconMakerLoaderPitch(pathToSvg) {
//   // debugger;
//   console.log(
//     'pitch',
//     pathToSvg
//   );
//   this._compilation.plugin('compile', (compilation, callback) => {
//     this[NS] = false;
//     console.log('***********************************************************************compile');
//     callback();
//   });
//   this._compilation.plugin('after-compile', (compilation, callback) => {
//     this[NS] = false;
//     console.log('***********************************************************************after-compile');
//     callback();
//   });
//   this._compilation.plugin('done', (compilation, callback) => {
//     this[NS] = false;
//     console.log('***********************************************************************done');
//     callback();
//   });
//   // if (this[NS]) {
//   //   return '';
//   // } else {
//   //   this[NS] = true;
//   //   this._compilation.plugin('after-compile', (compilation, callback) => {
//   //     this[NS] = false;
//   //     console.log('post-finish');
//   //     callback();
//   //   });
//   // }
//   // const params = loaderUtils.parseQuery(this.query);
//   // const fontFamily = params.fontFamily || 'icon-maker';
//   // const isLocalCss = params.localCss !== undefined ? true : undefined;
//   // const files = params.files !== undefined ? params.files.split(',') : undefined;
//   // if (fonts[fontFamily] === undefined || fonts[fontFamily].count === undefined) {
//   //   fonts[fontFamily] = {
//   //     count: 0,
//   //     paths: fonts[fontFamily] === undefined ? [] : fonts[fontFamily].paths,
//   //     created: fonts[fontFamily] === undefined ? false : fonts[fontFamily].created,
//   //     doOnRun: [],
//   //     iconMaker: new IconMaker({ fontFamily, files, isLocalCss })
//   //   };
//   // }
//   // const font = fonts[fontFamily];
//   // if (font.paths.indexOf(pathToSvg) === -1) {
//   //   font.count += 1;
//   //   font.iconMaker.addSvg(pathToSvg, fontFamily);
//   // }
// };
