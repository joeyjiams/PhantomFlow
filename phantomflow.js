/*ignore jshint console*/

/*
 * phantomflow
 * Copyright (c) 2014 Huddle
 * Licensed under The MIT License (MIT).
 */

var path = require('path');
var util = require('util');
var fs = require('fs');
var _ = require('lodash');
var colors = require('colors');
var connect = require('connect');
var open = require('open');
var datauri = require('datauri');
var eventEmitter = new (require('events').EventEmitter)();
var glob = require("glob");
var cp = require('child_process');
var wrench = require('wrench');
var async = require('async');
var execSync = require('child_process').execSync;

var optionDebug;

module.exports = {};

module.exports.init = function (options) {

    var time = Date.now();

    var filterTests = options.test;

    var bootstrapPath = path.join(__dirname, 'lib');

    var casperPath = getCasperPath();

    var createReport = options.createReport;

    var includes = path.resolve(options.includes || 'include');
    var tests = path.resolve(options.tests || 'test') + '/';
    var results = path.resolve(options.results || 'test-results');

    var remoteDebug = options.remoteDebug || false;
    var remoteDebugAutoStart = options.remoteDebugAutoStart || false;
    var remoteDebugPort = options.remoteDebugPort || 9000;

    var threads = options.threads || 8;
    var maxRetry = typeof (options.retry) == "undefined" ? 2 : options.retry;

    /*
		Set to false if you do not want the tests to return on the first failure
	*/
    var earlyExit = typeof options.earlyexit === 'undefined' ? false : options.earlyexit;

    var threadCompletionCount = 0;
    var fileGroups;

    var dontDoVisuals = options.skipVisualTests;
    var hideElements = options.hideElements || [];
    var casperArgs = options.casperArgs || [];
    //var casperArgs = "--ssl-protocol=any --web-security=false  --ignore-ssl-errors=yes";

    var args = [];

    var visualTestsPath = changeSlashes(tests + '/visuals/');

    var dataPath = changeSlashes(results + '/data/');
    var xUnitPath = changeSlashes(results + '/xunit/');
    var debugPath = changeSlashes(results + '/debug/');
    var reportPath = changeSlashes(results + '/report/');
    var visualResultsPath = changeSlashes(results + '/visuals/');

    var loggedErrors = [];
    var failCount = 0;
    var passCount = 0;
    var isFinished = false;
    var retry = 0;
    var exitCode = 1;

    optionDebug = parseInt(options.debug, 10) < 3 ? parseInt(options.debug, 10) : void 0;

    if (earlyExit) {
        console.log('The earlyExit parameter is set to true, PhantomFlow will abort of the first failure. \n'.yellow);
        console.log('If a failure occurs, a report will not be generated. \n'.yellow);
    }

    return {
        event: eventEmitter,
        report: function report() {
            if (showReport(reportPath, options.port || 9001, {
                src: visualTestsPath,
                res: visualResultsPath
            })) {
                eventEmitter.emit('exit');
            }
            return;
        },
        run: function (done) {

            var files;

            glob.sync(
					visualResultsPath + '/**/*.fail.png, ' +
					xUnitPath + '/*.xml, ' +
					dataPath + '/**/*.js')
				.forEach(
					function (file) {
					    deleteFile(file, true); // delete
					}
				);

            /*
				Get the paths for all the tests
			*/
            files = _.filter(
				glob.sync(tests + '/**/*.test.js'),
				function (file) {
				    return isFile(file);
				}
			).map(function (file) {
			    return path.relative(tests, file);
			});

            /*
				Filter tests down to match specified string
			*/
            if (filterTests) {
                files = _.filter(files, function (file) {
                    return file.toLowerCase().indexOf(filterTests.toLowerCase()) !== -1;
                });
                threads = 1;
            }

            /*
				Stop if there are no tests
			*/
            if (files.length === 0) {
                eventEmitter.emit('exit');
            }

            /*
				Enable https://github.com/ariya/phantomjs/wiki/Troubleshooting#remote-debugging
			*/
            if (remoteDebug) {
                args.push(
					'--remote-debugger-port=' + remoteDebugPort +
					(remoteDebugAutoStart ? ' --remote-debugger-autorun=yes' : ''));
            }

            /*
				Setup arguments to be sent into PhantomJS
			*/
            args.push(changeSlashes(path.join(bootstrapPath, 'start.js')));
            args.push('--flowincludes=' + changeSlashes(includes));
            args.push('--flowtestsroot=' + changeSlashes(tests));
            args.push('--flowphantomcssroot=' + changeSlashes(path.join(__dirname, 'node_modules', 'phantomcss')));
            args.push('--flowlibraryroot=' + changeSlashes(bootstrapPath));
            args.push('--flowoutputroot=' + changeSlashes(dataPath));
            args.push('--flowxunitoutputroot=' + changeSlashes(xUnitPath));
            args.push('--flowvisualdebugroot=' + changeSlashes(debugPath));
            args.push('--flowvisualstestroot=' + changeSlashes(visualTestsPath));
            args.push('--flowvisualsoutputroot=' + changeSlashes(visualResultsPath));

            if (optionDebug !== void 0) {
                args.push('--flowdebug=' + optionDebug);
            }

            if (optionDebug === 2) {
                earlyExit = false;
            }

            if (dontDoVisuals) {
                args.push('--novisuals=' + dontDoVisuals);
            }

            if (hideElements) {
                args.push('--hideelements=' + hideElements.join(','));
            }
            if (options.setting) {
                args.push('--setting=' + options.setting);
            }
            if (casperArgs) {
                args = args.concat(casperArgs);
            }

            cleanupFolderRecursive(results, true);
            deleteFile('failedtests.json', true);
            testFiles(files);
            eventEmitter.on('retry', function () {
                console.log("Retry run #" + (++retry));
                cleanupFolderRecursive(results, false);
                var failedTestcases = [];
                if (loggedErrors.length > 0) {
                    var failedTests = [];
                    loggedErrors.forEach(function (error) {
                        failedTests.push(error.file);
                        var testname = error.testId;
                        if (testname) {
                            failedTestcases.push(testname);
                        }
                    });
                    fs.writeFileSync('failedtests.json', JSON.stringify(failedTestcases));
                    loggedErrors = [];
                    glob.sync(visualResultsPath + '/**/*.fail.png')
                        .forEach(
                            function (file) {
                                deleteFile(file, true); // delete
                            }
                        );
                    testFiles(failedTests.unique());
                }
            });

            eventEmitter.on('exit', function () {
                isFinished = true;
            });

            eventEmitter.on('report', function () {
                mergedData = concatData(dataPath, visualTestsPath, visualResultsPath);

                copyReportTemplate(
                    mergedData,
                    reportPath,
                    createReport
                );
            });

            async.until(
				function () {
				    return isFinished;
				},
				function (callback) {
				    setTimeout(callback, 100);
				},
				function () {
				    if (done) {
				        done(exitCode);
				    }
				}
			);

        }
    };

    function testFiles(files) {
        /*
        Group the files for thread parallelization
        */

        if (files.length < threads) {
            threads = files.length;
        }

        if (optionDebug > 0 || remoteDebug) {
            threads = 1;
        }

        threadCompletionCount = 0;

        fileGroups = _.groupBy(files, function (val, index) {
            return index % threads;
        });

        console.log('Parallelising ' + files.length + ' test files on ' + threads + ' threads.\n');
        console.log("Testing suites:\n" + files);
        _.forEach(fileGroups, function (files, index) {

            var groupArgs = args.slice(0);
            var child;
            var currentTestFile = '';
            var stdoutStr = '';
            var failFileName = 'error_' + index + '.log';
            var hasErrored = false;

            groupArgs.push('--flowtests=' + changeSlashes(files.join(',')));
            //console.log("starting test:" + casperPath + groupArgs);
            child = cp.spawn(
                changeSlashes(casperPath),
                groupArgs, {
                    stdio: false
                }
            );

            child.on('close', function (code) {

                var mergedData;

                if (code !== 0) {

                    console.log(('It broke, sorry. Threads aborted. Non-zero code (' + code + ') returned.').red);
                    writeLog(results, failFileName, stdoutStr);
                    if (earlyExit) {
                        eventEmitter.emit('exit');
                    }
                }

                threadCompletionCount += 1;

                if (threadCompletionCount === threads) {
                    console.log('\n All the threads have completed. \n'.grey);

                    loggedErrors.forEach(function (error) {
                        console.log(('== ' + error.file).white);
                        console.log(error.msg.bold.red);
                    });

                    console.log(
                        ('Completed ' + (failCount + passCount) + ' tests in ' + Math.round((Date.now() - time) / 1000) + ' seconds. ') +
                        (failCount + ' failed, ').bold.red +
                        (passCount + ' passed. ').bold.green);

                    if (failCount > 0 && retry < maxRetry) {
                        console.log((failCount + " tests failed, retry the failed test suite.").bold.red);
                        failCount = passCount = 0;
                        eventEmitter.emit('retry');
                    } else {
                        if (failCount === 0) {
                            exitCode = 0;
                        }
                        if (createReport) {
                            eventEmitter.emit('report');
                        }

                        eventEmitter.emit('exit');
                    }

                } else {
                    console.log('\n A thread has completed. \n'.yellow);
                }
            });

            child.stdout.on('data', function (buf) {

                var bufstr = String(buf);

                if (/^execvp\(\)/.test(buf)) {
                    console.log('Failed to start CasperJS');
                }

                if (/Error:/.test(bufstr)) {
                    hasErrored = true;
                }

                bufstr.split(/\n/g).forEach(function (line) {

                    if (/TESTFILE/.test(line)) {
                        currentTestFile = line.replace('TESTFILE ', '');
                    }
                    if (/FAIL PhantomCSS|CaptureFailed/.test(line)) {
                        console.log(line.bold.red);
                        var testFile = line.match(/visuals\/(.*\.js)/);
                        if (testFile && testFile.length === 2) {
                            currentTestFile = testFile[1];
                        }
                        var testId = /CaptureFailed/.test(line) ? line.replace('CaptureFailed: ', '') : line.replace('FAIL PhantomCSS ', '');
                        loggedErrors.push({
                            file: currentTestFile,
                            msg: line,
                            testId: testId
                        });
                        failCount++;

                        if (earlyExit === true) {
                            writeLog(results, failFileName, stdoutStr);
                            eventEmitter.emit('exit');

                            child.kill();
                        }

                    } else if (/PASS/.test(line)) {
                        passCount++;
                        console.log(line.green);
                    } else if (/DEBUG/.test(line)) {
                        console.log(('\n' + line.replace(/DEBUG/, '') + '\n').yellow);
                    } else if (hasErrored) {
                        console.log(line.bold.red);
                        if (earlyExit === true) {
                            writeLog(results, failFileName, stdoutStr);
                            eventEmitter.emit('exit');

                            child.kill();
                        }
                    } else if (threads === 1) {
                        console.log(line.white);
                    }

                    stdoutStr += line;
                });
            });

            if (remoteDebug) {
                console.log("Remote debugging is enabled.  Web Inspector interface will show shortly.".bold.green);
                console.log("Please use ctrl+c to escape\n".bold.green);
                console.log("https://github.com/ariya/phantomjs/wiki/Troubleshooting#remote-debugging\n".underline.bold.grey);

                if (!remoteDebugAutoStart) {
                    console.log("Click 'about:blank' to see the PhantomJS Inspector.");
                    console.log("To start, enter the '__run()' command in the Web Inspector Console.\n");
                }

                setTimeout(function () {
                    //console.log(("If Safari or Chrome is not your default browser, please open http://localhost:"+remoteDebugPort+" in a compatible browser.\n").bold.yellow);
                    open('http://localhost:' + remoteDebugPort, "chrome");
                }, 3000);
            }
        });
    }
};

Array.prototype.unique = function () {
    var a = [], k = 0, e;
    for (k = 0; e = this[k]; k++)
        if (a.indexOf(e) == -1)
            a.push(e);
    return a;
};

function concatData(dataPath, imagePath, imageResultPath) {
    // do concatination and transform here to allow parallelisation in PhantomFlow

    var data = {};
    var stringifiedData;

    glob.sync(dataPath + '/**/*.json').forEach(
		function (file) {
		    var json = readJSON(file);
		    var filename = file.replace(dataPath, '').replace('.json', '');

		    if (data[filename] && data[filename].children && json && json.children) {
		        data[filename].children = data[filename].children.concat(json.children);
		    } else {
		        data[filename] = json;
		    }
		}
	);

    stringifiedData = JSON.stringify(data, function (k, v) {
        return dataTransform(k, v, imagePath, imageResultPath);
    }, 2);

    return stringifiedData;
}

function copyReportTemplate(data, dir, templateName) {

    templateName = typeof templateName == 'string' ? templateName : 'Dendrogram';

    var templates = path.join(__dirname, 'report_templates');
    var template = path.join(templates, templateName);
    var datafilename = path.join(dir, 'data.js');

    if (isDir(template)) {

        wrench.copyDirSyncRecursive(template, dir, {
            forceDelete: true
        });

        if (isFile(datafilename)) {
            deleteFile(datafilename);
        }
        fs.writeFileSync(datafilename, data);
    }

    writeStaticTestReport(dir, JSON.parse(data));
}

function writeStaticTestReport(dir, data) {
    var filename = path.join(dir, 'TestResult.html');
    var header = '<title>UI Regression test report</title>';
    var failedTest = { val: '', summary: '', failureCount: 0 };
    var body = '';
    pickOutFailedTests(data, 'Test', failedTest);
    if (failedTest.failureCount > 0) {
        body = '<h1 class="failed"> ' + failedTest.failureCount + ' failed tests: </h1> Click <a href="http://aka.ms/uiregression" target="_new"> here</a> for instruction. <h1 id="top">Summary</h1><ol>' + failedTest.summary + '</ol><h1>Details</h1><ol>' + failedTest.val + '</ol><a id="back" href="#top" title="Go back to top">&uarr;&uarr;&uarr;</a>';
    } else {
        body = '<h1 class="passed">All test passed.</h1>';
    }
    var style = '<style>body{font-family: wf_segoe-ui_normal,Segoe,Tahoma,Verdana,Arial,sans-serif;} h2 {font-size: 1em;}.failed {color:red;} .passed {color:green;} h3 {color:gray} .latest, .diff{border: 1px dashed lightcoral;} .origin{border: 1px dashed lightgreen;margin-right:10px;} .origin, .latest {cursor:pointer;} .owner,.testurl{color:darkcyan;} .owner {background-color:yellow} h2 span{margin-right: 1em;} .anchor{margin-left: 15px;} #back{position:fixed;top:0;right:0;border:1px solid gray;padding:10px;background-color: lightyellow;text-decoration: none;}.sbs{overflow-x: auto;white-space: nowrap;}.sbs>div{display:inline-block;vertical-align:top;}</style>';
    var script = '<script type="text/javascript">function sidebyside(id) {' +
            'document.getElementById(id).className="sbs";' +
        '} ' +
        'function topdown(id) {' +
            'document.getElementById(id).className="topdown";' +
        '} ' +
        'function setview() {' +
        'var screenshots = document.getElementsByClassName("screenshot");' +
        'for(var i = 0; i < screenshots.length; i++) {' +
        'screenshots[i].className = screenshots[i].clientHeight > 500 ? "sbs" : "topdown";' +
        '}}' +
        'window.onload=setview;' +
        '</script>';
    var html = '<!DOCTYPE html>'
        + '<html><head>' + header + style + script + '</head><body onload="setview();">' + body + '</body></html>';
    fs.writeFileSync(filename, html);
}

function pickOutFailedTests(data, name, output) {
    if (typeof data == 'object' && data) {
        var testname = '';
        if (data.hasOwnProperty('name')) {
            testname = name + ' > ' + data.name;
        } else {
            for (var child in data) {
                pickOutFailedTests(data[child], Array.isArray(data) ? name : child, output);
            }
        }

        if (data.hasOwnProperty('screenshot')) {
            var screenshot = data.screenshot;
            var id = testname.replace(/\W|_/g, '');
            var titleForSummary = '<li> <h2>' + testname + '<a class="anchor" href="#' + id + '">&rarr;Detail</a></h2><h2>';
            var title = '<li id="' + id + '"> <h2>' + testname + '</h2><h2>';
            var desc = '<span class="owner">Owner: ' + data.owner + '</span>'
                + '<span class="testurl">Test Url: <a href="' + data.testUrl + '">' + data.testUrl + '</a></span></h2>';
            if (screenshot) {
                if (screenshot.hasOwnProperty('failure')) {

                    output.summary += titleForSummary + desc;
                    output.val += title + desc
                        + '<button onclick="sidebyside(\'' + id + 'img\');" >Compare side by side</button> <button onclick="topdown(\'' + id + 'img\');">Compare top to down</button>'
                        + '<div id="' + id + 'img" class="screenshot" ><div id="' + id + 'base"><h3>Baseline</h3>'
                        + '<img class="origin" src="' + screenshot.original + '" onclick="window.open(this.src);"/></div>'
                        + '<div id="' + id + 'new" "><h3>Latest</h3>'
                        + '<img class="latest" src="' + screenshot.latest + '" onclick="window.open(this.src);"/></div></div>'
                        + '<h3>Diff</h3>'
                        + '<img class="diff" src="' + screenshot.failure + '" /></li>';
                    output.failureCount++;
                }
            } else {
                output.summary += titleForSummary + desc;
                output.val += title + desc + '<div id="' + id + '">Failed to capture screenshot. Dead link? Bad selector? </div></li>';
                output.failureCount++;
            }
        }
        if (data.hasOwnProperty('children') && data.children) {
            pickOutFailedTests(data.children, testname, output);
        }
    }
}

function getImageResultDiffFromSrc(src) {
    return src.replace(/.png$/, '.diff.png');
}

function getImageResultFailureFromSrc(src) {
    return src.replace(/.png$/, '.fail.png');
}

function dataTransform(key, value, imagePath, imageResultPath) {
    var obj, ori, latest, fail, img;
    if (key === 'screenshot') {

        img = changeSlashes(value);
        ori = path.join(imageResultPath, img);

        if (isFile(ori)) {

            latest = getImageResultDiffFromSrc(ori);
            fail = getImageResultFailureFromSrc(ori);

            obj = {
                original: datauri(ori),
                src: img
            };

            if (isFile(fail)) {
                obj.failure = datauri(fail);
                if (isFile(latest)) {
                    obj.latest = datauri(latest);
                }
            }

            return obj;
        } else {
            if (optionDebug > 0) {
                console.log(("Expected file does not exist! " + value).grey);
            }
            return null;
        }
    }

    return value;
}

function showReport(dir, port, paths) {
    if (isDir(dir)) {
        console.log("Please use ctrl+c to escape".bold.green);
        var server = connect(connect.static(dir));

        server.use('/rebase', reqHandler(paths)).listen(port);

        open('http://localhost:' + port);
        return false;
    } else {
        console.log("A report hasn't been generated.  Maybe you haven't set the createReport option?".bold.yellow);
        return true;
    }
}

function reqHandler(paths) {
    return function (req, res, next) {
        if (req.method === 'POST') {
            req.on('data', function (chunk) {
                var image = decodeURIComponent(chunk.toString().split("img=").pop()).replace(/\+/g, ' ');
                var origImage;
                var resImage;

                if (image) {
                    origImage = changeSlashes(paths.src + image);
                    resImage = changeSlashes(paths.res + getImageResultDiffFromSrc(image));

                    if (isFile(origImage) && isFile(resImage)) {
                        console.log(('Rebasing... ' + origImage).bold.yellow);
                        console.log(("tf checkout \"" + origImage + "\"").bold.yellow);
                        try {
                            execSync("tf checkout \"" + origImage + "\"", { timeout: 5000 });
                        }
                        catch (e) {
                            console.log("Not able to check out file. ")
                        }
                        deleteFile(origImage);
                        moveFile(resImage, origImage);
                    }
                }

            });
            res.writeHead(202, {
                'Content-Type': 'text/plain',
                'Content-Length': 0
            });
            res.end();
        } else if (req.method === 'GET') {
            res.writeHead(202, {
                'Content-Type': 'text/plain',
                'Content-Length': 0
            });
            console.log(('Click the rebase button to update screenshot baseline').bold.yellow);
            res.end();
        } else {
            next();
        }
    };
}

function moveFile(oldPath, newPath) {
    fs.renameSync(oldPath, newPath);
}

function changeSlashes(str) {
    return path.normalize(str).replace(/\\/g, '/');
}

function writeLog(resultsDir, filename, log) {
    var path = resultsDir + '/log/';

    if (!isDir(path)) {
        fs.mkdir(path, function () {
            writeLogFile(path + filename, log);
        });
    } else {
        writeLogFile(path + filename, log);
    }
}

function writeLogFile(path, log) {
    fs.writeFile(path, log, function () {
        console.log((" Please take a look at the error log for more info '" + path + "'").bold.yellow);
    });
}

function cleanupFolderRecursive(path, isDelete) {
    var files = [];

    if (isDir(path)) {
        files = fs.readdirSync(path);
        files.forEach(function (file, index) {
            var curPath = path + "/" + file;
            if (isDir(curPath)) {
                cleanupFolderRecursive(curPath, isDelete);
            } else {
                deleteFile(curPath, isDelete);
            }
        });
        if (isDelete) {
            try {
                fs.rmdirSync(path);
            } catch (e) {
                console.log(('Could not remove ' + path + ' is there a file lock?').bold.red);
            }
        }
    }
}

function isFile(path) {
    if (fs.existsSync(path)) {
        return fs.lstatSync(path).isFile();
    } else {
        return false;
    }
}

function isDir(path) {
    if (fs.existsSync(path)) {
        return fs.lstatSync(path).isDirectory();
    } else {
        return false;
    }
}

function readJSON(file) {
    return JSON.parse(fs.readFileSync(file));
}

function deleteFile(file, isDelete) {
    if (fs.existsSync(file)) {
        fs.chmodSync(file, 0777);
        if (isDelete) {
            fs.unlinkSync(file);
        }
    }
}

function getCasperPath() {
    var nodeModules = path.resolve(__dirname, 'node_modules', 'phantomcss', 'node_modules');
    var phantomjs = require(path.resolve(nodeModules, 'phantomjs'));
    var isWindows = /^win/.test(process.platform);
    var casperPath = nodeModules + "/casperjs/bin/casperjs" + (isWindows ? ".exe" : "");

    if (fs.existsSync(phantomjs.path)) {
        process.env["PHANTOMJS_EXECUTABLE"] = phantomjs.path;
    } else {
        console.log("PhantomJS is not installed? Try `npm install`".bold.red);
    }

    if (!fs.existsSync(casperPath)) {
        console.log("CasperJS is not installed? Try `npm install`".bold.red);
    }

    return casperPath;
}
