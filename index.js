const loaderUtils = require('loader-utils');
const IconMaker = require('icon-maker');
const path = require('path');
const fs = require('fs');
const createTmpDir = require('./create-tmp-dir.js');

// const tmpFolder = path.join(os.tmpdir(), 'icon-maker-loader-tmp', uuid.v4());
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
          var style = require("./${fontFamily}.css");
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
  if (this.cacheable) {
    this.cacheable();
  }
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
      console.log('GO - ' + fontFamily);
      writeFontFiles(fontFamily, font, err => {
        if (err) {
          throw err;
        }
        console.log('YES?');
        font.doOnRun.forEach(fn => fn());
        console.log('DONE - ' + fontFamily + `(${font.doOnRun.length})`);
        fonts[fontFamily] = {
          paths: fonts[fontFamily].paths,
          created: true
        };
      });
    }
    if (font.created) {
      console.log('load - created but not in');
      return moduleContent;
    } else {
      console.log('load - will wait');
      const cb = this.async();
      font.doOnRun.push(() => {
        console.log('loadding...');
        cb(undefined, moduleContent);
        font.paths.push(pathToSvg);
      });
      return undefined;
    }
  } else {
    console.log('load - already in');
    return moduleContent;
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
      iconMaker: new IconMaker({ fontFamily })
    };
  }
  const font = fonts[fontFamily];
  if (font.paths.indexOf(pathToSvg) === -1) {
    console.log('pitch first time');
    font.count += 1;
    font.iconMaker.addSvg(pathToSvg, fontFamily);
  } else {
    console.log('pitch else');
  }
};
module.exports.raw = true;
