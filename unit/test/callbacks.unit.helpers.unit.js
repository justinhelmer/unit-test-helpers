(function (helpers) {
  'use strict';

  describe('Unit test helpers - callbacks', function () {
    describe('#register', function () {
      var methodName;
      var a;

      beforeEach(function () {
        methodName = '__methodName__';
        a = _.fill([], {}, 5);
      });

      it('should throw an error if a valid name is not provided', function () {
        var error = 'Must supply a method name to register a callback.';
        expect(helpers.callbacks.register()).toThrowError(error);
        expect(helpers.callbacks.register(25)).toThrowError(error);
        expect(helpers.callbacks.register('')).toThrowError(error);
      });

      it('should execute the registered callback when invoked', function () {
        var callback = helpers.spies.create('callback');
        helpers.callbacks.register(methodName)(callback);
        helpers.callbacks.invoke(methodName, a[0], a[1], a[2], a[3], a[4]);
        expect(callback).toHaveBeenCalledWith(a[0], a[1], a[2], a[3], a[4]);
      });

      it('should not execute the registered callback when invoked after destroyed', function () {
        var callback = helpers.spies.create('callback');
        helpers.callbacks.register(methodName)(callback);
        helpers.callbacks.destroy();
        helpers.callbacks.invoke('methodName', a[0], a[1], a[2], a[3], a[4]);
        expect(callback).not.toHaveBeenCalled();
      });

      it('should throw an error when the suffix argument is not valid', function () {
        var register = helpers.callbacks.register(methodName, 0);

              expect(register).toThrowError('Suffix argument must be a string.');
              expect(_.partial(register, angular.noop)).toThrowError('Suffix argument must be a string.');
        expect(_.partial(register, 25)).toThrowError('Suffix argument must be a string.');
      });

      it('should append to the method name when the suffix argument is valid', function () {
        var callback = helpers.spies.create('callback'),
          suffix = 'event.name',
          register = helpers.callbacks.register(methodName, 0);

        expect(_.partial(register, 'event.name', callback)).not.toThrowError();

        register(suffix, callback);

        helpers.callbacks.invoke(methodName + '.' + suffix, a[0], a[1], a[2], a[3], a[4]);
        expect(callback).toHaveBeenCalledWith(a[0], a[1], a[2], a[3], a[4]);
      });

      it('should append to the original method name each time', function () {
        var callback = helpers.spies.create('callback'),
          suffix1 = 'event1.name',
          suffix2 = 'event2.name',
          register = helpers.callbacks.register(methodName, 0);

        register(suffix1, callback);
        register(suffix2, callback);

        helpers.callbacks.invoke(methodName + '.' + suffix1, a[0], a[1]);
        expect(callback).toHaveBeenCalledWith(a[0], a[1]);

        helpers.callbacks.invoke(methodName + '.' + suffix2, a[2], a[3]);
        expect(callback).toHaveBeenCalledWith(a[2], a[3]);
      });

      it('should throw an error when the callback argument is not valid', function () {
        var register = helpers.callbacks.register(methodName);
        expect(register).toThrowError('Must supply a function to register a callback');
        expect(_.partial(register, 'foobar')).toThrowError('Must supply a function to register a callback');
        expect(_.partial(register, 25)).toThrowError('Must supply a function to register a callback');
      });

      it('should register the callback if the callback argument is valid', function () {
        var callback = helpers.spies.create('callback'),
          register = helpers.callbacks.register(methodName, null, 0);

        register(callback, 'foobar');

        helpers.callbacks.invoke(methodName, a[0], a[1], a[2], a[3], a[4]);
        expect(callback).toHaveBeenCalledWith(a[0], a[1], a[2], a[3], a[4]);
      });
    });
  });

})(window.unitTestHelpers);
