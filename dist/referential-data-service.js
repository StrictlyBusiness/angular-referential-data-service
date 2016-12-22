/* eslint-disable no-underscore-dangle */
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var Plan = (function () {
  function Plan() {
    _classCallCheck(this, Plan);

    this.steps = [];
  }

  //  A PlanStep represents one step in the process to load and cache data. It
  //  is created by the Plan.addStepForProperty method.

  // Call this method to add a query to fetch and cache the data entities for
  // the referenced property. It may or may not create a plan step, depending
  // on whether an existing plan step can satisfy the retrieval.

  _createClass(Plan, [{
    key: 'addStepForProperty',
    value: function addStepForProperty(entityName, service, property) {

      // Split the path by the '.' characters into an array
      var propertyChain = property.split('.');

      // See if a plan step exists for this entity
      var planStep = _lodash2['default'].find(this.steps, 'entity', entityName);

      // If we didnt find one, create one and add it
      if (!planStep) {
        planStep = new PlanStep(entityName, service);
        this.steps.push(planStep);
      }

      // Add the property path if it doesn't exist
      if (planStep.paths.indexOf(property) === -1) {
        planStep.paths.push(property);
      }

      // Update the depth
      planStep.depth = Math.max(planStep.depth, propertyChain.length);

      // ensure they are sorted
      this.steps = _lodash2['default'].sortByAll(this.steps, ['depth', 'entity']);
    }
  }, {
    key: 'findStepsForDepth',
    value: function findStepsForDepth(depth) {
      return _lodash2['default'].filter(this.steps, function (step) {
        return step.depth === depth;
      });
    }

    // Execute the query plan using the specified items.
  }, {
    key: 'execute',
    value: function execute(items) {

      var planContext = {
        items: items,
        plan: this
      };

      // Build a chain of all the promises, starting with the plan context
      var promises = _lodash2['default'].reduce(this.steps, function (previous, step) {
        return previous.bind(step).then(step.execute);
      }, _bluebird2['default'].resolve(planContext));
      return promises.bind();
    }
  }]);

  return Plan;
})();

exports.Plan = Plan;

var PlanStep = (function () {
  function PlanStep(entity, service) {
    _classCallCheck(this, PlanStep);

    this.entity = entity; // The name of the entity, such as Account
    this.service = service; // A reference to the actual service
    this.paths = []; // An array of property reference paths
    //
    // paths: [
    //       'site.instructor',
    //       'site.grantee.administrator',
    //       'site.grantee.region.administrator'
    //     ],
    this.depth = 1; // The execution depth. This determines the order
    // in which the steps are executed. Plan steps
    // with the same value will be executed
    // concurrently.
  }

  // Returns a promise that performs the operations necessary to load the data
  // associated with this step. Be sure to bind the this argument to this step
  // instance. It assumes the incoming argument is a plan context and also
  // ensures the plan context is continued down the promise chain.

  _createClass(PlanStep, [{
    key: 'execute',
    value: function execute(planContext) {
      var _this = this;

      var stepContext = {
        planContext: planContext,
        step: this
      };

      return _bluebird2['default'].resolve(stepContext).then(function (sc) {
        // Get the ids
        var ids = _this.getPropertyValues(sc.planContext.items, sc.step);
        // Filter out any values that are already cached
        ids = sc.step.service.uncachedIds(ids);
        // Query and cache the entities
        return sc.step.service.loadByIds(ids);
      }).then(function (results) {
        return planContext;
      });
    }

    //  Returns all the unique values for the properties specified in a query
    //  plan step's path argument. Items must be an array of items and step must
    //  be a valid step.
    //
    //   {
    //     entity: 'Account',
    //     service: AccountService,
    //     paths: [
    //       'site'.instructor',
    //       'site.grantee.administrator',
    //       'site.grantee.region.administrator'
    //     ],
    //     depth: 3
    //   }
  }, {
    key: 'getPropertyValues',
    value: function getPropertyValues(items, step) {
      var _this2 = this;

      // Initialize the id list that will be used to collect the values
      var ids = [];

      // For each item in the list, get the values
      items.forEach(function (item) {
        // Loop over the paths
        step.paths.forEach(function (path) {
          var pathChain = path.split('.');
          // Get all the id values
          _this2.collectPropertyValues(item, pathChain, ids);
        });
      });

      return _lodash2['default'].uniq(ids);
    }
  }, {
    key: 'collectPropertyValues',
    value: function collectPropertyValues(item, propertyChain, ids) {

      // Get the property we are extracting and update the property chain to
      // exclude the property we are currently processing.
      var property = propertyChain[0];
      propertyChain = propertyChain.slice(1); // Without the first element

      // If the propertyChain is empty, we know we are at the place we need to
      // collect the value.
      if (propertyChain.length === 0) {
        // Get the property value from the key (property with id)
        var value = item[property + 'Id'];

        // may need Ids
        if (value === null || _lodash2['default'].isUndefined(value)) {
          var _value = item[property + 'Ids'];
        }

        // Only process values that are defined
        if (value !== null && !_lodash2['default'].isUndefined(value)) {
          // Add the value to the found ids
          if (Array.isArray(value)) {
            ids.concat(value);
          } else {
            ids.push(value);
          }
        }
      } else {
        // Get the property value from the getter/setter
        var value = item[property];
        // Only process values that are defined
        if (value !== null && !_lodash2['default'].isUndefined(value)) {
          // If we are not at the property yet, keep traversing
          this.collectPropertyValues(value, propertyChain, ids);
        }
      }
    }
  }]);

  return PlanStep;
})();

exports.PlanStep = PlanStep;

var ReferentialDataService = (function () {
  function ReferentialDataService($log, $injector) {
    _classCallCheck(this, ReferentialDataService);

    // This types dictionary contains a key per type. Each key is a reference to
    // another dictionary. Here is an example:
    //
    // Class: {                                 <-- entityName
    //    _typeName: 'Class'                    <-- entityName
    //    'classType': {                        <-- propertyName
    //      propertyName: 'classType',          <-- key name without Id
    //      serviceName: 'classTypeService',    <-- name of the reference service
    //      service: classTypeService,          <-- Looked up after initialized
    //      keyName: 'classTypeId',
    //      propertyTypeName: 'ClassType',      <-- ref entityName
    //      property: {
    //        get: function() { ... },
    //        set: function(value) { ... }
    //      }
    //    }
    //  }

    this.$log = $log;
    this.$injector = $injector;
    this._types = {};
  }

  // Registers a foreign get reference. This information is used to create
  // getters and setters on model entities to reference related objects. It is
  // also used to load the referential data as well. To register a reference,
  // call this method with the type name (class name), the name of the property
  // that holds the key reference, the related service name, and the
  // referenced type. The last argument is an optional name for the getter/setter
  // and defaults to the keyName minus the last two characters so it turns
  // 'propertyId' to 'property'.

  _createClass(ReferentialDataService, [{
    key: 'registerReference',
    value: function registerReference(typeName, keyName, serviceName, propertyTypeName, propertyName) {

      // Get the type definition or define it if not found
      var type = this._types[typeName];
      if (!type) {
        type = { _typeName: typeName };
        this._types[typeName] = type;
      }

      // Get the property name if not specifically assigned
      if (!propertyName) {
        propertyName = keyName.slice(0, -2);
      }

      // Get the reference definition or define it if not found
      var reference = type[propertyName];
      if (!reference) {
        reference = {};
        type[propertyName] = reference;
      }

      // Set the values of the reference
      reference.propertyName = propertyName;
      reference.keyName = keyName;
      reference.serviceName = serviceName;
      reference.propertyTypeName = propertyTypeName;

      // Create the getter and setter definition
      reference.property = {
        enumerable: false,
        get: function get() {
          return reference.service.get(this[reference.keyName]);
        },
        set: function set(value) {
          if (value) {
            this[reference.keyName] = value.key;
          } else {
            this[reference.keyName] = value;
          }
        }
      };
    }

    // In order to add the getter/setter methods for referential properties, this
    // method must be called on each model instance created. It adds the getter/
    // setter methods.
  }, {
    key: 'configureClass',
    value: function configureClass(typeName, obj) {
      var _this3 = this;

      // Get the references for the type. If there are no references for the
      // type, just return.
      var type = this._types[typeName];
      if (!type) {
        return;
      }

      // Add the actual getter/setter properties to the class instance
      var referenceNames = Object.keys(type);
      referenceNames.forEach(function (referenceName) {
        if (referenceName !== '_typeName') {
          var reference = type[referenceName];
          // Ensure the service instance is injected
          if (!reference.service) {
            reference.service = _this3.$injector.get(reference.serviceName);
            if (!reference.service) {
              throw new Error('The reference property ' + reference.propertyName + ' on ' + typeName + '\n              requires service {$reference.serviceName} but it was not found');
            }
          }
          Object.defineProperty(obj, reference.propertyName, reference.property);
        }
      });
    }
  }, {
    key: 'loadReferential',
    value: function loadReferential(pagedItems, type, properties) {
      // Build the query plan
      var plan = this.buildQueryPlan(type, properties);

      // Return a promise for the execution of the query plan. Also,
      // return the original items if successful.
      return plan.execute(pagedItems.items).then(function (planContext) {
        return pagedItems;
      });
    }

    // Fetch all the properties and sort them in ascenting order. This will ensure
    // child properties are processed after the parent. For example, site
    // would be processed before site.grantee and site.grantee.region
    // after that.
    //
    // An Array of Classes (ClassService)
    //   site (SiteService)
    //   site.instructor (AccountService)
    //   site.grantee.administrator (AccountService)
    //   site.grantee.region (RegionService)
    //   site.grantee.region.administrator (AccountService)
    //   classType (ClassTypeService)
    //
    //
    // This should result in five queries, one for each of the entities: Class,
    // Site, Region, ClassType, and Account. The should be executed in the
    // following order with the entities in [] executed in parallel:
    //
    //   Class (Already queried) -> [Site, ClassType], Region, Account
    //
    // Loop over the tree and get the service types. For each type, determine the
    // maximum depth, the number of '.' in the path. Order the entities by depth.
    // An example of the data structure for the services in the example above is:
    //
    // {
    //   steps: [
    //     {
    //       entity: 'Site',
    //       serviceName: 'siteService',
    //       paths: [
    //          'site'
    //       ],
    //       depth: 1
    //     },
    //     {
    //       entity: 'ClassType',
    //       serviceName: 'classTypeService',
    //       paths: [
    //          'classType'
    //       ],
    //       depth: 1
    //     },
    //     {
    //       entity: 'Region',
    //       serviceName: 'regionService',
    //       paths: [
    //          'site.grantee.region'
    //       ],
    //       depth: 2
    //     },
    //     {
    //       entity: 'Account',
    //       serviceName: 'accountService',
    //       paths: [
    //         'site.instructor',
    //         'site.grantee.administrator',
    //         'site.grantee.region.administrator'
    //       ],
    //       depth: 3
    //     }
    //   ]
    // }
    //
    // To process them, makes sure they are sorted in order by depth. Loop over
    // the depths and process the entities at each depth in parallel.
    //
    //  for each depth d {
    //    for each entity e at depth {
    //      traverse the paths for the entity and collect all the ids
    //      get the distinct list of ids
    //      check each id and remove it if it is already cached
    //      make the request with a then that caches the results and return the
    //        promise
    //    }
    //  }

    // Takes in an array of entities to query and builds the query plan. An
    // example input could be:
    //
    //   site (SiteService)
    //   site.instructor (AccountService)
    //   site.grantee.administrator (AccountService)
    //   site.grantee.region (RegionService)
    //   site.grantee.region.administrator (AccountService)
    //   classType (ClassTypeService)
    //
    // It returns a plan that can be used to execute
  }, {
    key: 'buildQueryPlan',
    value: function buildQueryPlan(rootType, propertyList) {
      var _this4 = this;

      var plan = new Plan();

      propertyList.forEach(function (property) {

        // Add the property and all sub properties. For example, you add
        // site.grantee.region, be sure site and site.grantee are
        // in the list.
        var propertyChain = property.split('.');
        for (var i = 0; i < propertyChain.length; i++) {
          var currentProperty = propertyChain.slice(0, i + 1).join('.');
          // Follow the path and find the type at the end
          var reference = _this4.getReferenceForPropertyChain(rootType, currentProperty);
          // Add the plan step
          plan.addStepForProperty(reference.propertyTypeName, reference.service, currentProperty);
        }
      });

      return plan;
    }

    // Get the references for the specified type. If it is not found, an exception
    // is thrown.
  }, {
    key: 'getTypeReferences',
    value: function getTypeReferences(type) {
      var references = this._types[type];
      if (!references) {
        throw new Error('The type ' + type + ' is not registered');
      }
      return references;
    }
  }, {
    key: 'getPropertyReference',
    value: function getPropertyReference(references, property) {
      var reference = references[property];
      if (!reference) {
        throw new Error('The reference property ' + property + ' is not registered on ' + references._typeName);
      }

      // Ensure the service instance is injected
      if (!reference.service) {
        reference.service = this.$injector.get(reference.serviceName);
        if (!reference.service) {
          throw new Error('The reference property ' + property + ' on ' + references._typeName + '\n          requires service {$reference.serviceName} but it was not found');
        }
      }

      return reference;
    }

    // Returns the property reference, the definition for a single reference
    // property based on the type and the propertyChain, an array of properties
    // to traverse.
  }, {
    key: 'getReferenceForPropertyChain',
    value: function getReferenceForPropertyChain(type, property) {
      var _this5 = this;

      // Split the path by the '.' characters into an array
      var propertyChain = property.split('.');

      var propertyReference = null;
      propertyChain.forEach(function (p) {
        // Get the current type's references
        var typeReferences = _this5.getTypeReferences(type);
        // Get the reference for the next property on the current type
        propertyReference = _this5.getPropertyReference(typeReferences, p);
        // Use the reference to get the referenced key's type and service
        type = propertyReference.propertyTypeName;
      });
      return propertyReference;
    }
  }]);

  return ReferentialDataService;
})();

ReferentialDataService.$inject = ['$log', '$injector'];
exports['default'] = ReferentialDataService;