const gulp = require('gulp');
const jshint = require('gulp-jshint');
const stylish = require('jshint-stylish');

gulp.task('jshint', function() {
  return gulp.src('lib/**/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter(stylish));
});

gulp.task('watch', ['jshint'], function() {
  return gulp.watch(['lib/**/*.js', 'test/tokenizer-tests.js'], ['jshint']);
});

gulp.task('default', ['jshint']);
