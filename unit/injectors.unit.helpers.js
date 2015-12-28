(function (_) {
  'use strict';

  _.set(window, 'unitTestHelpers.injectors', { add: add, get: get, remove: remove });

  var helpers = window.unitTestHelpers;

  var injectors = [];

  function add(options) {
    injectors.push(new Injector(options));
  }

  function get(name) {
    var injector = _.find(injectors, { name: name });

    if (injector) {
      injector.reset();
      return injector.prepare();
    }
  }

  function remove(name) {
    _.remove(injectors, { name: name });
  }

  /**
   * Known limitations:
   *
   *   - Can't provide multiple values for the same dependency used across provider types within a given injector.
   *
   *     For example, this configuration would ignore `$urlRouterProviderSpyValue2`
   *                                                  `$urlRouterProviderSpyValue3`
   *                                                  `$urlRouterProviderSpyValue4`:
   *
   *     helpers.injectors.add({
   *       name: 'app.module',
   *       dependencies: {
   *         config: [{
   *           name: '$urlRouterProvider',
   *           value: $urlRouterProviderSpyValue1,
   *           module: 'ui.router'
   *         }],
   *         provider: [{
   *           name: '$urlRouterProvider',
   *           value: $urlRouterProviderSpyValue2,
   *           module: 'ui.router'
   *         }],
   *         'config.resolve': [{
   *           name: '$urlRouterProvider',
   *           value: $urlRouterProviderSpyValue3,
   *           module: 'ui.router'
   *         }],
   *         run: [{
   *           name: '$urlRouterProvider',
   *           value: $urlRouterProviderSpyValue4,
   *           module: 'ui.router'
   *         }]
   *       }
   *     });
   *
   *     Instead, create one value function that is used for all provider dependency types.
   *
   *  - Can't mock providers that depend on the module you are testing. This is because the module instance is
   *    temporarily replaced in order to inject mock values when the module is loaded.
   */
  function Injector(options) {
    var injector = this;

    var createModuleDependencies = ['config', 'provider'],
      provideValueDependencies = ['config.resolve', 'run'];

    if (!_.isString(_.get(options, 'name'))) {
      throw new Error('All injectors must provide a name.');
    }

    injector.dependencies = [];
    injector.name = options.name;
    injector.prepare = prepare;
    injector.reset = reset;

    function prepare() {
      var dependencies = _.get(options, 'dependencies') || {},
        providerTypes = _.union(createModuleDependencies, provideValueDependencies);

      _.each(providerTypes, function (providerType) {
        if (!_.isEmpty(dependencies[providerType])) {
          _prepareDependencies(providerType, dependencies[providerType]);
        }
      });

      if (!_.any(_.keys(dependencies), _.partial(_.contains, provideValueDependencies))) {
        // since no "provideValue" dependencies exist, the module was never loaded. Load it. @see provideValues()
        module(injector.name);
      }

      return { inject: _inject, reset: reset };
    }

    function reset() {

      _.each(injector.dependencies, function (dependency) {
        if (dependency._original) {
          _.extend(angular.module(dependency._original.name), dependency._original);
        }
      });

      injector.dependencies = [];
    }

    function _inject(callback) {
      var args = extractArgs(callback);

      inject();

      var dependencies = _.map(args, function (arg) {
        return _.get(_.find(injector.dependencies, { name: arg }), '_value');
      });

      _.spread(callback)(dependencies);

      // https://github.com/angular/angular.js/blob/master/src/auto/injector.js#L72
      function extractArgs(fn) {
        var FN_ARGS = /^[^\(]*\(\s*([^\)]*)\)/m;
        var FN_ARG_SPLIT = /,/;
        var FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;
        var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;

        var fnText = fn.toString().replace(STRIP_COMMENTS, '');
        var extracted = fnText.match(FN_ARGS);

        var args = [];

        _.each(extracted[1].split(FN_ARG_SPLIT), function (arg) {
          arg.replace(FN_ARG, function(all, underscore, name) {
            args.push(name);
          });
        });

        return args;
      }

      return { reset: reset };
    }

    function _prepareDependencies(op, dependencies) {
      if (!_.isEmpty(dependencies) && !_.isArray(dependencies)) {
        throw new Error('Injector dependencies "dependencies.' + op + '" must be an array.');
      }

      if (_.contains(createModuleDependencies, op)) {
        createModules(dependencies);
      } else {
        provideValues(dependencies);
      }

      /**
       * Register a mock module for each dependency, and attach the dependencies to the module.
       * This new reference will be fed as the dependency into the .config() or .provider() block,
       * as well as become injectable in the unit test.
       */
      function createModules(dependencies) {
        _.each(dependencies, function (dependency) {

          if (_.find(injector.dependencies, { name: dependency.name })) {
            return;
          }

          _prepareValue(dependency);

          if (!_.endsWith(dependency.name, 'Provider') && !_.endsWith(dependency.name, '.config')) {
            throw new Error('All ' + op + ' dependencies must be either providers or configuration constants.');
          }

          if (!dependency.module) {
            throw new Error('All ' + op + ' dependencies must specify a module.');
          }

          // Can't override core angular modules
          if (!_.startsWith(dependency.module, 'ng')) {
            overrideRealValue();
          } else {
            extendRealValue();
          }

          // Create a special module that loads early, and modifies the real provider with the methods of interest
          function extendRealValue() {
            var moduleName = dependency.name + 'Config';

            angular
              .module(moduleName, [dependency.module])
              .config(config);

            config.$inject = [dependency.name];
            module(moduleName);

            function config(_provider_) {
              _.extend(_provider_, dependency._value);

              dependency._value = _provider_;
              injector.dependencies.push(dependency);
            }
          }

          function overrideRealValue() {
            if (!_.find(injector.dependencies, { module: dependency.module })) {
              dependency._original = angular.module(dependency.module);
              angular.module(dependency.module, []);
            }

            if (_.endsWith(dependency.name, '.config')) {
              angular.module(dependency.module)
                .constant(dependency.name, dependency._value);
            } else {
              angular.module(dependency.module)
                .provider(dependency.name.replace('Provider', ''), _.defaults(dependency._value, {
                  $get: helpers.spies.create(dependency.name + '.$get')
                }));
            }

            injector.dependencies.push(dependency);
          }
        });
      }

      /**
       * Load the actual module, which will cause the .config() and .provider() blocks to execute with the dependencies
       * that were previously established. Additionally provide mock values for all config.resolve() and .run() dependencies.
       * These mock values will be fed as the dependency to the config.resolve() or .run() block,
       * as well as become injectable in the unit test.
       */
      function provideValues(dependencies) {

        module(injector.name, function ($provide) {
          _.each(dependencies, function (dependency) {
            if (_.find(injector.dependencies, { name: dependency.name })) {
              return;
            }

            _prepareValue(dependency);

            injector.dependencies.push(dependency);
            $provide.value(dependency.name, dependency._value);
          });
        });
      }

      function _prepareValue(dependency) {
        validateDependency(dependency);
        dependency._value = dependency.value();

        function validateDependency(dependency) {
          if (!_.get(dependency, 'name') || !_.get(dependency, 'value')) {
            throw new Error('All injector dependencies must provide a name and value.');
          }

          if (typeof dependency.value !== 'function' || dependency.value() === dependency.value()) {
            throw new Error('Dependency value must be a function that returns a unique reference each time.');
          }
        }
      }

    }
  }

})(window._);
