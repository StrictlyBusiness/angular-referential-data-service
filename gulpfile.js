'use strict';
/*eslint-env node */
/*eslint-disable */

// Based on
// https://github.com/martinmicunda/employee-scheduling-ui/blob/master/gulpfile.js

//=============================================
//            PLUGIN REFERENCES
//=============================================
var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();
var karma = require('karma').server;
var path = require('path');
var babel = require("gulp-babel");
var argv = require('minimist')(process.argv.slice(2));
var COLORS = require('ansi-colors');
var log = require('fancy-log');
var runSequence = require('run-sequence');
var exec = require('child_process').exec;
//=============================================
//            DECLARE VARIABLES
//=============================================

/**
 * Declare variables that are use in gulpfile.js or angular app
 */
var WATCH =  !!argv.watch ? argv.watch : false;
var BROWSERS = 'Chrome';
var REPORTERS = 'mocha';


//=============================================
//            DECLARE PATHS
//=============================================

var paths = {
  /**
   * The 'gulpfile' file is where our run tasks are held.
   */
  gulpfile: 'gulpfile.js',

  /**
   * This is a collection of file patterns that refer to our app unit and e2e tests code.
   *
   * 'config'       contains karma and protractor config files
   * 'testReports'  contains unit and e2e test reports
   * 'unit'         contains all project unit test code
   * 'e2e'          contains all project e2e test code
   */
  test: {
    basePath: '/',
    config: {
      karma: 'karma.conf.js',
    },
    mock: '*.mock.js',
    unit: '*.test.js',
  },
};

//---------------------------------------------
//               TEST TASKS
//---------------------------------------------

/**
 * The 'test:unit' task to run karma unit tests
 */
gulp.task('test:unit', function(cb) {
  // run the karma test
  karma.start({
    configFile: path.join(__dirname, paths.test.config.karma),
    browsers: [BROWSERS],
    reporters: [REPORTERS],
    singleRun: !WATCH,
    autoWatch: WATCH
  }, function(code) {
    // make sure failed karma tests cause gulp to exit non-zero
    if (code === 1) {
      log(COLORS.red('Error: unit test failed '));
      return process.exit(1);
    }
    cb();
  });
});


gulp.task("bundleDirective", function () {
  return gulp.src("*-directive.js")
      .pipe(babel())
      .pipe(gulp.dest("dist"));
});

gulp.task("bundleModule", function () {
  return gulp.src("*-module.js")
      .pipe(babel())
      .pipe(gulp.dest("dist"));
});


gulp.task('build:jspmconfig', function (cb) {
  exec("node ./node_modules/jspm/jspm.js config registries.github.timeouts.lookup 360", function(err, stdout, stderr) {
    log(stdout);
    log.error(stderr);
    cb(err);
  });
});



gulp.task('build:jspminstall', ['build:jspmconfig'], function (cb) {
  exec("node ./node_modules/jspm/jspm.js install", function(err, stdout, stderr) {
      log(stdout);
      log.error(stderr);
      cb(err);
  });
});



gulp.task('build:fixjspmconfig', function (cb) {
  exec("node ./node_modules/eslint/bin/eslint.js --config ./.eslintrc --fix ./config.js", function(err, stdout, stderr) {
      log(stdout);
      log.error(stderr);
      cb(err);
  });
});



gulp.task('build:jspm', function(cb){
  runSequence(
    ['build:jspminstall'],['build:fixjspmconfig'],
    cb
  );
})

gulp.task('install', function (cb) {
  exec("yarn", function(err, stdout, stderr) {
      log(stdout);
      log.error(stderr);
      cb(err);
  });
});



gulp.task("compile", function () {
  runSequence(['bundleDirective', 'bundleModule']);
});
