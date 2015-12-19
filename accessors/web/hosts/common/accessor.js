// JavaScript functions to be shared among accessor hosts.
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
 
/** Return an accessor instance whose interface and functionality is given by the
 *  specified code. Specifically, the returned object includes the following
 *  fields:
 *
 *  * '''exports''': An object that includes any properties that have have been
 *    explicitly added to the exports property in the specified code.
 *  * '''inputList''': An array of input names (see below).
 *  * '''inputs''': An object with one field per input (see below).
 *  * '''outputList''': An array of output names (see below).
 *  * '''outputs''': An object with one field per output (see below).
 *  * '''parameterList''': An array of parameter names (see below).
 *  * '''parameters''': An object with one field per parameter (see below).
 *  * '''inputHandlers''': An object indexed by input name with
 *    an array of input handlers, each of which is a function.
 *  * '''anyInputHandlers''': An array of input handlers to be invoked
 *    when any input arrives (the name argument of addInputHandler is null).
 *  * '''inputHandlersIndex''': An object indexed by handler id (returned
 *    by addInputHandler()) that contains objects of the form
 *    {'name': nameOfInput, 'index': arrayIndexOfHandler}.
 *    This is used by removeInputHandler(). If the handler is one
 *    for any input, then nameOfInput is null.
 *
 *
 *  Inputs, outputs, and parameters in an accessor have a defined order.
 *  The ```inputList``` field is an array giving the name of each input in the order in which
 *  it is defined in the setup() function.  For each entry in that array, there is a
 *  field by that name in the ```inputs``` object. The value of that field is the
 *  options object given to the ```input()``` function, or an empty object if no
 *  options were specified.  Similarly, parameters and outputs are represented in the
 *  data structure by an array of names and an object with the options values.
 *
 *  @module socket
 *  @authors: Edward A. Lee
 */
exports.accessor = function(code) {
    if (!code) {
        throw 'No accessor code specified.';
    }
    // CommonJS specification requires a 'module' object with an 'id' field
    // and an optional 'uri' field. The spec says that module.id should be
    // a valid argument to require(). Here, we are just given the JavaScript
    // code, so we don't have any information about where it came from.
    // Hence, we set a default id to 'unspecified', with the expectation that the
    // code passed in will override that, and possibly the uri.
    var module = {'id': 'unspecified'};

    // Define the object to be populated by the accessor code with functions
    // such as setup(), initialize(), etc.
    var exports = {};
    
    ////////////////////////////////////////////////////////////////////
    //// Define the functions that define inputs and input handlers
    
    // Inputs, outputs, and parameters need to be able to be accessed two ways,
    // by name and in the order they are defined. Hence, we define two data
    // structures for each, one of which is an ordered list of names, and one
    // of which is an object with a field for each input, output, or parameter.
    var inputList = [];
    var inputs = {};
    
    /** Define an accessor input.
     */
    function input(name, options) {
        inputList.push(name);
        inputs[name] = options || {};
    }

    var inputHandlers = {};
    var anyInputHandlers = [];
    var inputHandlersIndex = {};
    
    /** Add an input handler for the specified input and return a handle that
     *  can be used to remove the input handler.
     *  If no name is given (the first argument is null or a function), then the
     *  function will be invoked when any input changes.
     *  If more arguments are given beyond the first two (or first, if the function
     *  is given first), then those arguments
     *  will be passed to the input handler function when it is invoked.
     *  @param name The name of the input (a string).
     *  @param func The function to be invoked.
     *  @param args Additional arguments to pass to the function.
     *  @return An ID that can be passed to removeInputHandler().
     */
    function addInputHandler(name, func) {
        var argCount = 2, callback, id, tail;
        if (name && typeof name !== 'string') {
            // Tolerate a single argument, a function.
            if (typeof name === 'function') {
                func = name;
                name = null;
                argCount = 1;
            } else {
                throw ('name argument is required to be a string. Got: ' + (typeof name));
            }
        }
        if (!func) {
            func = nullHandlerFunction;
        } else if (typeof func !== 'function') {
            throw ('Argument of addInputHandler is not a function. It is: ' + func);
        }

        // Check that the input exists.
        if (!inputs[name]) {
            throw 'Cannot add an input handler to a non-existent input: ' + name;
        }

        // If there are arguments to the callback, create a new function.
        // Get an array of arguments excluding the first two.
        // When that function is invoked, the exports data structure will be 'this'.
        tail = Array.prototype.slice.call(arguments, argCount);
        if (tail.length !== 0) {
            callback = function() {
                func.apply(exports, tail);
            };
        } else {
            callback = func.bind(exports);
        }
        // Need to allow more than one handler and need to return a handle
        // that can be used by removeInputHandler.
        var index;
        if (name) {
            if (! inputHandlers[name]) {
                inputHandlers[name] = [];
            }
            index = inputHandlers[name].length;
            inputHandlers[name].push(callback);
        } else {
            index = anyInputHandlers.length;
            anyInputHandlers.push(callback);
        }
        var result = inputHandlerID;
        inputHandlersIndex[inputHandlerID++] = {
            'name': name,
            'index': index
        };
        return result;
    }
    
    /** Remove the input handler with the specified handle, if it exists.
     *  @param handle The handle.
     *  @see #addInputHandler()
     */
    function removeInputHandler(handle) {
        var handler = inputHandlersIndex[handle];
        if (handler) {
            if (handler.name) {
                if (inputHandlers[handler.name]
                        && inputHandlers[handler.name][handler.index]) {
                    inputHandlers[handler.name][handler.index] = null;
                }
            } else {
                // Handler is set up to handle any input.
                if (anyInputHandlers[handler.index]) {
                    anyInputHandlers[handler.index] = null;
                }
            }
            inputHandlersIndex[handle] = null;
        }
    }
    
    /** Default empty function to use if the function argument to
     *  addInputHandler is null.
     */
    function nullHandlerFunction() {}

    ////////////////////////////////////////////////////////////////////
    //// Define the functions that define outputs and parameters.
    
    var outputList = [];
    var outputs = {};
    
    /** Define an accessor output.
     */
    function output(name, options) {
        outputList.push(name);
        outputs[name] = options || {};
    }

    var parameterList = [];
    var parameters = {};
    
    /** Define an accessor parameter.
     */
    function parameter(name, options) {
        parameterList.push(name);
        parameters[name] = options || {};
    }

    ////////////////////////////////////////////////////////////////////
    //// Evaluate the accessor code using the above function definitions

    // In strict mode, eval() cannot modify the scope of this function.
    // Hence, we wrap the code in the function, and will pass in the
    // exports object that we want the code to modify.
    // Inside that function, references to top-level accessor functions
    // such as input() will need to be bound to the particular implementation
    // of input() within this accessor function, so that that function
    // updates the proper field of this function.
    var wrapper = eval('(function(addInputHandler, exports, input, removeInputHandler) {'
            + code
            + '})');
    
    // Populate the exports field.
    wrapper(addInputHandler, exports, input, removeInputHandler);
        
    ////////////////////////////////////////////////////////////////////
    //// Evaluate the setup() function to populate the structure.
    
    if (typeof exports.setup === 'function') {
        exports.setup();
    } else {
        throw 'No setup() function.';
    }
    
    ////////////////////////////////////////////////////////////////////
    //// Construct and return the final data structure.

    return {
        'anyInputHandlers': anyInputHandlers,
        'exports': exports,
        'inputHandlers': inputHandlers,
        'inputHandlersIndex': inputHandlersIndex,
        'inputList' : inputList,
        'inputs': inputs,
        'module': module,
        'outputList' : outputList,
        'outputs': outputs,
        'parameterList' : parameterList,
        'parameters': parameters,
    };
}

// Counter used to assign unique IDs to each input handler.
var inputHandlerID = 0;


