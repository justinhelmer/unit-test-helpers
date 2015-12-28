(function (helpers) {
  'use strict';

  describe('jasmine.CallTracker.prototype', function () {
    var foo;

    beforeEach(function () {
      foo = helpers.spies.create('foo', { callFake: angular.noop });
      foo('bar', 'baz', 'qux');
    });

    describe('#matches', function () {
      it('should return the call if all of the arguments match', function () {
        expect(foo.calls.matching('bar', 'baz', 'qux').length).toBe(1);
      });

      it('should return the call if all arguments that are included match', function () {
        expect(foo.calls.matching('bar', 'baz').length).toBe(1);
        expect(foo.calls.matching('bar').length).toBe(1);
      });

      it('should return the call if all arguments but ignored arguments match', function () {
        expect(foo.calls.matching('bar', jasmine.IGNORE_WHEN_MATCHING, 'qux').length).toBe(1);
      });

      it('should not ignore empty arguments', function () {
        expect(foo.calls.matching('bar', null, 'qux').length).toBe(0);
        expect(foo.calls.matching('bar', undefined, 'qux').length).toBe(0);
        expect(foo.calls.matching('bar', 0, 'qux').length).toBe(0);
        expect(foo.calls.matching('bar', false, 'qux').length).toBe(0);
        expect(foo.calls.matching('bar', '', 'qux').length).toBe(0);
      });

      it('should return multiple matches if they exist', function () {
        foo('bar', 'baz', 'other');
        foo('baz');

        expect(foo.calls.matching('bar', 'baz', 'qux').length).toBe(1);
        expect(foo.calls.matching('bar', 'baz', 'other').length).toBe(1);
        expect(foo.calls.matching('bar', 'baz').length).toBe(2);
        expect(foo.calls.matching('bar').length).toBe(2);
        expect(foo.calls.matching('baz').length).toBe(1);
      });
    });
  });

})(window.unitTestHelpers);
