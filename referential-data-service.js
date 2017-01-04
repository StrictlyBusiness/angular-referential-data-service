/* eslint-disable no-underscore-dangle */
import _ from 'lodash';
import Promise from 'bluebird';

export class Plan {

  constructor() {
    this.steps = [];
  }

  // Call this method to add a query to fetch and cache the data entities for
  // the referenced property. It may or may not create a plan step, depending
  // on whether an existing plan step can satisfy the retrieval.
  addStepForProperty(entityName, service, property) {

    // Split the path by the '.' characters into an array
    let propertyChain = property.split('.');

    // See if a plan step exists for this entity
    let planStep = _.find(this.steps, 'entity', entityName);

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
    this.steps = _.sortByAll(this.steps, ['depth', 'entity']);
  }

  findStepsForDepth(depth) {
    return _.filter(this.steps, (step) => step.depth === depth);
  }

  // Execute the query plan using the specified items.
  execute(items) {

    let planContext = {
      items: items,
      plan: this
    };

    // Build a chain of all the promises, starting with the plan context
    let promises = _.reduce(this.steps,
      (previous, step) => previous.bind(step).then(step.execute),
      Promise.resolve(planContext)
    );
    return promises.bind();
  }
}

//  A PlanStep represents one step in the process to load and cache data. It
//  is created by the Plan.addStepForProperty method.
export class PlanStep {

  constructor(entity, service) {
      this.entity = entity;   // The name of the entity, such as Account
      this.service = service; // A reference to the actual service
      this.paths = [];        // An array of property reference paths
                              //
                              // paths: [
                              //       'site.instructor',
                              //       'site.grantee.administrator',
                              //       'site.grantee.region.administrator'
                              //     ],
      this.depth = 1;         // The execution depth. This determines the order
                              // in which the steps are executed. Plan steps
                              // with the same value will be executed
                              // concurrently.
  }

  // Returns a promise that performs the operations necessary to load the data
  // associated with this step. Be sure to bind the this argument to this step
  // instance. It assumes the incoming argument is a plan context and also
  // ensures the plan context is continued down the promise chain.
  execute(planContext) {

    let stepContext = {
      planContext: planContext,
      step: this
    };

    return Promise.resolve(stepContext)
      .then((sc) => {
        // Get the ids
        let ids = this.getPropertyValues(sc.planContext.items, sc.step);
        // Filter out any values that are already cached
        ids = sc.step.service.uncachedIds(ids);
        // Query and cache the entities
        return sc.step.service.loadByIds(ids);
      })
      .then((results) => planContext);
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
  getPropertyValues(items, step) {

    // Initialize the id list that will be used to collect the values
    let ids = [];

    // For each item in the list, get the values
    items.forEach((item) => {
      // Loop over the paths
      step.paths.forEach((path) => {
        let pathChain = path.split('.');
        // Get all the id values
        this.collectPropertyValues(item, pathChain, ids);
      });
    });

    return _.uniq(ids);
  }

  collectPropertyValues(item, propertyChain, ids) {

    // Get the property we are extracting and update the property chain to
    // exclude the property we are currently processing.
    let property = propertyChain[0];
    propertyChain = propertyChain.slice(1); // Without the first element

    // If the propertyChain is empty, we know we are at the place we need to
    // collect the value.
    if (propertyChain.length === 0) {
      // Get the key from the lookup table
      let key = item._rdsReferences[property];
      // attempt to get the corresponding value
      let value = item[key];

      // Only process values that are defined
      if (value !== null && !_.isUndefined(value)) {
        // Add the value to the found ids
        if(Array.isArray(value)){
          value.forEach((val)=>{
            ids.push(val);
          });
        } else {
          ids.push(value);
        }
      }
    } else {
      // Get the property value from the getter/setter
      let value = item[property];
      // Only process values that are defined
      if (value !== null && !_.isUndefined(value)) {
        // If we are not at the property yet, keep traversing
        this.collectPropertyValues(value, propertyChain, ids);
      }
    }
  }

}

class ReferentialDataService {

  constructor($log, $injector) {

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
  // call this method with the following arguments
  //
  //  * typeName: the type name (class name)
  //  * keyName: the name of the property that holds the key reference(s)
  //      the key itself can be a single value or an array of values
  //  * serviceName: the related service name, 
  //  * propertyTypeName: the referenced type.
  //  * propertyName: an optional name for the getter/setter defaults to
  //        the keyName minus the last two characters so it turns 
  //        'propertyId' to 'property'.
  //
  //   NOTE: if your keyname is `propertyIds` you should provide a propertyName
  //     otherwise your property name will be `propertyI` when you 
  //     probably want `properties`
  registerReference(typeName, keyName, serviceName, propertyTypeName, propertyName) {

    // Get the type definition or define it if not found
    let type = this._types[typeName];
    if (!type) {
      type = { _typeName: typeName };
      this._types[typeName] = type;
    }

    // Get the property name if not specifically assigned
    if (!propertyName) {
      propertyName = keyName.slice(0, -2);
    }

    // Get the reference definition or define it if not found
    let reference = type[propertyName];
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
      get: function() {
        return reference.service.get(this[reference.keyName]);
      },
      set: function(value) {
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
  configureClass(typeName, obj) {

    // Get the references for the type. If there are no references for the
    // type, just return.
    let type = this._types[typeName];
    if (!type) {
      return;
    }

    // Add the actual getter/setter properties to the class instance
    let referenceNames = Object.keys(type);
    //initialize a lookup table for use later.
    obj._rdsReferences = {};

    referenceNames.forEach((referenceName) => {
      if (referenceName !== '_typeName') {
        let reference = type[referenceName];
        // Ensure the service instance is injected
        if (!reference.service) {
          reference.service = this.$injector.get(reference.serviceName);
          if (!reference.service) {
            throw new Error(`The reference property ${reference.propertyName} on ${typeName}
              requires service {$reference.serviceName} but it was not found`);
          }
        }
        Object.defineProperty(obj, reference.propertyName, reference.property);
        //create a lookup on the object for use later when executing the query plan
        obj._rdsReferences[reference.propertyName] = reference.keyName;
      }
    });
  }


  loadReferential(pagedItems, type, properties) {
    // Build the query plan
    let plan = this.buildQueryPlan(type, properties);

    // Return a promise for the execution of the query plan. Also,
    // return the original items if successful.
    return plan.execute(pagedItems.items)
      .then((planContext) =>
        pagedItems
      );
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
  //   classRooms (ClassRoomService)
  //
  //
  // This should result in six queries, one for each of the entities: Class,
  // ClassRooms, Site, Region, ClassType, and Account. The should be executed
  // in the following order with the entities in [] executed in parallel:
  //
  //   Class (Already queried) -> [ClassRoom, Site, ClassType], Region, Account
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
  //       entity: 'ClassRoom',
  //       serviceName: 'classRoomService',
  //       paths: [
  //          'classRooms'
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
  //   classRooms (ClassRoomService)
  //
  // It returns a plan that can be used to execute
  buildQueryPlan(rootType, propertyList) {

    let plan = new Plan();

    propertyList.forEach((property) => {

      // Add the property and all sub properties. For example, you add
      // site.grantee.region, be sure site and site.grantee are
      // in the list.
      let propertyChain = property.split('.');
      for(let i = 0; i < propertyChain.length; i++) {
        let currentProperty = propertyChain.slice(0, i + 1).join('.');
        // Follow the path and find the type at the end
        let reference = this.getReferenceForPropertyChain(rootType, currentProperty);
        // Add the plan step
        plan.addStepForProperty(reference.propertyTypeName, reference.service, currentProperty);
      }

    });

    return plan;
  }

  // Get the references for the specified type. If it is not found, an exception
  // is thrown.
  getTypeReferences(type) {
    let references = this._types[type];
    if (!references) {
      throw new Error('The type ' + type + ' is not registered');
    }
    return references;
  }

  getPropertyReference(references, property) {
    let reference = references[property];
    if (!reference) {
      throw new Error(`The reference property ${property} is not registered on ${references._typeName}`);
    }

    // Ensure the service instance is injected
    if (!reference.service) {
      reference.service = this.$injector.get(reference.serviceName);
      if (!reference.service) {
        throw new Error(`The reference property ${property} on ${references._typeName}
          requires service {$reference.serviceName} but it was not found`);
      }
    }

    return reference;
  }

  // Returns the property reference, the definition for a single reference
  // property based on the type and the propertyChain, an array of properties
  // to traverse.
  getReferenceForPropertyChain(type, property) {

    // Split the path by the '.' characters into an array
    let propertyChain = property.split('.');

    let propertyReference = null;
    propertyChain.forEach((p) => {
      // Get the current type's references
      let typeReferences = this.getTypeReferences(type);
      // Get the reference for the next property on the current type
      propertyReference = this.getPropertyReference(typeReferences, p);
      // Use the reference to get the referenced key's type and service
      type = propertyReference.propertyTypeName;
    });
    return propertyReference;
  }



}

ReferentialDataService.$inject = ['$log', '$injector'];
export default ReferentialDataService;
