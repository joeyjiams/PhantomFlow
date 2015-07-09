PhantomFlow
===========

**UI Regression test framework**. A NodeJS wrapper for [PhantomJS](http://github.com/ariya/phantomjs/), [CasperJS](http://github.com/n1k0/casperjs) and [PhantomCSS](http://github.com/Huddle/PhantomCSS). PhantomFlow compares newly captured screenshots with the baselines, and point out the change in a web based UI report. And it allows users to rebase the baseline by clicking buttons on the UI..

### Features

* Enable a more expressive way of describing user interaction paths within tests
* Fluently communicate UI complexity to stakeholders and team members through generated visualisations
* Support TDD and BDD for web applications and responsive web sites
* Provide a fast feedback loop for UI testing
* Raise profile of visual regression testing
* Support misual regression workflows, quick inspection & rebasing via UI.
* Retry failed tests to avoid random failure caused by render engine and external unreliables
* Allow user to load a setting file and use the setting in tests for endpoint, account, etc.
* Flatten node module dependencies to address long path issue in Windows
* Create a static test report in plain HTML
* Checkout file while rebasing (support TFS only for now)
* Support https by default
* Set up scaffold for writing static tests with simple JSON object

### Install

* Install with git 
`git clone https://github.com/joeyjiams/PhantomFlow.git` 
`cd phantomflow` 
`npm install`

### Try it!

* `node test.js` - First run will create visual test baslines with PhantomCSS
* `node test.js` - Second run will compare baseline visuals with the latest screenshots. This'll pass because there have been no changes.
* `node test.js report` - An optional step to load the Decision tree visualisation into your Web browser

There is an example test suites in test folder. You can add yours there too and they got run in parallel.

The D3.js visualisation opens with a combined view which merges the test result trees. Click on a branch label or use the dropdown to show a specific test. Hover over the nodes to see the PhantomCSS screenshots. If there is a visual test failure the node will glow red, hover and click the node to show the original, latest and generated diff screenshots.

### Test Example

The [demo](http://github.com/joeyjiams/PhantomFlow/tree/master/test/example.test.js) has a static test (watch certain element on a page without any user interactive on it) and an interactive test.

```javascript

    var staticTests = [
        {
            name: "shellheadertop",
            owner: "foo",
            url: setting.msEndpoint + "en-us/store/apps",
            selector: ".shell-header-top",
			hideSelector: "#meControl",
            browserWidths: [1280, 520]
        },
        /*{
            name: "test1",
            owner: "bar",
            url: "https://test.target.com/",
            selector: ".some-css-selector", //optional
			hideSelector: ".hide-some-element", // optional
            browserWidths: [1600, 920]  //optional, set to 1280 by default
        },*/
    ];

	flow('Test_Suite_Name', function() {
        chance({
            'static_tests': function() { runStaticTests(staticTests); }, // register all static tests
            'interactive_tests': function() {
                chance({
                    'case1': function() { step('testMenu', testMenu, 'foo') }, // register interactive tests
                    //'case2': function () { step('testX', testX, 'bar') },
                });
            }
        });
    });
	
	function testMenu() {
        casper.thenOpen(setting.msEndpoint + 'en-us/store/apps', function () {  //setting object comes from testSetting.json
            phantomCSS.turnOffAnimations();
            casper.viewport(1280, 768);
            casper.waitFor(function() {
                return document.readyState == 'complete';
            }, function() {
                casper.click('a[role="menu"][data-bi-slot="5"]');
                casper.waitForSelector('.active>.shell-header-dropdown-content',
                    function success() {
                        phantomCSS.screenshot('.active>.shell-header-dropdown-content', 'menu-dropdown');
                        console.log('Should see dropdown menu');
                    }
                );
            });
        });
    }

```

### Options

* debug (number) : A value of 1 will output more logging, 2 will generate full page screenshots per test which can be found in the test-results folder.  Forces tests onto one thread for readability.
* remoteDebug (boolean) : Enable PhantomJS remote debugging
* test (string) : Test run filtering with a substring match
* report : bring up test report (after test complete)
* retry (number) : max retry time for failed test to reduce unreliability caused by render engine or external factor
* setting (string) : assign a setting file to set test endpoint, account, etc for test cases
* results (string) : assign a directory to place the results of the tests
* tests (string) : specify a directory containing the test files you wish to run

### Parallelisation

Test execution is parallelised for increased speed and a reduced test to dev feedback loop. By default your tests will be divided and run on up to 4 spawned processes.  You can change the default number of threads to any number you think your machine can handle.

### Debugging

Debugging is often a painful part of writing tests with PhantomJS.  If you're experiencing trouble try the following:
node test.js debug

* PhantomJS provides [remote debugging](https://github.com/ariya/phantomjs/wiki/Troubleshooting#remote-debugging) functionality.  This setting allows you to use the debugger; statement and add breakpoints with the [Web Inspector interface](https://www.webkit.org/blog/1620/webkit-remote-debugging/).  

node test.js remoteDebug

### Rebasing visual tests

Rebasing is the process of deleting an original visual test, and creating a new baseline, either by renaming the diff image, or running the test suite again to create a new image.  The PhantomFlow UI provides a quick way to find and inspect differences, with a 'rebase' button to accept the latest image as the baseline.

--------------------------------------

Forked from [Huddle/PhantomFlow](https://github.com/Huddle/PhantomFlow) by [James Cryer](http://github.com/jamescryer) and the Huddle development team.
