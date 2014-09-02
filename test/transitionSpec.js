describe('transition', function () {
  var states;
  var Resolvable, Path, PathElement, PathContext;
  var emptyPath;
  beforeEach(inject(function($transition) {
    Resolvable = $transition.Resolvable;
    Path = $transition.Path;
    PathElement = $transition.PathElement;
    PathContext = $transition.PathContext;
    emptyPath = new Path([]);
  }));

  beforeEach(function() {
    states = {};
    states[''] = { name: '', parent: null };
    states['home'] = {
      name: 'home', parent: states['']
      ,resolve: { foo: function () { return "foo"; } }
    };
    states['home.about'] = {
      name: 'home.about', parent: states['home']
      ,resolve: { bar: function () { return "bar"; } }
    };
    states['home.about.people'] = {
      name: 'home.about.people', parent: states['home.about']
      ,resolve: { baz: function () { return "baz"; } }
    };
    states['home.about.people.person'] = {
      name: 'home.about.people.person', parent: states['home.about.people']
      ,resolve: { qux: function(foo, bar, baz) { return foo + bar + baz + "qux"; }}
    };
    states['home.about.company'] = { name: 'home.about.company', parent: states['home.about'] };
    states['other'] = { name: 'other', parent: states[''] };
    states['other.foo'] = { name: 'other.foo', parent: states['other'] };
    states['other.foo.bar'] = { name: 'other.foo.bar' };

    states['home.withData'] = {
      name: 'home.withData',
      data: { val1: "foo", val2: "bar" },
      parent: states['home']
    };

    states['home.withData.child'] = {
      name: 'home.withData.child',
      data: { val2: "baz" },
      parent: states['home.withData']
    };
  });

  describe('PathElement.resolve()', function() {
    it('should resolve all resolves in a PathElement', inject(function($q) {
      var path = new Path([ states[''], states['home'], states['home.about'], states['home.about.people'] ]);
      var pathContext = new PathContext(emptyPath, path);
      var promise = path.elements()[3].resolve(pathContext);
      promise.then(function(data) {
        expect(path.$$elements[1].$$resolvables['foo']).toBeDefined();
        expect(path.$$elements[1].$$resolvables['foo'].data).toBeUndefined();
        expect(path.$$elements[2].$$resolvables['bar'].data).toBeUndefined();
        expect(path.$$elements[3].$$resolvables['baz'].data).toBe("baz");
      });

      $q.flush();
    }));
  });

  describe('Path.resolve()', function() {
    it('should resolve all resolves in a Path', inject(function($q) {
      var path = new Path([ states[''], states['home'], states['home.about'], states['home.about.people'] ]);
      var promise = path.resolve(new PathContext(emptyPath, path));
      promise.then(function(data) {
        expect(path.$$elements[1].$$resolvables['foo'].data).toBe("foo");
        expect(path.$$elements[2].$$resolvables['bar'].data).toBe("bar");
        expect(path.$$elements[3].$$resolvables['baz'].data).toBe("baz");
      });

      $q.flush();
    }));
  });

  describe('Resolvable.resolve()', function() {
    it('should resolve Resolvable and its deps', inject(function($q) {
      var path = new Path([ states[''], states['home'], states['home.about'], states['home.about.people'] ]);
      var path2 = new Path([ states['home.about.people.person'] ]);
      var promise = path2.resolve(new PathContext(path, path2));

      promise.then(function(data) {
        expect(path2.$$elements[0].$$resolvables['qux'].data).toBe("foobarbazqux");
      });

      $q.flush();
    }));
  });

  describe('PathElement.invokeLater()', function() {
    it('should resolve only the required deps, then inject fn', inject(function($q) {
      var path = new Path([ states[''], states['home'], states['home.about'], states['home.about.people'], states['home.about.people.person'] ]);
      var peopleElement = path.elements()[3];
      var context = new PathContext(emptyPath, path);

      var result;
      var onEnter = function(baz) {
        result = baz;
      };
      var promise = peopleElement.invokeLater(onEnter, {}, context);

      promise.then(function(data) {
        expect(result).toBe("baz");
        expect(path.$$elements[1].$$resolvables['foo'].data).toBeUndefined();
        expect(path.$$elements[2].$$resolvables['bar'].data).toBeUndefined();
        expect(path.$$elements[3].$$resolvables['baz'].data).toBe("baz");
        expect(path.$$elements[4].$$resolvables['qux'].data).toBeUndefined();
      });

      $q.flush();
    }));
  });

  describe('invokeLater', function() {
    it('should fail if invoked on the wrong path element', inject(function($q) {
      var path = new Path([ states[''], states['home'], states['home.about'], states['home.about.people'], states['home.about.people.person'] ]);
      var peopleElement = path.elements()[3];
      var context = new PathContext(emptyPath, path);
      var quxOnEnter = function(qux) { quxResult = qux; };
      var quxPromise = peopleElement.invokeLater(quxOnEnter, {}, context);

      var caught;
      quxPromise.catch(function(err) {
        caught = err;
      });

      $q.flush();
      expect(caught.message.substring(0, 53)).toBe("[$injector:unpr] Unknown provider: quxProvider <- qux");
    }));
  });

  describe('Resolvables', function() {
    it('should load deps on-demand', inject(function($q) {
      var path = new Path([ states[''], states['home'], states['home.about'], states['home.about.people'], states['home.about.people.person'] ]);
      var context = new PathContext(emptyPath, path);

      var bazResult;
      var bazOnEnter = function(baz) { bazResult = baz; };
      var peopleElement = path.elements()[3];
      var bazPromise = peopleElement.invokeLater(bazOnEnter, {}, context);
      bazPromise.then(function(data) {
        expect(bazResult).toBe("baz");
        expect(path.$$elements[1].$$resolvables['foo'].data).toBeUndefined();
        expect(path.$$elements[2].$$resolvables['bar'].data).toBeUndefined();
        expect(path.$$elements[3].$$resolvables['baz'].data).toBe("baz");
        expect(path.$$elements[4].$$resolvables['qux'].data).toBeUndefined();
      });
      $q.flush();

      var quxResult;
      var quxOnEnter = function(qux) { quxResult = qux; };
      var personElement = path.elements()[4];
      var quxPromise = personElement.invokeLater(quxOnEnter, {}, context);
      quxPromise.then(function(data) {
        expect(quxResult).toBe("foobarbazqux");
        expect(path.$$elements[1].$$resolvables['foo'].data).toBe("foo");
        expect(path.$$elements[2].$$resolvables['bar'].data).toBe("bar");
        expect(path.$$elements[3].$$resolvables['baz'].data).toBe("baz");
        expect(path.$$elements[4].$$resolvables['qux'].data).toBe("foobarbazqux");
      });

      $q.flush();
    }));
  });
});