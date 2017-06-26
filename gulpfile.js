// npm modules
var del = require('del');
var gulp = require('gulp');
var tslint = require('gulp-tslint');
var tsc = require('gulp-typescript');
var jasmine = require('gulp-jasmine');
var JasmineConsoleReporter = require('jasmine-console-reporter');
var runSequence = require('run-sequence');
var istanbul = require('gulp-istanbul');

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
    var options = {
        reporter: new JasmineConsoleReporter({
            colors: process.argv.indexOf('--no-color') === -1,
            verbosity: 3
        })
    };

    return gulp.src('bin/**/*spec.js').pipe(jasmine(options));
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
        ['transpile.lib', 'transpile.test'],
        done
    );
});

gulp.task('transpile.lib', function () {
    var tsProject = tsc.createProject('tsconfig.json');

    return gulp.src('lib/**/*.ts')
        .pipe(tsProject())
        .pipe(gulp.dest('bin'));
});

gulp.task('transpile.test', function () {
    var tsProject = tsc.createProject('tsconfig.json');

    return gulp.src('test/**/*.ts')
        .pipe(tsProject())
        .pipe(gulp.dest('test'));
});

gulp.task('clean', function (done) {
    del(['bin', 'coverage', 'test/**/*.js']).then(function () {
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
    return tslintHelper('lib/**/*.ts', false);
});

gulp.task('lint', function () {
    return tslintHelper('lib/**/*.ts', true);
});

gulp.task('watch.lib', function () {
    gulp.watch(['lib/**/*.ts'], ['build', 'lint.noerror']);
});

/*********************************************************************************************************************
 * Helper methods
 *********************************************************************************************************************/

function tslintHelper(glob, emitError) {
    return gulp.src(glob)
        .pipe(tslint({
            formatter: 'verbose'
        }))
        .pipe(tslint.report({
            emitError: emitError
        }));
}