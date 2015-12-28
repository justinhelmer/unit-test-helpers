(function (_, helpers) {
  'use strict';

  describe('Unit test helpers - injectors', function () {
    var injectorName;

    beforeEach(function () {
      injectorName = 'testInjector';
    });

    afterEach(function () {
      helpers.injectors.remove(injectorName);
    });

    describe('#add', function () {
      it('should throw an error if attempting to add an injector without a name', function () {
        expect(helpers.injectors.add).toThrowError('All injectors must provide a name.');
      });
    });

    describe('#get', function () {
      it('should return nothing for unregistered injectors', function () {
        expect(helpers.injectors.get('_DOES_NOT_EXIST_')).toBeUndefined();
      });

      it('should return the injector if there are no dependencies', function () {
        helpers.injectors.add({ name: injectorName });

        expect(_.partial(helpers.injectors.get, injectorName)).toBeDefined();
      });

      describe('when the injector has at least one dependency', function () {
        // @see injector.prepare(). These values were copied over
        var createModuleDependencies = ['config', 'provider'],
          provideValueDependencies = ['config.resolve', 'run'],
          providerTypes = _.union(createModuleDependencies, provideValueDependencies);

        var dependencyName = 'testDependencyProvider', realProvider;
        var _module, moduleName;

        beforeEach(function () {
          moduleName = '__moduleName__';

          realProvider = { foo: angular.noop, bar: angular.noop, baz: 'real value' };

          angular
            .module(injectorName, [])
            .factory(dependencyName, function () {
              return realProvider;
            });

          module(injectorName);

          angular
            .module(moduleName, []);

          module(moduleName);
        });

        _.each(createModuleDependencies, function (providerType) {
          describe('when the injector has ' + providerType + ' dependencies', function () {
            validateDependencies(providerType);

            describe('when the dependencies are valid', function () {
              var dependencies;

              beforeEach(function () {
                dependencies = {};
              });

              describe('when the dependency being registered does not require a core module', function () {
                var angularSpy;

                beforeEach(function () {
                  angularSpy = jasmine.createSpyObj('angular.module.returnValue', ['provider']);
                  helpers.spies.extendObj(angular, [{ name: 'module', and: { returnValue: angularSpy } }]);
                });

                describe('when retrieving the injector', function () {
                  var injector;

                  beforeEach(function () {
                    dependencies[providerType] = [{
                      name: dependencyName,
                      value: _.partial(helpers.spies.createObj, dependencyName, ['foo', 'bar']),
                      module: moduleName
                    }];

                    helpers.injectors.add({ name: injectorName, dependencies: dependencies });
                    injector = helpers.injectors.get(injectorName);
                  });

                  it('should create a mock module to override the dependency module\'s definition', function () {
                    expect(angular.module).toHaveBeenCalledWith(moduleName, []);
                  });

                  it('should return the injector', function () {
                    expect(_.has(injector, 'inject')).toBe(true);
                  });
                });

                describe('when creating the mock module', function () {
                  var dependency1, dependency2, dependency3, singleton;

                  beforeEach(function () {
                    var deps = {
                      dependency1: [{ name: '$get', and: { callFake: $get } }, 'foo', 'bar'],
                      dependency2: ['foo', 'bar'],
                      dependency3: ['baz']
                    };

                    dependency1 = {
                      name: 'dependency1Provider',
                      value: _.partial(helpers.spies.createObj, dependencyName, deps.dependency1),
                      module: moduleName
                    };

                    dependency2 = {
                      name: 'dependency2Provider',
                      value: _.partial(helpers.spies.createObj, dependencyName, deps.dependency2),
                      module: moduleName + 'Different'
                    };

                    dependency3 = {
                      name: 'dependency3Provider',
                      value: _.partial(helpers.spies.createObj, dependencyName, deps.dependency3),
                      module: moduleName
                    };

                    dependencies[providerType] = [dependency1, dependency2, dependency3];
                    helpers.injectors.add({ name: injectorName, dependencies: dependencies, module: moduleName });
                    helpers.injectors.get(injectorName);

                    singleton = {};
                    function $get() {
                      return singleton;
                    }
                  });

                  it('should attach a new provider that returns the mock definition of each dependency', function () {
                    var args;

                    expect(angularSpy.provider.calls.count()).toBe(3);

                    args = angularSpy.provider.calls.argsFor(0);
                    expect(args[0]).toBe('dependency1');
                    expect(args[1]).toBe(dependency1._value);

                    args = angularSpy.provider.calls.argsFor(1);
                    expect(args[0]).toBe('dependency2');
                    expect(args[1]).toBe(dependency2._value);

                    args = angularSpy.provider.calls.argsFor(2);
                    expect(args[0]).toBe('dependency3');
                    expect(args[1]).toBe(dependency3._value);
                  });

                  it('should create a new spy for the dependencies missing a $get method', function () {
                    expect(jasmine.isSpy(dependency2._value.$get)).toBe(true);
                  });

                  it('should leave other dependency\'s $get methods unaffected', function () {
                    expect(dependency1._value.$get()).toBe(singleton);
                  });

                  it('should not create a mock module if a mock module by the same name already exists', function () {
                    expect(angular.module.calls.count()).toBe(7);
                    expect(angular.module.calls.argsFor(0)).toEqual([moduleName]);
                    expect(angular.module.calls.argsFor(1)).toEqual([moduleName, []]);
                    expect(angular.module.calls.argsFor(2)).toEqual([moduleName]);
                    expect(angular.module.calls.argsFor(3)).toEqual([moduleName + 'Different']);
                    expect(angular.module.calls.argsFor(4)).toEqual([moduleName + 'Different', []]);
                    expect(angular.module.calls.argsFor(5)).toEqual([moduleName + 'Different']);
                    expect(angular.module.calls.argsFor(6)).toEqual([moduleName]);
                  });
                });
              });

              describe('when the dependency being registered requires a core module', function () {
                var dependency;

                beforeEach(function () {
                  moduleName = 'ngAnything';

                  angular
                    .module(moduleName, [])
                    .factory(dependencyName, function () {
                      return realProvider;
                    });

                  module(injectorName);

                  dependency = {
                    name: dependencyName,
                    value: _.partial(helpers.spies.createObj, dependencyName, ['foo', 'qux']),
                    module: moduleName
                  };

                  dependencies[providerType] = [dependency];
                  helpers.injectors.add({ name: injectorName, dependencies: dependencies });

                  helpers.spies.extendObj(angular, [{
                    name: 'module',
                    and: {
                      returnValue: helpers.spies.createObj('angular.module', [{
                        name: 'config',
                        and: { callFake: helpers.callbacks.register('angular.module.config') }
                      }])
                    }
                  }]);

                  helpers.spies.extendObj(window, ['module']);

                  helpers.injectors.get(injectorName);
                });

                afterEach(function () {
                  helpers.callbacks.destroy();
                });

                it('should create an angular module to configure the test dependency', function () {
                  expect(angular.module).toHaveBeenCalledWith(dependencyName + 'Config', ['ngAnything']);
                });

                it('should load the created module to modify the test dependency with the mocked methods', function () {
                  expect(window.module).toHaveBeenCalledWith(dependencyName + 'Config');
                });

                it('should configure a new module that extends the mock value onto the dependency', function () {
                  helpers.callbacks.invoke('angular.module.config', realProvider);

                  expect(jasmine.isSpy(realProvider.foo)).toBe(true);
                  expect(jasmine.isSpy(realProvider.qux)).toBe(true);
                  expect(_.isFunction(realProvider.bar)).toBe(true);
                  expect(jasmine.isSpy(realProvider.bar)).toBe(false);
                  expect(realProvider.baz).toBe('real value');
                });

                it('should set the internal _value to the modified object with the spied method(s)', function () {
                  helpers.callbacks.invoke('angular.module.config', realProvider);
                  expect(dependency._value).toBe(realProvider);
                });
              });
            });
          });
        });

        _.each(provideValueDependencies, function (providerType) {
          describe('when the injector has ' + providerType + ' dependencies', function () {
            var $provide;

            beforeEach(function () {
              helpers.spies.extendObj(window, [{
                name: 'module',
                and: { callFake: helpers.callbacks.register('window.module') }
              }]);

              $provide = helpers.spies.createObj('$provide', ['value']);
              _module = _.partial(helpers.callbacks.invoke, 'window.module', $provide);
            });

            afterEach(function () {
              helpers.callbacks.destroy();
              _module = null;
            });

            it('should load the injector module if there is at least one ' + providerType + ' dependency', function () {
              var dependencies = {};
              dependencies[providerType] = [{}];

              helpers.injectors.add({ name: injectorName, dependencies: dependencies });

              helpers.injectors.get(injectorName);

              expect(window.module.calls.count()).toBe(1);
              expect(window.module.calls.argsFor(0)[0]).toBe(injectorName);
            });

            it('should not load the injector module if there is not at least one ' + providerType + ' dependency', function () {
              var dependencies = {};
              dependencies[providerType] = null;

              helpers.injectors.add({ name: injectorName, dependencies: dependencies });
              helpers.injectors.get(injectorName);

              expect(window.module.calls.count()).toBe(0);
            });

            describe('when the injector module is loaded', function () {
              validateDependencies(providerType);
            });

            describe('when the dependencies are valid', function () {
              var injector;
              var spyObj;

              beforeEach(function () {
                var dependencies = {};

                dependencies[providerType] = [{
                  name: dependencyName,
                  value: dependencyValueSpy
                }];

                helpers.injectors.add({ name: injectorName, dependencies: dependencies });
                injector = helpers.injectors.get(injectorName);
                _module();

                function dependencyValueSpy() {
                  spyObj = helpers.spies.createObj(dependencyName, ['foo', 'bar']);
                  return spyObj;
                }
              });

              afterEach(function () {
                helpers.callbacks.destroy();
              });

              it('should return the injector', function () {
                expect(_.has(injector, 'inject')).toBe(true);
              });

              it('should provide the spy as the value for the dependency when injected', function () {
                expect($provide.value).toHaveBeenCalledWith(dependencyName, spyObj);
              });
            });
          });
        });

        _.each(providerTypes, function (providerType) {
          describe('when injecting ' + providerType + ' dependencies', function () {
            var doesNotExist, testDependency;

            beforeEach(function () {
              var dependencies = {};

              dependencies[providerType] = [{
                name: dependencyName,
                value: _.partial(helpers.spies.createObj, dependencyName, ['foo', 'bar']),
                module: '__moduleName__'
              }];

              helpers.spies.extendObj(window, [{ name: 'inject', and: { callThrough: true } }]);
              helpers.injectors.add({ name: injectorName, dependencies: dependencies });
              helpers.injectors.get(injectorName)
                .inject(function (_doesNotExist_, _testDependencyProvider_) {
                  doesNotExist = _doesNotExist_;
                  testDependency = _testDependencyProvider_;
                });
            });

            it('should call angular mock\'s inject() function', function () {
              expect(inject).toHaveBeenCalled();
            });

            it('should resolve with the mocked data, for known dependencies', function () {
              expect(jasmine.isSpy(testDependency.foo)).toBe(true);
              expect(jasmine.isSpy(testDependency.bar)).toBe(true);
            });

            it('should resolve with undefined, for unknown dependencies', function () {
              expect(doesNotExist).toBeUndefined();
            });
          });

          describe('when one of the dependencies is defined more than once in a single injector', function () {
            var dependencies;

            beforeEach(function () {
              dependencies = {};

              dependencies[providerType] = [{
                name: dependencyName,
                value: _.partial(helpers.spies.createObj, dependencyName, ['foo', 'bar']),
                module: moduleName
              }, {
                name: dependencyName
              }];

              helpers.injectors.add({ name: injectorName, dependencies: dependencies });
            });

            it('should skip validation during retrieval for the dependency that has already been defined', function () {
              expect(helpers.injectors.get).not.toThrowError();
            });

            it('should skip validation during injection for the dependency that has already been defined', function () {
              var inject = _.partial(helpers.injectors.get(injectorName).inject, angular.noop);
              expect(inject).not.toThrowError();
            });

            if (_.contains(createModuleDependencies, providerType)) {
              it('should not create any mock modules for the dependency that has already been defined', function () {
                helpers.spies.extendObj(angular, [{
                  name: 'module',
                  and: { returnValue: jasmine.createSpyObj('angular.module.returnValue', ['provider']) }
                }]);

                helpers.injectors.get(injectorName);
                expect(angular.module.calls.count()).toBe(3);

                expect(angular.module.calls.argsFor(0)).toEqual([moduleName]);
                expect(angular.module.calls.argsFor(1)).toEqual([moduleName, []]);
                expect(angular.module.calls.argsFor(2)).toEqual([moduleName]);
              });
            }

            if (_.contains(provideValueDependencies, providerType)) {
              it('should not provide any mock values for the dependency that has already been defined', function () {
                var $provide = helpers.spies.createObj('$provide', ['value']);

                helpers.spies.extendObj(window, [{
                  name: 'module',
                  and: { callFake: helpers.callbacks.register('window.module') }
                }]);

                helpers.injectors.get(injectorName);
                helpers.callbacks.invoke('window.module', $provide);
                var value = $provide.value.calls.first();

                expect($provide.value.calls.count()).toBe(1);
                expect(value.args[0]).toBe(dependencyName);
                expect(_.every(['foo', 'bar'], _.partial(_.has, value.args[1])));
              });
            }

            it('should use the result of the first definition\'s value function when injected', function (done) {
              helpers.injectors.get(injectorName).inject(function (testDependencyProvider) {
                expect(testDependencyProvider).toBe(dependencies[providerType][0]._value);
                done();
              });
            });
          });
        });

        function validateDependencies(providerType) {
          var dependencies;

          beforeEach(function () {
            dependencies = {};
          });

          describe('validate ' + providerType + ' Dependencies', function () {
            it('should throw an error if the dependencies are not an array', function () {
              dependencies[providerType] = { foo: 'bar' };
              helpers.injectors.add({ name: injectorName, dependencies: dependencies });

              var error = 'Injector dependencies "dependencies.' + providerType + '" must be an array.';
              expect(_.partial(helpers.injectors.get, injectorName)).toThrowError(error);
            });

            it('should throw an error if any dependency in the array has no name', function () {
              dependencies[providerType] = [{}];
              helpers.injectors.add({ name: injectorName, dependencies: dependencies });
              expectError('All injector dependencies must provide a name and value.');
            });

            it('should throw an error if any dependency in the array has no value', function () {
              dependencies[providerType] = [{ name: dependencyName }];
              helpers.injectors.add({ name: injectorName, dependencies: dependencies });
              expectError('All injector dependencies must provide a name and value.');
            });

            it('should throw an error if any dependency in the array has a value which is not a function', function () {
              dependencies[providerType] = [{ name: dependencyName, value: { foo: 'bar' } }];
              helpers.injectors.add({ name: injectorName, dependencies: dependencies });
              expectError('Dependency value must be a function that returns a unique reference each time.');
            });

            it('should throw an error if any dependency in the array has a value which always returns the same instance', function () {
              var reference = { foo: 'bar' };
              var singleton = function () {
                return reference;
              };

              dependencies[providerType] = [{ name: dependencyName, value: singleton }];
              helpers.injectors.add({ name: injectorName, dependencies: dependencies });
              expectError('Dependency value must be a function that returns a unique reference each time.');
            });

            if (_.contains(createModuleDependencies, providerType)) {
              it('should throw an error if not every dependency in the array is either a provider or configuration constant', function () {
                dependencies[providerType] = [{
                  name: dependencyName.replace('Provider', ''),
                  value: _.partial(helpers.spies.createObj, 'spy', ['method'])
                }];

                helpers.injectors.add({ name: injectorName, dependencies: dependencies });
                expectError('All ' + providerType + ' dependencies must be either providers or configuration constants.');
              });

              it('should not throw an error if there is a configuration constant with no provider', function () {
                dependencies[providerType] = [{
                  name: 'some.config',
                  value: _.partial(helpers.spies.createObj, 'spy', ['method']),
                  module: '__moduleName__'
                }];

                helpers.injectors.add({ name: injectorName, dependencies: dependencies });
                expect(_.partial(helpers.injectors.get, injectorName)).not.toThrowError();
              });

              it('should throw an error if if any dependency in the array is missing module name', function () {
                dependencies[providerType] = [{
                  name: dependencyName,
                  value: _.partial(helpers.spies.createObj, 'spy', ['method'])
                }];

                helpers.injectors.add({ name: injectorName, dependencies: dependencies });
                expectError('All ' + providerType + ' dependencies must specify a module.');
              });
            }
          });

          function expectError(error) {

            if (_module) {
              helpers.injectors.get(injectorName);
              expect(_module).toThrowError(error);
            } else {
              expect(_.partial(helpers.injectors.get, injectorName)).toThrowError(error);
            }
          }
        }
      });
    });

    describe('#remove', function () {
      it('should remove the injector by name', function () {
        helpers.injectors.add({ name: injectorName });
        expect(helpers.injectors.get(injectorName)).toBeDefined();
        helpers.injectors.remove(injectorName);
        expect(helpers.injectors.get(injectorName)).toBeUndefined();
      });
    });
  });

})(window._, window.unitTestHelpers);
