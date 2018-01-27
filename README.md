# PostCSS CSS Variables in `@media` queries

[PostCSS][postcss] plugin to use CSS Custom Properties in `@media` query parameters.

**There's no specification for this!**
(but it feels so natural..)

# Example

```css
/* input */
:root {
    --min-width: 1000px;
    --smallscreen: 480px;
}
@media (min-width: var(--min-width)) {}
@media (max-width: calc(var(--min-width) - 1px)) {}

@custom-media --small-device (max-width: var(--smallscreen));
@media (--small-device) {}
```

```css
/* output */
@media (min-width: 1000px) {}
@media (max-width: 999px) {}
@media (max-width: 480px) {}
```

### Install

`npm install postcss-media-variables --save-dev`

# Usage

`postcss-media-variables` has to be used **twice**!

Every other plugin is optional, but keep this order of plugins if you use any of them.

- **`postcss-media-variables`** (first occurence)
- [`postcss-custom-media`][custom-media]
- [`postcss-css-variables`][css-variables] and/or [`postcss-custom-properties`][custom-properties]
- [`postcss-calc`][calc]
- **`postcss-media-variables`** (second occurence)
- [`postcss-media-minmax`][media-minmax]

Since v1.1.0, this plugin plays well with [`postcss-custom-media`][custom-media]!

### Example

```js
var fs = require('fs');
var postcss = require('postcss');

var mediaVariables = require('postcss-media-variables');
var cssVariables = require('postcss-css-variables');
var customMedia = require('postcss-custom-media');
var calc = require('postcss-calc');

var mycss = fs.readFileSync('input.css', 'utf8');

// Process your CSS
var output = postcss()
    .use(mediaVariables()) // first run
    .use(customMedia(/* options */))
    .use(cssVariables(/* options */))
    .use(calc(/* options */))
    .use(mediaVariables()) // second run
    .process(mycss, { /* postcss - options */ })
    .css;

console.log(output);
```
[*For more general PostCSS usage, see this section*](https://github.com/postcss/postcss#usage)

In the first run, `postcss-media-variables` inspects every `@media` and every `@custom-media` rule, parses their params and wraps the affected `@media` rules into helper rules.
The information in the helper rules are calculated and resolved then.
In the second run, this plugin removes those helper rules again and uses the newly calculated information from there to change the `@media`-rule parameters.

# Non-Standard and not proposed - so why?
This plugin is created in personal need of a solution for the issue [Resolve variables in media queries ](https://github.com/postcss/postcss-custom-properties/issues/24).



[calc]:                 https://github.com/postcss/postcss-calc
[css-variables]:        https://github.com/MadLittleMods/postcss-css-variables
[custom-media]:         https://github.com/postcss/postcss-custom-media
[custom-properties]:    https://github.com/postcss/postcss-custom-properties
[media-minmax]:         https://github.com/postcss/postcss-media-minmax
[postcss]:              https://github.com/postcss/postcss
