// Test accessor inheritance.
//
// Copyright (c) 2015-2016 The Regents of the University of California.
// All rights reserved.
//
// Permission is hereby granted, without written agreement and without
// license or royalty fees, to use, copy, modify, and distribute this
// software and its documentation for any purpose, provided that the above
// copyright notice and the following two paragraphs appear in all copies
// of this software.
//
// IN NO EVENT SHALL THE UNIVERSITY OF CALIFORNIA BE LIABLE TO ANY PARTY
// FOR DIRECT, INDIRECT, SPECIAL, INCIDENTAL, OR CONSEQUENTIAL DAMAGES
// ARISING OUT OF THE USE OF THIS SOFTWARE AND ITS DOCUMENTATION, EVEN IF
// THE UNIVERSITY OF CALIFORNIA HAS BEEN ADVISED OF THE POSSIBILITY OF
// SUCH DAMAGE.
//
// THE UNIVERSITY OF CALIFORNIA SPECIFICALLY DISCLAIMS ANY WARRANTIES,
// INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE. THE SOFTWARE
// PROVIDED HEREUNDER IS ON AN "AS IS" BASIS, AND THE UNIVERSITY OF
// CALIFORNIA HAS NO OBLIGATION TO PROVIDE MAINTENANCE, SUPPORT, UPDATES,
// ENHANCEMENTS, OR MODIFICATIONS.
//

/** Test inheritance (this.extend() function and overrides).
 *  This modifies the base class so that on the 'jsonOfUntyped' output it produces
 *  the string 'hello', a string defined in a variable defined in the base class.
 *  This tests the ability to access variables defined in the base class and the
 *  ability to override functions defined and used in the base class.
 *
 *  @accessor test/TestInheritance
 *  @author Edward A. Lee
 *  @version $$Id$$
 */

// Stop extra messages from jslint.  Note that there should be no
// space between the / and the * and global.
/*globals console, error, exports, require */
/*jshint globalstrict: true*/
"use strict";

exports.setup = function () {
    this.extend('test/TestAccessor');
};

exports.initialize = function () {
    // Test ability to invoke superclass function from overridden function.
    this.ssuper.initialize();
};

/** Override the base class to use output a constant read from the base class. */
exports.formatOutput = function (value) {
    // Variable 'variable' is defined in the base class.
    // Note that the base class invokes this function with 'this' bound to the
    // exports property, of which variable is a property.
    return this.variable;
};
