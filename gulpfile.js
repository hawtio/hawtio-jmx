var gulp = require('gulp'),
    eventStream = require('event-stream'),
    gulpLoadPlugins = require('gulp-load-plugins'),
    fs = require('fs'),
    del  = require('del'),
    path = require('path'),
    s = require('underscore.string'),
    argv = require('yargs').argv,
    logger = require('js-logger'),
    hawtio = require('@hawtio/node-backend'),
    Server = require('karma').Server;
    packageJson = require('./package.json');

var plugins = gulpLoadPlugins({});

const config = {
  proxyPort: argv.port || 8181,
  targetPath: argv.path || '/jolokia',
  logLevel: argv.debug ? logger.DEBUG : logger.INFO,
  ts: ['plugins/**/*.ts'],
  less: ['plugins/**/*.less'],
  templates: ['plugins/**/*.html', 'plugins/**/*.md'],
  templateModule: 'hawtio-jmx-templates',
  dist: argv.out || './dist/',
  js: 'hawtio-jmx.js',
  dts: 'hawtio-jmx.d.ts',
  css: 'hawtio-jmx.css',
  sourceMap: argv.sourcemap,
  vendor: './vendor/',
};

const tsProject = plugins.typescript.createProject('tsconfig.json');

gulp.task('clean', function () {
  if (!argv.out) {
    return del(config.dist);
  }
});

gulp.task('tsc', ['clean'], function() {
  var tsResult = tsProject.src()
    .pipe(plugins.if(config.sourceMap, plugins.sourcemaps.init()))
    .pipe(tsProject());

  return eventStream.merge(
    tsResult.js
      .pipe(plugins.ngAnnotate())
      .pipe(plugins.if(config.sourceMap, plugins.sourcemaps.write()))
      .pipe(gulp.dest('.')),
    tsResult.dts
      .pipe(plugins.rename(config.dts))
      .pipe(gulp.dest(config.dist)));
});

gulp.task('less', ['clean'], function () {
  return gulp.src(config.less)
    .pipe(plugins.less({
      paths: [
        path.join(__dirname, 'plugins'),
        path.join(__dirname, 'node_modules')
      ]
    }))
    .pipe(plugins.concat(config.css))
    .pipe(gulp.dest(config.dist));
});

gulp.task('template', ['tsc'], function() {
  return gulp.src(config.templates)
    .pipe(plugins.angularTemplatecache({
      filename: 'templates.js',
      root: 'plugins/',
      standalone: true,
      module: config.templateModule,
      templateFooter: '}]); hawtioPluginLoader.addModule("' + config.templateModule + '");'
    }))
    .pipe(gulp.dest('.'));
});

gulp.task('concat', ['template'], function() {
  return gulp.src([
    config.vendor + 'dangle.js',
    config.vendor + 'jolokia.js',
    config.vendor + 'jolokia-simple.js',
    config.vendor + 'cubism.v1.js',
    config.vendor + 'jolokia-cubism.js',
    'compiled.js',
    'templates.js'
  ])
  .pipe(plugins.concat(config.js))
  .pipe(gulp.dest(config.dist));
});

gulp.task('clean-temp-files', ['concat'], function() {
  return del(['templates.js', 'compiled.js']);
});

gulp.task('watch-less', function() {
  gulp.watch(config.less, ['less']);
});

gulp.task('watch', ['build', 'watch-less'], function() {
  gulp.watch(['index.html', config.dist + '/*'], ['reload']);

  const tsconfig = require('./tsconfig.json');
  gulp.watch([...tsconfig.include, ...(tsconfig.exclude || []).map(e => `!${e}`),config.templates],
    ['tsc', 'template', 'concat', 'clean']);
});

gulp.task('connect', ['build'], function() {
  hawtio.setConfig({
    logLevel: config.logLevel,
    port: 2772,
    proxy: '/hawtio/proxy',
    staticProxies: [{
      port: config.proxyPort,
      path: '/jolokia',
      targetPath: config.targetPath
    }],
    staticAssets: [{
      path: '/hawtio/',
      dir: '.'

    }],
    fallback: 'index.html',
    liveReload: {
      enabled: true
    }
  });
  hawtio.use('/', function(req, res, next) {
          var path = req.originalUrl;
          if (path === '/') {
            res.redirect('/hawtio');
          } else if (s.startsWith(path, '/plugins/') && s.endsWith(path, 'html')) {
            // avoid returning these files, they should get pulled from js
            console.log("returning 404 for: ", path);
            res.statusCode = 404;
            res.end();
          } else {
            // console.log("allowing: ", path);
            next();
          }
        });
  hawtio.listen(function(server) {
    var host = server.address().address;
    var port = server.address().port;
    console.log("started from gulp file at ", host, ":", port);
  });
});

gulp.task('reload', function() {
  gulp.src('.')
    .pipe(hawtio.reload());
});

gulp.task('test', ['build'], function (done) {
  new Server({
    configFile: __dirname + '/karma.conf.js'
  }, done).start();
});

gulp.task('version', function() {
  gulp.src(config.dist + config.js)
    .pipe(plugins.replace('PACKAGE_VERSION_PLACEHOLDER', packageJson.version))
    .pipe(gulp.dest(config.dist));
});

gulp.task('build', ['tsc', 'less', 'template', 'concat', 'clean-temp-files']);

gulp.task('default', ['connect', 'watch']);
