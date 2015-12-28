(function (_, helpers) {
  'use strict';

  describe('Unit test helpers - directives', function () {
    describe('Compiler()', function () {
      var moduleName;

      beforeEach(function () {
        moduleName = '__module__';
      });

      it('should throw an error when module name is missing', function () {
        expect(helpers.directives.compiler).toThrowError('Module name is required.');
      });

      it('should throw an error when directive name is missing', function () {
        expect(_.partial(helpers.directives.compiler, moduleName)).toThrowError('Directive name is required.');
      });

      describe('when providing valid constructor parameters', function () {
        var compiler, directiveName, templateUrl;
        var $compile, $injector, $rootScope, compile, element, isolatedScope, scope;

        beforeEach(function () {
          directiveName = '__xxDirectiveName__';
        });

        afterEach(helpers.callbacks.destroy);

        describe('when generating a new compiler', function () {
          beforeEach(function () {
            compiler = helpers.directives.compiler(moduleName, directiveName);
          });

          it('should not have an element', function () {
            expect(compiler.element).toBe(null);
          });

          it('should not have any scope', function () {
            expect(compiler.scope).toBe(null);
          });

          describe('#compile', function () {
            it('when the directive has not yet been injected should throw an error', function () {
              expect(compiler.compile).toThrowError('Too early to compile; directive has not yet been injected.');
            });

            describe('when the directive has been injected', function () {
              var result;

              beforeEach(function () {
                _inject();
                result = compiler.compile();
              });

              it('should create a compile function with the generated element', function () {
                expect($compile).toHaveBeenCalledWith(element);
              });

              it('should compile the element with the current scope', function () {
                expect(compile).toHaveBeenCalledWith(scope);
              });

              it('should digest the scope', function () {
                expect(scope.$digest).toHaveBeenCalled();
              });

              it('should generate a new isolated scope', function () {
                expect(compiler.element.isolateScope).toHaveBeenCalled();
              });

              it('should return the newly-generated isolated scope', function () {
                expect(result).toBe(isolatedScope);
              });

              it('should compile with the isolated scope, if provided', function () {
                compiler.compile(result);
                expect(compile).toHaveBeenCalledWith(result);
              });
            });
          });

          describe('#inject', function () {
            var result;

            beforeEach(function () {
              result = _inject();
            });

            it('should throw an error if the directive has already been injected', function () {
              expect(compiler.inject).toThrowError('Directive has already been injected');
            });

            it('should load the module supplied to the compiler', function () {
              expect(module).toHaveBeenCalledWith(moduleName);
            });

            it('should call angular\'s inject() method', function () {
              expect(inject).toHaveBeenCalled();
            });

            it('should get the compiler', function () {
              expect($injector.get).toHaveBeenCalledWith('$compile');
            });

            it('should generate a new root scope', function () {
              expect($injector.get).toHaveBeenCalledWith('$rootScope');
              expect($rootScope.$new).toHaveBeenCalled();
            });

            it('should get the real directive', function () {
              expect($injector.get).toHaveBeenCalledWith(directiveName + 'Directive');
            });

            it('should return the compiler', function () {
              expect(result).toBe(compiler);
            });
          });

          describe('#stub', function () {
            it('when the directive has been injected should throw an error', function () {
              _inject();
              expect(compiler.stub).toThrowError('Too late to stub; directive has already been injected.');
            });

            describe('when the directive has not yet been injected', function () {
              var $provide;

              beforeEach(function () {
                helpers.spies.extendObj(window, [{
                  name: 'module',
                  and: { callFake: helpers.callbacks.register('module') }
                }]);

                $provide = helpers.spies.createObj('$provide', ['value']);
              });

              afterEach(helpers.callbacks.destroy);

              it('should register a new module to provide a mocked value for each directive', function () {
                compiler.stub(['directive1', 'directive2']);
                expect(module.calls.count()).toBe(2);
                expect(module.calls.argsFor(0)[0]).toBe(moduleName);
              });

              it('should stub all supplied directives by registering an empty template', function () {
                compiler.stub(['directive1']);
                helpers.callbacks.invoke('module', $provide);
                expect($provide.value).toHaveBeenCalledWith('directive1Directive', { template: '' });
              });

              it('should allow for single string values as opposed to arrays of directive names', function () {
                compiler.stub('directive1');
                helpers.callbacks.invoke('module', $provide);
                expect($provide.value).toHaveBeenCalledWith('directive1Directive', { template: '' });
              });

              it('should return the compiler', function () {
                expect(compiler.stub()).toBe(compiler);
              });
            });
          });

          describe('#validate', function () {
            it('when the directive has not yet been injected should throw an error', function () {
              expect(compiler.validate).toThrowError('Too early to validate; directive has not yet been injected.');
            });

            describe('when the directive has been injected', function () {
              beforeEach(function () {
                _inject();
              });

              var directive = {
                restrict: 'E',
                templateUrl: templateUrl,
                scope: {
                  fooKey: '=',
                  barKey: '=',
                  bazKey: '='
                },
                controllerAs: 'vm',
                bindToController: true
              };

              it('should return true if the directive object contains the entire sample', function () {
                expect(compiler.validate({ restrict: 'E' })).toBe(true);
                expect(compiler.validate({ restrict: 'EA' })).toBe(false);
                expect(compiler.validate({ scope: { fooKey: '=' } })).toBe(true);
                expect(compiler.validate({ scope: { fooKey: '*' } })).toBe(false);
                expect(compiler.validate({ scope: { quxKey: '=' } })).toBe(false);
                expect(compiler.validate({ bindToController: true })).toBe(true);
                expect(compiler.validate({ bindToController: 'anything' })).toBe(false);
                expect(compiler.validate({ unknown: undefined })).toBe(false);
                expect(compiler.validate({
                  restrict: 'E',
                  templateUrl: templateUrl,
                  scope: {
                    fooKey: '=',
                    barKey: '=',
                    bazKey: '='
                  },
                  controllerAs: 'vm',
                  bindToController: true
                })).toBe(true);
              });
            });
          });
        });

        describe('when generating a new element during compiler injection', function () {
          it('should use the module name to generate the tag name for element directives', function () {
            compiler = helpers.directives.compiler(moduleName, directiveName);
            _inject({ directive: { restrict: 'E' } });
            expectElement('<xx-directive-name foo-key="fooKey" bar-key="barKey" baz-key="bazKey"></xx-directive-name>');
          });

          it('should use the module name to generate an attribute and use "div" for tagName, for attribute directives', function () {
            compiler = helpers.directives.compiler(moduleName, directiveName);
            _inject({ directive: { restrict: 'A' } });
            expectElement('<div xx-directive-name foo-key="fooKey" bar-key="barKey" baz-key="bazKey"></div>');
          });

          it('should allow passing tagName as an option for attribute directives', function () {
            compiler = helpers.directives.compiler(moduleName, directiveName, { tagName: 'tr' });
            _inject({ directive: { restrict: 'A' } });
            expectElement('<tr xx-directive-name foo-key="fooKey" bar-key="barKey" baz-key="bazKey"></tr>');
          });

          it('should ignore the tagName option for non-attribute directives', function () {
            compiler = helpers.directives.compiler(moduleName, directiveName, { tagName: 'tr' });
            _inject({ directive: { restrict: 'EA' } });
            expectElement('<xx-directive-name foo-key="fooKey" bar-key="barKey" baz-key="bazKey"></xx-directive-name>');
          });

          it('should use the module name to generate the tag name for all other directive types', function () {
            compiler = helpers.directives.compiler(moduleName, directiveName);
            _inject({ directive: { restrict: 'EA' } });
            expectElement('<xx-directive-name foo-key="fooKey" bar-key="barKey" baz-key="bazKey"></xx-directive-name>');
          });

          function expectElement(elementString) {
            expect(angular.element).toHaveBeenCalledWith(elementString);
          }
        });

        function _inject(options) {
          templateUrl = '__templateUrl__';
          var directive = _directive();
          isolatedScope = '__isolatedScope__';
          compile = _compile();
          $compile = _$compile();
          scope = _scope();
          $rootScope = _$rootScope();
          $injector = _$injector();
          element = '__element__';

          helpers.spies.extendObj(angular, [{ name: 'element', and: { returnValue: element } }]);
          helpers.spies.extendObj(window, [{
            name: 'inject',
            and: { callFake: helpers.callbacks.register('inject') }
          }, 'module']);

          var result = compiler.inject();
          helpers.callbacks.invoke('inject', $injector);

          return result;

          function _compile() {
            return helpers.spies.create('$compile(element)', {
              returnValue: helpers.spies.createObj('compiler.element', [{
                name: 'isolateScope',
                and: { returnValue: isolatedScope }
              }])
            });
          }

          function _$compile() {
            return helpers.spies.create('$compile', { returnValue: compile });
          }

          function _scope() {

            return {
              $digest: helpers.spies.create('$digest'),
              fooKey: 'fooValue',
              barKey: 'barValue',
              bazKey: 'bazValue'
            };
          }

          function _$injector() {
            return helpers.spies.createObj('$injector', [{
              name: 'get',
              and: { callFake: get }
            }]);

            function get(dependency) {
              if (dependency === '$compile') {
                return $compile;
              } else if (dependency === '$rootScope') {
                return $rootScope;
              } else if (dependency === directiveName + 'Directive') {
                return [directive];
              }
            }
          }

          function _$rootScope() {
            return helpers.spies.createObj('$rootScope', [{
              name: '$new',
              and: { returnValue: scope }
            }]);
          }

          function _directive() {

            return _.extend({
              restrict: 'E',
              templateUrl: templateUrl,
              scope: {
                fooKey: '=',
                barKey: '=',
                bazKey: '='
              },
              controllerAs: 'vm',
              bindToController: true
            }, _.get(options, 'directive') || {});
          }
        }
      });
    });
  });

})(window._, window.unitTestHelpers);
