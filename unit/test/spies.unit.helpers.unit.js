(function (_, helpers) {
  'use strict';

  describe('Unit test helpers - spies', function () {
    var spy;

    describe('#create', function () {
      var methodName = 'methodName';

      it('should throw an error for invalid method names', function () {
        var error = 'Method name must be provided.';

        expect(helpers.spies.create).toThrowError(error);
        expect(_.partial(helpers.spies.create, '')).toThrowError(error);
      });

      it('should create a Jasmine spy with the method name', function () {
        create();
        expect(jasmine.createSpy).toHaveBeenCalledWith(methodName);
      });

      describe('when the spy has a valid method name', function () {
        beforeEach(function () {
          spy = fakeSpy();

          helpers.spies.extendObj(jasmine, [
            {
              name: 'createSpy',
              and: {
                returnValue: spy
              }
            }
          ]);
        });

        expectPrepare(_.partial(helpers.spies.create, methodName));
      });

      function create(and, options) {
        helpers.spies.extendObj(jasmine, [
          {
            name: 'createSpy',
            and: {
              returnValue: fakeSpy()
            }
          }
        ]);

        helpers.spies.create(methodName, and, options);
      }
    });

    describe('#createObj', function () {
      var spyObjName;

      beforeEach(function () {
        spyObjName = 'spyObjName';
      });

      it('should throw an error if the methods supplied are not an array', function () {
        expect(_.partial(helpers.spies.createObj, spyObjName)).toThrowError('Must supply an array of method definitions.');
      });

      it('should throw an error if any method in the array is missing a name', function () {
        var error = 'Every method provided for ' + spyObjName + ' must be either a string or an object.',
          methods;

        methods = [''];
        expect(_.partial(helpers.spies.createObj, spyObjName, methods)).toThrowError(error);

        methods = [{}];
        expect(_.partial(helpers.spies.createObj, spyObjName, methods)).toThrowError(error);

        methods = [{ name: '' }];
        expect(_.partial(helpers.spies.createObj, spyObjName, methods)).toThrowError(error);

        methods = [[]];
        expect(_.partial(helpers.spies.createObj, spyObjName, methods)).toThrowError(error);
      });

      describe('when a simple value is supplied', function () {
        var spyObj;

        it('when the value is not a primitive should throw an error', function () {
          helpers.spies.extendObj(jasmine, ['createSpy']);

          var primitives = [undefined, null, 'string', 3.14, !99];
          _.each(primitives, function (primitive) {
            expect(_.partial(helpers.spies.createObj, spyObjName, [{
              name: 'foo',
              value: primitive
            }])).not.toThrowError();
          });

          var nonPrimitives = [{ foo: 'bar' }, new Number(10), /^\\d+$/];
          _.each(nonPrimitives, function (nonPrimitive) {
            expect(_.partial(helpers.spies.createObj, spyObjName, [{
              name: 'foo',
              value: nonPrimitive
            }])).toThrowError('Only primitive values can be set.');
          });
        });

        describe('when the value is a primitive', function () {
          beforeEach(function () {
            helpers.spies.extendObj(jasmine, ['createSpy']);
            spyObj = helpers.spies.createObj(spyObjName, [{ name: 'foo', value: 'bar' }]);
          });

          it('should set the value correctly', function () {
            expect(spyObj.foo).toBe('bar');
          });

          it('should not create a spy', function () {
            expect(jasmine.createSpy).not.toHaveBeenCalled();
          });
        });
      });

      describe('when a simple value is not supplied', function () {
        it('should call create() for each individual method, and return an array of ordered results', function () {
          var methods = [
            'method1',
            {
              name: 'method2',
              and: 'foobar',
              options: { foo: 'bar' }
            }
          ];

          // The only time ever that jasmine.createSpy() should be used in test code
          var original = helpers.spies.create,
            spied = jasmine.createSpy('helpers.spies.createValue');

          helpers.spies.create = jasmine.createSpy('helpers.spies.create').and.returnValue(spied);
          var spyObj = helpers.spies.createObj(spyObjName, methods);

          expect(helpers.spies.create.calls.argsFor(0)).toEqual([spyObjName + '.method1', undefined, undefined]);
          expect(helpers.spies.create.calls.argsFor(1)).toEqual([spyObjName + '.method2', 'foobar', { foo: 'bar' }]);

          helpers.spies.create = original;
          expect(spyObj).toEqual({ method1: spied, method2: spied });
        });
      });
    });

    describe('#extendObj', function () {
      it('should modify an object by spying on methods of interest', function () {
        var obj = {
          foo: 'bar',
          bar: function () {
            return 'foobar';
          }
        };

        var result = helpers.spies.extendObj(obj, [{ name: 'bar', and: { callThrough: true } }]);

        expect(result.foo).toBe('bar');
        expect(obj).toBe(result);
        expect(obj.bar).toBe(result.bar);

        // validates the spy is bound to the original method instead of replacing it
        expect(result.bar()).toBe('foobar');
      });
    });

    describe('#update', function () {
      it('when an invalid spy is supplied should throw an error', function () {
        expect(helpers.spies.update).toThrowError('Must provide a jasmine spy');
        expect(_.partial(helpers.spies.update, '')).toThrowError('Must provide a jasmine spy');
        expect(_.partial(helpers.spies.update, { and: { callFake: angular.noop } })).toThrowError('Must provide a jasmine spy');
      });

      describe('when a valid spy is supplied', function () {
        beforeEach(function () {
          helpers.spies.extendObj(jasmine, [{ name: 'isSpy', and: { returnValue: true } }]);
        });

        expectPrepare(helpers.spies.update, true);

        it('should update the existing spy with the configuration provided', function () {
          spy = helpers.spies.create('fakeSpy', { returnValue: 'foo' });
          expect(spy()).toBe('foo'); // sanity check that the spy was set up correctly

          helpers.spies.update(spy, { returnValue: 'bar' });
          expect(spy()).toBe('bar');
        });

        it('should inherit any existing options the spy had', function (done) {
          spy = helpers.spies.create('fakeSpy', { returnValue: 'foo' }, { foo: 'bar', promise: true });

          helpers.spies.update(spy, { returnValue: 'bar' });

          spy().then(function (result) {
            expect(result).toBe('bar');
            done();
          });
        });
      });
    });

    function expectPrepare(method, update) {
      describe('when the spy is prepared', function () {
        var _method;

        beforeEach(function () {
          if (update) {
            spy = fakeSpy();
            _method = _.partial(method, spy);
          } else {
            _method = method;
          }
        });

        it('should store options on the spy object', function () {
          var options = { foo: 'bar' };
          _method(null, options);

          expect(spy._options).toEqual(options);
          expect(spy._options).not.toBe(options);
        });

        it('when the `callFake` function is supplied should invoke the callFake() method on the spy', function () {
          _method({ callFake: angular.noop });
          expect(spy.and.callFake).toHaveBeenCalledWith(angular.noop);
        });

        it('when the `callThrough` property is true should invoke the callThrough() method on the spy', function () {
          _method({ callThrough: true });
          expect(spy.and.callThrough).toHaveBeenCalled();
        });

        describe('when the `callFake` function is not supplied', function () {
          it('should invoke the returnValue() method on the spy with the `returnValue` string supplied', function () {
            expectValue('foobar');
          });

          it('should invoke the returnValue() method on the spy with the `returnValue` function supplied', function () {
            expectValue(angular.noop);
          });

          it('should invoke the returnValue() method on the spy with the `returnValue` object supplied', function () {
            expectValue({ foo: 'bar' });
          });

          it('should invoke the returnValue() method on the spy with null if `returnValue` is null', function () {
            expectValue(null);
          });

          it('should invoke the returnValue() method on the spy with undefined if `returnValue` is not supplied', function () {
            expectValue();
          });

          function expectValue(value) {
            _method({ returnValue: value });
            expect(spy.and.returnValue).toHaveBeenCalledWith(value);
          }
        });

        describe('when the `promise` option is set', function () {
          describe('when the promise is resolved', function () {
            it('should resolve with the `returnValue` string specified', function () {
              expectPromise('foobar');
            });

            it('should resolve with the `returnValue` function specified', function () {
              expectPromise(angular.noop);
            });

            it('should resolve with the `returnValue` object specified', function () {
              expectPromise({ foo: 'bar' });
            });

            it('should resolve with null if `returnValue` is specified as null', function () {
              expectPromise(null);
            });

            it('should resolve with undefined if `returnValue` is not specified', function () {
              expectPromise();
            });

            function expectPromise(result) {
              _method({ returnValue: result }, { promise: true });
              spy.and.returnValue.calls.argsFor(0)[0].then(function (value) {
                expect(value).toBe(result);
              });
            }
          });
        });
      });
    }

    function fakeSpy() {
      return {
        // The only time ever that jasmine.createSpyObj() should be used in test code
        and: jasmine.createSpyObj('and', ['callFake', 'callThrough', 'returnValue'])
      };
    }
  });

})(window._, window.unitTestHelpers);
