var gulp = require('gulp'),
  cleanCSS = require('gulp-clean-css'),
  browserify = require('gulp-browserify'),
  jshint = require('gulp-jshint');

var paths = {
  scripts: ['src/js/**.js'],
  serverScripts: ['server.js', 'mailing/**.js', 'utils/**.js'],
  css: 'src/css/*.css'
};

gulp.task('jshint', function() {
  return gulp.src(paths.scripts)
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'));
});

// Basic usage
gulp.task('scripts', function() {
    // Single entry point to browserify
    gulp.src(paths.scripts)
        .pipe(browserify({
          insertGlobals : true,
          debug : !gulp.env.production
        }))
        .pipe(gulp.dest('./public'))
});

// Copy Css /Minify
gulp.task('minify-css', function() {
    return gulp.src(paths.css)
        .pipe(cleanCSS({debug: true}, function(details) {
            console.log(details.name + ': ' + details.stats.originalSize);
            console.log(details.name + ': ' + details.stats.minifiedSize);
        }))
        .pipe(gulp.dest('./public'));
});

gulp.task('watch', function() {
  gulp.watch(paths.scripts, ['jshint']);
  gulp.watch(paths.scripts, ['scripts']);
  gulp.watch(paths.css, ['css']);
});

gulp.task('default', ['jshint', 'scripts', 'minify-css']);
