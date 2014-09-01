describe('transition', function () {
//  var stateProvider, transitionProvider, locationProvider, templateParams, ctrlName;
//  var Path;

//  beforeEach(module('ui.router', function($locationProvider) {
//    // This isn't getting invoked.   ???
//    locationProvider = $locationProvider;
//    $locationProvider.html5Mode(false);
//  }));

  var states;
  beforeEach(function() {
    states = {};
    states[''] = { name: '', parent: null };
    states['home'] = {
      name: 'home', parent: states['']
      ,resolve: { foo: function () { console.log("foo"); return "foo"; } }
    };
    states['home.about'] = {
      name: 'home.about', parent: states['home']
      ,resolve: { bar: function () { console.log("bar"); return "bar"; } }
    };
    states['home.about.people'] = {
      name: 'home.about.people', parent: states['home.about']
      ,resolve: { baz: function () { console.log("baz"); return "baz"; } }
    };
    states['home.about.people.person'] = { name: 'home.about.people.person', parent: states['home.about.people'] };
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

//  beforeEach(module('ui.router',  function($transitionProvider, $locationProvider) {
//    locationProvider = $locationProvider;
//    transitionProvider = $transitionProvider;
//    Path = transitionProvider.Path;
//    $locationProvider.html5Mode(false);
//  }));

//  beforeEach(module(function ($stateProvider, $provide) {
//    console.log("------------------------->", transitionProvider);
//    angular.forEach(states, function(state) {
//      $stateProvider.state(state);
//    });
//  }));

  describe('Path.resolve()', function() {
    it('should resolve on-demand', inject(function($transition) {
      var Path = $transition.Path;
      var PathContext = $transition.PathContext;
      console.log(Path, PathContext);
      var path = new Path([ states[''], states['home'], states['home.about'], states['home.about.people'] ]);
      path.resolve(new PathContext(new Path([])));
    }));
  });
});