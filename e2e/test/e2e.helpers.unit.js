(function (helpers, e2eTestHelpers) {
  'use strict';

  describe('E2E test helpers', function () {
    describe('#cleanSlate', function () {
      it('should clear the localStorage', function () {
        window.browser = helpers.spies.createObj('browser', [{ name: 'executeScript' }]);
        e2eTestHelpers.cleanSlate();
        expect(window.browser.executeScript).toHaveBeenCalledWith('window.localStorage.clear();');
      });
    });

    describe('#takeScreenshot', function () {
      var fs, stream;
      var buffer, name, png;

      beforeEach(function () {
        buffer = { data: '__buffer__' };
        name = '__name__';
        png = '__png__';

        stream = helpers.spies.createObj('stream', ['end', 'write']);

        fs = helpers.spies.createObj('fs', [{
          name: 'createWriteStream',
          and: { returnValue: stream }
        }]);

        window.browser = helpers.spies.createObj('browser', [{
          name: 'takeScreenshot',
          and: { returnValue: png },
          options: { promise: true }
        }]);

        window.Buffer = helpers.spies.create('Buffer', { returnValue: buffer });
        window.require = helpers.spies.create('require', { returnValue: fs });
      });

      it('should take a screenshot', function () {
        e2eTestHelpers.takeScreenshot();
        expect(window.browser.takeScreenshot).toHaveBeenCalled();
      });

      describe('when the screenshot is done being taken', function () {
        beforeEach(function (done) {
          e2eTestHelpers.takeScreenshot();
          setTimeout(done, 0);
        });

        it('should create a file stream', function () {
          expect(fs.createWriteStream).toHaveBeenCalled();
        });

        it('should create a base64 buffer with the screenshot data', function () {
          expect(window.Buffer).toHaveBeenCalledWith(png, 'base64');
        });

        it('should write the buffer to the stream', function () {
          expect(stream.write).toHaveBeenCalledWith(buffer);
        });

        it('should end the file stream', function () {
          expect(stream.end).toHaveBeenCalled();
        });
      });

      it('should create a file stream for the provided when supplying a name', function (done) {
        var name = '__name__',
          filename = name + '.png';

        e2eTestHelpers.takeScreenshot(name);

        setTimeout(function () {
          expect(fs.createWriteStream).toHaveBeenCalledWith('./client/source/test/reporters/screenshots/' + filename);
          done();
        }, 0);
      });

      it('should create a file stream name based on the current time when not supplying a name', function (done) {
        var mockDate = new Date(2015, 11, 25, 0, 0, 0),
          filename = mockDate.toISOString() + '.png';

        var _setTimeout = setTimeout;

        jasmine.clock().install();
        jasmine.clock().mockDate(mockDate);

        e2eTestHelpers.takeScreenshot();

        _setTimeout(function () {
          expect(fs.createWriteStream).toHaveBeenCalledWith('./client/source/test/reporters/screenshots/' + filename);

          jasmine.clock().uninstall();
          done();
        }, 0);
      });
    });
  });

})(window.unitTestHelpers, window.e2eTestHelpers);
