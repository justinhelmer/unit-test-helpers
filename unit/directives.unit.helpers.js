(function (_) {
  'use strict';

  _.set(window, 'unitTestHelpers.directives', { compiler: compiler });

  function compiler(moduleName, directiveName, options) {
    return new Compiler(moduleName, directiveName, options);
  }

  function Compiler(moduleName, directiveName, options) {
    if (!moduleName) {
      throw new Error('Module name is required.');
    }

    if (!directiveName) {
      throw new Error('Directive name is required.');
    }

    var compiler = this;

    compiler.compile = compile;
    compiler.element = null;
    compiler.inject = injectAndPrepare;
    compiler.scope = null;
    compiler.stub = stub;
    compiler.validate = validate;

    var $compile = null,
      directive = null,
      element = null;

    function compile(scope) {
      if (!element) {
        throw new Error('Too early to compile; directive has not yet been injected.');
      }

      compiler.element = $compile(element)(scope || compiler.scope);
      compiler.scope.$digest();

      return compiler.element.isolateScope();
    }

    function injectAndPrepare() {
      if (directive) {
        throw new Error('Directive has already been injected');
      }

      module(moduleName);
      inject(injector);

      return compiler;

      function injector($injector) {
        $compile = $injector.get('$compile');
        compiler.scope = $injector.get('$rootScope').$new();

        directive = $injector.get(directiveName + 'Directive')[0];
        element = _element();
      }
    }

    function stub(directiveNames) {
      if (directive) {
        throw new Error('Too late to stub; directive has already been injected.');
      }

      directiveNames = (!_.isArray(directiveNames)) ? ([directiveNames]) : (directiveNames);

      _.each(directiveNames, function (directiveName) {
        module(moduleName, function ($provide) {
          $provide.value(directiveName + 'Directive', { template: '' });
        });
      });

      return compiler;
    }

    function validate(sample) {
      if (!directive) {
        throw new Error('Too early to validate; directive has not yet been injected.');
      }

      return _.matches(sample)(directive);
    }

    function _element() {

      return angular.element(elementString());

      function elementString() {
        var name = _.kebabCase(directiveName),
          scopeVariables = _.keys(directive.scope),
          tagName = (directive.restrict === 'A') ? (_.get(options, 'tagName') || 'div') : (name),
          attrs =_.map(scopeVariables, _.kebabCase),
          elementString = (tagName !== name) ? ('<' + tagName + ' ' + name) : ('<'+ name);

        _.each(attrs, function (attr, idx) {
          elementString += ' ' + attr + '="' + scopeVariables[idx] + '"';
        });

        elementString += '></' + tagName + '>';

        return elementString;
      }
    }
  }

})(window._);
