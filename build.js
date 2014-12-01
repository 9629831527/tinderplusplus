var NwBuilder = require('node-webkit-builder');
var nw = new NwBuilder({
  files: 'desktop-app/**',
  platforms: ['osx', 'win', 'linux32', 'linux64'],
  version: '0.11.2',
  appName: 'Tinder⁺⁺',
  buildType: 'timestamped',
  appVersion: '1.0.0',
  winIco: 'icons/win.ico',
  macIcns: 'icons/mac.icns'
});

// Log stuff you want
nw.on('log',  console.log);

// Build returns a promise
nw.build().then(function () {
  console.log('all done!');
}).catch(function (error) {
  console.error(error);
});

// And supports callbacks
nw.build(function(err) {
  if(err) console.log(err);
});