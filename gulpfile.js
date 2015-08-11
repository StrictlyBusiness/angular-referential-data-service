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

//=============================================
//                CONSTANTS
//=============================================
var PRODUCTION_URL = 'http://your-production-url.com';
var GIT_REMOTE_URL = 'https://' + process.env.GH_TOKEN + '@github.com/StrictlyBusiness/aemis-cloud.git';
var DEVELOPMENT_URL = 'http://127.0.0.1:3500';
var PRODUCTION_CDN_URL = 'http://your-production-cdn-url.com';


//=============================================
//            DECLARE VARIABLES
//=============================================

/**
 * Declare variables that are use in gulpfile.js or angular app
 */
var log = plugins.util.log;
var ENV =  'dev';
var COLORS = plugins.util.colors;
var WATCH =  false;
var BROWSERS = 'Chrome';
var REPORTERS = 'mocha';
var CDN_BASE =  DEVELOPMENT_URL;
var APPLICATION_BASE_URL =  DEVELOPMENT_URL;


//=============================================
//            DECLARE PATHS
//=============================================

var paths = {
  /**
   * The 'gulpfile' file is where our run tasks are hold.
   */
  gulpfile: 'gulpfile.js',
  /**
   * This is a collection of file patterns that refer to our app code (the
   * stuff in `src/`). These file paths are used in the configuration of
   * build tasks.
   *
   * - 'styles'       contains all project css styles
   * - 'images'       contains all project images
   * - 'fonts'        contains all project fonts
   * - 'scripts'      contains all project javascript except config-env.js and unit test files
   * - 'html'         contains main html files
   * - 'templates'    contains all project html templates
   * - 'config'       contains Angular app config files
   */
  app: {
    basePath: 'src/',
    config: {
      dev: 'src/app/core/config/core.config.dev.js',
      test: 'src/app/core/config/core.config.test.js',
      prod: 'src/app/core/config/core.config.prod.js'
    },
    scripts: [
      'src/app/**/*.js',
      '!src/app/**/*.test.js'
    ],
  },
  /**
   * This is a collection of file patterns that refer to our app unit and e2e tests code.
   *
   * 'config'       contains karma and protractor config files
   * 'testReports'  contains unit and e2e test reports
   * 'unit'         contains all project unit test code
   * 'e2e'          contains all project e2e test code
   */
  test: {
    basePath: 'test/',
    config: {
      karma: 'karma.conf.js',
    },
    mock: '*.mock.js',
    unit: '*.test.js',
  },
  /**
   * The 'tmp' folder is where our html templates are compiled to JavaScript during
   * the build process and then they are concatenating with all other js files and
   * copy to 'dist' folder.
   */
  tmp: {
    basePath: 'tmp/',
    styles: 'tmp/styles/',
    scripts: 'tmp/scripts/',
    fonts: 'tmp/fonts/'
  },
  /**
   * The 'build' folder is where our app resides once it's
   * completely built.
   *
   * - 'dist'         application distribution source code
   * - 'docs'         application documentation
   */
  build: {
    basePath: 'build/',
    dist: {
      basePath: 'build/dist/',
      fonts: 'build/dist/fonts/',
      images: 'build/dist/images/',
      styles: 'build/dist/styles/',
      scripts: 'build/dist/scripts/'
    },
    docs: 'build/docs/'
  }
};


/**
 * The 'eslint' task defines the rules of our hinter as well as which files
 * we should check. It helps to detect errors and potential problems in our
 * JavaScript code.
 */
gulp.task('eslint', function() {
  return gulp.src(paths.app.scripts)
    .pipe(plugins.eslint())
    .pipe(plugins.eslint.formatEach())
    .pipe(plugins.eslint.failAfterError());
});


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
