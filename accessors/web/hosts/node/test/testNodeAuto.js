// @version: $$Id$$
// Run the tests in accessors/web/test/auto.
// To run this test, do:
//   sudo npm install -g mocha
//   mocha testNodeAuto.js
// or
//   cd accessors/web; ant tests.mocha.composites

var nodeHost = require('../nodeHost.js');
var fs = require('fs');

/** Run all the .js tests in a directory using mocha.
 *  It is expected that the .js file define composite accessors.
 *  @param auto The directory that contains the .js files.
 */
exports.testNodeAuto = function(auto) {
    console.log("testNodeAuto.js: testNodeAuto(" + auto + ")");
    var accessors;
    try {
	// If run in accessors/web/hosts/node/test/mocha/
	accessors = fs.readdirSync('../../../../' + auto);
    } catch (e) {
	// If run in accessors/web/
	accessors = fs.readdirSync(auto);
    }

    // describe() is a mocha function.
    describe('NodeHost' , function() {
	    //describe('testNodeAuto ' + auto.replace('/','.'), function () {
		    accessors.forEach(function(accessor) {
			    if (accessor.length > 3 && accessor.indexOf('.') > 0 && 
				accessor.endsWith('.js') &&
				accessor.indexOf('~') == -1 &&
				accessor.substring(0,4) != '.svn' &&
				accessor.substring(0,4) != '.log') {
				// mocha-junit-reporter creates a "classname" attribute 
				// with the value of the test name.  Unfortunately, Jenkins
				// uses any classname as the top level in the display
				// hierarchy.  So, we insert a "describe" with the test name
				// It would be better not to insert a classname attribute. 
				// Unfortunately, there is no option to omit it.  
				// Alternatively, we could post-process the file, modify
				// mocha-junit-reporter or try a different reporter.  
				// Tried mocha-jenkins-reporter, but it does not seem to 
				// generate a results file when passed a file path.
					// it() is a mocha function.
					it ('run accessors/web/' + auto + '/' + accessor + '\n', function (done) {
						var testAccessor = [ auto +'/' + accessor ];
						instantiateAndInitialize(testAccessor);
	                        
						var exception = null;
						process.once('uncaughtException', function(error) { 
							exception = error;
							done(error);
						    });
	                        
						setTimeout(function(){
							if (exception === null) {
							    done();
							}
						    }, 1000);
	                        
						// TODO:
						// What is the success criteria?  Lack of exception
						// e.g. from trainable test after certain amount of 
						// time?  any way to listen for a stop?
						// Node-host-specific solution here
	                        
						// Cancel timer in case of a stop?
					    });
			    }
			//});
	    });
	});
};