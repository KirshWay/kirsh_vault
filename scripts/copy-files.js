// eslint-disable-next-line
const fs = require('fs');
// eslint-disable-next-line
const path = require('path');

const sourceDir = path.join(__dirname, '../public');
const targetDir = path.join(__dirname, '../out');

function copyFilesRecursively(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);

  files.forEach((file) => {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);

    const stat = fs.statSync(sourcePath);

    if (stat.isFile()) {
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`Copied: ${sourcePath} -> ${targetPath}`);
    } else if (stat.isDirectory()) {
      copyFilesRecursively(sourcePath, targetPath);
    }
  });
}

copyFilesRecursively(sourceDir, targetDir);

const serviceWorkerSource = path.join(sourceDir, 'service-worker.js');
const serviceWorkerTarget = path.join(targetDir, 'service-worker.js');

fs.copyFileSync(serviceWorkerSource, serviceWorkerTarget);
console.log(`Copied Service Worker: ${serviceWorkerSource} -> ${serviceWorkerTarget}`);

const nojekyllSource = path.join(sourceDir, '.nojekyll');
const nojekyllTarget = path.join(targetDir, '.nojekyll');

fs.copyFileSync(nojekyllSource, nojekyllTarget);
console.log(`Copied .nojekyll: ${nojekyllSource} -> ${nojekyllTarget}`);

console.log('All files copied successfully.');
