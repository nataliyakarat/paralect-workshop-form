'use strict';

import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import browserSync from 'browser-sync';
import del from 'del';
import babelify from 'babelify';

const $ = gulpLoadPlugins();
const reload = browserSync.reload;

const development = $.environments.development;
const production = $.environments.production;

const stylePath = {
  src: `assets/styles/**/*.pcss`,
  tmp: `.tmp/assets/styles/`,
  dest: `build/assets/styles/`
};

const imagesPath = {
  src: `assets/images/**/*.{png,jpg,gif,svg}`,
  dest: `build/assets/images/`
};

const fontsPath = {
  src: `assets/fonts/**/*.{woff,woff2}`,
  style: `assets/fonts/*.pcss`,
  dest: `build/assets/fonts/`
};

const svgPath = {
  src: `assets/svg/**/*.svg`,
  folder: `assets/svg/`
};

const scriptsPath = {
  src: `assets/scripts/**.js`,
  tmp: `.tmp/assets/scripts/`,
  dest: `build/assets/scripts/`
};

function log() {
  var args = [].slice.call(arguments);
  $.notify.onError({
    title: 'Compile Error',
    message: '<%= error %>'
  }).apply(this, args);
  this.emit('end');
};

gulp.task('styles', () => {
  return gulp.src([fontsPath.style, stylePath.src])
    .pipe($.concat('bundle.css'))
    .pipe($.postcss([
      require('postcss-normalize'), // latest normalize.css
      require('postcss-normalize-charset'), // @charset "utf-8"
      require('postcss-cssnext')(), // http://cssnext.io/features/
      require('postcss-inline-svg')({ // inline SVG
        path: svgPath.folder
      }),
      require('postcss-svgo'), // optimise inline SVG
      require('postcss-assets')
    ])).on('error', log)
    .pipe(production($.csso()))
    .pipe(development(gulp.dest(stylePath.tmp)))
    .pipe(production(gulp.dest(stylePath.dest)))
    .pipe(reload({stream: true}));
});

gulp.task("styles-linter", () => {
  return gulp.src(stylePath.src)
    .pipe($.stylelint({
      reporters: [
        {formatter: 'string', console: true}
      ]
    }));
});

gulp.task('images', () => {
  return gulp.src(imagesPath.src)
    .pipe($.cache($.imagemin({
      progressive: true,
      interlaced: true,
      svgoPlugins: [{cleanupIDs: false}]
    }))
    .on('error', function(err) {
      console.log(err);
      this.end();
    }))
    .pipe(gulp.dest(imagesPath.dest));
});

gulp.task('html', () => {
  return gulp.src('*.html')
    .pipe($.htmlmin({
      collapseWhitespace: true,
      removeComments: true
    }))
    .pipe(gulp.dest('build'));
});

gulp.task('scripts', () => {
  return gulp.src('./assets/scripts/bundle.js')
    .pipe($.browserify({
      transform: ['babelify'],
      debug: development()
    }))
    .pipe(production($.uglify()))
    .pipe(development(gulp.dest(scriptsPath.tmp)))
    .pipe(production(gulp.dest(scriptsPath.dest)))
    .pipe(reload({stream: true}));
});

gulp.task("copy", () => {
  gulp.src(fontsPath.src).pipe(gulp.dest(fontsPath.dest));
  gulp.src(imagesPath.src).pipe(gulp.dest(imagesPath.dest));
  gulp.src('favicon.ico').pipe(gulp.dest('build/'));
});

gulp.task('clean', del.bind(null, ['.tmp', 'build']));

gulp.task('serve', ['styles', 'scripts'], () => {
  browserSync({
    server: [".tmp", "."],
    notify: false,
    open: true,
    ui: false
  });

  gulp.watch(stylePath.src, ['styles-linter', 'styles']);
  gulp.watch(svgPath.src, ['styles']);
  gulp.watch(scriptsPath.src, ['scripts']);
  gulp.watch("*.html").on('change', reload);
});

gulp.task('set-production', function() {
  return $.environments.current(production);
});

gulp.task('prod', ['styles', 'scripts', 'html', 'images', 'copy'], () => {
  return gulp.src('build/**/*').pipe($.size({title: 'build', gzip: true}));
});

gulp.task('default', ['clean', 'set-production'], () => {
  gulp.start('prod');
});
