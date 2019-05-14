// npm modules
const del = require('del');
const { src, dest, series } = require('gulp');
const tslint = require('gulp-tslint');
const tsc = require('gulp-typescript');
const jasmine = require('gulp-jasmine');
const JasmineConsoleReporter = require('jasmine-console-reporter');
const istanbul = require('gulp-istanbul');

function cleanTask(done) {
    del(['bin', 'coverage', 'test/**/*.js']).then(function () {
        done();
    });
}

function lintTask() {
    return src('lib/**/*.ts')
        .pipe(tslint({
            formatter: 'verbose'
        }))
        .pipe(tslint.report({
            emitError: true
        }));
}

function transpileLibTask() {
    const tsProject = tsc.createProject('tsconfig.json');

    return src('lib/**/*.ts')
        .pipe(tsProject())
        .pipe(dest('bin'));
}

function transpileTestTask() {
    const tsProject = tsc.createProject('tsconfig.json');

    return src('test/**/*.ts')
        .pipe(tsProject())
        .pipe(dest('test'));
}

function pretestCoverageInstrumentationTask() {
    const filesGlob = [
        'bin/**/*.js',

        // ignore test-related files
        '!bin/**/*.spec.js',
        '!bin/jasmine-runner.js'
    ];

    return src(filesGlob)
        .pipe(istanbul({
            includeUntested: true
        }))
        .pipe(istanbul.hookRequire());
}

function posttestCoverageReportsTask() {
    return src('bin/**/*.spec.js')
        .pipe(istanbul.writeReports());
}

function testTask() {
    return src('bin/**/*spec.js').pipe(jasmine({
        reporter: new JasmineConsoleReporter({
            colors: process.argv.indexOf('--no-color') === -1,
            verbosity: 3
        })
    }));
}

function prepublishTask(done) {
    del(['bin/jasmine-runner.js', 'bin/**/*.spec.js']).then(function () {
        done();
    });
}

exports.prepublish = prepublishTask;
exports.build = series(lintTask, cleanTask, transpileLibTask, transpileTestTask);
exports.test = series(exports.build, pretestCoverageInstrumentationTask, testTask, posttestCoverageReportsTask);
exports.default = exports.test;