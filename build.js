var NwBuilder = require('node-webkit-builder');
var nw = new NwBuilder({
  files: 'desktop-app/**',
  platforms: ['osx', 'win', 'linux32', 'linux64'],
  version: '0.11.2',
  appName: 'Tinder⁺⁺',
  appVersion: '1.0.0',
  winIco: 'icons/win.ico',
  macIcns: 'icons/mac.icns'
});

nw.on('log', console.log);

nw.build().then(function () {
  console.log('all done!');
}).catch(function (error) {
  console.error(error);
});