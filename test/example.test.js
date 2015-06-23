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
            owner: "jojia",
            url: shellServiceEndpoint + "en-gb/shell/html/v1_1/testStore?headerId=testheader&footerId=testFooter",
            selector: ".shell-header-top",
            browserWidths: [1280, 520]
        },
        {
            name: "shellheadertop-noresponsive",
            owner: "jojia",
            url: shellServiceEndpoint + "en-us/shell/html/v1_1/testStore?headerId=testheader&footerId=testFooter&targeting=NoResponsive",
            selector: ".shell-header-top",
            browserWidths: [1600, 920]
        },
        {
            name: "shellheadernav",
            owner: "jojia",
            url: shellServiceEndpoint + "en-gb/shell/html/v1_1/testStore?headerId=testheader&footerId=testFooter",
            selector: "#srv_shellHeaderNav",
            // browsersWidths are [1280] by default
        },
        {
            name: "notificationInHeader",
            owner: "jojia",
            url: shellServiceEndpoint + "en-gb/shell/html/v1_1/testStore?headerId=testheader&footerId=testFooter",
            selector: "#lca-cookie-notification",
            browserWidths: [1280, 520]
        },
        {
            name: "subtitleInHeader",
            owner: "jojia",
            url: shellServiceEndpoint + "en-us/shell/html/v1_1/testStore?headerId=mainheaderlongsubtitle&footerId=testFooter",
            selector: ".shell-header-top",
            browserWidths: [1280, 900, 520, 320]
        },
        {
            name: "testFooter",
            owner: "jojia",
            url: shellServiceEndpoint + "en-us/shell/html/v1_1/testStore?headerId=mainheader&footerId=testFooter",
            selector: ".shell-footer",
            browserWidths: [1280, 520]
        },
    ];

    // Avoid putting white space to the names as the names would be the file path.
    flow("Test_UHF", function() {
        chance({
            "static_tests": function() { runStaticTests(staticTests); },
            "interactive_tests": function() {
                chance({
                    "case1": function() { step("testHeaderMenuL3Img", testHeaderMenuL3Img, 'jojia') },
                    "case2": function () { step("testHeaderMenuImg", testHeaderMenuImg, 'jojia') },
                    "case3": function () { step("testHeaderMenuL3_2col", testHeaderMenuL3_2col, 'jojia') },
                    "case4": function () { step("testHeaderMenuL3_3col", testHeaderMenuL3_3col, 'jojia') },
                    "case4": function () { step("testHeaderMenuL3_4col", testHeaderMenuL3_4col, 'jojia') },
                    "case5": function () { step("testHeaderMenuMobile", testHeaderMenuMobile, 'jojia') },
                    "case5": function () { step("testHeaderTopMobile", testHeaderTopMobile, 'jojia') },
                });
            }
        });
    });

    function testHeaderMenuL3Img() {
        casper.thenOpen(shellServiceEndpoint + "en-us/shell/html/v1_1/testStore?headerId=testHeadermulticoll3", function () {
            phantomCSS.turnOffAnimations();
            casper.viewport(1280, 768);
            casper.waitFor(function() {
                return document.readyState == "complete";
            }, function() {
                casper.click('a[role="menu"][data-bi-name="TestDropDown"]');
                casper.waitForSelector('.active>.shell-header-dropdown-content',
                    function success() {
                        casper.wait(1000);
                        phantomCSS.screenshot('.active>.shell-header-dropdown-content', 'shell-header-dropdown-content-l3img');
                        console.log('Should see MenuL3Img');
                    }
                );
            });
        });
    }

    function testHeaderMenuImg() {
        casper.thenOpen(shellServiceEndpoint + "en-us/shell/html/v1_1/testStore?headerId=testHeadermulticoll3&testcase=2", function() {
            phantomCSS.turnOffAnimations();
            casper.viewport(1280, 768);
            casper.waitFor(function() {
                return document.readyState == "complete";
            }, function() {
                casper.click('a[role="menu"][data-bi-name="TestDropDown"]');
                casper.waitForSelector('.active>.shell-header-dropdown-content',
                    function success() {
                        casper.click('a[role="menuitem"][data-bi-name="WatchAnywhere"]');
                        casper.waitForSelector('a[data-bi-name="WatchAnywhere_TabImage"]',
                            function success() {
                                casper.wait(1000);
                                phantomCSS.screenshot('.active>.shell-header-dropdown-content', 'shell-header-dropdown-content-img');
                                console.log('Should see MenuImg');
                            }
                        );
                    }
                );
            });
        });
    }

    function testHeaderMenuL3_2col() {
        casper.thenOpen(shellServiceEndpoint + "en-us/shell/html/v1_1/testStore?headerId=testHeadermulticoll3", function() {
            phantomCSS.turnOffAnimations();
            casper.viewport(1280, 768);
            casper.waitFor(function() {
                return document.readyState == "complete";
            }, function() {
                casper.click('a[role="menu"][data-bi-name="TestDropDown"]');
                casper.waitForSelector('.active>.shell-header-dropdown-content',
                    function success() {
                        casper.click('#ServerAndCould');
                        casper.waitForSelector('a[data-bi-name="AllServerAndCloud"]',
                            function success() {
                                casper.wait(1000);
                                phantomCSS.screenshot('.active>.shell-header-dropdown-content', 'shell-header-dropdown-content-l3-2col');
                                console.log('Should see L3 menu items in 2 column');
                            }
                        );
                    }
                );
            });
        });
    }

    function testHeaderMenuL3_3col() {
        casper.thenOpen(shellServiceEndpoint + "en-us/shell/html/v1_1/testStore?headerId=testHeadermulticoll3", function () {
            phantomCSS.turnOffAnimations();
            casper.viewport(1000, 768);
            casper.waitFor(function () {
                return document.readyState == "complete";
            }, function () {
                casper.click('a[role="menu"][data-bi-name="Dev Center"]');
                casper.waitForSelector('.active>.shell-header-dropdown-content',
                    function success() {
                        casper.wait(1000);
                        phantomCSS.screenshot('.active>.shell-header-dropdown-content', 'shell-header-dropdown-content-l3-3col');
                        console.log('Should see MenuL3 in 3 columns');
                    }
                );
            });
        });
    }

    function testHeaderMenuL3_4col() {
        casper.thenOpen(shellServiceEndpoint + "en-us/shell/html/v1_1/testStore?headerId=testHeadermulticoll3", function() {
            phantomCSS.turnOffAnimations();
            casper.viewport(1280, 768);
            casper.waitFor(function() {
                return document.readyState == "complete";
            }, function() {
                casper.click('a[role="menu"][data-bi-name="Dev Center"]');
                casper.waitForSelector('.active>.shell-header-dropdown-content',
                    function success() {
                        casper.wait(1000);
                        phantomCSS.screenshot('.active>.shell-header-dropdown-content', 'shell-header-dropdown-content-l3-3col');
                        console.log('Should see MenuL3 in 4 columns');
                    }
                );
            });
        });
    }

    function testHeaderMenuMobile() {
        casper.thenOpen(shellServiceEndpoint + "en-us/shell/html/v1_1/testStore?headerId=testHeadermulticoll3", function() {
            phantomCSS.turnOffAnimations();
            casper.viewport(520, 768);
            casper.waitFor(function() {
                return document.readyState == "complete";
            }, function() {
                casper.click('.shell-header-toggle-menu');
                casper.waitForSelector('.expanded',
                    function success() {
                        phantomCSS.screenshot('#srv_shellHeaderNav', 'expanded-menu');
                        console.log('Should see menu in narrow screen');
                    },
                    function fail() {
                        casper.test.fail('No menu in narrow screen');
                    }
                );
            });
        });
    }

    function testHeaderTopMobile() {
        casper.thenOpen(shellServiceEndpoint + "en-us/shell/html/v1_1/testStore?headerId=mainheader", function () {
            phantomCSS.turnOffAnimations();
            casper.viewport(520, 768);
            casper.waitFor(function () {
                return document.readyState == "complete";
            }, function () {
                casper.click('.shell-header-toggle-menu');
                casper.waitForSelector('.expanded',
                    function success() {
                        phantomCSS.screenshot('.shell-header-top', 'expanded-top');
                        console.log('Should see Me control in narrow screen');
                    },
                    function fail() {
                        casper.test.fail('No Me control in narrow screen');
                    }
                );
            });
        });
    }
}());