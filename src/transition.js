

/**
 * @ngdoc object
 * @name ui.router.state.$transitionProvider
 */
$TransitionProvider.$inject = [];
function $TransitionProvider() {

  var $transition = {}, events, stateMatcher = angular.noop, abstractKey = 'abstract';

  // $transitionProvider.on({ from: "home", to: "somewhere.else" }, function($transition$, $http) {
  //   // ...
  // });
  this.on = function(states, callback) {
  };

  // $transitionProvider.onEnter({ from: "home", to: "somewhere.else" }, function($transition$, $http) {
  //   // ...
  // });
  this.onEnter = function(states, callback) {
  };

  // $transitionProvider.onExit({ from: "home", to: "somewhere.else" }, function($transition$, $http) {
  //   // ...
  // });
  this.onExit = function(states, callback) {
  };

  // $transitionProvider.onSuccess({ from: "home", to: "somewhere.else" }, function($transition$, $http) {
  //   // ...
  // });
  this.onSuccess = function(states, callback) {
  };

  // $transitionProvider.onError({ from: "home", to: "somewhere.else" }, function($transition$, $http) {
  //   // ...
  // });
  this.onError = function(states, callback) {
  };


  /**
   * @ngdoc service
   * @name ui.router.state.$transition
   *
   * @requires $q
   * @requires $injector
   * @requires ui.router.util.$resolve
   *
   * @description
   * The `$transition` service manages changes in states and parameters.
   */
  this.$get = $get;
  $get.$inject = ['$q', '$injector', '$resolve', '$stateParams'];
  function $get(   $q,   $injector,   $resolve,   $stateParams) {

    var from = { state: null, params: null },
        to   = { state: null, params: null };

    /**
     * @ngdoc object
     * @name ui.router.state.type:Transition
     *
     * @description
     * Represents a transition between two states, and contains all contextual information about the
     * to/from states and parameters, as well as the list of states being entered and exited as a
     * result of this transition.
     *
     * @param {Object} fromState The origin {@link ui.router.state.$stateProvider#state state} from which the transition is leaving.
     * @param {Object} fromParams An object hash of the current parameters of the `from` state.
     * @param {Object} toState The target {@link ui.router.state.$stateProvider#state state} being transitioned to.
     * @param {Object} toParams An object hash of the target parameters for the `to` state.
     * @param {Object} options An object hash of the options for this transition.
     *
     * @returns {Object} New `Transition` object
     */
    function Transition(fromState, fromParams, toState, toParams, options) {
      var keep = 0, state, retained = [], entering = [], exiting = [];
      var hasRun = false, hasCalculated = false;

      var states = {
        to: stateMatcher(toState, options),
        from: stateMatcher(fromState, options)
      };

      function isTargetStateValid() {
        var state = stateMatcher(toState, options);

        if (!isDefined(state)) {
          if (!options || !options.relative) return "No such state " + angular.toJson(toState);
          return "Could not resolve " + angular.toJson(toState) + " from state " + angular.toJson(options.relative);
        }
        if (state[abstractKey]) return "Cannot transition to abstract state " + angular.toJson(toState);
        return null;
      }

      function hasBeenSuperseded() {
        return !(fromState === from.state && fromParams === from.params);
      }

      function calculateTreeChanges() {
        if (hasCalculated) return;

        state = toState.path[keep];

        while (state && state === fromState.path[keep] && equalForKeys(toParams, fromParams, state.ownParams)) {
          retained.push(state);
          keep++;
          state = toState.path[keep];
        }

        for (var i = fromState.path.length - 1; i >= keep; i--) {
          exiting.push(fromState.path[i]);
        }

        for (i = keep; i < toState.path.length; i++) {
          entering.push(toState.path[i]);
        }
        hasCalculated = true;
      }


      extend(this, {
        /**
         * @ngdoc function
         * @name ui.router.state.type:Transition#from
         * @methodOf ui.router.state.type:Transition
         *
         * @description
         * Returns the origin state of the current transition, as passed to the `Transition` constructor.
         *
         * @returns {Object} The origin {@link ui.router.state.$stateProvider#state state} of the transition.
         */
        from: extend(function() { return fromState; }, {

          /**
           * @ngdoc function
           * @name ui.router.state.type:Transition.from#state
           * @methodOf ui.router.state.type:Transition
           *
           * @description
           * Returns the object definition of the origin state of the current transition.
           *
           * @returns {Object} The origin {@link ui.router.state.$stateProvider#state state} of the transition.
           */
          state: function() {
            return states.from && states.from.self;
          },

          $state: function() {
            return states.from;
          }
        }),

        /**
         * @ngdoc function
         * @name ui.router.state.type:Transition#to
         * @methodOf ui.router.state.type:Transition
         *
         * @description
         * Returns the target state of the current transition, as passed to the `Transition` constructor.
         *
         * @returns {Object} The target {@link ui.router.state.$stateProvider#state state} of the transition.
         */
        to: extend(function() { return toState; }, {

          /**
           * @ngdoc function
           * @name ui.router.state.type:Transition.to#state
           * @methodOf ui.router.state.type:Transition
           *
           * @description
           * Returns the object definition of the target state of the current transition.
           *
           * @returns {Object} The target {@link ui.router.state.$stateProvider#state state} of the transition.
           */
          state: function() {
            return states.to && states.to.self;
          },

          $state: function() {
            return states.to;
          }
        }),

        isValid: function() {
          return isTargetStateValid() === null && !hasBeenSuperseded();
        },

        rejection: function() {
          var reason = isTargetStateValid();
          return reason ? $q.reject(new Error(reason)) : null;
        },

        /**
         * @ngdoc function
         * @name ui.router.state.type:Transition#params
         * @methodOf ui.router.state.type:Transition
         *
         * @description
         * Gets the origin and target parameters for the transition.
         *
         * @returns {Object} An object with `to` and `from` keys, each of which contains an object hash of
         * state parameters.
         */
        params: function() {
          // toParams = (options.inherit) ? inheritParams(fromParams, toParams, from, toState);
          return { from: fromParams, to: toParams };
        },

        options: function() {
          return options;
        },

        entering: function() {
          calculateTreeChanges();
          return extend(pluck(entering, 'self'), new Path(entering));
        },

        exiting: function() {
          calculateTreeChanges();
          return extend(pluck(entering, 'self'), new Path(exiting));
        },

        retained: function() {
          calculateTreeChanges();
          return pluck(retained, 'self');
        },

        views: function() {
          return map(entering, function(state) {
            return [state.self, state.views];
          });
        },

        redirect: function(to, params, options) {
          if (to === toState && params === toParams) return false;
          return new Transition(fromState, fromParams, to, params, options || this.options());
        },

        ensureValid: function(failHandler) {
          if (this.isValid()) return $q.when(this);
          return $q.when(failHandler(this));
        },

        /**
         * @ngdoc function
         * @name ui.router.state.type:Transition#ignored
         * @methodOf ui.router.state.type:Transition
         *
         * @description
         * Indicates whether the transition should be ignored, based on whether the to and from states are the
         * same, and whether the `reload` option is set.
         *
         * @returns {boolean} Whether the transition should be ignored.
         */
        ignored: function() {
          return (toState === fromState && !options.reload);
        },

        run: function() {
          var exiting = this.exiting().$$exit();
          if (exiting !== true) return exiting;

          var entering = this.entering().$$enter();
          if (entering !== true) return entering;

          return true;
        },

        begin: function(compare, exec) {
          if (!compare()) return this.SUPERSEDED;
          if (!exec()) return this.ABORTED;
          if (!compare()) return this.SUPERSEDED;
          return true;
        },

        end: function() {
          from = { state: toState, params: toParams };
          to   = { state: null, params: null };
        }
      });
    }

    Transition.prototype.SUPERSEDED = 2;
    Transition.prototype.ABORTED    = 3;
    Transition.prototype.INVALID    = 4;

    // An element in the path which represents a state and its resolve status
    // When the resolved data is ready, it is stored here in the PathElement on the Resolvable(s) objects
    function PathElement(state) {
      var self = this;
      var resolvables = map(state.resolve || {}, function(resolveFn, resolveName) {
        return new Resolvable(resolveName, resolveFn, state);
      });

      function resolvePathElement(resolveContext) {
        return $q.all(map(resolvables, function(resolvable) { return resolvable.get(resolveContext); }));
      }

      // Injects a function at this PathElement level with available Resolvables
      // First it resolves all resolvables.  When they are done resolving, invokes the function.
      // Returns a promise for the return value of the function.
      function invokeLater(fn, locals, resolveContext) {
        var deps = $injector.annotate(fn);
        var resolvables = pick(resolveContext.getResolvableLocals(self.$$state.name), deps);
        var promises = map(resolvables, function(resolvable) { return resolvable.get(resolveContext); });
        return $q.all(promises).then(function() {
          try {
            return self.invokeNow(fn, locals, resolveContext);
          } catch (error) {
            return $q.reject(error);
          }
        });
      }

      // Injects a function at this PathElement level with available Resolvables
      // Does not wait until all Resolvables have been resolved; call PathElement.resolve() first
      function invokeNow(fn, locals, resolveContext) {
        var resolvables = resolveContext.getResolvableLocals(self.$$state.name);
        var moreLocals = map(resolvables, function(resolvable) { return resolvable.data; });
        var combinedLocals = extend({}, locals, moreLocals);
        return $injector.invoke(fn, self.$$state, combinedLocals);
      }

      extend(this, {
        state: function() { return state; },
        $$state: state,
        resolvables: function() { return resolvables; },
        $$resolvables: resolvables,
        resolve: resolvePathElement,
        invokeNow: invokeNow,
        invokeLater: invokeLater
      });
    }

    // statesOrPathElements must be an array of either state(s) or PathElement(s)
    // states should be "private" state objects
    function Path(statesOrPathElements) {
      var self = this;
      if (!isArray(statesOrPathElements)) throw new Error("states must be an array of state(s) or PathElement(s)", statesOrPathElements);
      var isPathElementArray = (statesOrPathElements.length && (statesOrPathElements[0] instanceof PathElement));

      var elements = statesOrPathElements;
      if (!isPathElementArray) { // they passed in states; convert to PathElements
        elements = map(elements, function (state) { return new PathElement(state); });
      }

      // resolveContext will hold stateful Resolvables (containing possibly resolved data), mapped per state-name.
      function resolvePath(resolveContext) {
        return $q.all(map(elements, function(element) { return element.resolve(resolveContext); }));
      }

      function invoke(hook, self, locals) {
        if (!hook) return;
        return $injector.invoke(hook, self, locals);
      }

      extend(this, {
        resolve: resolvePath,
        $$elements: elements, // for development at least
        concat: function(path) {
          return new Path(elements.concat(path.elements()));
        },
        slice: function(start, end) {
          return new Path(elements.slice(start, end));
        },
        elements: function() {
          return elements;
        },
        $$enter: function(/* locals */) {
          // TODO: Replace with PathElement.invoke(Now|Later)
          // TODO: If invokeNow (synchronous) then we have to .get() all Resolvables for all functions first.
          for (var i = 0; i < states.length; i++) {
            // entering.locals = toLocals[i];
            if (invoke(states[i].self.onEnter, states[i].self, locals(states[i])) === false) return false;
          }
          return true;
        },
        $$exit: function(/* locals */) {
          // TODO: Replace with PathElement.invoke(Now|Later)
          for (var i = states.length - 1; i >= 0; i--) {
            if (invoke(states[i].self.onExit, states[i].self, locals(states[i])) === false) return false;
            // states[i].locals = null;
          }
          return true;
        }
      });
    }

    var ResolveContext = function(parentPath, currentPath) {
      var resolvablesByState = {}, previousIteration = {};

      registerPath(parentPath);
      registerPath(currentPath);

      function registerPath(path) {
        forEach(path.elements(), function (pathElem) {
          var resolvesbyName = indexBy(pathElem.resolvables(), 'name');
          var resolvables = inherit(previousIteration, resolvesbyName); // note prototypal inheritance
          previousIteration = resolvablesByState[pathElem.state().name] = resolvables;
        });
      }

      function getResolvableLocals(stateName, options) {
        var resolvables = (resolvablesByState[stateName] || {});
        options = extend({ flatten: true, omitPropsFromPrototype: [] }, options);

        // Create a shallow clone referencing the original prototype chain.  This is so we can alter the clone's
        // prototype without affecting the actual object (for options.omitPropsFromPrototype)
        var shallowClone = Object.create(Object.getPrototypeOf(resolvables));
        for (property in resolvables) {
          if (resolvables.hasOwnProperty(property)) { shallowClone[property] = resolvables[property]; }
        }

        // options.omitPropsFromPrototype
        // Remove the props specified in options.omitPropsFromPrototype from the prototype of the object.

        // This hides a top-level resolvable by name, potentially exposing a parent resolvable of the same name
        // further down the prototype chain.

        // This is used to provide a Resolvable access to all other Resolvables in its same PathElement, yet disallow
        // that Resolvable access to its own injectable Resolvable reference.

        // This is also used to allow a state to override a parent state's resolve while also injecting
        // that parent state's resolve:

        // state({ name: 'G', resolve: { _G: function() { return "G"; } } });
        // state({ name: 'G.G2', resolve: { _G: function(_G) { return _G + "G2"; } } });
        // where injecting _G into a controller will yield "GG2"
        forEach(options.omitPropsFromPrototype, function(prop) {
          delete(shallowClone[prop]); // possibly exposes the same prop from prototype chain
        });

        // options.flatten
        // $$resolvablesByState has resolvables organized in a prototypal inheritance chain.  options.flatten will
        // flatten the object from prototypal inheritance to a simple object with all its parent properties exposed
        // with child properties taking precedence over parent properties.
        if (options.flatten)
          shallowClone = flattenPrototypeChain(shallowClone);

        return shallowClone;
      }

      extend(this, {
        getResolvableLocals: getResolvableLocals,
        $$resolvablesByState: resolvablesByState
      });
    };

    function Resolvable(name, resolveFn, state) {
      var self = this;
      // resolve is likely called from transitionTo()
      function resolveResolvable(resolveContext) {
        // First, set up an overall deferred/promise for this Resolvable
        var deferred = $q.defer();
        self.promise = deferred.promise;

        // Load an assoc-array of all resolvables for this state from the resolveContext
        var options = {  omitPropsFromPrototype: [ self.name ], flatten: true };
        var ancestorsByName = resolveContext.getResolvableLocals(self.state.name, options);

        // Limit the ancestors Resolvables map to only those that the current Resolvable fn's annotations depends on
        var depResolvables = pick(ancestorsByName, self.deps);

        // Get promises (or invoke resolveFn) for deps
        var depPromises = map(depResolvables, function(resolvable) {
          return resolvable.get(resolveContext);
        });

        // Make sure all the dependencies from ancestors have been invoked so we have access to their promises,
        // then invoke our current resolveFn, passing in the ancestors' resolved data
        return $q.all(depPromises).then(function invokeResolve(locals) {
          try {
            var result = $injector.invoke(self.resolveFn, state, locals);
            deferred.resolve(result);
          } catch (error) {
            deferred.reject(error);
          }
          return self.promise;
        }).then(function(data) {
          self.data = data;
          return self.promise;
        })
      }

      extend(this, {
        name: name,
        resolveFn: resolveFn,
        state: state,
        deps: $injector.annotate(resolveFn),
        resolve: resolveResolvable,
        promise: undefined,
        data: undefined,
        get: function(resolveContext) {
          return self.promise || resolveResolvable(resolveContext);
        }
      });
    }

    // Expose for unit testing... not sure how we want this stuff structured
    // Does this stuff remain only under $transition?
    // Do we need to expose this API level for any reason other than testing?
    $transition.Path = Path;
    $transition.PathElement = PathElement;
    $transition.ResolveContext = ResolveContext;
    $transition.Resolvable = Resolvable;

    $transition.init = function init(state, params, matcher) {
      from = { state: state, params: params };
      to = { state: null, params: null };
      stateMatcher = matcher;
    };

    $transition.start = function start(state, params, options) {
      to = { state: state, params: params };
      return new Transition(from.state, from.params, state, params, options || {});
    };

    $transition.isActive = function isActive() {
      return !!to.state && !!from.state;
    };

    $transition.isTransition = function isTransition(transition) {
      return transition instanceof Transition;
    };

    return $transition;
  }
}

angular.module('ui.router.state').provider('$transition', $TransitionProvider);