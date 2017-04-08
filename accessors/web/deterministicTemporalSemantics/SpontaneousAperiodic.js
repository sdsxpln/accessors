// Accessor for testing the deterministic temporal semantics.
//
// Copyright (c) 2016-2017 The Regents of the University of California.
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

/** This is a spontaneous accessor that fires spontaneously only once after
 *  1200 ms.
 *    
 *  @accessor deterministicTemporalSemantics/SpontaneousOnceAcc.js
 *  @output output The output, the number of times the accessor fired
 *  @author Chadlia Jerad
 *  @version $$Id: SpontaneousOnceAcc.js 1137 2016-12-06 22:13:55Z cxh $$
 */

// Stop extra messages from jslint.  Note that there should be no
// space between the / and the * and global.
/*globals console, error, exports, require */
/*jshint globalstrict: true*/
"use strict";

exports.setup = function () {
    this.realize('periodic', {
        'ontology': 'url'
    });
    this.output('output', {
        'type': 'number',
        'value': 0
    });
    this.parameter('synchronizationLabel', {
        'type': 'string',
        'value': 'SynchInitialization'
    });
    this.parameter('timeout', {
        'type': 'number',
        'value': 1000
    });
};

exports.initialize = function () {
    var numberOfFirings = 0;
    var thiz = this;

    thiz.setTimeout(function () {
        thiz.send('output', ++numberOfFirings);
        console.log(thiz.accessorName + " :: period = " + thiz.getParameter('timeout') +
            ' :: output = ' + thiz.latestOutput('output'));
    }, thiz.getParameter('timeout'), thiz.getParameter('synchronizationLabel'), thiz);
};
