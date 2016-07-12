// Automatic test script for the browser host, using node.js execution platform.
//
// Copyright (c) 2015 The Regents of the University of California.
// All rights reserved.

// Permission is hereby granted, without written agreement and without
// license or royalty fees, to use, copy, modify, and distribute this
// software and its documentation for any purpose, provided that the above
// copyright notice and the following two paragraphs appear in all copies
// of this software.

// IN NO EVENT SHALL THE UNIVERSITY OF CALIFORNIA BE LIABLE TO ANY PARTY
// FOR DIRECT, INDIRECT, SPECIAL, INCIDENTAL, OR CONSEQUENTIAL DAMAGES
// ARISING OUT OF THE USE OF THIS SOFTWARE AND ITS DOCUMENTATION, EVEN IF
// THE UNIVERSITY OF CALIFORNIA HAS BEEN ADVISED OF THE POSSIBILITY OF
// SUCH DAMAGE.

// THE UNIVERSITY OF CALIFORNIA SPECIFICALLY DISCLAIMS ANY WARRANTIES,
// INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. THE SOFTWARE
// PROVIDED HEREUNDER IS ON AN "AS IS" BASIS, AND THE UNIVERSITY OF
// CALIFORNIA HAS NO OBLIGATION TO PROVIDE MAINTENANCE, SUPPORT, UPDATES,
// ENHANCEMENTS, OR MODIFICATIONS.

/** Automatic test script for the browser host, using node.js execution platform.  
 *  This script:
 *  Starts the test server (for serving accessor files), 
 *  Loads and runs composite accessor test files, 
 *  Loads and runs Mocha test files, 
 *  And saves the result to a file.
 *  
 *  The script will search for an open port to start the test server on.
 *  This script currently requires the Firefox browser.
 *  
 *  To run, first install the selenium-webdriver module:
 *  npm install -g selenium-webdriver
 *  
 *  Then,
 *  node regressionTestScript.js
 *  
 *  The Firefox driver is installed by default.  For other browsers, install
 *  the driver and edit the script to refer to your preferred browser.
 *  NOTE:  The default driver is NOT compatible with Firefox versions 47 and up.
 *  https://www.npmjs.com/package/selenium-webdriver
 *  
 *  Results will be printed to the console, and saved at:
 *  /accessors/web/reports/junit/browserTestResults.xml
 *  
 *  For more details and examples, please see the wiki:
 *  https://www.terraswarm.org/accessors/wiki/Version0/RegressionTesting
 */

var childProcess = require('child_process');
var fs = require('fs');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var startPort = 8089;

/** A class for running regression tests in the browser.  This class starts a
 *  web server, starts the selenium browser driver, then runs tests in the 
 *  accessor tree.  Please see:
 *  https://www.terraswarm.org/accessors/wiki/Version0/RegressionTesting
 */
var RegressionTester = (function() {
	
	// /test/auto/mocha directories contain Mocha test files.
	// For these, a Test accessor is instantiated to load the file.
	
	// /test/auto directories contain composite accessors which
	// constitute tests.  These are instantiated and run.  Lack of 
	// exception means pass.
	
	// TODO:  Search for matching directories instead of hardcoding names.
	var resultsFilePath = "../../../reports/junit/browserTestResults.xml";
	
	var compositeDirs = ["test/auto", "net/test/auto"];
	var mochaDirs = ["hosts/browser/test/auto/mocha"];
	var accessors = [];
	var filenames = [], testNames = [];
	
	var compositeResults = [];
	var compositeFailureCount = 0;
	var mochaResults = [];
    
    var port = 8089;
    var maxPort = 8200;
    
    var process;
    var runTimeLimit = 10000;  // Run time limit for composite accessors under test.
    var waitTimeLimit = 5000;  // Amount of time to wait for a react to inputs button.

    var webdriver = require('selenium-webdriver'),
    By = require('selenium-webdriver').By,
    until = require('selenium-webdriver').until;

    var driver = new webdriver.Builder()
    	    .forBrowser('chrome')
    	    .build();
    
    var compositeTester; 
    var mochaTester; 
    
    /** A class for running composite accessor tests.
     * 
     */
    function CompositeTester() {
    	// Call super constructor.
    	EventEmitter.call(this);
    };
    util.inherits(CompositeTester, EventEmitter);
    
    /** Run all composite accessor tests in the directories specified. 
     * Emit a 'complete' event when finished.
     * 
     * @param dirs Directories containing composite accessor tests.
     */
    CompositeTester.prototype.run = function(dirs){
    	accessors = getFileNames(dirs);
    	compositeFailureCount = 0;
    	compositeResults = [];
	    
	    // Run tests sequentially.
	    this.runNextTest(0, port);
    }
    
    /** Run a test, waiting until the previous test has completed.  This allows
     * running tests sequentially so that only one browser driver instance is 
     * needed.  If this is too slow, in the future, we could use a pool of 
     * drivers or consider Selenium Grid.  Recursive.
     * http://www.seleniumhq.org/projects/grid/
     * 
     * @param count  The array index of the test.
     * @param accessors  An array of composite accessors to test.
     * @param driver  The browser driver.
     */
    CompositeTester.prototype.runNextTest = function(count, port) {
    	var self = this;
    	
    	var testPromise = new Promise(function(resolve, reject) {
    		var testAccessor = accessors[count];
               
	        if (accessors.length < 1) {
	        	resolve('No accessors');
	        } else {

            	// Write an HTML file that instantiates the accessor.
    			// Reloading the page for each accessor will wrapup any 
	        	// previously instantiated accessors.
    			    
    			var beginText = "<!DOCTYPE html> \n" + 
    			   	"<html lang=\"en\"> \n" + 
    			    "<head>\n" + 
    			    "<meta charset=\"utf-8\"> \n" + 
    			    "<title>Composite Test Template </title> \n" + 
    			    "<!-- Load accesor stylesheet and browser host. --> \n" + 
    			    "<link rel=\"stylesheet\" type=\"text/css\" href=\"/accessors/hosts/browser/accessorStyle.css\"> \n" +    
    			    "<script src=\"/accessors/hosts/browser/browser.js\"></script>" + 
    			    "</head>" + 
    			    "<body>";
    			    
    			var divText = "";
    			    
    			var endText = "</body> \n" + 
    			    "</html>";
 
                    divText =  "<div class=\"accessor\" " +
        			"src=\"" + testAccessor + "\" " +
        			"id=\"" + testAccessor + "\"></div>";
                		   
                fs.writeFile('compositeTest.html', beginText + divText + endText, function(err) {
                	if (err) {
                		reject('Error instantiating ' + testAccessor);
                	} else {
                		driver.get("http://localhost:" + port + "/accessors/hosts/browser/test/compositeTest.html");
                			
                		// Wait until page has loaded, then click react to 
                		// inputs (if present).
                		driver.wait(function() {
                			return driver.isElementPresent(By.id('reactToInputs'));
                		}, waitTimeLimit).then(function() {
                			driver.findElement(By.id('reactToInputs')).click();
                		}).catch(function(err){
                			// This is OK.  Not all accessors have a
                			// reactToInputs button (e.g. spontaneous).
                		});
                       
                		// Let the accessor run for the specified time.
                		// TODO:  How to define when accessor is done?
                        setTimeout(function() {
                        	driver.isElementPresent(By.className('accessorError'))
                        		.then(function(found) {
                        			if (found) {
                            			compositeFailureCount ++;
                            			console.log(testAccessor + ' failed');
                            			// driver.findElement(By.id('Test.result')).getText()
                            			driver.findElement(By.className('accessorError')).getText().then(function(text){
                            				compositeResults.push({accessor: testAccessor, message : text, passed : false});
                            				resolve(testAccessor + ' failed');
                            			}).catch(function(err) {
                            				console.log(err);
                            				compositeResults.push({accessor: testAccessor, message : 'Unknown failure', passed : false});
                            				resolve(testAccessor + ' failed');
                            			});
                                    
                        			} else {
	                                	console.log(testAccessor + " passed");
	                                	compositeResults.push({accessor : testAccessor, message : 'passed', passed : true});
	                                	resolve(testAccessor + ' passed');
                        			}
                        	}, function() {
                                		console.log(testAccessor + " passed");
                                		compositeResults.push({accessor : testAccessor, message : 'passed', passed : true});
                                		resolve(testAccessor + ' passed');
                        		});                 		
                        	}, runTimeLimit);
                        } 
                	});
            }
    	}).then(function(){
    		if (count < accessors.length - 1) {
    			self.runNextTest(count + 1, port);
    		} else {        
    			// Delete the temporary file.
    			 fs.stat('compositeTest.html', function (err) {
    				   if (err) {
    				       // OK.  Might not be any composite tests.
    				   } else {
    					   fs.unlink('compositeTest.html');
    				   }
    				});
    	    	self.emit('complete');
    		}
    	}).catch(function(err) {
    		console.log('Error running tests ' + err);
    	});
    }
    
    /** A class for running mocha test files.
     * 
     */
    function MochaTester() {
    	// Call super constructor.
    	EventEmitter.call(this);
   
    };
    util.inherits(MochaTester, EventEmitter);
    
    /** Run all mocha tests in the directories specified. 
     * Emit a 'complete' event when finished.
     * 
     * @param dirs Directories containing mocha tests.
     */
    MochaTester.prototype.run = function(dirs){
    	mochaResults = [];
    	
    	testNames = getFileNames(dirs);

	    if (testNames.length > 0) {
	    	this.runNextTest(0, port);
	    } else {
	    	this.emit('complete');
	    }
	};
	
	/** Run a Mocha test, waiting until the previous test has completed, using 
	 * the specified port on localhost to request accessor files.  This allows
     * running tests sequentially so that only one browser driver instance is 
     * needed.  Recursive.
	 *  
	 *  @param count The index of the next test file in the testNames array.
	 *  @param port The port on localhost to request accessor files from.
	 */
	MochaTester.prototype.runNextTest = function(count, port) {
		var self = this;
    	var testPromise = new Promise(function(resolve, reject) {
        	
	    	var testName = testNames[count];
	    	console.log('Testing ' + testName);
	    	
			driver.get("http://localhost:" + port + "/accessors/hosts/browser/test/regressionTest.html");
			
			// Wait until page has loaded.
			driver.wait(function() {
				return driver.isElementPresent(By.id('reactToInputs'));
			}, 10000).then(function() {
				// Set test file name and output URL, including the port.
				
				driver.findElement(By.id('MochaTest.testFile')).clear();
				driver.findElement(By.id('MochaTest.testFile')).sendKeys('/accessors/' + testName);
				driver.findElement(By.id('reactToInputs')).click();
				
				// Wait for output, by checking if output text box contains 
				// contains something (here, check for 'xml' which is always 
				// part of the result).
				
				driver.wait(function() {
					return until.elementTextContains(By.id('MochaTest.result'), 'xml')
				}, 10000).then(function() {
					driver.findElement(By.id('MochaTest.result')).getText()
						.then(function(text) {
							console.log(text);
							mochaResults.push({'testName':testName, 'result':text});
							resolve('done');
						}).catch(function(err){
							reject('Error: Result text not found.');
						});
					}).catch(function(err){
						reject('Error: Result element not found.');
					});
				}).catch(function(err){
					// Mocha tests should always have a react to inputs button, for
					// the file name input.
					reject('Error: No react to inputs button.');
				});	// end wait until page has loaded
		
	    	}).then(function(outcome){
	    		if (count < testNames.length - 1){
	    			self.runNextTest(count + 1, port);
	    		} else {
	    			self.emit('complete');
	    		}
	    	}).catch(function(err){
	    		console.log(err);
	    		self.emit('error');
	    	});
	
    };
    
	/** Return file names in the given directories.
	 * 
	 * @param dirs The directories to return filenames from.
	 */
	function getFileNames(dirs) {
    	var fileNames = [];
    	var validNames = [];

	    dirs.forEach(function(directory) {
	        
	        try {
	        // If run in accessors/web/hosts/browser/test
	        	fileNames = fs.readdirSync('../../../' + directory);		        	
	        	fileNames.forEach(function(name) {
	        		if (name.length > 3 && name.substring(0,4) != '.svn' &&
	    	    			name.substring(0,4) != '.log') {
	        			validNames.push(directory + "/" + name);
	        		}	
	        	});
	        	
	        } catch (e) {
	            // If run in accessors/web/
	        	fileNames = fs.readdirSync('../../../' + directory);		        	
	        	fileNames.forEach(function(name) {
	        		if (name.length > 3 && name.substring(0,4) != '.svn' &&
	    	    			name.substring(0,4) != '.log') {
	        			validNames.push(directory + "/" + name);
	        		}	
	        	});
	        }
	    });
	        return validNames;
	}

	/** Run the test server script, executing the given callback once the script 
	 * From http://stackoverflow.com/questions/22646996/how-do-i-run-a-node-js-script-from-within-another-node-js-script
	 * 
	 * @param scriptPath The full path of the testServer script.
	 * @param port The port to start the server on.
	 */

	var run = function(scriptPath, desiredPort) {
		
		port = desiredPort;
		process = childProcess.fork(scriptPath, [port]);
	    	    
		compositePasses = [];	// An array of accessor names.
		compositeFailures = []; // And array of objects {accessor, message}.

	    compositeTester = new CompositeTester(compositeDirs);
	    mochaTester = new MochaTester();
		

		// Check for port in use error.  If this happens, increment the port and
		// try again.  
		process.on('message', function(message) {		
			if (message === 'listening') {
				
				// Run composite accessor tests.  Lack of an exception means 
				// pass.  Mocha tests will be run upon completion.  
				compositeTester.run(compositeDirs);
				
			} else if (message === 'portError') {
				if (port < maxPort) {
					run(scriptPath, port + 1);
				} else {
					throw Error('Regression test cannot find open port after maximum tries.');
				}
			} 
		});  
		
		// Register an event handler to run Mocha tests upon completion of
		// composite accessor tests.
		compositeTester.on('complete', function() {
			mochaTester.run(mochaDirs);
		}).on('error', function(){
	        driver.quit();
	        process.kill('SIGINT');
		});
		
	    // Register an event handler to close the driver upon test completion.
	    mochaTester.on('complete', function(){
	        driver.quit();
	        process.kill('SIGINT');
	        writeResults(resultsFilePath);
	    }).on('error', function(){
	        driver.quit();
	        process.kill('SIGINT');
	    });
	    
	}; 
	
	/** Write the results to the specified file, overwriting any existing file.
	 * 
	 * @param filepath The name and path of the file.
	 */
	var writeResults = function(filepath) {
		try {
			var writeStream = fs.createWriteStream(filepath);
			var testCount = 0;
			var failureCount = 0;
			
			// Count total number of tests and number of failed tests.
			mochaResults.forEach(function(resultObject){
				testCount += (resultObject.result.match(/<testcase/g) || []).length;
				failureCount += (resultObject.result.match(/<failure/g) || []).length;
			});
			
			testCount += compositeResults.length;
			failureCount += compositeFailureCount;
			
			writeStream.write("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
			writeStream.write("<testsuites>\n");
			writeStream.write("<testsuite name=\"BrowserHost\" tests=\"" + 
					testCount + "\" failed=\"" + 
					failureCount + "\">\n");
			
			if (compositeResults.length > 0) {
				writeStream.write("<testsuite name=\"Composite Accessor Tests\">\n");
				compositeResults.forEach(function(result){
					writeStream.write("<testcase name=\"" + result.accessor + "\>\n");
					if (!result.passed) {
						writeStream.write("<failure message=\"" + result.message +
								"\"/>\n");
					}
					writeStream.write("</testcase>\n");
				});
				writeStream.write("</testsuite>\n");
			}
			
			if (mochaResults.length > 0) {
				writeStream.write("<testsuite name=\"Mocha Tests\">\n");
				
				
				// Mocha results are already in XML format.  Extract needed portion.
				var beginIndex = 0;
				var endIndex = 0;
				mochaResults.forEach(function(resultObject){
					
					// Write to file everything in between
					// <testsuite name="BrowserHost" ... > and last instance of
					// </testsuite>
					// Find first instance of <testsuite> and last instance of
					// </testsuites>.  Copy everything in between.
					beginIndex = resultObject.result.indexOf("<testsuite name=\"BrowserHost\"");
					if (beginIndex > 0) {
						beginIndex = resultObject.result.indexOf(">", beginIndex);
						if (beginIndex > 0) {
							endIndex = resultObject.result.lastIndexOf("</testsuite>");
							if (endIndex > 0) {
								writeStream.write(resultObject.result.substring(beginIndex + 1, endIndex));
							}
						}
					}
				});
				writeStream.write("</testsuite>");	// Closing tag Mocha Tests
			}
			
			writeStream.write("</testsuite>\n");	// Closing tag BrowserHost
			writeStream.write("</testsuites>\n");
			
			
		}
		catch(err){
			console.log("Error writing test results to " + filepath);
			console.log(err);
		}
	};
	
	return {
		run : run
	};
}());

RegressionTester.run('./testServer.js', startPort);








