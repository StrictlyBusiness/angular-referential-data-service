import ReferentialDataService, { Plan, PlanStep } from './referential-data-service';


import CacheService from 'angular-cache-service';
import Class from './test-models/class';
import Site from './test-models/site';
import ClassRoom from './test-models/class-room';


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
      referentialDataService.registerReference('Class','classRoomIds', 'classRoomService', 'ClassRoom', 'classRooms');

      let plan = referentialDataService.buildQueryPlan('Class', [
        'site',
        'site.instructor',
        'site.grantee.administrator',
        'site.grantee.region',
        'site.grantee.region.administrator',
        'classType',
        'classRooms'
      ]);

      let expected = {
        steps: [
          getPlanStep('ClassRoom', { name: 'classRoomService'}, ['classRooms'], 1),
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

      let planStep = getPlanStep('Grantee', granteeService, [ 'site.grantee' ], 1);
      let actual = planStep.getPropertyValues(classes, planStep);
      expect(actual).to.deep.equal([ 300, 301 ]);

    });

    it('should return all classRoom ids', function() {

      let cacheService = new CacheService();

      let classRoomService = { get: function(id) { return cacheService.get('ClassRoom', id); }};

      $injector.get = function(serviceName) {
        if (serviceName == 'classRoomService') {
          return classRoomService;
        }
      }

      referentialDataService.registerReference('Class','classRoomIds', 'classRoomService', 'ClassRoom', 'classRooms');
      

      let classes = [
        new Class({  classRoomIds: [10,20,30] }, referentialDataService),
        new Class({  classRoomIds: [40,70] }, referentialDataService),
        new Class({  classRoomIds: [50,80] }, referentialDataService),
        new Class({  classRoomIds: [60,90,55, 57] }, referentialDataService)
      ];


      /* making sure a group of ids returns the correct concatenated array */
      let planStep = getPlanStep('ClassRoom', classRoomService, [ 'classRooms' ], 1);
      let actual = planStep.getPropertyValues(classes, planStep);
      expect(actual).to.deep.equal([ 10, 20, 30, 40, 70, 50, 80, 60, 90, 55, 57 ]);


    });

/*

NOT sure how to set this test up so that it actually returns the class rooms so commented out for now
    it('should return all student ids', function() {

      let cacheService = new CacheService();

      let classRoomService = { get: function(id) { return cacheService.get('ClassRoom', id); }};
      let studentService = { get: function(id) { return cacheService.get('Student', id); }};

      $injector.get = function(serviceName) {
        if (serviceName == 'classRoomService') {
          return classRoomService;
        }
        if (serviceName == 'studentService') {
          return studentService;
        }
      }

      referentialDataService.registerReference('Class','classRoomIds', 'classRoomService', 'ClassRoom', 'classRooms');
      referentialDataService.registerReference('ClassRoom', 'studentId', 'studentService', 'Student');
      
      let classes = [
        new Class({  classId: 1, classRoomIds: [10,20,30] }, referentialDataService),
        new Class({  classId: 2, classRoomIds: [40,20] }, referentialDataService),
      ];

      let classRoom = new ClassRoom({ classRoomId:10, studentId: 300 }, referentialDataService);
      cacheService.set(classRoom.typeName, classRoom.key, classRoom);

      classRoom = new ClassRoom({ classRoomId:20, studentId: 300 }, referentialDataService);
      cacheService.set(classRoom.typeName, classRoom.key, classRoom);

      classRoom = new ClassRoom({ classRoomId:30, studentId: 400 }, referentialDataService);
      cacheService.set(classRoom.typeName, classRoom.key, classRoom);

      classRoom = new ClassRoom({ classRoomId:40, studentId: 500 }, referentialDataService);
      cacheService.set(classRoom.typeName, classRoom.key, classRoom);


      let planStep = getPlanStep('Student', studentService, [ 'classRooms.student' ], 1);
      let actual = planStep.getPropertyValues(classes, planStep);
      expect(actual).to.deep.equal([ 300, 400, 500 ]);

    });
*/



  });

});
