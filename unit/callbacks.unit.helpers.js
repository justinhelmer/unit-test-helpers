(function (_) {
  'use strict';

  _.set(window, 'unitTestHelpers.callbacks', {
    destroy: destroy,
    invoke: invoke,
    register: register
  });

  var callbacks = {};

  function destroy() {
    callbacks = {};
  }

  function invoke(name, args) {
    if (_.isFunction(callbacks[name])) {
      var cb = _.spread(callbacks[name]);
      cb(_.slice(arguments, 1));
    }
  }

  function register(methodName, suffixArg, callbackArg) {

    return function () {
      var callback, _methodName = methodName;

      if (!_.isString(_methodName) || _.isEmpty(_methodName)) {
        throw new Error('Must supply a method name to register a callback.');
      }

      if (_.isNumber(suffixArg)) {
        var suffix = _.get(arguments, suffixArg);

        if (!_.isString(suffix)) {
          throw new Error('Suffix argument must be a string.');
        }

        _methodName = _methodName + '.' + suffix;
      }

      if (_.isNumber(callbackArg)) {
        callback = _.get(arguments, callbackArg);
      } else {
        callback = _.last(arguments);
      }

      if (!_.isFunction(callback)) {
        throw Error('Must supply a function to register a callback');
      }

      callbacks[_methodName] = callback;
    };
  }

})(window._);
