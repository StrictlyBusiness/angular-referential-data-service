import ReferentialDataService, { PlanStep } from './referential-data-service';


import CacheService from 'angular-cache-service';
import Class from './test-models/class';
import Site from './test-models/site';


function getPlanStep(entity, service, paths, depth) {
  let planStep = new PlanStep(entity, service);
  planStep.paths = paths;
  planStep.depth = depth;
  return planStep;
}

let $injector = {
  get: function (serviceName) {
    return { name: serviceName };
  }
}

describe('ReferentialDataService', function() {
  let referentialDataService = null;
  beforeEach('Inject referentialDataService for test', function() {
    referentialDataService = new ReferentialDataService(null, $injector);
  });

  describe('.buildQueryPlan', function() {

    it('should build a simple query plan', function() {

      // Setup references
      referentialDataService.registerReference('Class', 'siteId', 'siteService', 'Site');

      let plan = referentialDataService.buildQueryPlan('Class', ['site']);

      let expected = {
        steps: [
          getPlanStep('Site', { name: 'siteService' }, [ 'site' ], 1)
        ]
      };
      expect(plan).to.deep.equal(expected);
    });

    it('should build a complicated query plan', function() {

      // Setup references
      referentialDataService.registerReference('Class', 'classTypeId', 'classTypeService', 'ClassType');
      referentialDataService.registerReference('Class', 'siteId', 'siteService', 'Site');
      referentialDataService.registerReference('Site', 'instructorId', 'accountService', 'Account');
      referentialDataService.registerReference('Site', 'granteeId', 'granteeService', 'Grantee');
      referentialDataService.registerReference('Grantee', 'administratorId', 'accountService', 'Account');
      referentialDataService.registerReference('Grantee', 'regionId', 'regionService', 'Region');
      referentialDataService.registerReference('Region', 'administratorId', 'accountService', 'Account');

      let plan = referentialDataService.buildQueryPlan('Class', [
        'site',
        'site.instructor',
        'site.grantee.administrator',
        'site.grantee.region',
        'site.grantee.region.administrator',
        'classType'
      ]);

      let expected = {
        steps: [
          getPlanStep('ClassType', { name: 'classTypeService' }, [ 'classType' ], 1),
          getPlanStep('Site', { name: 'siteService' }, [ 'site' ], 1),
          getPlanStep('Grantee', { name: 'granteeService' }, [ 'site.grantee' ], 2),
          getPlanStep('Region', { name: 'regionService' }, [ 'site.grantee.region' ], 3),
          getPlanStep('Account', { name: 'accountService' }, [
              'site.instructor',
              'site.grantee.administrator',
              'site.grantee.region.administrator'
            ], 4)
        ]
      };
      expect(plan).to.deep.equal(expected);
    });

  });

  describe('.getPropertyValues', function() {

    it('should return all grantee ids', function() {

      let cacheService = new CacheService();

      let siteService = { get: function(id) { return cacheService.get('Site', id); }};
      let granteeService = { get: function(id) { return cacheService.get('Grantee', id); }};

      $injector.get = function(serviceName) {
        if (serviceName == 'siteService') {
          return siteService;
        }
        if (serviceName == 'granteeService') {
          return granteeService;
        }
      }

      referentialDataService.registerReference('Class', 'siteId', 'siteService', 'Site');
      referentialDataService.registerReference('Site', 'granteeId', 'granteeService', 'Grantee');

      let classes = [
        new Class({ classId: 100, siteId: 200 }, referentialDataService),
        new Class({ classId: 101, siteId: 201 }, referentialDataService),
        new Class({ classId: 102, siteId: 202 }, referentialDataService),
        new Class({ classId: 103, siteId: 202 }, referentialDataService)
      ];
      let site = new Site({ siteId: 200, granteeId: 300 }, referentialDataService);
      cacheService.set(site.typeName, site.key, site);
      site = new Site({ siteId: 201, granteeId: 300 }, referentialDataService);
      cacheService.set(site.typeName, site.key, site);
      site = new Site({ siteId: 202, granteeId: 301 }, referentialDataService);
      cacheService.set(site.typeName, site.key, site);

      // Force service injection
      //referentialDataService.getReferenceForPropertyChain('Class', 'site.grantee');

      let planStep = getPlanStep('Grantee', granteeService, [ 'site.grantee' ], 1);
      let actual = planStep.getPropertyValues(classes, planStep);
      expect(actual).to.deep.equal([ 300, 301 ]);

    });

  });

});
