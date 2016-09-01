// npm modules
var del = require('del');
var gulp = require('gulp');
var tslint = require('gulp-tslint');
var tsc = require('gulp-typescript');
var typescript = require('typescript');
var runSequence = require('run-sequence');
var istanbul = require('gulp-istanbul');

// custom modules
var jasmine = require('./tools/jasmine-runner');

/*********************************************************************************************************************
 * Public tasks: run these from the console, e.g. 'gulp start' or 'gulp test'
 *********************************************************************************************************************/

gulp.task('default', function (done) {
    runSequence(
        'lint',
        'build',
        'test.coverage',
        done
    );
});

gulp.task('start', ['build', 'lint', 'watch.lib']);

gulp.task('test', function () {
    return gulp.src('bin/**/*spec.js').pipe(jasmine());
});

gulp.task('test.coverage', function (done) {
    runSequence(
        'pretest.coverage.instrumentation',
        'test',
        'posttest.coverage.reports',
        done
    );
});

/*********************************************************************************************************************
 * Create Build Package
 *********************************************************************************************************************/

gulp.task('build', function (done) {
    runSequence(
        'clean',
        ['transpile', 'copy.assets'],
        done
    );
});

gulp.task('transpile', function () {
    var tsProject = tsc.createProject('tsconfig.json', { typescript: typescript });

    return gulp.src('lib/**/*.ts')
        .pipe(tsc(tsProject))
        .pipe(gulp.dest('bin'));
});

gulp.task('copy.assets', function () {
    return gulp.src('tools/**/*.js')
        .pipe(gulp.dest('bin'));
});

gulp.task('clean', function (done) {
    del(['bin', 'coverage']).then(function () {
        done();
    });
});

gulp.task('prepublish', function (done) {
    del(['bin/jasmine-runner.js', 'bin/**/*.spec.js']).then(function () {
        done();
    });
});

/*********************************************************************************************************************
 * Linting, Testing, Precommit-hooks, etc.
 *********************************************************************************************************************/

gulp.task('pretest.coverage.instrumentation', function () {
    var filesGlob = [
        'bin/**/*.js',

        // ignore test-related files
        '!bin/**/*.spec.js',
        '!bin/jasmine-runner.js'
    ];

    return gulp.src(filesGlob)
        .pipe(istanbul({
            includeUntested: true
        }))
        .pipe(istanbul.hookRequire());
});

gulp.task('posttest.coverage.reports', function () {
    return gulp.src('bin/**/*.spec.js')
        .pipe(istanbul.writeReports());
});

gulp.task('lint.noerror', function () {
    return gulp.src('lib/**/*.ts')
        .pipe(tslint({
            formatter: 'verbose'
        }))
        .pipe(tslint.report({
            emitError: false
        }));
});

gulp.task('lint', function () {
    return gulp.src('lib/**/*.ts')
        .pipe(tslint({
            formatter: 'verbose'
        }))
        .pipe(tslint.report());
});

gulp.task('watch.lib', function () {
    gulp.watch(['lib/**/*.ts'], ['build', 'lint.noerror']);
});