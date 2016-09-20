const fs = require('fs');
const path = require('path');
const uuid = require('node-uuid');
// const os = require('os');

module.exports = () => {
  // const tmpFolder = path.join(os.tmpdir(), 'icon-maker-loader-tmp', uuid.v4());
  const tmpFolder = path.join(__dirname, '.tmp', uuid.v4());
  const baseTmpFolder = path.dirname(tmpFolder);

  // Try to make base dir if not exists
  try {
    fs.mkdirSync(baseTmpFolder);
    console.log(`Created dir '${baseTmpFolder}'.`);
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
  }

  // Remove all the folders' child folders
  const tmpFolders = fs.readdirSync(baseTmpFolder);
  tmpFolders.forEach(tmpFolderName => {
    const currTmpFolder = path.join(baseTmpFolder, tmpFolderName);
    const fileNamesInTmpFolder = fs.readdirSync(currTmpFolder);
    fileNamesInTmpFolder.forEach(fileNameInTmpFolder => {
      const fileInTmpFolder = path.join(currTmpFolder, fileNameInTmpFolder);
      fs.unlinkSync(fileInTmpFolder);
    });
    fs.rmdirSync(currTmpFolder);
  });

  // Try to make the tmp dir if not exists
  try {
    fs.mkdirSync(tmpFolder);
    console.log(`Created dir '${tmpFolder}'.`);
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
  }

  return tmpFolder;
};
