var fs = require('fs');
var path = require('path');

Mobile('log').call("Running accessor on Android!");

var commonHost = require('./commonHost');
var accessorPath = [path.join(__dirname)];
var accessors;
getAccessorCode = function(name) {
    var code;
    // Append a '.js' to the name, if needed.
    if (name.indexOf('.js') !== name.length - 3) {
        name += '.js';
    }
    for (var i = 0; i < accessorPath.length; i++) {
        var location = path.join(accessorPath[i], name);
        try {
            code = fs.readFileSync(location, 'utf8');
            console.log('Reading accessor at: ' + location);
        } catch(error) {
            console.log(error);
            continue;
        }
    }
    if (!code) {
        throw('Accessor ' + name + ' not found on path: ' + accessorPath);
    }
    return code;
};

instantiate = function(accessorName, accessorClass) {
    // FIXME: The bindings should be a bindings object where require == a requireLocal
    // function that searches first for local modules.
    var bindings = {
       'require': require,
    };
    // var bindings = [];
    var instance = new commonHost.instantiateAccessor(
            'Instance1', 'TestAccessor', getAccessorCode, bindings);
    Mobile('log').call('Instantiated accessor ' + accessorName + ' with class ' + accessorClass);
    return instance;
};


instantiateAndInitialize = function(accessorNames) {
    var accessors = [];
    var length = accessorNames.length;
    for (index = 0; index < length; ++index) {
        // The name of the accessor is basename of the accessorClass.
        var accessorClass = accessorNames[index];
        // For example, if the accessorClass is
        // test/TestComposite, then the accessorName will be
        // TestComposite.

        var startIndex = (accessorClass.indexOf('\\') >= 0 ? accessorClass.lastIndexOf('\\') : accessorClass.lastIndexOf('/'));
        var accessorName = accessorClass.substring(startIndex);
        if (accessorName.indexOf('\\') === 0 || accessorName.indexOf('/') === 0) {
            accessorName = accessorName.substring(1);
        }
        // If the same accessorClass appears more than once in the
        // list of arguments, then use different names.
        // To replicate: node nodeHostInvoke.js test/TestComposite test/TestComposite
        if (index > 0) {
            accessorName += "_" + (index - 1);
        }
        var accessor = instantiate(accessorName, accessorClass);
        // Push the top level accessor so that we can call wrapup later.
        accessors.push(accessor);
        accessor.initialize();
    }
    return accessors;
};


stop = function() {
    console.log("nodeHost.js: stop() invoked");
    process.exit();
}

Accessor = commonHost.Accessor;

provideInput = commonHost.provideInput;
setParameter = commonHost.setParameter;

// In case this gets used a module, create an exports object.
exports = {
    'Accessor': Accessor,
    'getAccessorCode': getAccessorCode,
    'instantiate': instantiate,
    'instantiateAndInitialize': instantiateAndInitialize,
    'provideInput': commonHost.provideInput,
    'setParameter': commonHost.setParameter,
};


///////////////// Launch accessor/////////////////////////////////////////////////////

Mobile('log').call('Instantiating/initializing accessor');
var a = instantiate('TestInstance', 'TestAccessor');
a.initialize();
Mobile('log').call('Input ports: ' + a.inputList);
Mobile('log').call('');
Mobile('log').call('');
Mobile('log').call('Providing \'hello world\' as untyped input');
a.provideInput('untyped', 'hello world');
Mobile('log').call('Calling react');
a.react();
Mobile('log').call('Output ports: ' + a.outputList);
Mobile('log').call('Type of Untyped: ' + a.latestOutput('typeOfUntyped'));
Mobile('log').call(a.latestOutput('jsonOfUntyped'));

Mobile('log').call('');
Mobile('log').call('');
Mobile('log').call('Providing 30 as numeric input');
a.provideInput('numeric', 30);
Mobile('log').call('Calling react');
a.react();
Mobile('log').call('Numeric plus 42: ' + a.latestOutput('numericPlusP'));
///////////////// Launch accessor/////////////////////////////////////////////////////