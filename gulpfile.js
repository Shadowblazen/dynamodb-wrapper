// core node modules
var exec = require('child_process').exec;

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
        'build.dev',
        'test.coverage',
        'build.prod',
        done
    );
});

gulp.task('start', ['build.dev', 'lint.dev', 'watch.lib']);

gulp.task('test', function () {
    return gulp.src('dist/dev/**/*spec.js').pipe(jasmine());
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
 * Create Production Build
 *********************************************************************************************************************/

gulp.task('build.prod', function (done) {
    runSequence(
        'clean.prod',
        ['transpile.prod', 'copy.assets.prod'],
        done
    );
});

gulp.task('transpile.prod', function () {
    var tsProject = tsc.createProject('tsconfig.json', { typescript: typescript });

    return gulp.src([
            'lib/**/*.ts',
            '!lib/**/*spec.ts',
            '!lib/test/**/*'
        ])
        .pipe(tsc(tsProject))
        .pipe(gulp.dest('dist/prod'));
});

gulp.task('copy.assets.prod', function () {
    return gulp.src(['lib/**/*.json'])
        .pipe(gulp.dest('dist/prod'));
});

gulp.task('clean.prod', function (done) {
    cleanDir('dist/prod', done);
});

/*********************************************************************************************************************
 * Create Dev Build
 *********************************************************************************************************************/

gulp.task('build.dev', function (done) {
    runSequence(
        'clean.dev',
        ['transpile.dev', 'copy.assets.dev'],
        done
    );
});

gulp.task('transpile.dev', function () {
    var tsProject = tsc.createProject('tsconfig.json', { typescript: typescript });

    return gulp.src(['lib/**/*.ts', 'test/**/*.ts'])
        .pipe(tsc(tsProject))
        .pipe(gulp.dest('dist/dev'));
});

gulp.task('copy.assets.dev', function () {
    return gulp.src(['lib/**/*.json', 'tools/**/*.js'])
        .pipe(gulp.dest('dist/dev'));
});

gulp.task('clean.dev', function (done) {
    cleanDir('dist/dev', done);
});

/*********************************************************************************************************************
 * Linting, Testing, Precommit-hooks, etc.
 *********************************************************************************************************************/

gulp.task('pretest.coverage.instrumentation', function () {
    var filesGlob = [
        'dist/dev/**/*.js',

        // ignore test-related files
        '!dist/dev/**/*.spec.js',
        '!dist/dev/jasmine-runner.js',
        '!dist/dev/test/**/*'
    ];

    return gulp.src(filesGlob)
        .pipe(istanbul({
            includeUntested: true
        }))
        .pipe(istanbul.hookRequire());
});

gulp.task('posttest.coverage.reports', function () {
    return gulp.src(['dist/**/*.spec.js'])
        .pipe(istanbul.writeReports());
});

gulp.task('lint.dev', function () {
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
    gulp.watch(['lib/**/*.ts'], ['build.dev', 'lint.dev']);
});

gulp.task('pre-commit', function (done) {
    runSequence(
        'lint',
        'build.dev',
        'test.coverage',
        'build.prod',
        done
    );
});

gulp.task('postinstall', ['install.pre-commit']);

gulp.task('install.pre-commit', function (next) {
    var isWin = /^win/.test(process.platform);
    if (!isWin) {
        execChildProcess('sh pre-commit-install.sh', next);
    }
});

/*********************************************************************************************************************
 * Private helper methods
 *********************************************************************************************************************/

function cleanDir(dir, done) {
    del(dir).then(function () {
        done();
    });
}

function execChildProcess(cmd, cb) {
    if (Object.prototype.toString.call(cmd) === '[object Array]') {
        cmd = cmd.join(' && ');
    }

    var childProcess = exec(cmd);

    childProcess.stdout.on('data', function (data) {
        console.log(data.toString().replace(/\n$/, ''));
    });

    childProcess.stderr.on('data', function (data) {
        console.log(data.toString().replace(/\n$/, ''));
    });

    childProcess.on('exit', function () {
        cb && cb();
    });
}
