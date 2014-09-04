describe('transition', function () {
  var statesTree, statesMap = {};
  var Resolvable, Path, PathElement, ResolveContext;
  var emptyPath;
  var counts;

  beforeEach(inject(function ($transition) {
    Resolvable = $transition.Resolvable;
    Path = $transition.Path;
    PathElement = $transition.PathElement;
    ResolveContext = $transition.ResolveContext;
    emptyPath = new Path([]);
  }));

  beforeEach(function () {
    counts = { _J: 0, _J2: 0, _K: 0, _L: 0, _M: 0};
    states = {
      A: { resolve: { _A: function () { return "A"; }, _A2: function() { return "A2"; }},
        B: { resolve: { _B: function () { return "B"; }, _B2: function() { return "B2"; }},
          C: { resolve: { _C: function (_A, _B) { return _A + _B + "C"; }, _C2: function() { return "C2"; }},
            D: { resolve: { _D: function (_D2) { return "D1" + _D2; }, _D2: function () { return "D2"; }} }
          }
        },
        E: { resolve: { _E: function() { return "E"; } },
          F: { resolve: { _E: function() { return "_E"; }, _F: function(_E) { return _E + "F"; }} }
        },
        G: { resolve: { _G: function() { return "G"; } },
          H: { resolve: { _G: function(_G) { return _G + "_G"; }, _H: function(_G) { return _G + "H"; } } }
        },
        I: { resolve: { _I: function(_I) { return "I"; } } }
      },
      J: { resolve: { _J: function() { counts['_J']++; return "J"; }, _J2: function(_J) { counts['_J2']++; return _J + "J2"; } },
        K: { resolve: { _K: function(_J2) { counts['_K']++; return _J2 + "K"; }},
          L: { resolve: { _L: function(_K) { counts['_L']++; return _K + "L"; }},
            M: { resolve: { _M: function(_L) { counts['_M']++; return _L + "M"; }} }
          }
        }
      }
    };

    var stateProps = ["resolve"];
    statesTree = loadStates({}, states, '');

    function loadStates(parent, state, name) {
      var thisState = pick.apply(null, [state].concat(stateProps));
      var substates = omit.apply(null, [state].concat(stateProps));

      thisState.name = name;
      thisState.parent = parent.name;
      thisState.data = { children: [] };

      angular.forEach(substates, function (value, key) {
        thisState.data.children.push(loadStates(thisState, value, key));
      });
      statesMap[name] = thisState;
      return thisState;
    }
//    console.log(map(makePath([ "A", "B", "C" ]), function(s) { return s.name; }));
  });

  function makePath(names) {
    return new Path(map(names, function(name) { return statesMap[name]; }));
  }

  describe('PathElement.resolve()', function () {
    it('should resolve all resolves in a PathElement', inject(function ($q) {
      var path = makePath([ "A" ]);
      var promise = path.elements()[0].resolve(new ResolveContext(emptyPath, path)); // A
      promise.then(function () {
        expect(path.$$elements[0].$$resolvables['_A']).toBeDefined();
        expect(path.$$elements[0].$$resolvables['_A'].data).toBe("A");
        expect(path.$$elements[0].$$resolvables['_A2'].data).toBe("A2");
      });

      $q.flush();
    }));
  });

  describe('PathElement.resolve()', function () {
    it('should not resolve non-dep parent PathElements', inject(function ($q) {
      var path = makePath([ "A", "B" ]);
      var promise = path.elements()[1].resolve(new ResolveContext(emptyPath, path)); // B
      promise.then(function () {
        expect(path.$$elements[0].$$resolvables['_A']).toBeDefined();
        expect(path.$$elements[0].$$resolvables['_A'].data).toBeUndefined();
        expect(path.$$elements[0].$$resolvables['_A2'].data).toBeUndefined();
        expect(path.$$elements[1].$$resolvables['_B'].data).toBe("B");
        expect(path.$$elements[1].$$resolvables['_B2'].data).toBe("B2");
      });

      $q.flush();
    }));
  });

  describe('ResolveContext.getResolvableLocals', function () {
    it('should return Resolvables from itself and all parents', inject(function ($q) {
      var path = makePath([ "A", "B", "C" ]);
      var resolveContext = new ResolveContext(emptyPath, path);
      var resolvableLocals = resolveContext.getResolvableLocals("C", { flatten: true } );
      var keys = Object.keys(resolvableLocals).sort();
      expect(keys).toEqual( ["_A", "_A2", "_B", "_B2", "_C", "_C2" ] );
    }));
  });

  describe('Path.resolve()', function () {
    it('should resolve all resolves in a Path', inject(function ($q) {
      var path = makePath([ "A", "B" ]);
      var promise = path.resolve(new ResolveContext(emptyPath, path));
      promise.then(function () {
        expect(path.$$elements[0].$$resolvables['_A'].data).toBe("A");
        expect(path.$$elements[0].$$resolvables['_A2'].data).toBe("A2");
        expect(path.$$elements[1].$$resolvables['_B'].data).toBe("B");
        expect(path.$$elements[1].$$resolvables['_B2'].data).toBe("B2");
      });

      $q.flush();
    }));
  });

  describe('Resolvable.resolve()', function () {
    it('should resolve one Resolvable, and its deps', inject(function ($q) {
      var path = makePath([ "A", "B", "C" ]);
      var promise = path.$$elements[2].$$resolvables['_C'].resolve(new ResolveContext(emptyPath, path));
      promise.then(function () {
        expect(path.$$elements[0].$$resolvables['_A'].data).toBe("A");
        expect(path.$$elements[0].$$resolvables['_A2'].data).toBeUndefined();
        expect(path.$$elements[1].$$resolvables['_B'].data).toBe("B");
        expect(path.$$elements[1].$$resolvables['_B2'].data).toBeUndefined();
        expect(path.$$elements[2].$$resolvables['_C'].data).toBe("ABC");
      });

      $q.flush();
    }));
  });

  describe('PathElement.invokeLater()', function () {
    it('should resolve only the required deps, then inject the fn', inject(function ($q) {
      var path = makePath([ "A", "B", "C", "D" ]);
      var cPathElement = path.elements()[2];
      var context = new ResolveContext(emptyPath, path);

      var result;

      var onEnter1 = function (_C2) { result = _C2; };
      var promise = cPathElement.invokeLater(onEnter1, {}, context);
      promise.then(function (data) {
        expect(result).toBe("C2");
        expect(path.$$elements[0].$$resolvables['_A'].data).toBeUndefined();
        expect(path.$$elements[1].$$resolvables['_B'].data).toBeUndefined();
        expect(path.$$elements[2].$$resolvables['_C'].data).toBeUndefined();
        expect(path.$$elements[2].$$resolvables['_C2'].data).toBe("C2");
        expect(path.$$elements[3].$$resolvables['_D'].data).toBeUndefined();
      });
      $q.flush();
    }));
  });

  describe('PathElement.invokeLater()', function () {
    it('should resolve the required deps on demand', inject(function ($q) {
      var path = makePath([ "A", "B", "C", "D" ]);
      var cPathElement = path.elements()[2];
      var context = new ResolveContext(emptyPath, path);

      var result;

      var cOnEnter1 = function (_C2) { result = _C2; };
      var promise = cPathElement.invokeLater(cOnEnter1, {}, context);
      promise.then(function (data) {
        expect(result).toBe("C2");
        expect(path.$$elements[0].$$resolvables['_A'].data).toBeUndefined();
        expect(path.$$elements[1].$$resolvables['_B'].data).toBeUndefined();
        expect(path.$$elements[2].$$resolvables['_C'].data).toBeUndefined();
        expect(path.$$elements[2].$$resolvables['_C2'].data).toBe("C2");
        expect(path.$$elements[3].$$resolvables['_D'].data).toBeUndefined();
      });
      $q.flush();

      var cOnEnter2 = function (_C) { result = _C; };
      promise = cPathElement.invokeLater(cOnEnter2, {}, context);
      promise.then(function (data) {
        expect(result).toBe("ABC");
        expect(path.$$elements[0].$$resolvables['_A'].data).toBe("A");
        expect(path.$$elements[1].$$resolvables['_B'].data).toBe("B");
        expect(path.$$elements[2].$$resolvables['_C'].data).toBe("ABC");
        expect(path.$$elements[2].$$resolvables['_C2'].data).toBe("C2");
        expect(path.$$elements[3].$$resolvables['_D'].data).toBeUndefined();
      });
      $q.flush();
    }));
  });

  describe('invokeLater', function () {
    it('should Error if the onEnter dependency cannot be injected', inject(function ($q) {
      var path = makePath([ "A", "B", "C", "D" ]);
      var cPathElement = path.elements()[2];
      var context = new ResolveContext(emptyPath, path);

      var cOnEnter = function (_D) {  };
      var caught;
      var promise = cPathElement.invokeLater(cOnEnter, {}, context);
      promise.catch(function (err) {
        caught = err;
      });

      $q.flush();
      expect(caught.message).toContain("Unknown provider: _DProvider");
    }));
  });


  describe('Resolvables', function () {
    it('should inject same-name deps from parent', inject(function ($q) {
      var path = makePath([ "A", "B", "C", "D" ]);
      var dPathElement = path.elements()[3];
      var context = new ResolveContext(emptyPath, path);

      var result;
      var dOnEnter = function (_D) {
        result = _D;
      };

      var promise = dPathElement.invokeLater(dOnEnter, {}, context);
      promise.then(function () {
        expect(result).toBe("D1D2");
        expect(path.$$elements[0].$$resolvables['_A'].data).toBeUndefined();
        expect(path.$$elements[3].$$resolvables['_D'].data).toBe("D1D2");
        expect(path.$$elements[3].$$resolvables['_D2'].data).toBe("D2");
      });

      $q.flush();
    }));
  });

  describe('Resolvables', function () {
    it('should allow PathElement to override parent deps', inject(function ($q) {
      var path = makePath([ "A", "E", "F" ]);
      var fPathElement = path.elements()[2];
      var context = new ResolveContext(emptyPath, path);

      var result;
      var fOnEnter = function (_F) {
        result = _F;
      };

      var promise = fPathElement.invokeLater(fOnEnter, {}, context);
      promise.then(function () {
        expect(result).toBe("_EF");
      });

      $q.flush();
    }));
  });

  describe('Resolvables', function () {
    it('should inject same-name deps from parent PathElement', inject(function ($q) {
      var path = makePath([ "A", "G", "H" ]);
      var context = new ResolveContext(emptyPath, path);

      var resolvable_G = path.elements()[2].$$resolvables._G;
      var promise = resolvable_G.get(context);
      promise.then(function (data) {
        expect(data).toBe("G_G");
      });
      $q.flush();

      var result;
      var hOnEnter = function (_H) {
        result = _H;
      };

      var hPathElement = path.elements()[2];
      promise = hPathElement.invokeLater(hOnEnter, {}, context);
      promise.then(function (data) {
        expect(result).toBe("G_GH");
      });

      $q.flush();
    }));
  });

  describe('Resolvables', function () {
    it('should fail to inject same-name deps to self', inject(function ($q) {
      var path = makePath([ "A", "I" ]);
      var context = new ResolveContext(emptyPath, path);

      var iPathElement = path.elements()[1];
      var iOnEnter = function (_I) {  };
      var caught;
      var promise = iPathElement.invokeLater(iOnEnter, {}, context);
      promise.catch(function (err) {
        caught = err;
      });

      $q.flush();
      expect(caught.message).toContain("[$injector:unpr] Unknown provider: _IProvider ");
    }));
  });

  describe('Resolvables', function () {
    it('should not re-resolve', inject(function ($q) {
      var path = makePath([ "J", "K" ]);
      var context = new ResolveContext(emptyPath, path);

      var kPathElement = path.elements()[1];
      var result;
      function checkCounts() {
        expect(result).toBe("JJ2K");
        expect(counts['_J']).toBe(1);
        expect(counts['_J2']).toBe(1);
        expect(counts['_K']).toBe(1);
      }
      var promise = kPathElement.invokeLater(function(_K) { result = _K; }, {}, context);
      promise.then(checkCounts);
      $q.flush();

      // invoke again
      promise = kPathElement.invokeLater(function(_K) { result = _K; }, {}, context);
      promise.then(checkCounts);
      $q.flush();
    }));
  });

  describe('PathContext', function () {
    it('from previous resolve should be', inject(function ($q) {
      var path = makePath([ "J", "K" ]);

      expect(counts["_J"]).toBe(0);
      expect(counts["_J2"]).toBe(0);
      path.resolve(new ResolveContext(emptyPath, path)).then(function () {
        expect(counts["_J"]).toBe(1);
        expect(counts["_J2"]).toBe(1);
        expect(counts["_K"]).toBe(1);
      });
      $q.flush();

      var path2 = makePath([ "L", "M" ]);
      path2.resolve(new ResolveContext(path, path2)).then(function () {
        expect(counts["_J"]).toBe(1);
        expect(counts["_J2"]).toBe(1);
        expect(counts["_K"]).toBe(1);
        expect(counts["_L"]).toBe(1);
        expect(counts["_M"]).toBe(1);
      });
      $q.flush();
    }));
  });

  describe('Path.slice()', function () {
    it('should create a partial path from an original path', inject(function ($q) {
      var path = makePath([ "J", "K", "L" ]);
      path.resolve(new ResolveContext(emptyPath, path)).then(function () {
        expect(counts["_J"]).toBe(1);
        expect(counts["_J2"]).toBe(1);
        expect(counts["_K"]).toBe(1);
        expect(counts["_L"]).toBe(1);
      });
      $q.flush();

      var slicedPath = path.slice(0, 2);
      expect(slicedPath.elements().length).toBe(2);
      expect(slicedPath.elements()[1]).toBe(path.elements()[1]);
      var path2 = makePath([ "L", "M" ]);
      path2.resolve(new ResolveContext(slicedPath, path2)).then(function () {
        expect(counts["_J"]).toBe(1);
        expect(counts["_J2"]).toBe(1);
        expect(counts["_K"]).toBe(1);
        expect(counts["_L"]).toBe(2);
        expect(counts["_M"]).toBe(1);
      });
      $q.flush();
    }));
  });

  // TODO: test injection of annotated functions
  // TODO: test injection of services
  // TODO: test injection of other locals
  // TODO: Implement and test injection to onEnter/Exit
  // TODO: Implement and test injection into controllers
});