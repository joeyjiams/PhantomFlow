/*
	Require and initialise PhantomCSS module
	Paths are relative to CasperJs directory
*/
(function () {

    /*
		Test cases include static tests and interaction tests.
        Register static test cases in the staticTests object
        Write interaction tests and put them in chance and step.
	*/

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
            selector: ".some-css-selector",
            browserWidths: [1600, 920] 
        },*/
    ];

    // Avoid putting white space to the names as the names would be the file path.
    flow('Test_Suite_Name', function() {
        chance({
            'static_tests': function() { runStaticTests(staticTests); },
            'interactive_tests': function() {
                chance({
                    'case1': function() { step('testMenu', testMenu, 'foo') },
                    //'case2': function () { step('testX', testX, 'bar') },
                });
            }
        });
    });

    function testMenu() {
        casper.thenOpen(setting.msEndpoint + 'en-us/store/apps', function () {
            phantomCSS.turnOffAnimations();
            casper.viewport(1280, 768);
            casper.waitFor(function() {
                return document.readyState == 'complete';
            }, function() {
                casper.click('a[role="menu"][data-bi-slot="5"]');
                casper.waitForSelector('.active>.shell-header-dropdown-content',
                    function success() {
                        casper.wait(1000);
                        phantomCSS.screenshot('.active>.shell-header-dropdown-content', 'menu-dropdown');
                        console.log('Should see dropdown menu');
                    }
                );
            });
        });
    }
}());