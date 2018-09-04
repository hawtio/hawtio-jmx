const angularTemplateCache = require('gulp-angular-templatecache');
const argv = require('yargs').argv;
const concat = require('gulp-concat');
const del  = require('del');
const eventStream = require('event-stream');
const gulp = require('gulp');
const hawtio = require('@hawtio/node-backend');
const If = require('gulp-if');
const less = require('gulp-less');
const logger = require('js-logger');
const ngAnnotate = require('gulp-ng-annotate');
const path = require('path');
const rename = require('gulp-rename');
const replace = require('gulp-replace');
const s = require('underscore.string');
const Server = require('karma').Server;
const sourcemaps = require('gulp-sourcemaps');
const typescript = require('gulp-typescript');

const packageJson = require('./package.json');
const tsconfig = require('./tsconfig.json');

const config = {
  targetPath: argv.path || '/jolokia',
  logLevel: argv.debug ? logger.DEBUG : logger.INFO,
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

const tsProject = typescript.createProject('tsconfig.json');

gulp.task('tsc', function() {
  const tsResult = tsProject.src()
    .pipe(If(config.sourceMap, sourcemaps.init()))
    .pipe(tsProject());

  return eventStream.merge(
    tsResult.js
      .pipe(ngAnnotate())
      .pipe(If(config.sourceMap, sourcemaps.write()))
      .pipe(gulp.dest('.')),
    tsResult.dts
      .pipe(rename(config.dts))
      .pipe(gulp.dest(config.dist)));
});

gulp.task('less', function () {
  return gulp.src(config.less)
    .pipe(less({
      paths: [
        path.join(__dirname, 'plugins'),
        path.join(__dirname, 'node_modules')
      ]
    }))
    .pipe(concat(config.css))
    .pipe(gulp.dest(config.dist));
});

gulp.task('template', ['tsc'], function() {
  return gulp.src(config.templates)
    .pipe(angularTemplateCache({
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
  .pipe(concat(config.js))
  .pipe(gulp.dest(config.dist));
});

gulp.task('clean-temp-files', ['concat'], function() {
  return del(['templates.js', 'compiled.js']);
});

gulp.task('watch', ['build'], function() {
  gulp.watch(['index.html', config.dist + '/*'], ['reload']);
  gulp.watch([...tsconfig.include, ...(tsconfig.exclude || []).map(e => `!${e}`), config.templates], ['clean-temp-files']);
  gulp.watch(config.less, ['less']);
});

gulp.task('connect', ['build'], function() {
  hawtio.setConfig({
    logLevel: config.logLevel,
    port: 2772,
    proxy: '/hawtio/proxy',
    staticProxies: [{
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
          const path = req.originalUrl;
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
    const host = server.address().address;
    const port = server.address().port;
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
    .pipe(replace('PACKAGE_VERSION_PLACEHOLDER', packageJson.version))
    .pipe(gulp.dest(config.dist));
});

gulp.task('build', ['clean-temp-files', 'less']);

gulp.task('default', ['connect', 'watch']);
