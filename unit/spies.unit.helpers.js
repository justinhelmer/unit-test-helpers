(function (_, Q) {
  'use strict';

  _.set(window, 'unitTestHelpers.spies', {
    create: create,
    createObj: createObj,
    extendObj: extendObj,
    update: update
  });

  var helpers = window.unitTestHelpers;

  /**
   * Creates a single spy, where each spy may return a value, if provided.
   *
   * @param methodName {String} The name of the method being spied upon (required)
   * @param and        {Object} Attach behaviors to the spy. Calls the Jasmine method (i.e. and.returnValue)
   * @param options    {Object} The additional options which customize the behavior of the spy. Possible values include:
   *          - promise {Boolean} If true, the method will return a promise that immediately resolves with `and.returnValue`
   */
  function create(methodName, and, options) {
    if (!_isValidName(methodName)) {
      throw new Error('Method name must be provided.');
    }

    // The only time that jasmine.createSpy() should be used in application code
    return _prepare(jasmine.createSpy(methodName), and, options);
  }

  /**
   * Creates an object of spies, where each spy's behavior is defined by the properties supplied.
   *
   * @param spyObjName {String} The name of the object being spied upon
   * @param methods    {Array}  The spy definition for each method on the object. Each element in the array can be:
   *          - {String} The name of the method being spied upon. A spy will be created, but no value will be returned
   *          - {Object} A spy will be created by invoking create(method.name, method.and, method.options);
   */
  function createObj(spyObjName, methods) {
    return _extendObj({}, methods, spyObjName);
  }

  /**
   * Extends an existing object, spying on existing methods of the object. Mutates the object.
   *
   * Note that because it internally uses spyOn(), the original value will be automatically
   * restored at the end of the test.
   *
   * @param obj     {Object} The base object whose methods will be spied upon
   * @param methods {Array}  The spy definition for each method on the object. @see createObj()
   */
  function extendObj(obj, methods) {
    return _extendObj(obj, methods);
  }

  /**
   * Updates an existing spy, to change its current behavior.
   *
   * @param spy {SpyStrategy} The spy to modify
   * @param and        {Object} Attach behaviors to the spy. Calls the Jasmine method (i.e. and.returnValue)
   * @param options    {Object} The additional options which customize the behavior of the spy. Possible values include:
   *          - promise {Boolean} If true, the method will return a promise that immediately resolves with `and.returnValue`
   */
  function update(spy, and, options) {
    if (!jasmine.isSpy(spy)) {
      throw new Error('Must provide a jasmine spy');
    }

    return _prepare(spy, and, options);
  }

  function _isValidName(name) {
    // @todo test empty string case (hence the need for isEmpty)
    return !_.isEmpty(name) && _.isString(name);
  }

  function _prepare(spy, and, options) {
    if (!spy._options) {
      spy._options = {};
    }

    options = _.extend(spy._options, options || {});

    if (_.get(and, 'callFake')) {
      spy.and.callFake(and.callFake);
      return spy;
    }

    if (_.get(and, 'callThrough')) {
      spy.and.callThrough();
      return spy;
    }

    var returnValue = (_.get(options, 'promise')) ? (Q.when(_.get(and, 'returnValue'))) : (_.get(and, 'returnValue'));

    spy.and.returnValue(returnValue);

    return spy;
  }

  function _extendObj(baseObj, methods, spyObjName) {
    spyObjName = spyObjName || 'spy';

    if (!_.isArray(methods)) {
      throw new Error('Must supply an array of method definitions.');
    }

    _.each(methods, prepare);

    return baseObj;

    function attachSpy(method) {
      var methodName = (_.isString(method)) ? (method) : (method.name);

      if (_.has(method, 'value')) {
        baseObj[methodName] = _.get(method, 'value');
      } else {
        var spy;

        var and = _.get(method, 'and'),
          options = _.get(method, 'options');

        if (!baseObj[methodName]) {
          spy = helpers.spies.create(spyObjName + '.' + methodName, and, options);
          baseObj[methodName] = spy;
        } else {
          spy = spyOn(baseObj, methodName);
        }

        _prepare(spy, and, options);
      }
    }

    function isPrimitive(value) {
      var type = typeof value;
      return value === null || (type !== 'object' && type !== 'function');
    }

    function prepare(method) {
      validate(method);
      attachSpy(method);
    }

    function validate(method) {
      if (_.isString(method) && !_isValidName(method) ||
        _.isPlainObject(method) && !_isValidName(method.name) ||
        !_.isString(method) && !_.isPlainObject(method)) {
        throw new Error('Every method provided for ' + spyObjName + ' must be either a string or an object.');
      }

      if (_.has(method, 'value') && !isPrimitive(_.get(method, 'value'))) {
        throw new Error('Only primitive values can be set.');
      }
    }
  }

})(window._, window.Q);
