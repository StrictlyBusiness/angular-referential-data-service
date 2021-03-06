// Karma configuration
// Generated on Tue Jan 13 2015 13:06:52 GMT-0500 (EST)

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '.',

    // we need this to override the way base is in config.js in order for our
    // tests to load properly within Karma runner which uses base instead of /
    // as the baseURL

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jspm', 'mocha', 'should'],

    jspm: {
        config: 'config.js',
        loadFiles:  [ // Test Files
            '*.test.js'
        ],
        serveFiles: [ // Non-test Files
            'test-models/*.js',
            '*.js',
        ]
    },


    // list of files to exclude
    exclude: [
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['mocha'],

    // reporter options
    mochaReporter: {
      output: 'full',
      ignoreSkipped: false
    },

    // web server port
    port: 9876,

    // teamcity server seems to be slow at getting the tests running so we extend the timeout from 10 seconds to 60
    browserNoActivityTimeout: 60000,

    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_DEBUG,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['Chrome'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false
  });
};
