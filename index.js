// PostCSS CSS Variables in @media queries
// https://github.com/WolfgangKluge/postcss-media-variables

/**
 * The PostCSS Rule node
 * @external rule
 * @see {@link https://github.com/postcss/postcss/blob/master/docs/api.md#rule-node}
 */

/**
 * The PostCSS AtRule node
 * @external atrule
 * @see {@link https://github.com/postcss/postcss/blob/master/docs/api.md#atrule-node}
 */

/**
 * The PostCSS Result class
 * @external result
 * @see {@link https://github.com/postcss/postcss/blob/master/docs/api.md#result-class}
 */

var postcss = require('postcss');

var helperSelector = '::-postcss-media-variables';
var runProperty = '-postcss-media-run';
var propertyPrefix = '-pcs-mv-';

/**
 * Search for the first occurence of two alternatives
 *
 * @param  {string}             txt     text to search in
 * @param  {Number}             pos     start-position in text (where the search starts)
 * @param  {string}             a       text to find
 * @param  {string}             b       text to find
 * @return {(Boolean|Object)}           false, if there's no match, Object otherwise
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
 * search for `calc(` and `var(` (whatever comes first)
 * search for the matching `)`
 * add text position/length to the return value
 *
 * Attention: this does not respect any other text ending with e.g. `var(` like `somevar(`!
 *
 * @param  {string}             params  string to parse
 * @return {(Object[]|Object)}          Array of text positions or Object on error
 */
function parseQuery(params) {
    var ret = [];
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
 * create the helper rule with a comment
 * @return {external:rule} the newly created helper rule
 */
function createHelperRule() {
    var rule = postcss.rule({
        selector: helperSelector
    });

    rule.append(
        postcss.comment({
            text: 'If you can see this comment, you might have forgotten to add\n' +
                  'postcss-media-variables to the plugin list for a second time.\n\n' +
                  'Otherwise, it\'s a bug :) Sorry\n' +
                  'Please report here: https://github.com/WolfgangKluge/postcss-media-variables/issues'
        })
    );

    return rule;
}

/**
 * take the parsed information and create new entries in the helperRule for them
 * returns the new atrule params value
 *
 * @param  {Object[]}       parsedPositions relevant text positions/lengths
 * @param  {string}         params          the original atrule params
 * @param  {external:rule}  helperRule      the helper rule to add new entries to
 * @param  {string}         lineNumber      line number of the AtRule
 * @return {string}                         the new atrule params
 */
function createDecls(parsedPositions, params, helperRule, lineNumber) {
    if (parsedPositions.length > 0) {
        var newParams = ''; // create new params with replacement strings
        var lastPos = 0;

        parsedPositions.forEach(function (data) {
            var func = params.substr(data.start, data.length);
            var prop = propertyPrefix + lineNumber + '-' + data.start + 'e';

            newParams += params.substr(lastPos, data.start - lastPos);
            newParams += prop;
            lastPos = data.start + data.length;

            helperRule.append(
                postcss.decl({
                    prop: prop,
                    value: func
                })
            );
        });
        return newParams + params.substr(lastPos);
    }
    return params;
}

/**
 * search for `var()` and `calc()` in the parameters of an atrule
 * @param  {external:atrule}    atrule  PostCSS AtRule to search in
 * @param  {external:result}    result  PostCSS Result
 * @return {(Object[]|Boolean)}         false, if there's an error, otherwise an array of text positions/lengths
 */
function parse(atrule, result) {
    var parsedPositions = parseQuery(atrule.params);

    if (parsedPositions === null) {
        result.warn('Unknown error while parsing @media params', { node: atrule });
        return false;
    }

    if (parsedPositions.type === 'warning') {
        // error
        result.warn(parsedPositions.msg, { node: atrule });
        return false;
    }

    return parsedPositions;
}

/**
 * clones all children of org into node
 * @param  {external:node}  org     the node to clone from
 * @param  {external:node}  node    the node to copy the clones into
 */
function cloneChildrenTo(org, node) {
    org.each(function (n) {
        node.append(n.clone());
    });
}

/**
 * inspect @media rule
 * parse the @media params
 * replace every occurence of calc(..) and var(..) with a replacement id
 * create a helper rule with a replacementid: var()/calc() list
 * wrap the helper rule around the @media rule (if there is already one, only copy it's children)
 *
 * @param  {external:atrule} atrule PostCSS AtRule
 * @param  {external:result} result PostCSS Result
 */
function firstRun_media(media, result) {
    var parsedPositions = parse(media, result);
    if (parsedPositions === false) return;

    var helperRule;
    if (isHelperRule(media.parent)) {
        helperRule = media.parent;
    } else {
        helperRule = createHelperRule();
        wrap(media, helperRule);
    }

    media.params = createDecls(parsedPositions, media.params, helperRule, media.source.start.line);
}

/**
 * inspect @custom-media rule
 * parse the @custom-media params
 * create a helper rule (map of replacement id: calc(..) / var(..))
 * replace every occurence of calc(..) and var(..) with the replacement id
 * wrap another helper rule around every @media rule, where the @custom-media rule is referenced (if not present)
 * copy a clone of each decl of the helper rule into the wrapping rule
 *
 * @param  {external:atrule} customMedia PostCSS AtRule
 * @param  {external:result} result      PostCSS Result
 */
function firstRun_customMedia(customMedia, result) {
    var parsedPositions = parse(customMedia, result);
    if (parsedPositions === false) return;

    var name = customMedia.params.split(' ')[0];
    var helperRule = createHelperRule();

    customMedia.params = createDecls(parsedPositions, customMedia.params, helperRule, customMedia.source.start.line);
    customMedia.root().walkAtRules('media', function (media) {
        if (media.params.indexOf('(' + name + ')') === -1) return;

        var currHelperRule;
        if (isHelperRule(media.parent)) {
            currHelperRule = media.parent;
        } else {
            currHelperRule = createHelperRule();
            wrap(media, currHelperRule);
        }

        cloneChildrenTo(helperRule, currHelperRule);
    });
}

/**
 * wrap the wrappingWith-rule around rule
 * @param  {external:rule} rule         the rule to wrap
 * @param  {external:rule} wrappingWith the wrapping element
 */
function wrap(rule, wrappingWith) {
    rule.replaceWith(wrappingWith);
    wrappingWith.append(rule);
    wrappingWith.source = rule.source;
}

/**
 * inspect @media
 * search for the helper rule and use it's declarations to change the @media-parameter
 * remove the helper rule
 *
 * @param  {external:atrule} media  PostCSS AtRule
 */
function secondRun(media) {
    if (!isHelperRule(media.parent)) return;
    media.parent.each(function (decl) {
        if (decl.type !== 'decl') return;
        do {
            media.params = media.params.replace(decl.prop, decl.value);
        } while (media.params.indexOf(decl.prop) !== -1);
    });

    // #1: `replaceWith` internally uses a clone of the node - and thus
    //     it removes all styling (in the current version of PostCSS)
    var parent = media.parent;
    parent.parent.insertBefore(parent, media);
    parent.remove();
}

/**
 * tests, if a rule is a helper rule
 *
 * @param  {external:rule} rule PostCSS Rule
 * @return {Boolean}            true, if it's a helper rule
 */
function isHelperRule(rule) {
    return rule && rule.selector == helperSelector;
}

/**
 * called every time, the plugin is invoked
 */
function onInvoke() {
    return function (css, result) {
        var step = 0;
        var stepNode;

        css.every(function (rule) {
            if (!isHelperRule(rule)) return;

            rule.walkDecls(function (decl) {
                if (decl.prop !== runProperty) return;

                stepNode = decl;
                step = parseInt(decl.value, 10);
                return false;
            });
            return false;
        });

        if (stepNode == null) {
            var node = createHelperRule();
            stepNode = postcss.decl({
                prop: runProperty,
                value: '0'
            });
            node.append(stepNode);
            css.prepend(node);
        }

        steps[step](css, result);
        if (step + 1 < steps.length) {
            stepNode.value = (step + 1).toString();
        } else {
            // cleanup on last step
            stepNode.parent.remove();
        }
    };
}

var steps = [step1, step2];

/**
 * inspect and change every `custom-media` and `media`
 * and wrap the @media rules with helper rules
 *
 * @param  {external:node}      css      the global Node
 * @param  {external:result}    result   PostCSS Result
 */
function step1(css, result) {
    css.walkAtRules('custom-media', function (customMedia) {
        firstRun_customMedia(customMedia, result);
    });
    css.walkAtRules('media', function (media) {
        firstRun_media(media, result);
    });
}

/**
 * step two: inspect every parent of every media rule. If it's a
 * helper rule use the information from there and unwrap everything
 *
 * @param  {external:node}      css      the global Node
 * @param  {external:result}    result   PostCSS Result
 */
function step2(css, result) {
    css.walkAtRules('media', function (media) {
        secondRun(media, result);
    });
}

module.exports = postcss.plugin('postcss-media-variables', onInvoke);

