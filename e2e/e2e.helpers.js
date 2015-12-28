
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // can't unit test this branch; file is loaded in the browser via karma
    module.exports = factory();
  } else {
    root.e2eTestHelpers = factory();
  }
}(this, function () {
  'use strict';

  return {
    cleanSlate: function () {
      browser.executeScript('window.localStorage.clear();');
    },

    takeScreenshot: function (name) {
      var fs = require('fs');

      function writeScreenShot(data, filename) {
        var stream = fs.createWriteStream('./client/source/test/reporters/screenshots/' + filename);

        stream.write(new Buffer(data, 'base64'));
        stream.end();
      }

      browser.takeScreenshot().then(function (png) {
        var date = new Date();
        name = name || date.toISOString();
        writeScreenShot(png, name + '.png');
      });
    }
  };

}));
