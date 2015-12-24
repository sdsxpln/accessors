// Browser host implementation of host-specific functions.
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

/** Browser host implementation of host-specific functions.
 *  This module provides functions to generate a web page for an accessor.
 *  It relies on the /common/commonHost.js module, which it loads when needed.
 *
 *  As a side effect of invoking this, the window object for the web page
 *  acquires a field ```accessor``` whose value is the provided accessor
 *  instance with some additional utilities to support the web page.
 *
 *  @author Edward A. Lee
 *  @version $$Id$$
 */

'use strict';

/** Generate HTML from an accessor defined at the specified path.
 *  If the path is relative (does not begin with '/' or './'), then the accessor
 *  specification will be loaded from the accessor library stored on the host.
 *  If the path is absolute (beginning with '/'), then the accessor specification
 *  will be loaded from the web server providing this swarmlet host at that path.
 *  If the accessor defines an initialize() function, then this function will
 *  execute its initialize() function after generating the web page.
 *  @path The path to the accessor.
 *  @param id The id of the page element into which to insert the generated HTML.
 */
function generate(path, id) {
    var code = getAccessorCode(path);
    
    function reportError(error) {
       alert('Error interpreting specification at '
               + path
               + ': '
               + error);
    };
    // Load common/commonHost.js code asynchronously.
    require('/accessors/hosts/common/commonHost.js', function(error, commonHost) {
        if (error) {
            alert('Failed to load commonHost.js: ' + error);
        } else {
            // Function bindings for the accessor:
            var bindings = {
                'get': get,
                'getParameter': getParameter,
                'require': require,
                'send': send,
            };
            try {
                // The following will define a global variable 'accessor'
                // if it is not already defined.
                accessor = commonHost.instantiateFromCode(code, getAccessorCode, bindings);
            } catch(error) {
                reportError(error);
                return;
            }
        }        
        try {
            generateFromInstance(accessor, id);
            if ((typeof accessor.exports.initialize) === 'function') {
                accessor.exports.initialize();
            }
        } catch (error) {
            reportError(error);
            return;
        }
    });
}

/** Generate HTML from the specified accessor instance and insert it
 *  into the element on the page with the specified id.
 *  @param accessor An accessor instance created by common/commonHost.js.
 *  @param id The id of the page element into which to insert the generated HTML.
 */
function generateFromInstance(instance, id) {
    // Generate a table for parameters.
    if (instance.parameterList && instance.parameterList.length > 0) {
        generateTable("Parameters", 
                instance.parameterList, instance.parameters, "parameter", id);
    }
    // Generate a table for inputs.
    if (instance.inputList && instance.inputList.length > 0) {
        generateTable("Inputs", instance.inputList, instance.inputs, "input", id);
    }
    // Generate a table for outputs.
    if (instance.outputList && instance.outputList.length > 0) {
        generateTable("Outputs", instance.outputList, instance.outputs, "output", id);
    }
    // Generate a list of contained accessors, if any.
    generateListOfContainedAccessors(instance, id);

    // On the assumption that there is never more than one accessor
    // per web page, create or set a global variable 'accessor' that will
    // be available as a property of the window object.
    accessor = instance;
}

/** Generate HTML of accessors contained by the specified accessor instance and insert it
 *  into the element on the page with the specified id.
 *  This assumes that every accessor has a corresponding HTML page at the same
 *  location as the accessor.
 *  @param accessor An accessor instance created by common/commonHost.js.
 *  @param id The id of the page element into which to insert the generated HTML.
 */
function generateListOfContainedAccessors(instance, id) {
    if (instance.containedAccessors && instance.containedAccessors.length > 0) {
        var header = document.createElement('h2');
        header.innerHTML = 'ContainedAccessors';
        var target = document.getElementById(id);
        target.appendChild(header);

        var list = document.createElement('ol');
        target.appendChild(list);
        
        for (var i = 0; i < instance.containedAccessors.length; i++) {
            var containedInstance = instance.containedAccessors[i];
            var className = containedInstance.className;
            var listElement = document.createElement('li');
            list.appendChild(listElement);
            listElement.innerHTML = '<a href="' + className + '.html">' + className + '</a>';
        }
    }
}

/** Generate a table with the specified title and contents and
 *  append it to the element on the page with the specified id.
 *
 *  @param title The title for the table.
 *  @param names A list of field names in the contents object to include, in order.
 *  @param contents An object containing one field for each object to include.
 *  @param role One of 'input', 'output', or 'parameter'.
 *  @param id The id of the page element into which to insert the generated HTML.
 */
function generateTable(title, names, contents, role, id) {
    // Create header line.
    var header = document.createElement('h2');
    header.innerHTML = title
    var target = document.getElementById(id);
    target.appendChild(header);
    
    var table = document.createElement('table');
    // table.setAttribute('border', 1);
    table.setAttribute('width', '100%');
    
    var head = document.createElement('thead');
    table.appendChild(head);
    
    var titleRow = document.createElement('tr');
    head.appendChild(titleRow);
    
    var column = document.createElement('th');
    <!-- To not expand, use 1%. -->
    column.setAttribute('width', '1%');
    column.innerHTML = 'Name';
    titleRow.appendChild(column);
    
    column = document.createElement('th');
    column.setAttribute('width', '1%');
    column.innerHTML = 'Type';
    titleRow.appendChild(column);

    column = document.createElement('th');
    column.innerHTML = 'Value';
    titleRow.appendChild(column);
    
    var tbody = document.createElement('tbody');
    table.appendChild(tbody);

    target.appendChild(table);
    
    var editable = true;
    if (role === 'output') {
        editable = false;
    }
    
    for (var i = 0; i < names.length; i++) {
        var item = contents[names[i]];
        if (item) {
            if (item.visibility) {
                var visibility = item.visibility;
                if (visibility == 'notEditable') {
                    editable = false;
                } else if (visibility != 'full') {
                    continue;
                }
            }
            generateTableRow(
                    tbody,
                    names[i],
                    item,
                    role,
                    editable);
        }
    }
}

/** Generate a table row for an input, parameter, or output.
 *  @param table The element into which to append the row.
 *  @param name The text to put in the name column.
 *  @param options The options.
 *  @param role One of 'input', 'output', or 'parameter'.
 *  @param editable True to make the value an input element.
 */
function generateTableRow(table, name, options, role, editable) {
    var row = document.createElement("tr");
    
    // Insert the name.
    var nameCell = document.createElement("td");
    nameCell.innerHTML = name;
    row.appendChild(nameCell);
    
    // Insert the type.
    var typeCell = document.createElement("td");
    var type = options['type'];
    if (!type) {
        type = 'general';
    }
    typeCell.innerHTML = type;
    row.appendChild(typeCell);
    
    // Insert the value.
    var valueCell = document.createElement("td");
    var value = options['value'];
    if (!value) {
        value = '';
    }
    if (!editable) {
        valueCell.innerHTML = value;
        
        // Set a unique ID so that this input can be retrieved by the get()
        // or set by the send() function defined in local.js.
        valueCell.setAttribute('id', name + '-' + role);
    } else {
        var valueInput = document.createElement("input");
        
        // Set a unique ID so that this input can be retrieved by the get()
        // function defined in local.js.
        valueInput.setAttribute('id', name + '-' + role);

        valueInput.setAttribute('type', 'text');
        valueInput.setAttribute('name', name);
        valueInput.setAttribute('value', value);
        <!-- Song and dance here required to get table cell to stretch, but not overrun the border. -->
        valueInput.setAttribute('style', 'display:table-cell; width:100%; box-sizing: border-box;-webkit-box-sizing:border-box;-moz-box-sizing: border-box;');
        
        // Invoke handlers, if there are any.
        valueInput.setAttribute('onchange', 'window.accessor.invokeHandlers("' + name + '")');
                
        valueCell.appendChild(valueInput);
    }
    row.appendChild(valueCell);

    table.appendChild(row);
}

/** Get data from an input. This implementation assumes that the document
 *  has an element with attribute 'id' equal to ```name + '-input'```.
 *  Such an attribute is created by the generate() function.
 *  This implementation also assumes that the window object has a field
 *  ```accessor``` whose value is the accessor data structure generated by
 *  the instantiateFromCode() function of the common/commonHost.js module.
 *  @param name The name of the input (a string).
 *  @return The value received on the input, or null if no value is received.
 */
function get(name) {
    return getInputOrParameter(name, 'input');
}

/** Get data from an input or parameter. This is used by get() and getParameter().
 *  @param name The name of the input (a string).
 *  @param role One of 'input' or 'parameter'.
 *  @return The value received on the input, or null if no value is received.
 */
function getInputOrParameter(name, role) {
    var element = document.getElementById(name + '-' + role);
    if (!element) {
        alert('No ' + role + ' named ' + name);
        return null;
    }
    // Depending on the type, we should parse the input or parameter.
    if (!window.accessor) {
        // The accessor field of the window object has not been set, so
        // just interpret the value as a string.
        return element.value;
    } else {
        var options = window.accessor[role + 's'][name];
        if (!options) {
            // This could only occur is somehow the document has an element
            // with the right name, but there is no such input or parameter.
            alert('No record of ' + role + ' named ' + name);
            return null;
        }
        if (!options.type) {
            // The type is unspecified.
            // In this host, we attempt to parse it as JSON, and failing that
            // return a string. Note that we do not want to use eval(), as that
            // could create security risks.
            try {
                return JSON.parse(element.value);
            } catch(error) {
                return element.value;
            }
        } else if (options.type === 'string') {
            return element.value;
        } else {
            // Types JSON, boolean, int, and number should all be parsable
            // as JSON, so we proceed with parsing. This will throw an exception
            // if invalid JSON. Since null is invalid JSON, treat that specially.
            if (!element.value) {
                return null;
            }
            try {
                return JSON.parse(element.value);
            } catch(error) {
                alert('Invalid JSON on ' + role + ' named ' + name +': ' + element.value);
                return null;
            }
        }
    }
}

/** Return the text of an accessor definition from the accessor library on the host.
 *  This implementation appends the string '.js' to the specified path
 *  (if it is not already there) and retrieves from the server's accessor
 *  repository the text of the accessor specification.
 *  This is a blocking call.
 *
 *  @param path The path on the server for the JavaScript code, e.g. 'net/REST'.
 */
function getAccessorCode(path) {
    // Strip off a leading '/' if provided.
    while (path.indexOf('/') == 0) {
        path = path.substring(1);
    }
    // The second argument indicates a blocking call, and the third indicates
    // to look in the accessor directory, not in the modules directory.
    return getJavaScript(path, null, false);
}

/** Return the text of an accessor or module definition.
 *  This implementation appends the string '.js' to the specified path
 *  (if it is not already there) and issues an HTTP GET with the specified path.
 *  If the path begins with '/' or './', then it is used as is.
 *  Otherwise, depending on the third argument, it is prepended with the
 *  location of the directory in which accessors are stored ('/accessors' on this host)
 *  or the directory in which modules are stored ('/accessors/hosts/browswer/modules'
 *  on this host).
 *
 *  If not callback function is given, then this is a blocking request.
 *  It will not return until it has the text, and then will return that text.
 *  If a callback is given, then this will issue the HTTP get and return, and
 *  then later invoke the callback when the response has been completely received.
 *  The callback function will be passed two argument: an error string (or null if
 *  no error occurred) and the text of the response (or null if an error occurred).
 *  @param path The path on the server for the JavaScript code.
 *  @param callback The callback function.
 *  @param module True to look in the modules directory for paths that do not
 *   begin with '/' or './'. False (or omitted) to look in '/accessors'.
 */
function getJavaScript(path, callback, module) {
    var index = path.lastIndexOf('.js');
    if (index != path.length - 3) {
        path = path + '.js';
    }
    if (path.indexOf('/') !== 0 && path.indexOf('./') !== 0) {
        // A relative path is provided.
        // Convert this to an absolute path for either a module or an accessor.
        if (module) {
            path = '/accessors/hosts/browser/modules/' + path;
        } else if (path.indexOf('accessors/') != 0) {
            path = '/accessors/' + path;
        } else {
            path = '/' + path;
        }
    }
    var request = new XMLHttpRequest();
    request.overrideMimeType("application/javascript");
    if (!callback) {
        // Synchronous version.
        request.open('GET', path, false);   // Pass false for synchronous
        request.send();                         // Send the request now
        // Throw an error if the request was not 200 OK 
        if (request.status !== 200) {
                throw 'require() failed to get '
                        + path + ': ' + request.statusText;
        }
        return request.responseText;
    } else {
        // Asynchronous version.
        request.open('GET', path, true);    // Pass true for asynchronous
        request.onreadystatechange = function() {
            // If the request is complete (state is 4)
            if (request.readyState === 4) {
                // If the request was successful.
                if (request.status === 200) {
                    callback(null, request.responseText);
                } else {
                    callback('Failed to get '
                            + path
                            + ': ' + request.statusText,
                            null);
                }
            }
        };
        request.send();
    }
}

/** Get data from a parameter. This implementation assumes that the document
 *  has an element with attribute 'id' equal to ```name + '-parameter'```.
 *  Such an attribute is created by the generate() function.
 *  This implementation also assumes that the window object has a field
 *  ```accessor``` whose value is the accessor data structure generated by
 *  the instantiateFromCode() function of the common/commonHost.js module.
 *  @param name The name of the input (a string).
 *  @return The value of the parameter, or null if no value has been set.
 */
function getParameter(name) {
    return getInputOrParameter(name, 'parameter');
}

/** Return a module whose functionality is given in JavaScript at the specified path
 *  on the server. The path will be requested from the same server that served the page
 *  executing this script. If no callback function is given, the a synchronous
 *  (blocking) request will be made (best to avoid this in a web page).
 *  If a callback function is given, then after receiving and evaluating the
 *  JavaScript code, the callback function will be invoked.
 *
 *  If the path begins with a '/' or './', then it will be interpreted as the path
 *  to a resource provided by the web server serving this swarmlet host.
 *  Otherwise, it will be interpreted as the name of a module provided by this
 *  swarmlet host.
 * 
 *  The returned object includes any properties
 *  that have been added to the 'exports' property in the specified code.
 *  For example, if the module is to export a function, the code
 *  could define the function as follows:</p>
 *
 *  ```javascript
 *   exports.myFunction = function() {...};
 *  ```
 *
 *  Alternatively, the code can explicitly define
 *  the exports object as follows:
 *
 *  ```javascript
 *   var myFunction = function() {...};
 *   module.exports = {
 *       myFunction : myFunction
 *   };
 *  ```
 *
 *  This implementation is inspired by the requires() function implemented
 *  by Walter Higgins, found here:
 *
 *    https://github.com/walterhiggins/commonjs-modules-javax-script
 *
 *  @param path The code to fetch (a JavaScript file or module name).
 *  @param callback The callback function, which gets two arguments: an error
 *   message (or null if the request succeeded) and the response JavaScript text.
 *   If this argument is omitted or null, then the path is retrieved synchronously
 *   and either the JavaScript text will be returned or an exception will be thrown.
 *  @see http://nodejs.org/api/modules.html#modules_the_module_object
 *  @see also: http://wiki.commonjs.org/wiki/Modules
 */
function require(path, callback) {
    var evaluate = function(code) {
        // Create the exports object to be populated.
        var exports = {};
        
        // In strict mode, eval() cannot modify the scope of this function.
        // Hence, we wrap the code in the function, and will pass in the
        // exports object that we want the code to modify.
        var wrapper = eval('(function(exports) {' + code + '})');
    
        // Populate the exports field.
        wrapper(exports);
        
        return exports;
    };
    if (callback) {
        // The third argument states that unless the path starts with '/'
        // or './', then the path should be searched for in the modules directory.
        getJavaScript(path, function(error, code) {
            if (error) {
                callback(error, code);
            } else {
                callback(null, evaluate(code));
            }
        }, true);
    } else {
        // The third argument states that unless the path starts with '/'
        // or './', then the path should be searched for in the modules directory.
        var code = getJavaScript(path, null, true);
        return evaluate(code);
    }
}

/** Set an output.  This implementation assumes that the document
 *  has an element with attribute 'id' equal to ```name + '-output'```.
 *  Such an attribute is created by the generate() function.
 *  This implementation also assumes that the window object has a field
 *  ```accessor``` whose value is the accessor data structure generated by
 *  the instantiateFromCode() function of the common/commonHost.js module.
 *  @param name The name of the output (a string).
 *  @param value The value to set the output to.
 */
function send(name, value) {
    var element = document.getElementById(name + '-output');
    if (!element) {
        alert('No output named ' + name);
        return;
    }
    // Handle data types
    var options = window.accessor.outputs[name];
    if (!options) {
        // This could only occur is somehow the document has an element
        // with the right name, but there is no such input.
        alert('No record of output named ' + name);
        return null;
    }
    if (options.type === 'string') {
        element.innerHTML = value;
    } else {
        element.innerHTML = JSON.stringify(value);
    }
}
