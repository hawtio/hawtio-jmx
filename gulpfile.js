var gulp = require('gulp'),
    wiredep = require('wiredep').stream,
    eventStream = require('event-stream'),
    gulpLoadPlugins = require('gulp-load-plugins'),
    fs = require('fs'),
    del  = require('del'),
    path = require('path'),
    s = require('underscore.string'),
    argv = require('yargs').argv,
    hawtio = require('hawtio-node-backend');

var plugins = gulpLoadPlugins({});
var pkg = require('./package.json');

var config = {
  main: '.',
  ts: ['plugins/**/*.ts'],
  less: ['plugins/**/*.less'],
  templates: ['plugins/**/*.html'],
  templateModule: pkg.name + '-templates',
  dist: argv.out || './dist/',
  js: pkg.name + '.js',
  css: pkg.name + '.css',
  tsProject: plugins.typescript.createProject('tsconfig.json')
};

gulp.task('bower', function() {
  return gulp.src('index.html')
    .pipe(wiredep({}))
    .pipe(gulp.dest('.'));
});

gulp.task('clean-defs', function() {
  return del('defs.d.ts');
});

/** Adjust the reference path of any typescript-built plugin this project depends on */
gulp.task('path-adjust', function() {
  return gulp.src('libs/**/defs.d.ts')
    .pipe(plugins.replace(/"libs/gm, '"../../libs'))
    .pipe(gulp.dest('libs'));
});

gulp.task('tsc', ['clean-defs', 'path-adjust'], function() {
  var tsResult = gulp.src(config.ts)
    .pipe(config.tsProject());
  return eventStream.merge(
    tsResult.js,
    tsResult.dts
      .pipe(plugins.rename('defs.d.ts'))
  )
  .pipe(gulp.dest('.'));
});

gulp.task('less', function () {
  return gulp.src(config.less)
    .pipe(plugins.less({
      paths: [ path.join(__dirname, 'less', 'includes') ]
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
  return gulp.src(['compiled.js', 'templates.js'])
    .pipe(plugins.concat(config.js))
    .pipe(gulp.dest(config.dist));
});

gulp.task('clean', ['concat'], function() {
  return del(['templates.js', 'compiled.js']);
});

gulp.task('watch-less', function() {
  plugins.watch(config.less, function() {
    gulp.start('less');
  });
});

gulp.task('watch', ['build', 'watch-less'], function() {
  plugins.watch(['libs/**/*.js', 'libs/**/*.css', 'index.html', config.dist + '/' + config.js, config.dist + '/' + config.css], function() {
    gulp.start('reload');
  });
  plugins.watch(['libs/**/*.d.ts', config.ts, config.templates], function() {
    gulp.start(['tsc', 'template', 'concat', 'clean']);
  });
});

gulp.task('connect', ['watch'], function() {
  hawtio.setConfig({
    port: 2772,
    staticProxies: [{
      port: 8181,
      path: '/jolokia',
      targetPath: 'hawtio/jolokia'
    }],
    staticAssets: [{
      path: '/',
      dir: '.'

    }],
    fallback: 'index.html',
    liveReload: {
      enabled: true
    }
  });
  hawtio.use('/', function(req, res, next) {
          var path = req.originalUrl;
          // avoid returning these files, they should get pulled from js
          if (s.startsWith(path, '/plugins/') && s.endsWith(path, 'html')) {
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

gulp.task('embed-images', ['concat'], function() {

  var replacements = [];

  var files = glob.sync('img/**/*.{png,svg,gif,jpg}');
  //console.log("files: ", files);
  function escapeRegExp(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    }

  function getDataURI(filename) {
    var relative = path.relative('.', filename);
    var ext = path.extname(filename);
    var mime = 'image/jpg';
    switch (ext) {
      case '.png':
        mime = 'image/png';
      break;
      case '.svg':
        mime = 'image/svg+xml';
      break;
      case '.gif':
        mime='image/gif';
      break;
    }
    var buf = fs.readFileSync(filename);
    return 'data:' + mime + ';base64,' + base64.encode(buf);
  }

  files.forEach(function(file) {
    replacements.push({
      match: new RegExp(escapeRegExp(file), 'g'),
      replacement: getDataURI(file)
    });
  });

  gulp.src('dist/dynatree-icons.css')
  .pipe(plugins.replaceTask({
    patterns: replacements
  }))
  .pipe(gulp.dest(config.dist));
});

gulp.task('build', ['tsc', 'less', 'template', 'concat', 'clean']);

gulp.task('default', ['bower', 'connect']);



