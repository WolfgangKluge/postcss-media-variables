var postcss = require('postcss');
var expect  = require('chai').expect;
var path    = require('path');
var fs      = require('fs');

var mediaVariables = require('../');
var cssVariables = require('postcss-css-variables');
var calc = require('postcss-calc');
var customMedia = require('postcss-custom-media');

function warningToString(warning) {
    return  warning.type + ': ' +
            warning.text;
}

function adjust(txt) {
    return txt
        .replace(/^\s+|\s+$|\r(?=\n)/g, '')
        .replace(/^\r/g, '\n');
}

function runTest(input, expected, expectedWarnings) {
    var result = postcss(
        mediaVariables(),
        customMedia(),
        cssVariables(),
        calc(),
        mediaVariables()
    ).process(input);

    var output = result.css;
    var warnings = result.warnings().map(warningToString).join('\n\n');

    expect(adjust(output)).to.eql(adjust(expected));
    expect(adjust(warnings)).to.eql(adjust(expectedWarnings));
}

describe('assets', function () {
    var assetDir = path.join(__dirname, 'assets');
    var assetnames = fs.readdirSync(assetDir);

    var tests = [];
    assetnames.forEach(function (assetname) {
        var assetpath = path.join(assetDir, assetname);
        var ext = path.extname(assetname); // .css
        assetname = path.basename(assetname, ext);

        ext = path.extname(assetname); // .input, .output, ...
        assetname = path.basename(assetname, ext);

        if (ext === '') return;

        if (!tests[assetname]) tests[assetname] = {
            input: '',
            output: '',
            warnings: ''
        };

        ext = ext.substr(1);
        if (tests[assetname].hasOwnProperty(ext)) {
            tests[assetname][ext] = fs.readFileSync(assetpath, 'utf-8');
        }
    });

    Object.keys(tests).forEach(function (testname) {
        var test = tests[testname];

        it(testname, function () {
            runTest(
                test.input,
                test.output,
                test.warnings
            );
        });
    });
});
