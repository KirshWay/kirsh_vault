// eslint-disable-next-line
const fs = require('fs');
// eslint-disable-next-line
const path = require('path');

const iconsDir = path.join(__dirname, '../out/icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(__dirname, '../out/.nojekyll'), '');

if (fs.existsSync(path.join(__dirname, '../public/404.html'))) {
  fs.copyFileSync(
    path.join(__dirname, '../public/404.html'),
    path.join(__dirname, '../out/404.html')
  );
  console.log('✅ Copy 404.html completed');
}

const copyIconsIfExists = (sourceDir, targetDir, filenames) => {
  filenames.forEach((filename) => {
    const sourcePath = path.join(sourceDir, filename);
    const targetPath = path.join(targetDir, filename);

    if (fs.existsSync(sourcePath)) {
      const targetDirname = path.dirname(targetPath);
      if (!fs.existsSync(targetDirname)) {
        fs.mkdirSync(targetDirname, { recursive: true });
      }

      fs.copyFileSync(sourcePath, targetPath);
      console.log(`✅ Copy ${filename} completed`);
    } else {
      console.log(`⚠️ File ${filename} not found in source directory`);
    }
  });
};

const rootIconFiles = ['favicon.ico', 'favicon-16x16.png', 'favicon-32x32.png'];

copyIconsIfExists(path.join(__dirname, '../public'), path.join(__dirname, '../out'), [
  ...rootIconFiles,
]);

console.log('✅ Copy files for GitHub Pages completed');
