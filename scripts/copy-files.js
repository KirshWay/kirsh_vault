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
  filenames.forEach(filename => {
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

const iconFiles = [
  'icons/android-chrome-192x192.png',
  'icons/android-chrome-512x512.png',
];

const rootIconFiles = [
  'apple-touch-icon.png',
  'favicon.ico',
  'favicon-16x16.png',
  'favicon-32x32.png',
];

copyIconsIfExists(path.join(__dirname, '../public'), path.join(__dirname, '../out'), [...iconFiles, ...rootIconFiles]);

const generateEmptyIcon = (name, size) => {
  const targetPath = path.join(__dirname, `../out/${name}`);
  
  const publicPath = path.join(__dirname, `../public/${name}`);
  
  if (!fs.existsSync(targetPath) && !fs.existsSync(publicPath)) {
    console.log(`⚠️ Icon ${name} is missing, creating empty`);
    
    const svgContent = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#4F46E5"/>
      <text x="50%" y="50%" font-family="Arial" font-size="${size / 5}" 
            fill="white" text-anchor="middle" dominant-baseline="middle">
        Vault
      </text>
    </svg>`;
    
    const targetDirname = path.dirname(targetPath);
    if (!fs.existsSync(targetDirname)) {
      fs.mkdirSync(targetDirname, { recursive: true });
    }
    
    fs.writeFileSync(targetPath, svgContent);
  }
};

generateEmptyIcon('icons/android-chrome-192x192.png', 192);
generateEmptyIcon('icons/android-chrome-512x512.png', 512);

console.log('✅ Copy files for GitHub Pages completed'); 