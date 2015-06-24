var postcss = require('postcss');
var expect  = require('chai').expect;
var path    = require('path');

var mediaVariables = require('../');
var cssVariables = require('postcss-css-variables');
var calc = require('postcss-calc');
var customMedia = require('postcss-custom-media');

var test = function (input, expected, opts) {
    var result = postcss(
        mediaVariables(opts),
        customMedia(),
        cssVariables(),
        calc(),
        mediaVariables(opts)
    ).process(input);

    expect(result.css).to.eql(expected);
    expect(result.warnings()).to.be.empty;
};

describe('postcss-mixins', function () {
    it('resolve var()', function () {
        test(
            '\
                :root {\
                    --min-width: 1000px;\
                }\
                @media (min-width: calc(var(--min-width))) {\
                }\
            ',
            '\
                @media (min-width: 1000px) {\
                }\
            '
        );
    });

    it('resolve var() on multiple rules', function () {
        test(
            '\
                :root {\
                    --min-width: 1000px;\
                    --max-width: 2000px;\
                }\
                @media screen and (min-width: var(--min-width)), (max-width: var(--max-width)) {\
                }\
            ',
            '\
                @media screen and (min-width: 1000px), (max-width: 2000px) {\
                }\
            '
        );
    });

    it('resolve calc()', function () {
        test(
            '\
                :root {\
                    --min-width: 1000px;\
                }\
                @media (max-width: calc(var(--min-width) - 1px)) {\
                }\
            ',
            '\
                @media (max-width: 999px) {\
                }\
            '
        );
    });
});
