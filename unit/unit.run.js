(function (_, jasmine) {
  'use strict';

  // Not necessary; only here so IDEs won't complain, since they aren't smart enough to understand lodash paths (@see _.set)
  if (!window.unitTestHelpers) {
    window.unitTestHelpers = {
      callbacks: {},
      directives: {},
      injectors: {},
      spies: {}
    };
  }

  jasmine.IGNORE_WHEN_MATCHING = '____ignore____';
  jasmine.CallTracker.prototype.matching = matching;

  function matching() {
    var matcherArgs = arguments;

    return _.filter(this.all(), function (call) {
      return _.all(call.args, function (arg, idx) {
        return _.isEqual(arg, matcherArgs[idx], _.partialRight(isEqual, idx));
      });
    });

    function isEqual(callArg, matcherArg, currentIdx) {
      return matcherArg === callArg ||
             matcherArg === undefined && currentIdx >= matcherArgs.length ||
             matcherArg === jasmine.IGNORE_WHEN_MATCHING;
    }
  }

})(window._, window.jasmine);
