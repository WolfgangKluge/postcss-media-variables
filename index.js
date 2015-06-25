// PostCSS CSS Variables in @media queries
// https://github.com/WolfgangKluge/postcss-media-variables

var postcss = require('postcss');

var helperSelector = '::-postcss-media-variables';
var prefix = '-postcss-media-';

function createReplacerId(idx) {
    return '$--m' + idx + 'p';
}

/**
 * Search for the first occurence of two alternatives
 *
 * @param  {String} txt text to search in
 * @param  {Number} pos start-position in text (where the search starts)
 * @param  {String} a   text to find
 * @param  {String} b   text to find
 * @return {false|Object} false, if there's no match, Object otherwise
 */
function searchForFirst(txt, pos, a, b) {
    var aidx = txt.indexOf(a, pos);
    var bidx = txt.indexOf(b, pos);

    if (aidx === -1 && bidx === -1) return false;

    if (aidx !== -1 && (aidx < bidx || bidx === -1)) {
        return {
            value: a,
            pos: aidx,
            length: a.length
        };
    }

    return {
        value: b,
        pos: bidx,
        length: b.length
    };
}

/**
 * parse params
 *
 * search for calc( and var( (whatever comes first)
 * search for the matching )
 * add to return value
 *
 * Attention: this does not respect any other text ending with e.g. `var(` like `somevar(`!
 *
 * @param  {String} params String to parse
 * @return {[Object]|Object}  Array of text positions or Object on error
 */
function parseQuery(params) {
    var ret = [];
    var plen = params.length;
    var pos = 0;

    do {
        var r = searchForFirst(params, pos, 'calc(', 'var(');
        if (r === false) {
            // no more calc() or var() here
            return ret;
        }

        var start = r.pos;
        pos = r.pos + r.length;
        var parenCount = 1;

        do {
            r = searchForFirst(params, pos, '(', ')');
            if (r === false) {
                return {
                    type: 'warning',
                    msg: 'Missing ' + parenCount + ' closing parenthesis'
                };
            }
            parenCount += r.value === '(' ? 1 : -1;
            pos = r.pos + r.length;
        } while (parenCount > 0);

        ret.push({
            start: start,
            length: pos - start
        });
    } while (true);
}

/**
 * inspect @media rule
 * parse the @media params
 * replace every occurence of calc(..) and var(..) with a replacement id
 * add a helper rule at the end of the @media rule with a map of replacement id to calc(..) / var(..)
 *
 * @param  {Object} atrule postcss AtRule
 * @param  {Object} result postcss AtRule
 */
function firstRun(atrule, result) {
    var positions = parseQuery(atrule.params);

    if (positions === null) {
        result.warn('Unknown error while parsing @media params', { node: atrule });
        return;
    }

    if (positions.type === 'warning') {
        // error
        result.warn(positions.msg, { node: atrule });
        return;
    }

    // add helper rule even if there is nothing to calculate (for second run)
    var helperRule = postcss.rule({
        selector: helperSelector
    });

    helperRule.append(
        postcss.comment({
            text: 'If you can see this comment, you might have forgotten to add\n' +
                  'postcss-media-variables to the plugin list for a second time.\n\n' +
                  'Otherwise, it\'s a bug :) Sorry\n' +
                  'Please report here: https://github.com/WolfgangKluge/postcss-media-variables/issues'
        })
    );

    if (positions.length > 0) {
        var newParams = ''; // create new params with replacement strings
        var lastPos = 0;

        positions.forEach(function (position, idx) {
            var func = atrule.params.substr(position.start, position.length);

            newParams += atrule.params.substr(lastPos, position.start - lastPos);
            newParams += createReplacerId(idx);
            lastPos = position.start + position.length;

            helperRule.append(
                postcss.decl({
                    prop: prefix + idx,
                    value: func
                })
            );
        });
        atrule.params = newParams + atrule.params.substr(lastPos);
    }

    atrule.append(helperRule);
}

/**
 * inspect @media
 * search for the helper rule and use it's declarations to change the @media-parameter
 * remove the helper rule
 *
 * @param  {Object} atrule postcss AtRule
 * @param  {Object} result postcss AtRule
 */
function secondRun(atrule, result) {
    atrule.each(function (node) {
        if (node.selector === helperSelector) {
            node.eachDecl(function (decl) {
                if (!decl.prop || decl.prop.substr(0, prefix.length) !== prefix) return;

                var id = createReplacerId(decl.prop.substr(prefix.length));
                atrule.params = atrule.params.replace(id, decl.value);
            });

            // cleanup
            node.removeSelf();
            return false;
        }
    });
}

/**
 * tests, if a rule is a helper rule
 *
 * @param  {Object} rule postcss Node
 * @return {Boolean}     true, if it's a helper rule
 */
function isHelperRule(rule) {
    return rule.selector == helperSelector;
}

module.exports = postcss.plugin('postcss-media-variables', function () {
    return function (css, result) {
        css.eachAtRule('media', function (atrule) {
            var isSecondRun = atrule.some(isHelperRule);

            if (!isSecondRun) {
                firstRun(atrule, result);
                return;
            }
            secondRun(atrule, result);
        });
    };
});
