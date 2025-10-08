// electron-builder config for packaging the Electron app
module.exports = {
  appId: 'com.sonicbroadcasting.desktop',
  productName: 'Sonic Broadcasting Studio',
  directories: {
    output: 'dist',
  },
  files: [
    'main.js',
    'out/**/*',
    'node_modules/**/*',
    'package.json',
  ],
  win: {
    target: 'nsis',
  },
  mac: {
    target: 'dmg',
  },
  linux: {
    target: 'AppImage',
  },
};
