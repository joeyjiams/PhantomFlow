
var path = require('path');
var fs = require('fs');
var showReport;
var filterTest;
var debugMode;
var remoteDebug;
var maxRetry;
var tests;
var results;
var setting = 'testSetting.json';

process.argv.forEach(function(arg, i){
	if(arg === 'report'){
		showReport = true;
	}
	if(/^debug/.test(arg)){
		debugMode = true;
	}
	if(/^remoteDebug/.test(arg)){
		remoteDebug = true;
	}
	if(/^test=/.test(arg)){
		filterTest = arg.split('=')[1];
	}
	if(/^retry=/.test(arg)){
	    maxRetry = parseInt(arg.split('=')[1]);
	}
	if (/^setting=/.test(arg)) {
	    setting = arg.split('=')[1];
	}
	if (/^tests=/.test(arg)) {
	    tests = arg.split('=')[1];
	}
	if (/^results=/.test(arg)) {
	    results = arg.split('=')[1];
	}
});

var phantomflowPathFile = './phantomflow.js';

var flow = require(phantomflowPathFile).init({
    //earlyexit: true, // abort as soon as a test fails (also prevents report creation)
    debug: debugMode ? 2 : undefined,
    createReport: true,
    test: filterTest,
    remoteDebug: remoteDebug,
    casperArgs: '--ssl-protocol=any --web-security=false  --ignore-ssl-errors=yes',
    retry: maxRetry,
    setting: setting,
    tests: tests, // specify a folder containing test files
    results: results // specify a folder to place results from test runs
});

if(showReport){

	flow.report();

} else {

	flow.run(function(code){
		process.exit(code);
	});
}