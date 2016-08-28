var path = require('path');
var through = require('through2');
var Jasmine = require('jasmine');
var consoleReporter = require('jasmine-console-reporter');
var gulpUtil = require('gulp-util');

function deleteRequireCache(id) {
    if (!id || id.indexOf('node_modules') !== -1) {
        return;
    }

    var files = require.cache[id];

    if (files !== undefined) {
        for (var file in files.children) {
            //noinspection JSUnfilteredForInLoop
            deleteRequireCache(files.children[file].id);
        }

        delete require.cache[id];
    }
}

function endJasmine(done) {

    return function (pass) {
        if (pass) {
            done();
        }
        else {
            done(new gulpUtil.PluginError('gulp-jasmine', 'Tests failed', {
                showStack: false
            }));
        }
    }
}

module.exports = function (options) {

    options = options || {};
    options.color = options.color || process.argv.indexOf('--no-color') === -1;

    var jasmine = new Jasmine();

    jasmine.loadConfig(options);

    jasmine.addReporter(new consoleReporter({
        colors: options.color,
        verbosity: 3
    }));

    return through.obj(function (file, encoding, done) {

        if (file.isNull()) {
            done(null, file);
            return;
        }

        var resolvedPath = path.resolve(file.path);
        var modId = require.resolve(resolvedPath);
        deleteRequireCache(modId);

        jasmine.addSpecFile(resolvedPath);

        done(null, file);

    }, function (done) {
        try {
            jasmine.onComplete(endJasmine(done));
            jasmine.execute();
        } catch (err) {
            done(new gulpUtil.PluginError('jasmine-runner', err, { showStack: true }));
        }

    });
};